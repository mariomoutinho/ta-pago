<?php
declare(strict_types=1);
require dirname(__DIR__).'/bootstrap.php';
function check(bool $condition,string $label): void { if (!$condition) throw new RuntimeException($label); }
$password=getenv('TEST_PASSWORD');
check(\TaPago\passwordValid($password,getenv('TEST_LEGACY_HASH')),'Compatibilidade scrypt Node/PHP');
check(!\TaPago\passwordValid('incorreta',getenv('TEST_LEGACY_HASH')),'Senha incorreta');
$db=tapagoDb(tapagoConfig());
$db->create('User',['id'=>'test-legacy','name'=>'Conta legada sintética','email'=>'legacy@example.test','role'=>'personal','passwordHash'=>getenv('TEST_LEGACY_HASH')]);
foreach (['a','b'] as $key) $db->create('User',['id'=>'test-teacher-'.$key,'name'=>'Pessoa Teste','email'=>$key.'@example.test','role'=>'personal','passwordHash'=>\TaPago\passwordHash($password)]);
$blocked=$db->create('User',['name'=>'Pessoa Teste','email'=>'blocked@example.test','role'=>'personal','passwordHash'=>\TaPago\passwordHash($password)]);
$blockedToken=str_repeat('ef',32);
$db->create('Session',['id'=>hash('sha256',$blockedToken),'userId'=>$blocked['id'],'expiresAt'=>\TaPago\at(time()+3600)]);
$_COOKIE['tapago_session_php']=$blockedToken;
check((new \TaPago\App($db,tapagoConfig()))->handle('GET','/auth/status')['user']===null,'Sessão ativa de personal não autorizado foi aceita');
$approvedToken=str_repeat('ab',32);
$db->create('Session',['id'=>hash('sha256',$approvedToken),'userId'=>'test-teacher-a','expiresAt'=>\TaPago\at(time()+3600)]);
$_COOKIE['tapago_session_php']=$approvedToken;
check((new \TaPago\App($db,tapagoConfig()))->handle('GET','/auth/status')['user']['id']==='test-teacher-a','Personal autorizado perdeu sessão');
$revoked=tapagoConfig();$revoked['authorizedPersonalIds']=[];
check((new \TaPago\App($db,$revoked))->handle('GET','/auth/status')['user']===null,'Revogação não bloqueou sessão existente');
unset($_COOKIE['tapago_session_php']);
$hash=\TaPago\passwordHash(str_repeat('á',60));
check(\TaPago\passwordValid(str_repeat('á',60),$hash),'Senha longa Unicode');
check(!\TaPago\passwordValid(str_repeat('á',59).'b',$hash),'Sem truncamento bcrypt');
$v=new \TaPago\Validation();
foreach ([['weight'=>'abc','waist'=>null],['weight'=>-1,'waist'=>null]] as $data) {
    try { $v->parse('physicalSchema',$data); throw new RuntimeException('Validação aceitou medida inválida'); } catch (\TaPago\HttpError) {}
}
$_SERVER['HTTP_X_REQUESTED_WITH']='TaPago';
foreach(['abcdef','123456','!@#$%^','😀😀😀😀😀😀','      ',str_repeat('a',129)] as $index=>$value){
    $_SERVER['REMOTE_ADDR']='synthetic-password-'.$index;$email='password-'.$index.'@example.test';
    $app=new \TaPago\App($db,tapagoConfig());$created=$app->handle('POST','/auth/register',['name'=>'Aluno Sintético','email'=>$email,'password'=>$value,'role'=>'student']);
    check($app->status===201&&$created['user']['role']==='student','Senha válida de seis caracteres foi recusada');
    check((new \TaPago\App($db,tapagoConfig()))->handle('POST','/auth/login',['email'=>$email,'password'=>$value])['user']['id']===$created['user']['id'],'Login com a senha preservada');
}
foreach(['','abcde','😀😀😀',null] as $index=>$value){
    $_SERVER['REMOTE_ADDR']='synthetic-short-password-'.$index;
    try{(new \TaPago\App($db,tapagoConfig()))->handle('POST','/auth/register',['name'=>'Aluno Sintético','email'=>'short-password@example.test','password'=>$value,'role'=>'student']);throw new RuntimeException('Senha curta aceita');}catch(\TaPago\HttpError $e){check($e->status===400,'Senha curta deve falhar na validação');}
}
$_SERVER['REMOTE_ADDR']='synthetic-rate-test';
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
