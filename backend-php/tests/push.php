<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli')exit(1);
require dirname(__DIR__).'/bootstrap.php';
$config=tapagoConfig();
if(($config['environment']??'')!=='test' || !str_contains($config['dsn'],'dbname=tapago_test_'))throw new RuntimeException('Somente banco sintético');
if(($argv[1]??'')==='crypto'){
    $push=new \TaPago\Push(tapagoDb($config),$config);
    echo json_encode(['publicKey'=>$push->publicKey(),'authorization'=>$push->authorization('https://fcm.googleapis.com/fcm/send/synthetic-subscription')]);
}else{
    $config['pushTestStatus']=(int)($argv[1]??201);
    echo json_encode((new \TaPago\Push(tapagoDb($config),$config))->dispatch());
}
