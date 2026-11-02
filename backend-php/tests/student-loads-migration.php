<?php
declare(strict_types=1);
require dirname(__DIR__).'/bootstrap.php';
if (PHP_SAPI!=='cli') exit(1);
$config=tapagoConfig();
if (!preg_match('/dbname=tapago_test_[a-f0-9]+(?:;|$)/',$config['dsn'])) throw new RuntimeException('Somente banco sintético');
$db=tapagoDb($config);
$before=$db->query('SELECT id,series,`load` FROM WorkoutExercise ORDER BY id')->fetchAll(PDO::FETCH_ASSOC);
if (!$before) throw new RuntimeException('O ensaio exige prescrições existentes');
$db->query('ALTER TABLE WorkoutExercise DROP COLUMN studentLoads');
$db->pdo->exec(file_get_contents(dirname(__DIR__).'/migrations/20261102_student_loads.sql'));
if ($before!==$db->query('SELECT id,series,`load` FROM WorkoutExercise ORDER BY id')->fetchAll(PDO::FETCH_ASSOC)) throw new RuntimeException('Prescrição alterada');
if ((int)$db->query('SELECT COUNT(*) FROM WorkoutExercise WHERE studentLoads IS NOT NULL')->fetchColumn()!==0) throw new RuntimeException('Cargas inesperadas');
echo "Migração incremental das cargas preservou as prescrições existentes.\n";
