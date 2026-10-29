<?php
declare(strict_types=1);
namespace TaPago;

final class HttpError extends \RuntimeException {
    public function __construct(public int $status, string $message) { parent::__construct($message); }
}
function ensure(bool $condition, string $message, int $status = 400): void {
    if (!$condition) throw new HttpError($status, $message);
}
function now(): string { return gmdate('Y-m-d\TH:i:s') . sprintf('.%03dZ', (int)(microtime(true)*1000)%1000); }
function at(int $time): string { return gmdate('Y-m-d\TH:i:s', $time).'.000Z'; }
function uid(): string { return bin2hex(random_bytes(16)); }
function encode(mixed $value): string { return json_encode($value, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); }

final class Db {
    public array $models;
    public function __construct(public \PDO $pdo) {
        $this->models = json_decode(file_get_contents(__DIR__.'/../generated/models.json'), true, 512, JSON_THROW_ON_ERROR);
    }
    public function query(string $sql, array $parameters = []): \PDOStatement {
        $s = $this->pdo->prepare($sql); $s->execute($parameters); return $s;
    }
    public function rows(string $table, string $where = '1=1', array $parameters = [], string $order = '', bool $lock = false): array {
        if (!isset($this->models[$table])) throw new \LogicException('Unknown table');
        $rows = $this->query("SELECT * FROM `$table` WHERE $where".($order ? " ORDER BY $order" : '').($lock ? ' FOR UPDATE' : ''), $parameters)->fetchAll(\PDO::FETCH_ASSOC);
        return array_map(fn($row) => $this->decode($table, $row), $rows);
    }
    public function one(string $table, string $where, array $parameters = [], bool $lock = false): ?array { return $this->rows($table, $where, $parameters, '', $lock)[0] ?? null; }
    public function required(string $table, string $where, array $parameters = [], bool $lock = false): array {
        $row = $this->one($table, $where, $parameters, $lock); ensure($row !== null, 'Registro não encontrado', 404); return $row;
    }
    public function decode(string $table, array $row): array {
        foreach ($this->models[$table]['fields'] as $key => $field) {
            if (!isset($row[$key])) continue;
            $row[$key] = match ($field['type']) {
                'Json' => is_string($row[$key]) ? json_decode($row[$key], true, 512, JSON_THROW_ON_ERROR) : $row[$key],
                'Int' => (int)$row[$key], 'Float' => (float)$row[$key], 'Boolean' => (bool)$row[$key], default => $row[$key],
            };
        }
        return $row;
    }
    public function create(string $table, array $data): array {
        $fields = $this->models[$table]['fields'];
        foreach ($fields as $key => $f) {
            if (array_key_exists($key, $data)) continue;
            if (($f['default'] ?? null) === 'cuid()') $data[$key] = uid();
            elseif (($f['default'] ?? null) === 'now()' || $f['updatedAt']) $data[$key] = now();
            elseif (array_key_exists('default', $f)) $data[$key] = $f['type'] === 'Json' ? json_decode($f['default'], true) : $f['default'];
            elseif ($f['nullable']) $data[$key] = null;
        }
        $values = $this->storage($table, $data);
        $keys = array_keys($values);
        $this->query("INSERT INTO `$table` (`".implode('`,`', $keys).'`) VALUES ('.implode(',', array_fill(0,count($keys),'?')).')', array_values($values));
        return $this->required($table, 'id=?', [$data['id']]);
    }
    public function update(string $table, string $id, array $data): array {
        unset($data['id'], $data['createdAt']);
        if (isset($this->models[$table]['fields']['updatedAt'])) $data['updatedAt'] = now();
        $values = $this->storage($table, $data);
        if ($values) $this->query("UPDATE `$table` SET ".implode(',',array_map(fn($k)=>"`$k`=?",array_keys($values))).' WHERE id=?', [...array_values($values),$id]);
        return $this->required($table, 'id=?', [$id]);
    }
    private function storage(string $table, array $data): array {
        $out = [];
        foreach ($data as $k => $v) {
            $f = $this->models[$table]['fields'][$k] ?? null;
            if (!$f) throw new \LogicException("Unknown field $table.$k");
            $out[$k] = $v === null ? null : ($f['type'] === 'Json' ? encode($v) : ($f['type'] === 'Boolean' ? (int)$v : $v));
        }
        return $out;
    }
    public function delete(string $table, string $id): void { $this->query("DELETE FROM `$table` WHERE id=?", [$id]); }
}

final class Validation {
    private array $schemas;
    public function __construct() { $this->schemas = json_decode(file_get_contents(__DIR__.'/../generated/contracts.json'),true,512,JSON_THROW_ON_ERROR); }
    public function parse(string $name, mixed $value): array { return $this->check($this->schemas[$name], $value, $name); }
    private function check(array $s, mixed $v, string $path): mixed {
        if ($s['x-coerce-number']??false) {
            ensure(is_numeric($v) || is_bool($v) || $v === null || $v === '', "$path: número inválido");
            $v = (float)$v;
        }
        if (isset($s['anyOf'])) {
            foreach ($s['anyOf'] as $option) { try { return $this->check($option,$v,$path); } catch (HttpError) {} }
            throw new HttpError(400, "$path: valor inválido");
        }
        $types = (array)($s['type'] ?? []);
        if ($v === null && in_array('null',$types,true)) return null;
        if ($types === ['null']) ensure($v === null, "$path: valor deve ser nulo");
        if (in_array('object',$types,true)) {
            ensure(is_array($v) && (!array_is_list($v) || !$v), "$path: objeto inválido");
            $out = [];
            foreach ($s['properties'] ?? [] as $k => $child) {
                if (!array_key_exists($k,$v)) {
                    if (array_key_exists('default',$child)) $v[$k] = $child['default'];
                    elseif (in_array($k,$s['required']??[],true)) throw new HttpError(400,"$path.$k: obrigatório");
                    else continue;
                }
                $out[$k] = $this->check($child,$v[$k],"$path.$k");
            }
            return $out;
        }
        if (in_array('array',$types,true)) {
            ensure(is_array($v) && array_is_list($v),"$path: lista inválida");
            ensure(count($v)>=($s['minItems']??0) && count($v)<=($s['maxItems']??10000),"$path: tamanho inválido");
            return array_map(fn($x)=>$this->check($s['items']??[],$x,$path.'[]'),$v);
        }
        if (in_array('string',$types,true)) {
            ensure(is_string($v),"$path: texto inválido"); $v=trim($v);
            ensure(mb_strlen($v)>=($s['minLength']??0) && mb_strlen($v)<=($s['maxLength']??10000),"$path: tamanho inválido");
            if (isset($s['pattern'])) ensure(preg_match('~'.str_replace('~','\\~',$s['pattern']).'~u',$v)===1,"$path: formato inválido");
            if (($s['format']??'')==='email') ensure(filter_var($v,FILTER_VALIDATE_EMAIL)!==false,"$path: e-mail inválido");
            if (($s['format']??'')==='uri') ensure(filter_var($v,FILTER_VALIDATE_URL)!==false && in_array(strtolower(parse_url($v,PHP_URL_SCHEME)??''),['http','https']),"$path: use URL http/https");
            if (preg_match('/^\d{4}-\d{2}-\d{2}$/',$v)) {
                $date = \DateTimeImmutable::createFromFormat('!Y-m-d',$v);
                ensure($date !== false && $date->format('Y-m-d')===$v,"$path: data inválida");
            }
        }
        if (in_array('number',$types,true)||in_array('integer',$types,true)) {
            ensure((is_int($v)||is_float($v)) && is_finite((float)$v),"$path: número inválido");
            if (in_array('integer',$types,true)) ensure(floor($v)===$v || is_int($v),"$path: inteiro obrigatório");
            ensure($v>=($s['minimum']??-INF) && $v<=($s['maximum']??INF),"$path: fora dos limites");
            if (isset($s['exclusiveMinimum'])) ensure($v>$s['exclusiveMinimum'],"$path: fora dos limites");
        }
        if (in_array('boolean',$types,true)) ensure(is_bool($v),"$path: booleano inválido");
        if (isset($s['enum'])) ensure(in_array($v,$s['enum'],true),"$path: opção inválida");
        if (array_key_exists('const',$s)) ensure($v===$s['const'],"$path: valor inválido");
        return $v;
    }
}

function passwordHash(string $password): string {
    // SHA-384 evita truncamento do bcrypt após 72 bytes; não usa salt fixo.
    return 'bcrypt-sha384:'.password_hash(base64_encode(hash('sha384',$password,true)), PASSWORD_BCRYPT, ['cost'=>12]);
}
function passwordValid(string $password, string $hash): bool {
    if (str_starts_with($hash,'bcrypt-sha384:')) return password_verify(base64_encode(hash('sha384',$password,true)),substr($hash,14));
    if (!preg_match('/^([a-f0-9]{32}):([a-f0-9]{128})$/D',$hash,$parts)) return false;
    // Node crypto.scrypt padrão: N=16384, r=8, p=1, salt é o TEXTO hexadecimal.
    $derived = sodium_crypto_pwhash_scryptsalsa208sha256(64,$password,$parts[1],524288,16777216);
    return hash_equals($parts[2],bin2hex($derived));
}
