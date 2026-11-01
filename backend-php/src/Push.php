<?php
declare(strict_types=1);
namespace TaPago;

/** Web Push sem payload: nenhum dado do aluno é enviado ao provedor. */
final class Push {
    public function __construct(private Db $db,private array $config) {}
    private function root(): string {
        $root=$this->config['pushDirectory']??dirname(__DIR__).'/storage/push';
        if (!is_dir($root) && !mkdir($root,0700,true) && !is_dir($root)) throw new \RuntimeException('Push storage');
        return $root;
    }
    public static function endpoint(string $value): bool {
        $url=parse_url($value); $host=strtolower($url['host']??'');
        return strlen($value)<=4096 && ($url['scheme']??'')==='https' && !isset($url['pass']) && !isset($url['user']) && !isset($url['fragment']) && (!isset($url['port']) || $url['port']===443)
            && ($host==='fcm.googleapis.com' || $host==='web.push.apple.com' || $host==='updates.push.services.mozilla.com' || preg_match('/^[a-z0-9-]+\.notify\.windows\.com$/D',$host)===1);
    }
    private static function b64(string $value): string { return rtrim(strtr(base64_encode($value),'+/','-_'),'='); }
    private function key(): \OpenSSLAsymmetricKey {
        $file=$this->root().'/vapid-private.pem';$lock=fopen($this->root().'/.key.lock','c');
        if (!$lock || !flock($lock,LOCK_EX)) throw new \RuntimeException('Push key');
        try {
            if (!is_file($file)) {
                $key=openssl_pkey_new(['private_key_type'=>OPENSSL_KEYTYPE_EC,'curve_name'=>'prime256v1']);
                if (!$key || !openssl_pkey_export($key,$pem)) throw new \RuntimeException('Push key');
                $temporary=$file.'.'.uid();
                if (file_put_contents($temporary,$pem,LOCK_EX)!==strlen($pem) || !chmod($temporary,0600) || !rename($temporary,$file)) throw new \RuntimeException('Push key');
            }
            $key=openssl_pkey_get_private(file_get_contents($file)); if (!$key) throw new \RuntimeException('Push key'); return $key;
        } finally { flock($lock,LOCK_UN);fclose($lock); }
    }
    public function publicKey(): string { $ec=openssl_pkey_get_details($this->key())['ec'];return self::b64("\x04".str_pad($ec['x'],32,"\0",STR_PAD_LEFT).str_pad($ec['y'],32,"\0",STR_PAD_LEFT)); }
    public function authorization(string $endpoint): string {
        ensure(self::endpoint($endpoint),'Destino push inválido');
        $origin='https://'.strtolower(parse_url($endpoint,PHP_URL_HOST));
        $input=self::b64(encode(['typ'=>'JWT','alg'=>'ES256'])).'.'.self::b64(encode(['aud'=>$origin,'exp'=>time()+3600,'sub'=>$this->config['origin']]));
        if (!openssl_sign($input,$der,$this->key(),OPENSSL_ALGO_SHA256)) throw new \RuntimeException('Push signature');
        // OpenSSL retorna ASN.1 DER; JOSE exige os inteiros R e S em 32 bytes.
        $offset=2;if (ord($der[1])>127) $offset+=ord($der[1])&127;
        $raw='';for($i=0;$i<2;$i++){if(ord($der[$offset++])!==2)throw new \RuntimeException('Push signature');$length=ord($der[$offset++]);$integer=ltrim(substr($der,$offset,$length),"\0");$offset+=$length;if(strlen($integer)>32)throw new \RuntimeException('Push signature');$raw.=str_pad($integer,32,"\0",STR_PAD_LEFT);}
        return 'vapid t='.$input.'.'.self::b64($raw).', k='.$this->publicKey();
    }
    private function cipher(string $endpoint): string {
        $iv=random_bytes(12);$tag='';$data=openssl_encrypt($endpoint,'aes-256-gcm',hex2bin($this->config['enrollmentKey']),OPENSSL_RAW_DATA,$iv,$tag);
        if($data===false)throw new \RuntimeException('Push encryption');return base64_encode($iv.$tag.$data);
    }
    private function plain(string $cipher): string {
        $bytes=base64_decode($cipher,true);if($bytes===false||strlen($bytes)<29)throw new \RuntimeException('Push encryption');
        $value=openssl_decrypt(substr($bytes,28),'aes-256-gcm',hex2bin($this->config['enrollmentKey']),OPENSSL_RAW_DATA,substr($bytes,0,12),substr($bytes,12,16));
        if($value===false)throw new \RuntimeException('Push encryption');return $value;
    }
    private function save(string $file,array $state): void {
        $temporary=$file.'.'.uid();$json=encode($state);
        if(file_put_contents($temporary,$json,LOCK_EX)!==strlen($json)||!chmod($temporary,0600)||!rename($temporary,$file))throw new \RuntimeException('Push storage');
    }
    public function subscribe(string $owner,string $endpoint): void {
        ensure(self::endpoint($endpoint),'Este serviço de notificações não é compatível');$this->publicKey();
        $file=$this->root().'/'.hash('sha256',$endpoint).'.json';
        $lock=fopen($file.'.lock','c');if(!$lock||!flock($lock,LOCK_EX))throw new \RuntimeException('Push storage');
        try {
        if(is_file($file)){$old=json_decode(file_get_contents($file),true,32,JSON_THROW_ON_ERROR);if($old['owner']===$owner)return;}
        $count=0;foreach(glob($this->root().'/*.json')?:[] as $existing){$state=json_decode(file_get_contents($existing),true);if(($state['owner']??null)===$owner)$count++;}
        ensure($count<10,'Limite de aparelhos atingido',409);
        $this->save($file,['owner'=>$owner,'endpoint'=>$this->cipher($endpoint),'since'=>now(),'sent'=>[],'attempts'=>0,'retryAt'=>0]);
        } finally {flock($lock,LOCK_UN);fclose($lock);}
    }
    public function unsubscribe(string $owner,string $endpoint): void {
        $file=$this->root().'/'.hash('sha256',$endpoint).'.json';if(!is_file($file))return;
        $lock=fopen($file.'.lock','c');if(!$lock||!flock($lock,LOCK_EX))throw new \RuntimeException('Push storage');
        try {
        if(!is_file($file))return;
        $state=json_decode(file_get_contents($file),true,32,JSON_THROW_ON_ERROR);if($state['owner']===$owner)unlink($file);
        } finally {flock($lock,LOCK_UN);fclose($lock);}
    }
    public function dispatch(?string $owner=null): array {
        $counts=['sent'=>0,'failed'=>0,'expired'=>0];
        foreach(glob($this->root().'/*.json')?:[] as $file){
            $lock=fopen($file.'.lock','c');if(!$lock||!flock($lock,LOCK_EX|LOCK_NB)){if($lock)fclose($lock);continue;}
            try {
                if(!is_file($file))continue;$state=json_decode(file_get_contents($file),true,32,JSON_THROW_ON_ERROR);
                if(($owner!==null&&$state['owner']!==$owner)||$state['retryAt']>time())continue;
                if(!in_array($state['owner'],$this->config['authorizedPersonalIds']??[],true)){unlink($file);continue;}
                $rows=$this->db->rows('EnrollmentRequest',"personalId=? AND status='pending' AND createdAt>=? AND createdAt>=?",[$state['owner'],$state['since'],at(time()-86400)],'createdAt ASC');
                $ids=array_column($rows,'id');$state['sent']=array_values(array_intersect($state['sent'],$ids));
                if(!array_diff($ids,$state['sent']))continue;
                $endpoint=$this->plain($state['endpoint']);ensure(self::endpoint($endpoint),'Push endpoint');
                $authorization=$this->authorization($endpoint);$status=0;
                if(($this->config['environment']??'production')==='test'&&isset($this->config['pushTestStatus']))$status=(int)$this->config['pushTestStatus'];
                else {
                    $curl=curl_init($endpoint);curl_setopt_array($curl,[CURLOPT_POST=>true,CURLOPT_POSTFIELDS=>'',CURLOPT_HTTPHEADER=>['Authorization: '.$authorization,'TTL: 86400','Urgency: normal','Content-Length: 0'],CURLOPT_RETURNTRANSFER=>true,CURLOPT_FOLLOWLOCATION=>false,CURLOPT_CONNECTTIMEOUT=>3,CURLOPT_TIMEOUT=>5,CURLOPT_PROTOCOLS=>CURLPROTO_HTTPS]);
                    curl_exec($curl);$status=(int)curl_getinfo($curl,CURLINFO_HTTP_CODE);curl_close($curl);
                }
                if($status>=200&&$status<300){$state['sent']=$ids;$state['attempts']=0;$state['retryAt']=0;$counts['sent']++;}
                elseif(in_array($status,[404,410],true)){unlink($file);$counts['expired']++;continue;}
                else{$state['attempts']++;$state['retryAt']=time()+min(3600,60*(2**min(6,$state['attempts']-1)));$counts['failed']++;}
                $this->save($file,$state);
            } catch(\Throwable){$counts['failed']++;error_log('TaPago push: dispatch failed');}
            finally{flock($lock,LOCK_UN);fclose($lock);}
        }
        return $counts;
    }
}
