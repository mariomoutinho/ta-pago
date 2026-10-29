<?php
declare(strict_types=1);
namespace TaPago;

trait Auth {
    private function rate(string $bucket, int $limit = 20): void {
        // Não confiar em X-Forwarded-For enviado pelo cliente.
        $key=hash('sha256',$bucket.'|'.($_SERVER['REMOTE_ADDR']??'cli'));
        $time=time();
        $this->db->query('DELETE FROM RateLimit WHERE expires<?',[$time]);
        $this->db->query('INSERT INTO RateLimit (id,hits,expires) VALUES (?,1,?) ON DUPLICATE KEY UPDATE hits=hits+1',[$key,$time+900]);
        $hits=$this->db->query('SELECT hits FROM RateLimit WHERE id=?',[$key])->fetchColumn();
        ensure((int)$hits<=$limit,'Muitas tentativas. Aguarde 15 minutos.',429);
    }
    private function sessionUser(): ?array {
        $token=$_COOKIE['tapago_session_php']??'';
        $authorization=$_SERVER['HTTP_AUTHORIZATION']??'';
        if (str_starts_with($authorization,'Bearer ')) $token=substr($authorization,7);
        if (!preg_match('/^[a-f0-9]{64}$/D',$token)) return null;
        $session=$this->db->one('Session','id=? AND expiresAt>?',[hash('sha256',$token),now()]);
        if (!$session) return null;
        $this->sessionId=$session['id'];
        $u=$this->db->one('User','id=?',[$session['userId']]);
        return $u ? array_intersect_key($u,array_flip(['id','name','email','role'])) : null;
    }
    private function cookie(string $token, int $expires): void {
        setcookie('tapago_session_php',$token,['expires'=>$expires,'path'=>($this->config['basePath']?:'').'/',
            'secure'=>$this->config['environment']==='production','httponly'=>true,'samesite'=>'Strict']);
    }
    private function authenticate(array $input, bool $register): array {
        ensure(is_string($input['email']??null) && (!$register || is_string($input['name']??null)),'Cadastro inválido');
        $email=strtolower(trim($input['email']??'')); $password=$input['password']??null;
        ensure(filter_var($email,FILTER_VALIDATE_EMAIL)!==false && strlen($email)<=254,'E-mail inválido');
        ensure(is_string($password) && mb_strlen($password)>=12 && mb_strlen($password)<=128,'Use entre 12 e 128 caracteres na senha');
        if ($register) {
            ensure($this->config['registrationEnabled']??false,'Criação de contas indisponível',403);
            $name=trim($input['name']??''); $role=$input['role']??'';
            ensure(mb_strlen($name)>=2 && mb_strlen($name)<=120 && in_array($role,['personal','student'],true),'Cadastro inválido');
            $user=$this->db->create('User',['name'=>$name,'email'=>$email,'role'=>$role,'passwordHash'=>passwordHash($password)]);
            $this->status=201;
        } else {
            $user=$this->db->one('User','email=?',[$email]);
            // Trabalho de hash também quando o usuário não existe.
            $valid=$user ? passwordValid($password,$user['passwordHash']) : password_verify($password,'$2y$12$3euPcmQFCiblsZeEu5s7pOdiXxFh0ECucOG0k71VlHHFGu9pDN6fi');
            ensure($user!==null && $valid,'E-mail ou senha inválidos',401);
            if (!str_starts_with($user['passwordHash'],'bcrypt-sha384:')) $this->db->update('User',$user['id'],['passwordHash'=>passwordHash($password)]);
        }
        $token=bin2hex(random_bytes(32));
        $this->db->query('DELETE FROM Session WHERE expiresAt<?',[now()]);
        $this->db->create('Session',['id'=>hash('sha256',$token),'userId'=>$user['id'],'expiresAt'=>at(time()+43200)]);
        $this->cookie($token,time()+43200);
        $out=['user'=>array_intersect_key($user,array_flip(['id','name','email','role']))];
        if (($_SERVER['HTTP_X_CLIENT_PLATFORM']??'')==='native') $out['token']=$token;
        return $out;
    }
    private function personal(): void { ensure(($this->user['role']??'')==='personal','Acesso exclusivo do personal',403); }
    private function pupil(): void { ensure(($this->user['role']??'')==='student','Entre com uma conta de aluno',403); }
    private function own(string $table, string $id, string $key='ownerId'): array {
        $this->personal();
        return $this->db->required($table,"id=? AND `$key`=?",[$id,$this->user['id']],$this->writing);
    }
    private function claim(array $body): array {
        $this->pupil(); $code=$body['code']??'';
        ensure(is_string($code)&&strlen($code)>=20&&strlen($code)<=128,'Convite inválido');
        $invite=$this->db->one('Invitation','tokenHash=?',[hash('sha256',$code)],true);
        ensure($invite!==null && !$invite['consumedAt'] && $invite['expiresAt']>now(),'Convite inválido ou expirado');
        $s=$this->db->required('Student','id=?',[$invite['studentId']],true);
        ensure($s['linkStatus']!=='ended','Convite inválido ou expirado');
        $registration=$this->db->one('EnrollmentRequest','studentId=?',[$s['id']]);
        if ($registration) ensure($registration['status']==='active' && strtolower($s['email'])===$this->user['email'],'Use a conta do titular indicado no cadastro',403);
        ensure(!$s['accountId'] || $s['accountId']===$this->user['id'],'Este cadastro já possui um vínculo',409);
        $this->db->update('Invitation',$invite['id'],['consumedAt'=>now()]);
        $this->db->update('Student',$s['id'],['accountId'=>$this->user['id'],'linkStatus'=>'active']);
        $this->history($s['id'],'Vínculo aceito pelo aluno');
        return ['id'=>$s['id']];
    }
}
