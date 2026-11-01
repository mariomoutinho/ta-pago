<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
require dirname(__DIR__).'/bootstrap.php';
try{$config=tapagoConfig();$db=tapagoDb($config);echo json_encode(['web'=>(new \TaPago\Push($db,$config))->dispatch(),'android'=>(new \TaPago\AndroidPush($db,$config))->dispatch()]).PHP_EOL;}
catch(Throwable){fwrite(STDERR,"Falha ao processar notificações\n");exit(1);}
