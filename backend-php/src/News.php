<?php
declare(strict_types=1);
namespace TaPago;

final class News {
    public function __construct(private Db $db,private array $config){}
    public function events(string $owner): array {
        $since=at(time()-min(90,$this->config['retentionDays'])*86400);$items=[];
        foreach($this->db->rows('EnrollmentRequest','personalId=? AND createdAt>=?',[$owner,$since],'createdAt DESC LIMIT 100') as $row){
            $parts=explode('.',$row['payload']);[$iv,$tag,$data]=array_map('base64_decode',$parts);
            $plain=openssl_decrypt($data,'aes-256-gcm',hex2bin($this->config['enrollmentKey']),OPENSSL_RAW_DATA,$iv,$tag);
            if($plain===false)throw new \RuntimeException('News payload');$form=json_decode($plain,true,64,JSON_THROW_ON_ERROR);
            $items[]=['id'=>$row['id'],'kind'=>'enrollment','title'=>$form['name'].' enviou um cadastro.','createdAt'=>$row['createdAt'],'url'=>$row['status']==='active'&&$row['studentId']?'/alunos/'.$row['studentId']:'/alunos/cadastros'];
        }
        foreach(['WorkoutCompletion'=>'workout_completed','WorkoutFeedback'=>'feedback'] as $table=>$kind){
            $rows=$this->db->query("SELECT n.id,n.createdAt,w.name AS workoutName,s.name AS studentName,s.id AS studentId FROM `$table` n JOIN Workout w ON w.id=n.workoutId JOIN WorkoutPlan p ON p.id=w.planId JOIN Student s ON s.id=p.studentId WHERE s.personalId=? AND n.createdAt>=? ORDER BY n.createdAt DESC LIMIT 100",[$owner,$since])->fetchAll(\PDO::FETCH_ASSOC);
            foreach($rows as $row)$items[]=['id'=>($kind==='feedback'?'feedback:':'completion:').$row['id'],'kind'=>$kind,'title'=>$row['studentName'].($kind==='feedback'?' enviou um feedback sobre ':' concluiu ').$row['workoutName'].'.','createdAt'=>$row['createdAt'],'url'=>'/alunos/'.$row['studentId'].'/treinos'];
        }
        usort($items,fn($a,$b)=>strcmp($b['createdAt'],$a['createdAt'])?:strcmp($a['id'],$b['id']));return array_slice($items,0,100);
    }
    private function file(string $owner): string {
        $root=($this->config['pushDirectory']??dirname(__DIR__).'/storage/push').'/read';
        if(!is_dir($root)&&!mkdir($root,0700,true)&&!is_dir($root))throw new \RuntimeException('News storage');
        return $root.'/'.hash('sha256',$owner).'.json';
    }
    public function feed(string $owner): array {
        $file=$this->file($owner);$read=is_file($file)?json_decode(file_get_contents($file),true,64,JSON_THROW_ON_ERROR):[];
        return array_map(fn($item)=>[...$item,'read'=>in_array($item['id'],$read,true)],$this->events($owner));
    }
    public function markRead(string $owner,array $ids): void {
        ensure(count($ids)<=100&&!array_filter($ids,fn($id)=>!is_string($id)||strlen($id)>128),'Avisos inválidos');
        $allowed=array_column($this->events($owner),'id');ensure(!array_diff($ids,$allowed),'Aviso não encontrado',404);
        $file=$this->file($owner);$lock=fopen($file.'.lock','c');if(!$lock||!flock($lock,LOCK_EX))throw new \RuntimeException('News storage');
        try{
            $old=is_file($file)?json_decode(file_get_contents($file),true,64,JSON_THROW_ON_ERROR):[];
            $json=encode(array_slice(array_values(array_unique([...$old,...$ids])),-5000));$temp=$file.'.'.uid();
            if(file_put_contents($temp,$json,LOCK_EX)!==strlen($json)||!chmod($temp,0600)||!rename($temp,$file))throw new \RuntimeException('News storage');
        }finally{flock($lock,LOCK_UN);fclose($lock);}
    }
}
