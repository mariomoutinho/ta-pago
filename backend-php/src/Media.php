<?php
declare(strict_types=1);
namespace TaPago;

final class VideoStream {
    public function __construct(public string $file) {}
    public function send(): void {
        $size=filesize($this->file); $start=0; $end=$size-1; $partial=false;
        if (isset($_SERVER['HTTP_RANGE'])) {
            $range=$_SERVER['HTTP_RANGE'];
            if (!preg_match('/^bytes=(\d*)-(\d*)$/D',$range,$m) || ($m[1]==='' && $m[2]==='')) { $this->invalidRange($size); return; }
            if ($m[1]==='') $start=max(0,$size-(int)$m[2]);
            else { $start=(int)$m[1]; if ($m[2]!=='') $end=min($end,(int)$m[2]); }
            if ($start>$end || $start>=$size) { $this->invalidRange($size); return; }
            $partial=true;
        }
        header('Content-Type: video/mp4'); header('Accept-Ranges: bytes');
        header('Content-Length: '.($end-$start+1));
        header('Cache-Control: private, no-store');
        if ($partial) { http_response_code(206); header("Content-Range: bytes $start-$end/$size"); }
        if ($_SERVER['REQUEST_METHOD']==='HEAD') return;
        $stream=fopen($this->file,'rb'); fseek($stream,$start); $left=$end-$start+1;
        while ($left>0 && !feof($stream) && !connection_aborted()) { $chunk=fread($stream,min(65536,$left)); if ($chunk===false || $chunk==='') break; echo $chunk; $left-=strlen($chunk); }
        fclose($stream);
    }
    private function invalidRange(int $size): void { http_response_code(416); header("Content-Range: bytes */$size"); }
}

trait Media {
    private function mediaRoot(): string {
        $root=$this->config['mediaDirectory']??dirname(__DIR__).'/storage/exercise-videos';
        if (!is_dir($root) && !mkdir($root,0700,true) && !is_dir($root)) throw new \RuntimeException('Armazenamento indisponível');
        return $root;
    }
    private function uploadVideo(): array {
        $this->personal(); $this->rate('video-upload',30);
        ensure(strtolower(trim(explode(';',$_SERVER['CONTENT_TYPE']??'')[0]))==='video/mp4','Selecione um vídeo MP4',415);
        $limit=25*1024*1024;
        ensure((int)($_SERVER['CONTENT_LENGTH']??0)<=$limit,'O vídeo deve ter até 25 MB',413);
        $root=$this->mediaRoot(); $owner=hash('sha256',$this->user['id']);
        $directory=$root.'/'.$owner;
        if (!is_dir($directory) && !mkdir($directory,0700) && !is_dir($directory)) throw new \RuntimeException('Armazenamento indisponível');
        $lock=fopen($directory.'/.lock','c'); if (!$lock || !flock($lock,LOCK_EX)) throw new \RuntimeException('Armazenamento ocupado');
        $id=uid(); $temporary=$directory.'/'.$id.'.part';
        try {
            $used=0; foreach (glob($directory.'/*.mp4')?:[] as $file) $used+=filesize($file);
            ensure($used+$limit<=1024*1024*1024,'O armazenamento de vídeos está cheio. Entre em contato com o responsável.',413);
            $input=fopen('php://input','rb'); $output=fopen($temporary,'xb');
            if (!$input || !$output) throw new \RuntimeException('Envio indisponível');
            chmod($temporary,0600); $size=stream_copy_to_stream($input,$output,$limit+1); fclose($input); fclose($output);
            ensure($size!==false && $size>16 && $size<=$limit,'O vídeo deve ter até 25 MB',413);
            $head=file_get_contents($temporary,false,null,0,32);
            ensure(substr($head,4,4)==='ftyp' && in_array(substr($head,8,4),['isom','iso2','mp41','mp42','avc1','M4V '],true),'Arquivo inválido. Use um vídeo MP4 (H.264).',415);
            if (!rename($temporary,$directory.'/'.$id.'.mp4')) throw new \RuntimeException('Não foi possível salvar o vídeo');
            $this->status=201;
            return ['url'=>$this->config['origin'].$this->config['basePath'].'/api/exercise-videos/'.$owner.'/'.$id.'.mp4'];
        } finally { if (is_file($temporary)) unlink($temporary); flock($lock,LOCK_UN); fclose($lock); }
    }
    private function video(string $owner,string $id): VideoStream {
        $path='/api/exercise-videos/'.$owner.'/'.$id.'.mp4';
        $url=$this->config['origin'].$this->config['basePath'].$path;
        $allowed=$this->user['role']==='personal' && hash_equals($owner,hash('sha256',$this->user['id']));
        if (!$allowed && $this->user['role']==='student') {
            $allowed=(bool)$this->db->query("SELECT 1 FROM Exercise e JOIN WorkoutExercise we ON (we.exerciseId=e.id OR we.alternativeExerciseId=e.id) JOIN Workout w ON w.id=we.workoutId JOIN WorkoutPlan p ON p.id=w.planId JOIN Student s ON s.id=p.studentId WHERE e.videoUrl=? AND s.accountId=? AND p.publishedAt IS NOT NULL AND p.status IN ('ativo','arquivado') AND w.deletedAt IS NULL AND we.deletedAt IS NULL LIMIT 1",[$url,$this->user['id']])->fetchColumn();
        }
        ensure($allowed,'Vídeo não encontrado',404);
        $file=$this->mediaRoot().'/'.$owner.'/'.$id.'.mp4'; ensure(is_file($file),'Vídeo não encontrado',404);
        return new VideoStream($file);
    }
    private function validateVideoOwner(string $url): void {
        $path=parse_url($url,PHP_URL_PATH)?:'';
        if (!str_contains($path,'/api/exercise-videos/')) return;
        $prefix=$this->config['origin'].$this->config['basePath'].'/api/exercise-videos/'.hash('sha256',$this->user['id']).'/';
        ensure(str_starts_with($url,$prefix) && preg_match('/^[a-f0-9]{32}\.mp4$/D',substr($url,strlen($prefix)))===1,'Vídeo indisponível');
        ensure(is_file($this->mediaRoot().'/'.hash('sha256',$this->user['id']).'/'.basename($path)),'Vídeo indisponível');
    }
}
