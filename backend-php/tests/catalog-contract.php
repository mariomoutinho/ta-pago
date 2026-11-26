<?php
declare(strict_types=1);
require dirname(__DIR__).'/src/Core.php';
$validation=new \TaPago\Validation();
$empty=$validation->parse('workoutTemplateSchema',['name'=>'Treino para completar','exercises'=>[]]);
if($empty['exercises']!==[])throw new RuntimeException('Contrato PHP recusou treino vazio');
$folder=$validation->parse('workoutFolderSchema',['name'=>'Adaptação']);
if($folder['name']!=='Adaptação')throw new RuntimeException('Contrato de pasta inválido');
$move=$validation->parse('workoutFolderMoveSchema',['folderId'=>null,'revision'=>1]);
if($move['folderId']!==null || $move['revision']!==1)throw new RuntimeException('Contrato de mudança de pasta inválido');
$catalog=json_decode(file_get_contents(dirname(__DIR__).'/generated/exercise-catalog.json'),true,512,JSON_THROW_ON_ERROR);
if(count($catalog)!==240 || count(array_unique(array_column($catalog,'name')))!==240 || count(array_unique(array_column($catalog,'muscleGroup')))!==12)throw new RuntimeException('Catálogo incompleto');
foreach($catalog as $entry){
    $validation->parse('exerciseSchema',$entry);
    if(str_contains($entry['muscleGroup'],'?') || $entry['category']!=='Musculação')throw new RuntimeException('Acentuação do catálogo inválida');
}
echo "Contrato PHP: treino vazio e 240 exercícios em 12 grupos aprovados.\n";
