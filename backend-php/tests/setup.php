<?php
declare(strict_types=1);
if (PHP_SAPI!=='cli') exit(1);
// Cria somente banco NOVO com prefixo reservado para testes. Nunca DROP/TRUNCATE.
$name=$argv[1]??'';
if (!preg_match('/^tapago_test_[a-z0-9_]+$/D',$name)) throw new RuntimeException('Nome de teste inválido');
$pdo=new PDO(getenv('TAPAGO_TEST_DSN')?:'mysql:host=127.0.0.1;port=33316;charset=utf8mb4',getenv('TAPAGO_TEST_USER')?:'root',getenv('TAPAGO_TEST_PASSWORD')?:'isolated_test_only',[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);
$pdo->exec("CREATE DATABASE `$name` CHARACTER SET utf8mb4 COLLATE utf8mb4_bin");
$config=['environment'=>'test','origin'=>'http://127.0.0.1:33317','basePath'=>'',
    'dsn'=>(getenv('TAPAGO_TEST_DSN')?:'mysql:host=127.0.0.1;port=33316;charset=utf8mb4').';dbname='.$name,
    'dbUser'=>getenv('TAPAGO_TEST_USER')?:'root','dbPassword'=>getenv('TAPAGO_TEST_PASSWORD')?:'isolated_test_only',
    'enrollmentKey'=>str_repeat('ab',32),'retentionDays'=>90,'registrationEnabled'=>true];
$file=dirname(__DIR__,2).'/data/'.$name.'.php';
if (!is_dir(dirname($file))) mkdir(dirname($file),0700,true);
file_put_contents($file,"<?php\nreturn ".var_export($config,true).";\n");
echo $file;
