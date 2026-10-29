<?php
declare(strict_types=1);
require dirname(__DIR__).'/bootstrap.php';
function check(bool $condition,string $label): void { if (!$condition) throw new RuntimeException($label); }
$password=getenv('TEST_PASSWORD');
check(\TaPago\passwordValid($password,getenv('TEST_LEGACY_HASH')),'Compatibilidade scrypt Node/PHP');
check(!\TaPago\passwordValid('incorreta',getenv('TEST_LEGACY_HASH')),'Senha incorreta');
$db=tapagoDb(tapagoConfig());
$db->create('User',['name'=>'Conta legada sintética','email'=>'legacy@example.test','role'=>'personal','passwordHash'=>getenv('TEST_LEGACY_HASH')]);
$hash=\TaPago\passwordHash(str_repeat('á',60));
check(\TaPago\passwordValid(str_repeat('á',60),$hash),'Senha longa Unicode');
check(!\TaPago\passwordValid(str_repeat('á',59).'b',$hash),'Sem truncamento bcrypt');
$v=new \TaPago\Validation();
foreach ([['weight'=>'abc','waist'=>null],['weight'=>-1,'waist'=>null]] as $data) {
    try { $v->parse('physicalSchema',$data); throw new RuntimeException('Validação aceitou medida inválida'); } catch (\TaPago\HttpError) {}
}
$_SERVER['REMOTE_ADDR']='synthetic-rate-test';
$_SERVER['HTTP_X_REQUESTED_WITH']='TaPago';
for ($i=1;$i<=21;$i++) {
    try { (new \TaPago\App($db,tapagoConfig()))->handle('POST','/auth/login',['email'=>'inválido','password'=>'senha sintética']); throw new RuntimeException('Limite/validação ausente'); }
    catch (\TaPago\HttpError $e) { check($e->status===($i<=20?400:429),'Limite de requisições'); }
}
$legacy=$db->required('User','email=?',['legacy@example.test']);
$token=str_repeat('cd',32);
$db->create('Session',['id'=>hash('sha256',$token),'userId'=>$legacy['id'],'expiresAt'=>'2000-01-01T00:00:00.000Z']);
$_COOKIE['tapago_session_php']=$token;
check((new \TaPago\App($db,tapagoConfig()))->handle('GET','/auth/status')['user']===null,'Sessão expirada foi aceita');
echo "Hashes e validação conferidos.\n";
