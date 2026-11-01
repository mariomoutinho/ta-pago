<?php
declare(strict_types=1);
require dirname(__DIR__).'/bootstrap.php';
if (PHP_SAPI!=='cli') exit(1);
$config=tapagoConfig();
if (!preg_match('/dbname=tapago_test_[a-f0-9]+(?:;|$)/', $config['dsn'])) throw new RuntimeException('Somente banco sintético');
$db=tapagoDb($config);
// A tabela temporária isola o ensaio sem alterar a biblioteca de teste original.
$definition=$db->query('SHOW CREATE TABLE Exercise')->fetch(PDO::FETCH_NUM)[1];
$definition=preg_replace('/,\s*CONSTRAINT [^\n]+/','',$definition);
$db->pdo->exec(str_replace('CREATE TABLE','CREATE TEMPORARY TABLE',$definition));
$db->query('ALTER TABLE Exercise DROP COLUMN favorite');
$db->query("INSERT INTO Exercise (id,ownerId,name,muscleGroup,category,equipment,description,imageUrl,videoUrl,notes,status,createdAt,updatedAt) VALUES ('migration-fixture','test-teacher-a','Exercício sintético','Geral','Teste','','','','','','ativo','2026-01-01','2026-01-01')");
$before=$db->query('SELECT * FROM Exercise')->fetchAll(PDO::FETCH_ASSOC);
$db->pdo->exec(file_get_contents(dirname(__DIR__).'/migrations/20261101_exercise_favorites.sql'));
$after=$db->query('SELECT * FROM Exercise')->fetchAll(PDO::FETCH_ASSOC);
if (count($after)!==1 || (int)$after[0]['favorite']!==0) throw new RuntimeException('Favorito inicial inválido');
unset($after[0]['favorite']);
if ($before!==$after) throw new RuntimeException('A migração alterou o cadastro existente');
$db->query('DROP TEMPORARY TABLE Exercise');
echo "Migração incremental de favoritos preservou o exercício existente.\n";
