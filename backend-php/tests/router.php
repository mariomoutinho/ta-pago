<?php
// Somente desenvolvimento/testes com php -S; nunca distribuir no public_html.
$path=parse_url($_SERVER['REQUEST_URI'],PHP_URL_PATH);
if (str_starts_with($path,'/tapago/api/')) { require dirname(__DIR__).'/public/api/index.php'; return; }
$root=getenv('TAPAGO_TEST_WEB');
if ($root && str_starts_with($path,'/tapago/')) {
    $relative=rawurldecode(substr($path,8));
    if (str_contains($relative,'..') || str_contains($relative,"\0")) { http_response_code(400); exit; }
    $file=rtrim($root,'/\\').'/'.$relative;
    if (!is_file($file)) $file=rtrim($root,'/\\').'/index.html';
    $type=match(pathinfo($file,PATHINFO_EXTENSION)) { 'js'=>'text/javascript','css'=>'text/css','png'=>'image/png','ico'=>'image/x-icon','json'=>'application/json',default=>'text/html' };
    header('Content-Type: '.$type); readfile($file); return;
}
http_response_code(404); echo 'Not found';
