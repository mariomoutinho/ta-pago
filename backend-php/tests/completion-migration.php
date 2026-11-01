<?php
declare(strict_types=1);
require dirname(__DIR__).'/bootstrap.php';
if (PHP_SAPI!=='cli') exit(1);
$config=tapagoConfig();
if (!preg_match('/dbname=tapago_test_[a-f0-9]+(?:;|$)/', $config['dsn'])) throw new RuntimeException('Somente banco sintético');
$db=tapagoDb($config);
if ((int)$db->query('SELECT COUNT(*) FROM WorkoutCompletion')->fetchColumn()!==0) throw new RuntimeException('O ensaio exige tabela vazia');
$before=$db->query('SELECT * FROM Workout ORDER BY id')->fetchAll(PDO::FETCH_ASSOC);
if (!$before) throw new RuntimeException('O ensaio exige treinos existentes');
$db->query('DROP TABLE WorkoutCompletion');
$db->pdo->exec(file_get_contents(dirname(__DIR__).'/migrations/20261101_workout_completion.sql'));
if ($before!==$db->query('SELECT * FROM Workout ORDER BY id')->fetchAll(PDO::FETCH_ASSOC)) throw new RuntimeException('Treinos alterados');
if ((int)$db->query('SELECT COUNT(*) FROM WorkoutCompletion')->fetchColumn()!==0) throw new RuntimeException('Conclusões inesperadas');
echo "Migração incremental de conclusões preservou os treinos existentes.\n";
