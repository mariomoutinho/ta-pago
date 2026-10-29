<?php
declare(strict_types=1);
namespace TaPago;

trait Workouts {
    private function groups(array $items): void {
        $seen=[]; $last=null; $count=0;
        foreach ([...$items,['groupId'=>null]] as $item) {
            $group=$item['groupId']??null;
            if ($group!==$last) {
                if ($last) ensure($count>=2,'Grupos precisam de dois exercícios contíguos');
                if ($group) { ensure(!isset($seen[$group]),'Grupo não contíguo'); $seen[$group]=true; }
                $last=$group; $count=0;
            }
            $count++;
        }
    }
    private function series(array $rows): void {
        foreach ($rows as $row) {
            if (isset($row['restSeconds'])) ensure(floor($row['restSeconds']) == $row['restSeconds'],'Intervalo deve ser inteiro');
            if (!isset($row['type']) || in_array($row['type'],['repetitions-load','repetitions-load-time','repetitions-time'],true)) ensure(trim($row['repetitions']??'')!=='','Informe repetições');
        }
    }
    private function prescriptions(array $items,?array $previous=null): void {
        $this->groups($items);
        $ids=[];
        foreach ($items as $item) {
            $key=$item['id']??$item['clientId']??null;
            if ($key) { ensure(!isset($ids[$key]),'Itens duplicados'); $ids[$key]=true; }
            $this->series($item['series']??[]);
            foreach (['sets','durationSeconds','restSeconds'] as $field) if (isset($item[$field])) ensure(floor($item[$field]) == $item[$field], 'Informe um inteiro');
            foreach (['rir','rpe'] as $field) if (isset($item[$field])) ensure($item[$field]<=10, 'Esforço deve ser no máximo 10');
            $exercise=$this->db->one('Exercise','id=? AND ownerId=?',[$item['exerciseId'],$this->user['id']]);
            $existing=$previous?array_values(array_filter($previous,fn($p)=>isset($item['id']) && $p['id']===$item['id'] && $p['exerciseId']===$item['exerciseId'])):[];
            ensure($exercise!==null && ($exercise['status']==='ativo' || (bool)$existing),'Exercício indisponível');
            if ($item['alternativeExerciseId']??null) ensure($item['alternativeExerciseId']!==$item['exerciseId'] && $this->db->one('Exercise',"id=? AND ownerId=? AND status='ativo'",[$item['alternativeExerciseId'],$this->user['id']])!==null,'Alternativa indisponível');
        }
    }
    private function hydrateItems(array $items,?string $owner=null): array {
        return array_map(function($item) use($owner) {
            $where='id=?'.($owner?' AND ownerId=?':'');
            $params=fn($id)=>$owner?[$id,$owner]:[$id];
            $item['exercise']=$this->db->one('Exercise',$where,$params($item['exerciseId']));
            $item['alternativeExercise']=($item['alternativeExerciseId']??null)?$this->db->one('Exercise',$where,$params($item['alternativeExerciseId'])):null;
            return $item;
        },$items);
    }
    private function plan(array $p): array {
        $p['workouts']=array_map(function($w) {
            $w['exercises']=$this->hydrateItems($this->db->rows('WorkoutExercise','workoutId=? AND deletedAt IS NULL',[$w['id']],'orderIndex ASC'));
            $w['feedbacks']=array_map(fn($f)=>array_intersect_key($f,array_flip(['id','comment','createdAt'])),$this->db->rows('WorkoutFeedback','workoutId=?',[$w['id']],'createdAt DESC'));
            return $w;
        },$this->db->rows('Workout','planId=? AND deletedAt IS NULL',[$p['id']],'orderIndex ASC')); return $p;
    }
    private function myPlans(): array {
        $this->pupil(); $out=[];
        foreach ($this->db->rows('Student','accountId=?',[$this->user['id']]) as $s) {
            foreach ($this->db->rows('WorkoutPlan',"studentId=? AND publishedAt IS NOT NULL AND status IN ('ativo','arquivado')",[$s['id']]) as $p) {
                $p=$this->plan($p); $p['student']=['name'=>$s['name'],'linkStatus'=>$s['linkStatus'],'personal'=>$this->teacher($s['personalId'])]; $out[]=$p;
            }
        }
        usort($out,fn($a,$b)=>strcmp($b['startsAt'],$a['startsAt'])); return $out;
    }
    private function feedback(string $id,array $body): array {
        $this->pupil(); $data=$this->validation->parse('workoutFeedbackSchema',$body);
        $w=$this->db->required('Workout','id=? AND deletedAt IS NULL',[$id],true);
        $p=$this->db->required('WorkoutPlan',"id=? AND publishedAt IS NOT NULL AND status='ativo'",[$w['planId']],true);
        $s=$this->student($p['studentId'],true); ensure($s['linkStatus']==='active','Vínculo encerrado',403);
        $f=$this->db->one('WorkoutFeedback','workoutId=? AND requestId=?',[$id,$data['requestId']])??$this->db->create('WorkoutFeedback',[...$data,'workoutId'=>$id]);
        $this->status=201; return array_intersect_key($f,array_flip(['id','comment','createdAt']));
    }
    private function savePlan(string $studentId,array $body,?array $existing=null): array {
        $d=$this->validation->parse('planSchema',$body);
        ensure(!$existing || ($d['revision']??null)===$existing['revision'],'Plano atualizado em outra sessão. Abra novamente.',409);
        ensure(!($existing['publishedAt']??null) || $d['status']!=='rascunho','Arquive um plano publicado para preservar o histórico');
        $d['endsAt']=($d['endsAt']??'')?:null;
        ensure(!$d['endsAt'] || $d['endsAt']>=$d['startsAt'],'Término anterior ao início');
        $workouts=$d['workouts']; unset($d['workouts'],$d['revision']);
        if ($d['status']==='ativo') ensure((bool)$workouts && !array_filter($workouts,fn($w)=>!$w['exercises']),'Adicione treinos com exercícios antes de ativar');
        $old=$existing?$this->plan($existing):['workouts'=>[]];
        $oldWorkouts=array_column($old['workouts'],null,'id'); $seen=[];
        foreach ($workouts as $w) {
            if (isset($w['id'])) { ensure(isset($oldWorkouts[$w['id']]) && !isset($seen[$w['id']]),'Treino inválido'); $seen[$w['id']]=true; }
            $previous=$oldWorkouts[$w['id']??'']['exercises']??[];
            $oldItems=array_column($previous,null,'id');
            foreach ($w['exercises'] as $e) if (isset($e['id'])) { ensure(isset($oldItems[$e['id']]) && !isset($seen[$e['id']]),'Prescrição inválida'); $seen[$e['id']]=true; }
            $this->prescriptions($w['exercises'],$previous);
        }
        $d['publishedAt']=$existing['publishedAt']??($d['status']==='ativo'?now():null);
        $p=$existing?$this->db->update('WorkoutPlan',$existing['id'],[...$d,'revision'=>$existing['revision']+1]):$this->db->create('WorkoutPlan',[...$d,'studentId'=>$studentId]);
        $keep=array_column($workouts,'id');
        foreach ($old['workouts'] as $w) if (!in_array($w['id'],$keep,true)) $this->db->update('Workout',$w['id'],['deletedAt'=>now()]);
        foreach ($workouts as $index=>$w) {
            $items=$w['exercises']; unset($w['exercises']); $w['orderIndex']=$index;
            $saved=isset($w['id'])?$this->db->update('Workout',$w['id'],$w):$this->db->create('Workout',[...$w,'planId'=>$p['id']]);
            $keep=array_column($items,'id');
            foreach ($oldWorkouts[$saved['id']]['exercises']??[] as $e) if (!in_array($e['id'],$keep,true)) $this->db->update('WorkoutExercise',$e['id'],['deletedAt'=>now()]);
            foreach ($items as $position=>$e) {
                unset($e['clientId']); $e['orderIndex']=$position; $e['groupId']=$e['groupId']??null;
                if (isset($e['id'])) $this->db->update('WorkoutExercise',$e['id'],$e);
                else $this->db->create('WorkoutExercise',[...$e,'workoutId'=>$saved['id']]);
            }
        }
        return $this->plan($p);
    }
    private function ordered(array $items,array $body,string $key,int $revision): array {
        ensure(($body['revision']??null)===$revision,'Conteúdo atualizado em outra sessão',409);
        $ids=$body['ids']??null; ensure(is_array($ids) && array_is_list($ids) && count($ids)<=100,'Ordem inválida');
        ensure(!array_filter($ids,fn($id)=>!is_string($id) || $id===''),'Identificador inválido');
        ensure(count($ids)===count($items) && count(array_unique($ids))===count($ids) && !array_diff(array_column($items,$key),$ids),'A lista mudou. Abra novamente.',409);
        $map=array_column($items,null,$key); $out=array_map(fn($id)=>$map[$id],$ids); $this->groups($out); return $out;
    }
    private function orderPlan(array $p,string $id,array $body): array {
        $w=$this->db->required('Workout','id=? AND planId=? AND deletedAt IS NULL',[$id,$p['id']]);
        $items=$this->ordered($this->db->rows('WorkoutExercise','workoutId=? AND deletedAt IS NULL',[$id],'orderIndex ASC'),$body,'id',$p['revision']);
        $this->db->update('WorkoutPlan',$p['id'],['revision'=>$p['revision']+1]);
        foreach ($items as $i=>$e) $this->db->update('WorkoutExercise',$e['id'],['orderIndex'=>$i]);
        return ['revision'=>$p['revision']+1];
    }
    private function libraryRoute(string $method,string $resource,?string $id,bool $order,array $body): mixed {
        [$table,$schema]=match($resource) {
            'exercises'=>['Exercise','exerciseSchema'], 'programs'=>['Program','programRoutineSchema'],
            'workout-templates'=>['WorkoutTemplate','workoutTemplateSchema'], 'prescription-presets'=>['PrescriptionPreset','prescriptionPresetSchema'],
        };
        $existing=$id?$this->own($table,$id):null;
        if ($method==='GET' && !$id) {
            $rows=$this->db->rows($table,'ownerId=?',[$this->user['id']],$table==='Exercise'?'name ASC':'createdAt DESC');
            if ($table==='Exercise') $rows=array_values(array_filter($rows,fn($e)=>(!isset($_GET['q']) || mb_stripos($e['name'],substr((string)$_GET['q'],0,160))!==false) && (!isset($_GET['category']) || $e['category']===$_GET['category']) && (!isset($_GET['muscleGroup']) || $e['muscleGroup']===$_GET['muscleGroup'])));
            foreach ($rows as &$r) {
                if ($table==='WorkoutTemplate') $r['exercises']=$this->hydrateItems($r['exercises'],$this->user['id']);
                if ($table==='Program') foreach ($r['workouts'] as &$w) $w['exercises']=$this->hydrateItems($w['exercises'],$this->user['id']);
                unset($w);
            } unset($r); return $rows;
        }
        if ($method==='DELETE' && $id && in_array($table,['Program','WorkoutTemplate'],true)) {
            if ($table==='Program') ensure(!$this->db->one('Student','programId=?',[$id]),'Remova a rotina dos alunos antes de excluí-la',409);
            $this->db->delete($table,$id); return ['ok'=>true];
        }
        if ($method==='PUT' && $order && $table==='WorkoutTemplate') {
            $items=$this->ordered($existing['exercises'],$body,'clientId',$existing['revision']);
            $this->db->update($table,$id,['exercises'=>$items,'revision'=>$existing['revision']+1]); return ['revision'=>$existing['revision']+1];
        }
        if (($method==='POST' && !$id)||($method==='PUT' && $id && !$order && $table!=='PrescriptionPreset')) {
            $d=$this->validation->parse($schema,$body);
            if ($table==='PrescriptionPreset') {
                $this->series($d['series']);
                foreach ($this->db->rows($table,'ownerId=?',[$this->user['id']]) as $p) if ($p['name']===$d['name'] && $p['series']===$d['series'] && $p['configuration']===($d['configuration']??null)) return $p;
            }
            if ($table==='Program') {
                if ($existing && (isset($d['revision'])||isset($d['workouts']))) ensure(($d['revision']??null)===$existing['revision'],'Rotina atualizada em outra sessão',409);
                foreach ($d['workouts']??[] as $w) $this->prescriptions($w['exercises']);
            }
            if ($table==='WorkoutTemplate') {
                if ($existing) ensure(($d['revision']??null)===$existing['revision'],'Treino atualizado em outra sessão',409);
                foreach ($d['exercises'] as &$item) $item['clientId']=$item['clientId']??uid(); unset($item);
                $this->prescriptions($d['exercises']);
            }
            unset($d['revision']);
            if ($existing && in_array($table,['Program','WorkoutTemplate'],true)) $d['revision']=$existing['revision']+1;
            if (!$existing) $this->status=201;
            return $existing?$this->db->update($table,$id,$d):$this->db->create($table,[...$d,'ownerId'=>$this->user['id']]);
        }
        throw new HttpError(404,'Recurso não encontrado');
    }
}
