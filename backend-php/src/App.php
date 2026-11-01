<?php
declare(strict_types=1);
namespace TaPago;

final class App {
    use Auth, Students, Evaluations, Workouts, Enrollment, Media;
    public int $status=200;
    public ?array $user=null;
    public array $deferredNotifications=[];
    public function sendDeferredNotifications(): void {
        foreach(array_unique($this->deferredNotifications) as $owner)try{(new Push($this->db,$this->config))->dispatch($owner);}catch(\Throwable){error_log('TaPago push: deferred dispatch failed');}
        $this->deferredNotifications=[];
    }
    private ?string $sessionId=null;
    private bool $writing=false;
    public Validation $validation;
    public function __construct(public Db $db, public array $config) { $this->validation=new Validation(); }
    public function handle(string $method, string $path, array $body=[]): mixed {
        ensure(!isset($_SERVER['HTTP_ORIGIN']) || $_SERVER['HTTP_ORIGIN']===$this->config['origin'],'Origem não autorizada',403);
        if (!in_array($method,['GET','HEAD','OPTIONS'],true)) ensure(($_SERVER['HTTP_X_REQUESTED_WITH']??'')==='TaPago','Requisição inválida',403);
        if ($method==='OPTIONS') { $this->status=204; return null; }
        if (in_array($path,['/auth/login','/auth/register','/me/claim'],true)) $this->rate('auth');
        if (str_starts_with($path,'/public/enrollment/')) $this->rate('enrollment',30);
        $this->writing=!in_array($method,['GET','HEAD'],true);
        if ($this->writing) $this->db->pdo->beginTransaction();
        try {
            $result=$this->dispatch($method,$path,$body);
            if ($this->writing) $this->db->pdo->commit();
            return $result;
        } catch (\Throwable $e) {
            $this->deferredNotifications=[];
            if ($this->db->pdo->inTransaction()) $this->db->pdo->rollBack();
            throw $e;
        }
    }
    private function dispatch(string $method,string $path,array $body): mixed {
        if ($path==='/health' && $method==='GET') { $this->db->query('SELECT id FROM User LIMIT 1'); return ['status'=>'ok']; }
        if ($method==='POST' && in_array($path,['/auth/login','/auth/register'],true)) return $this->authenticate($body,$path==='/auth/register');
        $this->user=$this->sessionUser();
        if ($path==='/auth/status' && $method==='GET') return ['user'=>$this->user];
        if (preg_match('~^/public/enrollment/([^/]+)$~D',$path,$m)) return $this->publicEnrollment($method,$m[1],$body);
        ensure($this->user!==null,'Entre na sua conta para continuar',401);
        if ($path==='/exercise-videos' && $method==='PUT') return $this->uploadVideo();
        if (preg_match('~^/exercise-videos/([a-f0-9]{64})/([a-f0-9]{32})\.mp4$~D',$path,$m) && in_array($method,['GET','HEAD'],true)) return $this->video($m[1],$m[2]);
        if ($path==='/auth/logout' && $method==='POST') { $this->db->delete('Session',$this->sessionId); $this->cookie('',time()-3600); return ['ok'=>true]; }
        if ($path==='/me/claim' && $method==='POST') return $this->claim($body);
        if ($path==='/me/students' && $method==='GET') {
            $this->pupil(); return array_map(function($s) { return array_merge(array_intersect_key($s,array_flip(['id','name','mainGoal','linkStatus','startDate'])),['personal'=>$this->teacher($s['personalId'])]); },$this->db->rows('Student','accountId=?',[$this->user['id']]));
        }
        if ($path==='/me/workout-plans' && $method==='GET') return $this->myPlans();
        if (preg_match('~^/me/workouts/([^/]+)/feedbacks$~D',$path,$m) && $method==='POST') return $this->feedback($m[1],$body);
        if (preg_match('~^/(me/)?students(?:/([^/]+))?(.*)$~D',$path,$m)) return $this->studentRoute($method,($m[1]??'')!=='',$m[2]??null,$m[3]??'',$body);
        $this->personal();
        if ($path==='/notifications/settings' && $method==='GET') return ['publicKey'=>(new Push($this->db,$this->config))->publicKey()];
        if ($path==='/notifications/summary' && $method==='GET') {
            $rows=$this->db->rows('EnrollmentRequest',"personalId=? AND status='pending' AND updatedAt>=?",[$this->user['id'],at(time()-$this->config['retentionDays']*86400)],'createdAt DESC');
            return ['pending'=>count($rows)];
        }
        if (in_array($path,['/notifications/subscribe','/notifications/unsubscribe'],true) && $method==='POST') {
            ensure(is_string($body['endpoint']??null) && strlen($body['endpoint'])<=4096,'Inscrição inválida');
            $push=new Push($this->db,$this->config);
            if($path==='/notifications/subscribe')$push->subscribe($this->user['id'],$body['endpoint']);else $push->unsubscribe($this->user['id'],$body['endpoint']);
            return ['ok'=>true];
        }
        if (str_starts_with($path,'/enrollment/')) return $this->enrollmentRoute($method,substr($path,11),$body);
        if ($path==='/templates' && $method==='GET') return array_map(fn($t)=>$this->template($t['id']),$this->db->rows('EvaluationTemplate','ownerId IN (?,?)',['system',$this->user['id']],'name ASC, version DESC'));
        if ($path==='/templates' && $method==='POST') return $this->newTemplate($body);
        if (preg_match('~^/exercises/([^/]+)/favorite$~D',$path,$m) && $method==='PUT') return $this->favoriteExercise($m[1],$body);
        if (preg_match('~^/(exercises|programs|workout-templates|prescription-presets)(?:/([^/]+))?(/order)?$~D',$path,$m)) return $this->libraryRoute($method,$m[1],$m[2]??null,($m[3]??'')!=='',$body);
        if (preg_match('~^/workout-plans/([^/]+)(?:/workouts/([^/]+)/order)?$~D',$path,$m) && $method==='PUT') {
            $plan=$this->db->required('WorkoutPlan','id=?',[$m[1]],true); $this->student($plan['studentId'],false);
            return isset($m[2]) ? $this->orderPlan($plan,$m[2],$body) : $this->savePlan($plan['studentId'],$body,$plan);
        }
        throw new HttpError(404,'Recurso não encontrado');
    }
}
