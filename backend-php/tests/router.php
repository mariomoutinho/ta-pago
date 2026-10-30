<?php
// Somente desenvolvimento/testes com php -S; nunca distribuir no public_html.
$path=parse_url($_SERVER['REQUEST_URI'],PHP_URL_PATH);
if ($path==='/api' || str_starts_with($path,'/api/')) {
    $root=getenv('TAPAGO_TEST_WEB');
    require $root ? $root.'/api/index.php' : dirname(__DIR__).'/public/api/index.php'; return;
}
$root=getenv('TAPAGO_TEST_WEB');
if ($root) {
    $relative=rawurldecode(ltrim($path,'/'));
    if (str_contains($relative,'..') || str_contains($relative,"\0")) { http_response_code(400); exit; }
    $file=rtrim($root,'/\\').'/'.$relative;
    if (preg_match('~(^|/)\.|^(backend-php|tapago-private|private|src|generated|bin|tests|data|vendor|node_modules)(/|$)|\.(php|sql|db|sqlite|env|log|ini|jsonl|bak|zip)$~i',$relative)) { http_response_code(403); exit; }
    if (!is_file($file)) {
        if (preg_match('~^(_expo|assets)(/|$)~',$relative)) { http_response_code(404); exit; }
        $file=rtrim($root,'/\\').'/index.html';
    }
    $type=match(pathinfo($file,PATHINFO_EXTENSION)) { 'webmanifest'=>'application/manifest+json','js'=>'text/javascript','css'=>'text/css','png'=>'image/png','ico'=>'image/x-icon','json'=>'application/json','svg'=>'image/svg+xml','ttf'=>'font/ttf','woff'=>'font/woff','woff2'=>'font/woff2',default=>'text/html' };
    header('Content-Type: '.$type); readfile($file); return;
}
http_response_code(404); echo 'Not found';
