<?php
declare(strict_types=1);
require_once __DIR__.'/src/Core.php';
require_once __DIR__.'/src/Auth.php';
require_once __DIR__.'/src/Students.php';
require_once __DIR__.'/src/Evaluations.php';
require_once __DIR__.'/src/Workouts.php';
require_once __DIR__.'/src/Enrollment.php';
require_once __DIR__.'/src/App.php';

function tapagoConfig(): array {
    if (PHP_VERSION_ID < 80300) throw new RuntimeException('PHP 8.3 ou superior obrigatório');
    foreach (['pdo_mysql','mbstring','openssl','sodium'] as $extension) if (!extension_loaded($extension)) throw new RuntimeException('Extensão obrigatória ausente');
    $file = getenv('TAPAGO_CONFIG') ?: __DIR__.'/config.php';
    $config = require $file;
    if (!str_starts_with($config['dsn']??'','mysql:') || !preg_match('/^[a-f0-9]{64}$/i',$config['enrollmentKey']??'')) throw new RuntimeException('Configuração inválida');
    $origin = parse_url($config['origin']??'');
    if (!$origin || !isset($origin['host']) || isset($origin['user']) || isset($origin['query']) || isset($origin['fragment']) || ($origin['path']??'')!=='') throw new RuntimeException('Origem inválida');
    if (($config['environment']??'production')==='production' && ($origin['scheme']??'')!=='https') throw new RuntimeException('HTTPS obrigatório');
    if (!preg_match('~^(/[a-zA-Z0-9_-]+)*$~D',$config['basePath']??'')) throw new RuntimeException('Base path inválido');
    if (!is_int($config['retentionDays']??null) || $config['retentionDays']<1 || $config['retentionDays']>365) throw new RuntimeException('Retenção inválida');
    return $config;
}
function tapagoDb(array $config): \TaPago\Db {
    $pdo = new PDO($config['dsn'],$config['dbUser'],$config['dbPassword'],[
        PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION, PDO::ATTR_EMULATE_PREPARES=>false,
        PDO::ATTR_STRINGIFY_FETCHES=>false,
    ]);
    $pdo->exec("SET time_zone = '+00:00'");
    return new \TaPago\Db($pdo);
}
