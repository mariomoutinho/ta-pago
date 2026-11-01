<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli')exit(1);
require dirname(__DIR__).'/bootstrap.php';
$config=tapagoConfig();
if(($config['environment']??'')!=='test'||!str_contains($config['dsn'],'dbname=tapago_test_'))throw new RuntimeException('Somente banco sintético');
if(($argv[1]??'')==='crypto'){
    $key=openssl_pkey_new(['private_key_type'=>OPENSSL_KEYTYPE_RSA,'private_key_bits'=>2048]);openssl_pkey_export($key,$private);
    echo json_encode(['publicKey'=>openssl_pkey_get_details($key)['key'],'assertion'=>\TaPago\AndroidPush::assertion(['client_email'=>'synthetic@example.test','private_key'=>$private])]);
}else{
    $config['fcmTestStatus']=(int)($argv[1]??200);
    echo json_encode((new \TaPago\AndroidPush(tapagoDb($config),$config))->dispatch());
}
