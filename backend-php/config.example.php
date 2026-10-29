<?php
// Copiar para tapago-private/config.php FORA de public_html. Nunca publicar valores reais.
return [
    'environment' => 'production',
    'origin' => 'https://SEU-DOMINIO',
    'basePath' => '/tapago',
    'dsn' => 'mysql:host=localhost;port=3306;dbname=SEU_BANCO;charset=utf8mb4',
    'dbUser' => 'SEU_USUARIO',
    'dbPassword' => '',
    'enrollmentKey' => '', // Mesma chave AES-256 atual (64 caracteres hexadecimais).
    'retentionDays' => 90,
    'registrationEnabled' => true,
];
