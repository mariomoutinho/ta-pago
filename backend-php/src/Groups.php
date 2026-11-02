<?php
declare(strict_types=1);
namespace TaPago;
trait Groups {
    private function postingGroup(string $id,string $personal): array {
        $g=$this->db->required('FitnessGroup','id=? AND ownerId=?',[$id,$personal]);
        ensure($this->db->one('FitnessGroupMember','groupId=? AND accountId=?',[$id,$this->user['id']])!==null,'Entre no grupo antes de compartilhar',403);return $g;
    }
    private function groupMember(array $g): bool {
        return $this->user['role']==='student' && $this->db->one('FitnessGroupMember','groupId=? AND accountId=?',[$g['id'],$this->user['id']])!==null && $this->db->one('Student',"accountId=? AND personalId=? AND linkStatus='active'",[$this->user['id'],$g['ownerId']])!==null;
    }
    private function groupSummary(array $g): array {
        $out=array_intersect_key($g,array_flip(['id','name','description']));$out['members']=(int)$this->db->query('SELECT COUNT(*) FROM FitnessGroupMember m WHERE m.groupId=? AND EXISTS(SELECT 1 FROM Student s WHERE s.accountId=m.accountId AND s.personalId=? AND s.linkStatus=\'active\')',[$g['id'],$g['ownerId']])->fetchColumn();
        $out['ownerName']=$this->teacher($g['ownerId'])['name'];if($g['ownerId']===$this->user['id'])$out['inviteUrl']=$this->config['origin'].$this->config['basePath'].'/grupo/'.$g['inviteCode'];return $out;
    }
    private function groupRoute(string $method,string $path,array $body): mixed {
        if($path==='/fitness-groups'){
            if($method==='POST'){$this->personal();$d=$this->validation->parse('fitnessGroupSchema',$body);$this->status=201;return $this->groupSummary($this->db->create('FitnessGroup',[...$d,'ownerId'=>$this->user['id'],'inviteCode'=>bin2hex(random_bytes(24))]));}
            if($method==='GET'){$rows=$this->user['role']==='personal'?$this->db->rows('FitnessGroup','ownerId=?',[$this->user['id']]):array_values(array_filter($this->db->rows('FitnessGroup'),fn($g)=>$this->groupMember($g)));return array_map(fn($g)=>$this->groupSummary($g),$rows);}
        }
        if(preg_match('~^/fitness-groups/invite/([a-f0-9]{48})$~D',$path,$m)){
            $g=$this->db->required('FitnessGroup','inviteCode=?',[$m[1]]);
            if($method==='GET')return [...$this->groupSummary($g),'joined'=>$this->groupMember($g)];
            if($method==='POST'){$this->pupil();ensure($this->db->one('Student',"accountId=? AND personalId=? AND linkStatus='active'",[$this->user['id'],$g['ownerId']])!==null,'O convite é para alunos vinculados a este personal',403);$existing=$this->db->one('FitnessGroupMember','groupId=? AND accountId=?',[$g['id'],$this->user['id']]);if(!$existing)$this->db->create('FitnessGroupMember',['groupId'=>$g['id'],'accountId'=>$this->user['id']]);return ['id'=>$g['id'],'joined'=>true];}
        }
        if(!preg_match('~^/fitness-groups/([^/]+)(/challenges|/leave)?$~D',$path,$m))throw new HttpError(404,'Grupo não encontrado');
        $g=$this->db->required('FitnessGroup','id=?',[$m[1]]);$action=$m[2]??'';
        if($action==='/leave'&&$method==='POST'){$this->pupil();$member=$this->db->required('FitnessGroupMember','groupId=? AND accountId=?',[$g['id'],$this->user['id']]);$this->db->query('UPDATE WorkoutFeedback SET groupId=NULL WHERE groupId=? AND workoutId IN (SELECT w.id FROM Workout w JOIN WorkoutPlan p ON p.id=w.planId JOIN Student s ON s.id=p.studentId WHERE s.accountId=?)',[$g['id'],$this->user['id']]);$this->db->delete('FitnessGroupMember',$member['id']);return ['ok'=>true];}
        ensure($g['ownerId']===$this->user['id']||$this->groupMember($g),'Grupo não encontrado',404);
        if($action==='/challenges'&&$method==='POST'){$this->personal();ensure($g['ownerId']===$this->user['id'],'Grupo não encontrado',404);$d=$this->validation->parse('fitnessChallengeSchema',$body);ensure($d['endsAt']>=$d['startsAt'],'Término anterior ao início');$this->status=201;return $this->db->create('FitnessChallenge',[...$d,'groupId'=>$g['id']]);}
        ensure($method==='GET'&&$action==='','Recurso não encontrado',404);$out=$this->groupSummary($g);$out['challenges']=[];
        $members=$this->db->query("SELECT m.accountId,m.joinedAt,u.name FROM FitnessGroupMember m JOIN User u ON u.id=m.accountId WHERE m.groupId=? AND EXISTS(SELECT 1 FROM Student s WHERE s.accountId=m.accountId AND s.personalId=? AND s.linkStatus='active')",[$g['id'],$g['ownerId']])->fetchAll(\PDO::FETCH_ASSOC);
        foreach($this->db->rows('FitnessChallenge','groupId=?',[$g['id']],'createdAt DESC') as $challenge){$ranking=[];foreach($members as $member){$count=(int)$this->db->query('SELECT COUNT(*) FROM WorkoutCompletion c JOIN Workout w ON w.id=c.workoutId JOIN WorkoutPlan p ON p.id=w.planId JOIN Student s ON s.id=p.studentId WHERE s.accountId=? AND s.personalId=? AND c.createdAt>=? AND c.completedOn>=? AND c.completedOn<=?',[$member['accountId'],$g['ownerId'],$member['joinedAt'],$challenge['startsAt'],$challenge['endsAt']])->fetchColumn();$ranking[]=['name'=>$member['name'],'count'=>$count];}usort($ranking,fn($a,$b)=>$b['count']<=>$a['count']?:strcmp($a['name'],$b['name']));$out['challenges'][]=[...$challenge,'ranking'=>$ranking];}
        $out['posts']=$this->db->query("SELECT f.id,f.comment,f.photo,f.createdAt,u.name FROM WorkoutFeedback f JOIN Workout w ON w.id=f.workoutId JOIN WorkoutPlan p ON p.id=w.planId JOIN Student s ON s.id=p.studentId JOIN User u ON u.id=s.accountId JOIN FitnessGroupMember m ON m.accountId=u.id AND m.groupId=f.groupId WHERE f.groupId=? AND s.personalId=? AND s.linkStatus='active' ORDER BY f.createdAt DESC LIMIT 30",[$g['id'],$g['ownerId']])->fetchAll(\PDO::FETCH_ASSOC);return $out;
    }
}
