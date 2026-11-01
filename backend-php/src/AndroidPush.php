<?php
declare(strict_types=1);
namespace TaPago;

/** FCM HTTP v1. Credencial e tokens ficam exclusivamente no armazenamento privado. */
final class AndroidPush {
    public function __construct(private Db $db,private array $config) {}
    private function root(): string {
        $root=($this->config['pushDirectory']??dirname(__DIR__).'/storage/push').'/android';
        if(!is_dir($root)&&!mkdir($root,0700,true)&&!is_dir($root))throw new \RuntimeException('Android push storage');return $root;
    }
    private function credentials(): ?array {
        $file=$this->config['fcmServiceAccountFile']??dirname(__DIR__).'/firebase-service-account.json';
        if(!is_file($file))return null;
        $value=json_decode(file_get_contents($file),true,32,JSON_THROW_ON_ERROR);
        if(($value['type']??'')!=='service_account'||!preg_match('/^[a-z][a-z0-9-]{4,61}[a-z0-9]$/D',$value['project_id']??'')||!filter_var($value['client_email']??'',FILTER_VALIDATE_EMAIL)||!str_contains($value['private_key']??'','PRIVATE KEY'))throw new \RuntimeException('FCM configuration');
        return $value;
    }
    public function configured(): bool { return $this->testing()||$this->credentials()!==null; }
    private function testing(): bool { return ($this->config['environment']??'')==='test'&&isset($this->config['fcmTestStatus']); }
    public static function installation(mixed $value): bool { return is_string($value)&&preg_match('/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/D',$value)===1; }
    public static function token(mixed $value): bool { return is_string($value)&&preg_match('/^[A-Za-z0-9_:.-]{20,4096}$/D',$value)===1; }
    private function file(string $installation): string { return $this->root().'/'.hash('sha256',$installation).'.json'; }
    private function save(string $file,array $state): void {
        $temporary=$file.'.'.uid();$json=encode($state);
        if(file_put_contents($temporary,$json,LOCK_EX)!==strlen($json)||!chmod($temporary,0600)||!rename($temporary,$file))throw new \RuntimeException('Android push storage');
    }
    private function encrypted(string $token): string {
        $iv=random_bytes(12);$tag='';$cipher=openssl_encrypt($token,'aes-256-gcm',hex2bin($this->config['enrollmentKey']),OPENSSL_RAW_DATA,$iv,$tag);
        if($cipher===false)throw new \RuntimeException('Android push encryption');return base64_encode($iv.$tag.$cipher);
    }
    private function decrypted(string $cipher): string {
        $bytes=base64_decode($cipher,true);if($bytes===false||strlen($bytes)<29)throw new \RuntimeException('Android push encryption');
        $token=openssl_decrypt(substr($bytes,28),'aes-256-gcm',hex2bin($this->config['enrollmentKey']),OPENSSL_RAW_DATA,substr($bytes,0,12),substr($bytes,12,16));
        if(!self::token($token))throw new \RuntimeException('Android push encryption');return $token;
    }
    private function locked(string $file,callable $action): mixed {
        $lock=fopen($file.'.lock','c');if(!$lock||!flock($lock,LOCK_EX))throw new \RuntimeException('Android push storage');
        try{return $action();}finally{flock($lock,LOCK_UN);fclose($lock);}
    }
    public function subscribe(string $owner,string $installation,string $token): array {
        ensure(self::installation($installation)&&self::token($token),'Inscrição Android inválida');
        ensure($this->configured(),'O envio de notificações Android ainda não está configurado',503);
        $file=$this->file($installation);
        return $this->locked($file,function()use($file,$owner,$token){
            $old=is_file($file)?json_decode(file_get_contents($file),true,32,JSON_THROW_ON_ERROR):null;
            if(($old['owner']??null)===$owner){$old['token']=$this->encrypted($token);$this->save($file,$old);return ['binding'=>$old['binding']];}
            $count=0;foreach(glob($this->root().'/*.json')?:[] as $existing){$state=json_decode(file_get_contents($existing),true);if(($state['owner']??null)===$owner)$count++;}
            ensure($count<10,'Limite de aparelhos Android atingido',409);
            $binding=bin2hex(random_bytes(16));$this->save($file,['owner'=>$owner,'token'=>$this->encrypted($token),'binding'=>$binding,'since'=>now(),'sent'=>[],'attempts'=>0,'retryAt'=>0]);
            return ['binding'=>$binding];
        });
    }
    public function unsubscribe(string $owner,string $installation): void {
        ensure(self::installation($installation),'Inscrição Android inválida');$file=$this->file($installation);
        $this->locked($file,function()use($file,$owner){if(!is_file($file))return;$state=json_decode(file_get_contents($file),true,32,JSON_THROW_ON_ERROR);if($state['owner']===$owner)unlink($file);});
    }
    public function scheduleTest(string $owner,string $installation): void {
        ensure(self::installation($installation),'Inscrição Android inválida');$file=$this->file($installation);
        $this->locked($file,function()use($file,$owner){
            ensure(is_file($file),'Ative as notificações neste aparelho antes de testar',409);$state=json_decode(file_get_contents($file),true,32,JSON_THROW_ON_ERROR);
            ensure($state['owner']===$owner,'Inscrição não encontrada',404);ensure(time()-($state['lastTestAt']??0)>=90,'Aguarde o teste anterior antes de tentar novamente',429);
            $state['testAt']=time()+15;$state['lastTestAt']=time();$this->save($file,$state);
        });
    }
    public static function message(string $token,string $binding,?array $event): array {
        $kind=$event['kind']??'test';
        $titles=['enrollment'=>'Novo cadastro no Tá Pago','workout_completed'=>'Treino concluído','feedback'=>'Novo feedback','test'=>'Teste do Tá Pago'];
        $bodies=['enrollment'=>'Um aluno enviou um cadastro. Toque para analisar.','workout_completed'=>'Um aluno concluiu um treino. Toque para acompanhar.','feedback'=>'Um aluno enviou um feedback. Toque para abrir.','test'=>'Notificação enviada pelo servidor. Toque para abrir o Tá Pago.'];
        return ['message'=>['token'=>$token,'data'=>['binding'=>$binding,'id'=>$event['id']??'','title'=>$titles[$kind]??$titles['test'],'body'=>$bodies[$kind]??$bodies['test']],
            'android'=>['priority'=>'HIGH','ttl'=>'86400s']]];
    }
    private function http(string $url,string $body,array $headers): array {
        $curl=curl_init($url);curl_setopt_array($curl,[CURLOPT_POST=>true,CURLOPT_POSTFIELDS=>$body,CURLOPT_HTTPHEADER=>$headers,CURLOPT_RETURNTRANSFER=>true,CURLOPT_FOLLOWLOCATION=>false,CURLOPT_CONNECTTIMEOUT=>3,CURLOPT_TIMEOUT=>8,CURLOPT_PROTOCOLS=>CURLPROTO_HTTPS]);
        $response=curl_exec($curl);$status=(int)curl_getinfo($curl,CURLINFO_HTTP_CODE);curl_close($curl);
        return [$status,is_string($response)?json_decode($response,true):null];
    }
    private static function b64(string $value): string { return rtrim(strtr(base64_encode($value),'+/','-_'),'='); }
    public static function assertion(array $credentials): string {
        $input=self::b64(encode(['alg'=>'RS256','typ'=>'JWT'])).'.'.self::b64(encode(['iss'=>$credentials['client_email'],'scope'=>'https://www.googleapis.com/auth/firebase.messaging','aud'=>'https://oauth2.googleapis.com/token','iat'=>time(),'exp'=>time()+3600]));
        if(!openssl_sign($input,$signature,$credentials['private_key'],OPENSSL_ALGO_SHA256))throw new \RuntimeException('FCM signature');return $input.'.'.self::b64($signature);
    }
    private function accessToken(array $credentials): string {
        $file=$this->root().'/oauth-cache';
        return $this->locked($file,function()use($file,$credentials){
            $cache=is_file($file)?json_decode(file_get_contents($file),true):null;
            $key=hash('sha256',$credentials['client_email'].$credentials['private_key']);
            if(($cache['key']??'')===$key&&($cache['expires']??0)>time()+90)return $cache['token'];
            [$status,$response]=$this->http('https://oauth2.googleapis.com/token',http_build_query(['grant_type'=>'urn:ietf:params:oauth:grant-type:jwt-bearer','assertion'=>self::assertion($credentials)]),['Content-Type: application/x-www-form-urlencoded']);
            if($status!==200||!is_string($response['access_token']??null))throw new \RuntimeException('FCM authorization');
            $this->save($file,['key'=>$key,'token'=>$response['access_token'],'expires'=>time()+min(3600,(int)($response['expires_in']??3600))]);return $response['access_token'];
        });
    }
    private function send(array $message): string {
        if($this->testing())return (int)$this->config['fcmTestStatus']===200?'sent':((int)$this->config['fcmTestStatus']===410?'expired':'failed');
        $credentials=$this->credentials();if(!$credentials)return 'failed';
        [$status,$response]=$this->http('https://fcm.googleapis.com/v1/projects/'.$credentials['project_id'].'/messages:send',encode($message),['Authorization: Bearer '.$this->accessToken($credentials),'Content-Type: application/json']);
        if($status===200&&is_string($response['name']??null))return 'sent';
        foreach($response['error']['details']??[] as $detail)if(($detail['errorCode']??'')==='UNREGISTERED')return 'expired';
        if($status===401){$file=$this->root().'/oauth-cache';if(is_file($file))unlink($file);}return 'failed';
    }
    public function dispatch(?string $owner=null): array {
        $counts=['sent'=>0,'failed'=>0,'expired'=>0];if(!$this->configured())return $counts;
        foreach(glob($this->root().'/*.json')?:[] as $file){
            $lock=fopen($file.'.lock','c');if(!$lock||!flock($lock,LOCK_EX|LOCK_NB)){if($lock)fclose($lock);continue;}
            try{
                if(!is_file($file))continue;$state=json_decode(file_get_contents($file),true,32,JSON_THROW_ON_ERROR);
                if(($owner!==null&&$state['owner']!==$owner)||$state['retryAt']>time())continue;
                if(!in_array($state['owner'],$this->config['authorizedPersonalIds']??[],true)){unlink($file);continue;}
                $events=array_values(array_filter((new News($this->db,$this->config))->events($state['owner']),fn($event)=>$event['createdAt']>=$state['since']&&$event['createdAt']>=at(time()-86400)));
                $state['sent']=array_values(array_intersect($state['sent'],array_column($events,'id')));
                $pending=array_reverse(array_values(array_filter($events,fn($event)=>!in_array($event['id'],$state['sent'],true))));
                $testDue=isset($state['testAt'])&&$state['testAt']<=time();if($testDue)$pending[]=null;
                if(!$pending)continue;$token=$this->decrypted($state['token']);$expired=false;
                foreach(array_slice($pending,0,20) as $event){
                    try{$result=$this->send(self::message($token,$state['binding'],$event));}catch(\Throwable){$result='failed';}
                    if($result==='expired'){unlink($file);$counts['expired']++;$expired=true;break;}
                    if($result==='failed'){$state['attempts']++;$state['retryAt']=time()+min(3600,60*(2**min(6,$state['attempts']-1)));$counts['failed']++;break;}
                    if($event===null)unset($state['testAt']);else $state['sent'][]=$event['id'];
                    $state['attempts']=0;$state['retryAt']=0;$state['lastAcceptedAt']=now();$counts['sent']++;
                    $this->save($file,$state);
                }
                if(!$expired)$this->save($file,$state);
            }catch(\Throwable){$counts['failed']++;error_log('TaPago Android push: dispatch failed');}
            finally{flock($lock,LOCK_UN);fclose($lock);}
        }
        return $counts;
    }
}
