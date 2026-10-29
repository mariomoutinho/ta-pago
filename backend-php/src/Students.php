<?php
declare(strict_types=1);
namespace TaPago;

trait Students {
    private function teacher(string $id): array { $u=$this->db->required('User','id=?',[$id]); return ['name'=>$u['name']]; }
    private function history(string $id,string $action,array $detail=[]): void {
        $this->db->create('HistoryEntry',['studentId'=>$id,'action'=>$action,'detail'=>$detail?:new \stdClass()]);
    }
    private function student(string $id,bool $mine): array {
        if ($mine) $this->pupil(); else $this->personal();
        return $this->db->required('Student','id=? AND '.($mine?'accountId=?':'personalId=? AND linkStatus<>\'ended\''),[$id,$this->user['id']],$this->writing);
    }
    private function programAccess(?string $id,?string $owner=null): void {
        if ($id) ensure($this->db->one('Program','id=? AND ownerId=?',[$id,$owner??$this->user['id']])!==null,'Programa não disponível');
    }
    private function studentData(array $body): array {
        $data=$this->validation->parse('studentSchema',$body);
        foreach (['birthDate','nextEvaluationDate','programId'] as $field) $data[$field]=($data[$field]??'')?:null;
        ensure(!$data['birthDate'] || $data['birthDate']<=gmdate('Y-m-d'),'Nascimento não pode estar no futuro');
        $this->programAccess($data['programId']); return $data;
    }
    private function studentDetail(array $s,bool $mine=false): array {
        $s['program']=$s['programId']?$this->db->one('Program','id=?',[$s['programId']]):null;
        $s['evaluations']=array_map(fn($e)=>$this->evaluation($e),$this->db->rows('Evaluation','studentId=?',[$s['id']],'date DESC, createdAt DESC'));
        $s['records']=$this->db->rows('TrackingRecord','studentId=?',[$s['id']],'date DESC, createdAt DESC');
        $s['history']=$this->db->rows('HistoryEntry','studentId=?',[$s['id']],'createdAt DESC');
        if ($mine) $s['personal']=$this->teacher($s['personalId']);
        return $s;
    }
    private function revoke(array $s,bool $mine): array {
        $this->db->update('Student',$s['id'],['linkStatus'=>'ended']);
        $registration=$this->db->one('EnrollmentRequest','studentId=?',[$s['id']],true);
        if ($registration) {
            $this->db->update('EnrollmentRequest',$registration['id'],['status'=>'inactive','healthPayload'=>null]);
            $this->db->create('EnrollmentEvent',['requestId'=>$registration['id'],'status'=>'inactive']);
        }
        $this->db->query('DELETE FROM Invitation WHERE studentId=?',[$s['id']]);
        $this->history($s['id'],$mine?'Vínculo encerrado pelo aluno':'Vínculo encerrado pelo personal');
        return ['ok'=>true];
    }
    private function studentRoute(string $method,bool $mine,?string $id,string $tail,array $body): mixed {
        if (!$id) {
            $this->personal();
            if ($method==='GET') return array_map(function($s) {
                $s['program']=$s['programId']?$this->db->one('Program','id=?',[$s['programId']]):null;
                $s['evaluations']=array_map(fn($e)=>array_intersect_key($e,array_flip(['id','date','status'])),array_slice($this->db->rows('Evaluation','studentId=?',[$s['id']],'date DESC, createdAt DESC'),0,1)); return $s;
            },$this->db->rows('Student',"personalId=? AND linkStatus<>'ended'",[$this->user['id']],'name ASC'));
            if ($method==='POST') {
                $s=$this->db->create('Student',[...$this->studentData($body),'personalId'=>$this->user['id']]);
                $this->history($s['id'],'Cadastro criado'); $this->status=201; return $s;
            }
            throw new HttpError(404,'Recurso não encontrado');
        }
        $s=$this->student($id,$mine);
        if ($tail==='' && $method==='GET') return $this->studentDetail($s,$mine);
        if ($tail==='' && $method==='PUT' && !$mine) {
            $updated=$this->db->update('Student',$id,$this->studentData($body));
            $this->history($id,'Cadastro atualizado',['before'=>$s]); return $updated;
        }
        if ($tail==='' && $method==='DELETE') {
            ensure($mine || !$s['accountId'],'Encerre o vínculo; a exclusão pertence ao aluno',409);
            $this->db->delete('Student',$id); return ['ok'=>true];
        }
        if ($tail==='/export' && $method==='GET') {
            $s=$this->studentDetail($s,$mine);
            $s['workoutPlans']=array_map(fn($p)=>$this->plan($p),$this->db->rows('WorkoutPlan','studentId=?'.($mine?" AND publishedAt IS NOT NULL AND status IN ('ativo','arquivado')":''),[$id]));
            return ['formatVersion'=>1,'exportedAt'=>now(),'student'=>$s];
        }
        if ($tail==='/revoke' && $method==='POST') return $this->revoke($s,$mine);
        if ($tail==='/invite' && $method==='POST' && !$mine) {
            ensure(!$s['accountId'],'Aluno já vinculado',409);
            $code=bin2hex(random_bytes(32));
            $this->db->query('DELETE FROM Invitation WHERE studentId=?',[$id]);
            $this->db->create('Invitation',['studentId'=>$id,'tokenHash'=>hash('sha256',$code),'expiresAt'=>at(time()+172800)]);
            return ['code'=>$code,'expiresInHours'=>48];
        }
        if ($tail==='/workout-plans' && !$mine) {
            if ($method==='GET') return array_map(fn($p)=>$this->plan($p),$this->db->rows('WorkoutPlan','studentId=?',[$id],'startsAt DESC'));
            if ($method==='POST') { $this->status=201; return $this->savePlan($id,$body); }
        }
        if (preg_match('~^/evaluations(?:/([^/]+))?$~D',$tail,$m)) {
            $evaluation=isset($m[1])?$this->db->required('Evaluation','id=? AND studentId=?',[$m[1],$id],$this->writing):null;
            if ($mine) {
                ensure($method==='PUT' && $evaluation!==null,'Operação não permitida',403);
                ensure($s['linkStatus']==='active','Vínculo encerrado',403);
                $body=[...$evaluation,'answers'=>$body['answers']??null];
            }
            if (($method==='POST' && !$evaluation)||($method==='PUT' && $evaluation)) {
                if (!$evaluation) $this->status=201;
                return $this->saveEvaluation($s,$body,$evaluation);
            }
            if ($method==='DELETE' && $evaluation && !$mine) {
                ensure($evaluation['status']!=='concluida','Avaliações concluídas são preservadas',409);
                $this->db->delete('Evaluation',$evaluation['id']); $this->history($id,'Rascunho excluído',['evaluationId'=>$evaluation['id']]); return ['ok'=>true];
            }
        }
        if (preg_match('~^/records(?:/([^/]+))?$~D',$tail,$m) && !$mine) {
            $before=isset($m[1])?$this->db->required('TrackingRecord','id=? AND studentId=?',[$m[1],$id],true):null;
            if ($method==='DELETE' && $before) {
                $this->db->delete('TrackingRecord',$before['id']); $this->history($id,'Registro excluído',['before'=>$before]); return ['ok'=>true];
            }
            if (($method==='POST' && !$before)||($method==='PUT' && $before)) {
                $input=$this->validation->parse('recordSchema',$body);
                $data=$this->validation->parse($input['kind'].'Schema',$input['data']);
                if ($input['kind']==='physical') ensure(($data['weight']??null)!==null || ($data['waist']??null)!==null || ($data['notes']??'')!=='','Registre medida ou observação');
                if ($input['kind']==='technical') ensure(count(array_unique(array_column($data['criteria'],'criterion')))===13,'Critérios duplicados');
                ensure(!$before || $before['kind']===$input['kind'],'Tipo de registro não pode mudar');
                $payload=['kind'=>$input['kind'],'date'=>$input['date'],'data'=>$data];
                $row=$before?$this->db->update('TrackingRecord',$before['id'],$payload):$this->db->create('TrackingRecord',[...$payload,'studentId'=>$id]);
                $this->history($id,$before?'Registro corrigido':'Registro adicionado',$before?['before'=>$before]:['recordId'=>$row['id'],'kind'=>$row['kind'],'date'=>$row['date']]);
                if (!$before) $this->status=201; return $row;
            }
        }
        throw new HttpError(404,'Recurso não encontrado');
    }
}
