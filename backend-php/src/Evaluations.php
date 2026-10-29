<?php
declare(strict_types=1);
namespace TaPago;

trait Evaluations {
    private function template(string $id): array {
        $t=$this->db->required('EvaluationTemplate','id=?',[$id]);
        $t['questions']=array_map(function($q) {
            $q['options']=$this->db->rows('EvaluationOption','questionId=?',[$q['id']],'position ASC'); return $q;
        },$this->db->rows('EvaluationQuestion','templateId=?',[$id],'position ASC')); return $t;
    }
    private function evaluation(array $e): array {
        $e['template']=$this->template($e['templateId']);
        $e['answers']=$this->db->rows('EvaluationAnswer','evaluationId=?',[$e['id']]); return $e;
    }
    private function newTemplate(array $body): array {
        $data=$this->validation->parse('templateSchema',$body);
        foreach ($data['questions'] as $q) {
            $options=array_column($q['options'],'label');
            ensure($q['type']==='choice' ? count($options)>=2 : !$options,'Opções inválidas');
            ensure(count(array_unique($options))===count($options),'Opções duplicadas');
            if ($q['type']==='scale') ensure(isset($q['min'],$q['max']),'Escalas precisam de limites');
            ensure(!isset($q['min'],$q['max']) || $q['min']<=$q['max'],'Limites invertidos');
        }
        // Serializa criação de versões do mesmo proprietário.
        $this->db->required('User','id=?',[$this->user['id']],true);
        $last=$this->db->rows('EvaluationTemplate','name=? AND ownerId IN (?,?)',[$data['name'],'system',$this->user['id']],'version DESC');
        $t=$this->db->create('EvaluationTemplate',['name'=>$data['name'],'cycleDays'=>$data['cycleDays'],'ownerId'=>$this->user['id'],'version'=>($last[0]['version']??0)+1]);
        foreach ($data['questions'] as $i=>$q) {
            $options=$q['options']; unset($q['options']);
            $question=$this->db->create('EvaluationQuestion',[...$q,'templateId'=>$t['id'],'position'=>$i+1]);
            foreach ($options as $j=>$o) $this->db->create('EvaluationOption',[...$o,'questionId'=>$question['id'],'position'=>$j]);
        }
        $this->status=201; return $this->template($t['id']);
    }
    private function saveEvaluation(array $student,array $body,?array $previous): array {
        $d=$this->validation->parse('evaluationSchema',$body);
        $t=$this->template($d['templateId']);
        ensure(in_array($t['ownerId'],['system',$student['personalId']],true),'Modelo não encontrado',404);
        ensure(!$previous || $previous['status']!=='concluida','Avaliações concluídas são preservadas',409);
        ensure(!$previous || $previous['templateId']===$d['templateId'],'Modelo do rascunho não pode mudar',409);
        $answers=$d['answers']; unset($d['answers']);
        ensure(count(array_unique(array_column($answers,'questionId')))===count($answers),'Respostas duplicadas');
        $questions=array_column($t['questions'],null,'id');
        foreach ($answers as $a) {
            $q=$questions[$a['questionId']]??null; ensure($q!==null,'Pergunta não pertence ao modelo');
            if (trim($a['value'])==='') continue;
            if ($q['type']==='choice') ensure(in_array($a['value'],array_column($q['options'],'label'),true),'Opção inválida');
            if (in_array($q['type'],['number','scale'],true)) {
                ensure(is_numeric($a['value']) && is_finite((float)$a['value']),'Número inválido');
                ensure(($q['min']===null || (float)$a['value']>=$q['min']) && ($q['max']===null || (float)$a['value']<=$q['max']),'Resposta fora dos limites');
            }
        }
        if ($d['status']==='concluida') foreach ($questions as $q) {
            $answered=array_filter($answers,fn($a)=>$a['questionId']===$q['id'] && trim($a['value'])!=='');
            ensure(!$q['required'] || (bool)$answered,'Responda as perguntas obrigatórias');
        }
        $d['programId']=($d['programId']??'')?:null; $this->programAccess($d['programId'],$student['personalId']);
        $d['programSnapshot']=$d['programId']?encode($this->db->required('Program','id=?',[$d['programId']])):'';
        $e=$previous?$this->db->update('Evaluation',$previous['id'],$d):$this->db->create('Evaluation',[...$d,'studentId'=>$student['id']]);
        $this->db->query('DELETE FROM EvaluationAnswer WHERE evaluationId=?',[$e['id']]);
        foreach ($answers as $answer) $this->db->create('EvaluationAnswer',[...$answer,'evaluationId'=>$e['id']]);
        if ($d['status']==='concluida' && !$this->db->one('Evaluation',"studentId=? AND status='concluida' AND date>?",[$student['id'],$d['date']])) {
            $date=(new \DateTimeImmutable($d['date'],new \DateTimeZone('UTC')))->modify('+'.$t['cycleDays'].' days')->format('Y-m-d');
            $this->db->update('Student',$student['id'],['nextEvaluationDate'=>$date]);
        }
        $this->history($student['id'],$d['status']==='concluida'?'Avaliação concluída':'Rascunho salvo',['evaluationId'=>$e['id'],'cycle'=>$e['cycle']]);
        return $this->evaluation($e);
    }
}
