<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
require dirname(__DIR__).'/bootstrap.php';
try{$config=tapagoConfig();echo json_encode((new \TaPago\Push(tapagoDb($config),$config))->dispatch()).PHP_EOL;}
catch(Throwable){fwrite(STDERR,"Falha ao processar notificações\n");exit(1);}
