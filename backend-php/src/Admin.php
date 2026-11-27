<?php
declare(strict_types=1);
namespace TaPago;
trait Admin {
    private function requireAdmin(): void {
        ensure(($this->user['role']??'')==='personal'&&in_array($this->user['id'],$this->config['authorizedAdminIds']??[],true),'Acesso exclusivo do administrador',403);
    }
    private function adminAction(string $method,string $path,array $body): array {
        $this->requireAdmin();
        if($method==='POST'&&$path==='/admin/teachers') {
            $data=$this->validation->parse('adminTeacherSchema',$body);
            $data['password']=$body['password'];
            ensure(is_string($data['password']??null)&&mb_strlen($data['password'])>=6,'Use pelo menos 6 caracteres na senha.');
            $email=strtolower($data['email']);
            ensure(!$this->db->one('User','email=?',[$email]),'E-mail já cadastrado',409);
            $user=$this->db->create('User',['name'=>trim($data['name']),'email'=>$email,'role'=>'personal','professionalAuthorized'=>true,'passwordHash'=>passwordHash($data['password'])]);
            $this->status=201;return $this->adminUser($user);
        }
        if(preg_match('~^/admin/profiles/(account|student):([^/]+)(/password)?$~D',$path,$m)) {
            $account=$m[1]==='account';$id=rawurldecode($m[2]);
            if($method==='PUT'&&($m[3]??'')==='/password') {
                ensure($account,'Este cadastro ainda não possui conta com login.',409);
                $data=$this->validation->parse('adminPasswordSchema',$body);
                $data['password']=$body['password'];
                ensure(is_string($data['password']??null)&&mb_strlen($data['password'])>=6,'Use pelo menos 6 caracteres na senha.');
                $user=$this->db->required('User','id=?',[$id],true);
                $this->db->update('User',$id,['passwordHash'=>passwordHash($data['password'])]);
                $this->db->query('DELETE FROM Session WHERE userId=?',[$id]);return ['ok'=>true];
            }
            if($method==='DELETE'&&empty($m[3])) {
                $this->validation->parse('adminDeleteSchema',$body);
                if($account) {
                    $user=$this->db->required('User','id=?',[$id],true);
                    ensure($user['role']==='student','Somente alunos podem ser excluídos por esta ação.',403);
                    $this->db->query('DELETE FROM Student WHERE accountId=?',[$id]);
                    $this->db->delete('User',$id);
                } else {
                    $student=$this->db->required('Student','id=?',[$id],true);
                    ensure(!$student['accountId'],'O aluno já possui login. Atualize a lista e exclua pela conta.',409);
                    $this->db->delete('Student',$id);
                }
                return ['ok'=>true];
            }
        }
        throw new HttpError(404,'Recurso não encontrado');
    }
    private function adminProfiles(): array {
        ensure(($this->user['role']??'')==='personal'&&in_array($this->user['id'],$this->config['authorizedAdminIds']??[],true),'Acesso exclusivo do administrador',403);
        $q=$_GET['q']??'';$role=$_GET['role']??'all';
        ensure(is_string($q)&&mb_strlen(trim($q))<=160&&is_string($role)&&in_array($role,['all','personal','student'],true),'Filtro inválido');
        $page=filter_var($_GET['page']??1,FILTER_VALIDATE_INT,['options'=>['min_range'=>1,'max_range'=>100000]]);
        ensure($page!==false,'Página inválida');
        $users=$this->db->query("SELECT id,name,email,role FROM User WHERE role IN ('personal','student')")->fetchAll(\PDO::FETCH_ASSOC);
        $students=$this->db->query('SELECT s.id,s.name,s.email,s.accountId,p.name AS personalName FROM Student s JOIN User p ON p.id=s.personalId')->fetchAll(\PDO::FETCH_ASSOC);
        $profiles=[];
        foreach($users as $user){
            $teachers=[];foreach($students as $student)if($student['accountId']===$user['id'])$teachers[]=$student['personalName'];
            $profiles[]=['id'=>'account:'.$user['id'],'name'=>$user['name'],'email'=>$user['email'],'role'=>$user['role'],'hasLogin'=>true,'isAdmin'=>$user['role']==='personal'&&in_array($user['id'],$this->config['authorizedAdminIds']??[],true),'teachers'=>array_values(array_unique($teachers))];
        }
        foreach($students as $student)if(!$student['accountId'])$profiles[]=['id'=>'student:'.$student['id'],'name'=>$student['name'],'email'=>$student['email'],'role'=>'student','hasLogin'=>false,'isAdmin'=>false,'teachers'=>[$student['personalName']]];
        $counts=['personal'=>0,'student'=>0,'withoutLogin'=>0];foreach($profiles as $profile){$counts[$profile['role']]++;if(!$profile['hasLogin'])$counts['withoutLogin']++;}
        $normalize=fn($text)=>strtr(mb_strtolower($text),['á'=>'a','à'=>'a','ã'=>'a','â'=>'a','é'=>'e','ê'=>'e','í'=>'i','ó'=>'o','ô'=>'o','õ'=>'o','ú'=>'u','ü'=>'u','ç'=>'c']);
        $filtered=array_values(array_filter($profiles,fn($profile)=>($role==='all'||$profile['role']===$role)&&str_contains($normalize($profile['name'].' '.$profile['email']),$normalize(trim($q)))));
        usort($filtered,fn($a,$b)=>strcmp($normalize($a['name']),$normalize($b['name']))?:strcmp($a['id'],$b['id']));
        return ['items'=>array_slice($filtered,($page-1)*25,25),'total'=>count($filtered),'page'=>$page,'pageSize'=>25,'counts'=>$counts];
    }
}
