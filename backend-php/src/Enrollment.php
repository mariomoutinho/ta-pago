<?php
declare(strict_types=1);
namespace TaPago;

trait Enrollment {
    private function seal(array $data): string {
        $iv=random_bytes(12); $tag='';
        $encrypted=openssl_encrypt(encode($data),'aes-256-gcm',hex2bin($this->config['enrollmentKey']),OPENSSL_RAW_DATA,$iv,$tag);
        if ($encrypted===false) throw new \RuntimeException('Encryption failed');
        return implode('.',array_map('base64_encode',[$iv,$tag,$encrypted]));
    }
    private function unseal(string $value): array {
        $parts=explode('.',$value); if (count($parts)!==3) throw new \RuntimeException('Invalid encrypted data');
        [$iv,$tag,$data]=array_map(fn($p)=>base64_decode($p,true),$parts);
        if ($iv===false || $tag===false || $data===false || strlen($iv)!==12 || strlen($tag)!==16) throw new \RuntimeException('Invalid encrypted data');
        $plain=openssl_decrypt($data,'aes-256-gcm',hex2bin($this->config['enrollmentKey']),OPENSSL_RAW_DATA,$iv,$tag);
        if ($plain===false) throw new \RuntimeException('Invalid encrypted data or key');
        return json_decode($plain,true,64,JSON_THROW_ON_ERROR);
    }
    private function publicEnrollment(string $method,string $token,array $body): array {
        $link=$this->db->required('EnrollmentLink','token=? AND active=1',[$token],$this->writing);
        $seed=json_decode(file_get_contents(__DIR__.'/../generated/seed.json'),true);
        if ($method==='GET') {
            $challenge=bin2hex(random_bytes(32));
            $this->db->query('DELETE FROM EnrollmentChallenge WHERE expiresAt<?',[now()]);
            $this->db->create('EnrollmentChallenge',['id'=>hash('sha256',$challenge),'linkId'=>$link['id'],'expiresAt'=>at(time()+3600)]);
            return ['personalName'=>$link['publicName'],'contact'=>$link['contact'],'policyVersion'=>$seed['policyVersion'],'retentionDays'=>$this->config['retentionDays'],'challenge'=>$challenge];
        }
        ensure($method==='POST','Recurso não encontrado',404);
        $data=$this->validation->parse('enrollmentSchema',$body);
        ensure(count(preg_split('/\s+/',$data['name']))>1,'Informe nome e sobrenome');
        $digits=preg_replace('/\D/','',$data['phone']);
        ensure(preg_match('/^\+?[\d\s().-]+$/D',$data['phone'])===1 && strlen($digits)>=10 && strlen($digits)<=15,'Informe WhatsApp com DDD');
        if ($data['birthDate']) {
            $date=\DateTimeImmutable::createFromFormat('!Y-m-d',$data['birthDate']);
            ensure(preg_match('/^\d{4}-\d{2}-\d{2}$/D',$data['birthDate'])===1 && $date!==false && $date->format('Y-m-d')===$data['birthDate'] && $data['birthDate']>='1900-01-01' && $data['birthDate']<gmdate('Y-m-d'),'Nascimento inválido');
        }
        ensure(!array_filter($data['health']) || $data['healthConsent'],'Autorize dados de saúde ou remova essas informações');
        $code=$body['challenge']??'';
        ensure(is_string($code)&&preg_match('/^[a-f0-9]{64}$/D',$code)===1 && empty($body['website']),'Reabra o formulário e tente novamente');
        $proof=$this->db->one('EnrollmentChallenge','id=?',[hash('sha256',$code)],true);
        ensure($proof!==null && $proof['linkId']===$link['id'] && $proof['expiresAt']>now() && microtime(true)-strtotime($proof['createdAt'])>=2,'Reabra o formulário e tente novamente');
        $this->db->delete('EnrollmentChallenge',$proof['id']);
        $data['email']=strtolower(trim($data['email'])); $data['goals']=array_values(array_unique($data['goals']));
        $fingerprint=hash_hmac('sha256',$data['email'],hex2bin($this->config['enrollmentKey']));
        if (!$this->db->one('EnrollmentRequest','personalId=? AND emailHash=?',[$link['personalId'],$fingerprint])) {
            $health=$data['health']; unset($data['health']);
            $r=$this->db->create('EnrollmentRequest',['personalId'=>$link['personalId'],'emailHash'=>$fingerprint,'payload'=>$this->seal($data),
                'healthPayload'=>array_filter($health)?$this->seal($health):null,'policyVersion'=>$seed['policyVersion'],'consentAt'=>now(),'healthConsentAt'=>$data['healthConsent']?now():null]);
            $this->db->create('EnrollmentEvent',['requestId'=>$r['id'],'status'=>'pending']);
        }
        $this->status=202; return ['ok'=>true,'message'=>'Cadastro enviado ao profissional. Aguarde o contato dele.'];
    }
    private function enrollmentRoute(string $method,string $path,array $body): mixed {
        $owner=$this->user['id'];
        if ($path==='/link') {
            $link=$this->db->one('EnrollmentLink','personalId=?',[$owner],$this->writing);
            if ($method==='GET') return $link ? [
                'token'=>$link['token'],'url'=>$this->config['origin'].$this->config['basePath'].'/cadastro/'.$link['token'],
                'active'=>$link['active'],'publicName'=>$link['publicName'],'contact'=>$link['contact'],
                'local'=>$this->config['environment']!=='production','received'=>count($this->db->rows('EnrollmentRequest','personalId=?',[$owner])),
            ]:null;
            if ($method==='POST') {
                ensure(is_string($body['publicName']??null) && is_string($body['contact']??null),'Nome e contato inválidos');
                $name=trim($body['publicName']??''); $contact=trim($body['contact']??'');
                ensure(mb_strlen($name)>=2 && mb_strlen($name)<=120 && mb_strlen($contact)>=5 && mb_strlen($contact)<=200,'Nome e contato inválidos');
                $data=['token'=>bin2hex(random_bytes(32)),'active'=>true,'publicName'=>$name,'contact'=>$contact];
                if ($link) { $this->db->query('DELETE FROM EnrollmentChallenge WHERE linkId=?',[$link['id']]); $this->db->update('EnrollmentLink',$link['id'],$data); }
                else $this->db->create('EnrollmentLink',[...$data,'personalId'=>$owner]);
                $this->status=201; return ['ok'=>true];
            }
            if ($method==='DELETE') { if ($link) $this->db->update('EnrollmentLink',$link['id'],['active'=>false]); return ['ok'=>true]; }
        }
        if ($path==='/requests' && $method==='GET') {
            // Limpeza por proprietário; o comando CLI permite a limpeza global agendada.
            $this->db->query("DELETE FROM EnrollmentRequest WHERE personalId=? AND status IN ('pending','rejected') AND updatedAt<?",[$owner,at(time()-$this->config['retentionDays']*86400)]);
            return array_map(function($r) {
                $form=$this->unseal($r['payload']); return [...array_intersect_key($r,array_flip(['id','status','createdAt','studentId'])),...array_intersect_key($form,array_flip(['name','email','phone','goals']))];
            },$this->db->rows('EnrollmentRequest','personalId=?',[$owner],'createdAt DESC'));
        }
        if (preg_match('~^/requests/([^/]+)(/status)?$~D',$path,$m)) {
            $r=$this->db->required('EnrollmentRequest','id=? AND personalId=?',[$m[1],$owner],$this->writing);
            if ($method==='GET' && !isset($m[2])) return [...array_intersect_key($r,array_flip(['id','status','studentId','createdAt','policyVersion','consentAt','healthConsentAt'])),
                'form'=>[...$this->unseal($r['payload']),'health'=>$r['healthPayload']?$this->unseal($r['healthPayload']):['restrictions'=>'','injuries'=>'','adaptations'=>'']],
                'events'=>$this->db->rows('EnrollmentEvent','requestId=?',[$r['id']],'createdAt ASC')];
            if ($method==='DELETE' && !isset($m[2])) { ensure($r['status']!=='active','Desative o vínculo antes de excluir',409); $this->db->delete('EnrollmentRequest',$r['id']); return ['ok'=>true]; }
            if ($method==='POST' && isset($m[2])) {
                $status=$body['status']??'';
                ensure(in_array($status,['active','rejected','inactive'],true),'Status inválido');
                if ($status===$r['status']) return ['ok'=>true];
                ensure(($r['status']==='pending' && in_array($status,['active','rejected'],true)) || ($r['status']==='active' && $status==='inactive'),'Transição de status não permitida',409);
                $studentId=$r['studentId'];
                if ($status==='active') {
                    $form=$this->unseal($r['payload']);
                    $matches=$this->db->rows('Student','personalId=? AND LOWER(TRIM(email))=?',[$owner,$form['email']],'',true);
                    ensure(count($matches)<=1 && ($matches[0]['linkStatus']??'')!=='ended','Revise o cadastro existente',409);
                    $student=$matches[0]??$this->db->create('Student',['personalId'=>$owner,'name'=>$form['name'],'email'=>$form['email'],'phone'=>$form['phone'],'birthDate'=>$form['birthDate']?:null,
                        'sex'=>$form['gender'],'startDate'=>gmdate('Y-m-d'),'mainGoal'=>implode(', ',$form['goals']),'secondaryGoals'=>$form['specificGoals'],
                        'experience'=>$form['practicing'].'; '.$form['daysPerWeek'].' dias/semana; '.$form['experienceDuration'].'; personal anterior: '.$form['previousTrainer'].'; modalidade: '.$form['preferredActivity'],
                        'availability'=>$form['availability'],'weeklyFrequency'=>max(1,$form['daysPerWeek'])]);
                    $studentId=$student['id']; $this->history($studentId,'Cadastro por link aprovado',['requestId'=>$r['id']]);
                }
                if ($status==='inactive' && $studentId) {
                    $this->db->update('Student',$studentId,['linkStatus'=>'ended','status'=>'inativo']);
                    $this->db->query('DELETE FROM Invitation WHERE studentId=?',[$studentId]);
                    $this->history($studentId,'Vínculo encerrado pelo personal');
                }
                $update=['status'=>$status,'studentId'=>$studentId]; if ($status==='inactive') $update['healthPayload']=null;
                $this->db->update('EnrollmentRequest',$r['id'],$update);
                $this->db->create('EnrollmentEvent',['requestId'=>$r['id'],'status'=>$status]); return ['ok'=>true];
            }
        }
        throw new HttpError(404,'Recurso não encontrado');
    }
}
