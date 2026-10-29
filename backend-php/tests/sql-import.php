<?php
declare(strict_types=1);
if (PHP_SAPI!=='cli') exit(1);
require dirname(__DIR__).'/bootstrap.php';
$config=tapagoConfig();
if ($config['environment']!=='test' || !str_contains($config['dsn'],'dbname=tapago_test_')) throw new RuntimeException('Somente banco sintético');
$db=tapagoDb($config);
if ($db->query('SHOW TABLES')->fetchColumn()!==false) throw new RuntimeException('Banco não vazio');
$db->pdo->exec(file_get_contents($argv[1]));
echo "SQL importado em banco sintético.\n";
