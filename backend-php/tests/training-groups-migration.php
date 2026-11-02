<?php
declare(strict_types=1);
require dirname(__DIR__).'/bootstrap.php';
if(PHP_SAPI!=='cli')exit(1);$config=tapagoConfig();
if(!preg_match('/dbname=tapago_test_[a-f0-9]+(?:;|$)/',$config['dsn']))throw new RuntimeException('Somente banco sintético');
$db=tapagoDb($config);
foreach(['FitnessGroup','FitnessGroupMember','FitnessChallenge'] as $table)if((int)$db->query("SELECT COUNT(*) FROM `$table`")->fetchColumn())throw new RuntimeException('Ensaio exige grupos vazios');
$before=$db->query('SELECT id,series,`load`,studentLoads FROM WorkoutExercise ORDER BY id')->fetchAll(PDO::FETCH_ASSOC);
if(!$before)throw new RuntimeException('Ensaio exige prescrições');
$db->query('ALTER TABLE WorkoutFeedback DROP FOREIGN KEY fk_WorkoutFeedback_groupId');
foreach(['FitnessChallenge','FitnessGroupMember','FitnessGroup'] as $table)$db->query("DROP TABLE `$table`");
$db->query('ALTER TABLE WorkoutExercise DROP COLUMN studentProgress');
$db->query('ALTER TABLE WorkoutFeedback DROP COLUMN photo,DROP COLUMN groupId');
$db->pdo->exec(file_get_contents(dirname(__DIR__).'/migrations/20261102_training_groups.sql'));
if($before!==$db->query('SELECT id,series,`load`,studentLoads FROM WorkoutExercise ORDER BY id')->fetchAll(PDO::FETCH_ASSOC))throw new RuntimeException('Prescrição alterada');
echo "Migração de progresso e grupos preservou as prescrições e cargas existentes.\n";
