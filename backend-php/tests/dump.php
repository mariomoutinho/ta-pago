<?php
declare(strict_types=1);
if (PHP_SAPI!=='cli') exit(1);
require dirname(__DIR__).'/bootstrap.php';
$db=tapagoDb(tapagoConfig()); $tables=[];
foreach ($db->models as $name=>$model) $tables[$name]=$db->rows($name,'1=1',[],'id ASC');
echo \TaPago\encode($tables);
