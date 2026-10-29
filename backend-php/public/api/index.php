<?php
declare(strict_types=1);
// Em produção: /home/u.../domains/.../tapago-private, irmão de public_html.
ini_set('display_errors','0');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: no-referrer');
try {
    $private=getenv('TAPAGO_PRIVATE_DIR') ?: dirname(__DIR__,3).'/tapago-private';
    require $private.'/bootstrap.php';
    $config=tapagoConfig();
    $path=parse_url($_SERVER['REQUEST_URI'],PHP_URL_PATH);
    $prefix=$config['basePath'].'/api';
    \TaPago\ensure(str_starts_with($path,$prefix.'/'),'Recurso não encontrado',404);
    $path=rawurldecode(substr($path,strlen($prefix)));
    \TaPago\ensure(!str_contains($path,'..') && !str_contains($path,"\0"),'Caminho inválido');
    $raw=file_get_contents('php://input',false,null,0,1048577);
    \TaPago\ensure(strlen($raw)<=1048576,'Requisição muito grande',413);
    $body=$raw==='' ? [] : json_decode($raw,true,64,JSON_THROW_ON_ERROR);
    \TaPago\ensure(is_array($body) && ($raw==='' || str_starts_with(ltrim($raw),'{')),'Objeto JSON obrigatório');
    $app=new \TaPago\App(tapagoDb($config),$config);
    $result=$app->handle($_SERVER['REQUEST_METHOD'],$path,$body);
    http_response_code($app->status);
    if ($app->status!==204) echo \TaPago\encode($result);
} catch (\TaPago\HttpError $e) {
    http_response_code($e->status); echo json_encode(['error'=>$e->getMessage()],JSON_UNESCAPED_UNICODE);
} catch (JsonException) {
    http_response_code(400); echo '{"error":"JSON inválido"}';
} catch (Throwable $e) {
    $conflict=$e instanceof PDOException && (string)$e->getCode()==='23000';
    http_response_code($conflict?409:503);
    error_log('TaPago API: '.get_class($e));
    echo json_encode(['error'=>$conflict?'Cadastro duplicado ou vínculo inválido':'Serviço temporariamente indisponível']);
}
