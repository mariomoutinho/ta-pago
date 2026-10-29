<?php
declare(strict_types=1);
// Nunca expor este arquivo por HTTP.
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require dirname(__DIR__).'/bootstrap.php';
try {
    $command=$argv[1]??'help';
    $config=tapagoConfig(); $db=tapagoDb($config);
    $apply=in_array('--apply',$argv,true);
    if ($command==='check') {
        $db->query('SELECT 1'); echo "Configuração e conexão válidas.\n";
    } elseif ($command==='schema') {
        if ($db->query('SHOW TABLES')->fetchColumn()!==false) throw new RuntimeException('O banco deve estar vazio');
        if (!$apply) { echo "Simulação: criaria o esquema em banco vazio. Use --apply.\n"; exit; }
        $db->pdo->exec(file_get_contents(dirname(__DIR__).'/schema.sql'));
        echo "Esquema criado. DDL não é transacional; em caso de falha, use outro banco vazio.\n";
    } elseif ($command==='import' || $command==='verify') {
        $file=$argv[2]??'';
        $envelope=json_decode(file_get_contents($file),true,512,JSON_THROW_ON_ERROR);
        if (!isset($envelope['payload'],$envelope['sha256']) || !hash_equals(hash('sha256',$envelope['payload']),$envelope['sha256'])) throw new RuntimeException('Checksum inválido');
        $bundle=json_decode($envelope['payload'],true,512,JSON_THROW_ON_ERROR);
        if (($bundle['format']??null)!==1 || ($bundle['schemaHash']??'')!==hash_file('sha256',dirname(__DIR__).'/generated/models.json')) throw new RuntimeException('Contrato incompatível');
        $excluded=['Session','Invitation','EnrollmentChallenge'];
        $expected=array_diff(array_keys($db->models),$excluded);
        if (array_diff($expected,array_keys($bundle['tables'])) || array_diff(array_keys($bundle['tables']),$expected)) throw new RuntimeException('Tabelas incompatíveis');
        // Ordenação pelas chaves estrangeiras, sem desativar integridade referencial.
        $pending=$expected; $ordered=[];
        while ($pending) {
            $progress=false;
            foreach ($pending as $i=>$table) {
                $deps=array_column($db->models[$table]['relations'],'target');
                if (array_diff($deps,$ordered)) continue;
                $ordered[]=$table; unset($pending[$i]); $progress=true;
            }
            if (!$progress) throw new RuntimeException('Dependência circular no esquema');
        }
        foreach ($ordered as $table) foreach ($bundle['tables'][$table] as $row) {
            if (array_diff(array_keys($row),array_keys($db->models[$table]['fields'])) || array_diff(array_keys($db->models[$table]['fields']),array_keys($row))) throw new RuntimeException('Campos incompatíveis: '.$table);
        }
        // Recusar chave incorreta ANTES de importar fichas cifradas.
        foreach ($bundle['tables']['EnrollmentRequest'] as $row) foreach (['payload','healthPayload'] as $field) {
            if (!$row[$field]) continue;
            $parts=explode('.',$row[$field]);
            if (count($parts)!==3) throw new RuntimeException('Ficha cifrada inválida');
            [$iv,$tag,$cipher]=array_map(fn($s)=>base64_decode($s,true),$parts);
            if ($iv===false || strlen($iv)!==12 || $tag===false || strlen($tag)!==16 || $cipher===false || openssl_decrypt($cipher,'aes-256-gcm',hex2bin($config['enrollmentKey']),OPENSSL_RAW_DATA,$iv,$tag)===false) throw new RuntimeException('Chave de cadastro incompatível; origem preservada');
        }
        if ($command==='verify') {
            foreach ($ordered as $table) {
                $actual=$db->rows($table,'1=1',[],'id ASC'); $expectedRows=$bundle['tables'][$table];
                usort($expectedRows,fn($a,$b)=>strcmp($a['id'],$b['id']));
                if ($actual!=$expectedRows) throw new RuntimeException('Divergência: '.$table);
                echo $table.': '.count($actual)." registros conferidos\n";
            }
            exit;
        }
        foreach (array_keys($db->models) as $table) if ($db->query("SELECT COUNT(*) FROM `$table`")->fetchColumn()>0) throw new RuntimeException('Destino não vazio: '.$table);
        if (!$apply) { echo "Simulação: contrato e destino conferidos. Importação exige --apply.\n"; exit; }
        $db->pdo->beginTransaction();
        $objects=json_decode($envelope['payload'],false,512,JSON_THROW_ON_ERROR)->tables;
        foreach ($ordered as $table) foreach ($bundle['tables'][$table] as $i=>$row) {
            foreach ($db->models[$table]['fields'] as $field=>$definition) if ($definition['type']==='Json') $row[$field]=$objects->{$table}[$i]->{$field};
            $db->create($table,$row);
        }
        $db->query('INSERT INTO MigrationReceipt(id,createdAt) VALUES (?,?)',[$envelope['sha256'],\TaPago\now()]);
        $db->pdo->commit(); echo "Importação concluída. Execute verify antes de usar o banco.\n";
    } elseif ($command==='seed') {
        if (!$apply) { echo "Simulação: questionário inicial. Use --apply.\n"; exit; }
        if ($db->one('EvaluationTemplate','ownerId=?',['system'])) { echo "Questionário já existe.\n"; exit; }
        $seed=json_decode(file_get_contents(dirname(__DIR__).'/generated/seed.json'),true,512,JSON_THROW_ON_ERROR);
        $db->pdo->beginTransaction();
        $template=$db->create('EvaluationTemplate',['ownerId'=>'system','name'=>'Acompanhamento inicial — 30 dias','version'=>1]);
        foreach ($seed['initialQuestions'] as $q) {
            $options=$q['options']??[]; unset($q['options']);
            $question=$db->create('EvaluationQuestion',[...$q,'templateId'=>$template['id']]);
            foreach ($options as $o) $db->create('EvaluationOption',[...$o,'questionId'=>$question['id']]);
        }
        $db->pdo->commit(); echo "Questionário criado.\n";
    } elseif ($command==='purge') {
        $cutoff=\TaPago\at(time()-$config['retentionDays']*86400);
        $rows=$db->rows('EnrollmentRequest',"status IN ('pending','rejected') AND updatedAt<?",[$cutoff]);
        echo count($rows)." cadastros expirados.\n";
        if ($apply) { $db->pdo->beginTransaction(); foreach($rows as $r) $db->delete('EnrollmentRequest',$r['id']); $db->pdo->commit(); }
    } else echo "Comandos: check | schema [--apply] | import arquivo [--apply] | verify arquivo | seed [--apply] | purge [--apply]\n";
} catch (Throwable $e) {
    if (isset($db) && $db->pdo->inTransaction()) $db->pdo->rollBack();
    // Não imprimir mensagens PDO que possam conter dados pessoais/credenciais.
    fwrite(STDERR,($e instanceof PDOException?'Falha de banco; operação revertida quando transacional.':$e->getMessage())."\n"); exit(1);
}
