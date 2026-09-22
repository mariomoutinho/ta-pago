import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, copyFileSync, readFileSync, writeFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT, collect, buildManifest, serialize, incrementalPlan, validateManifest } from './lib.mjs';

const schema = readFileSync(join(ROOT, 'knowledge/document.schema.json'), 'utf8');
function metadata(id, extra = {}) {
  return { id, title: 'Documento de teste', status: 'proposed', owner: 'test', updated_at: '2026-01-01', language: 'pt-BR', tags: ['test'], indexable: true, sources: [], ...extra };
}
function document(meta, body = '') { return `---\n${JSON.stringify(meta)}\n---\n\n# ${meta.title}\n\n${body}\n`; }
function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'ta-pago-docs-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, 'docs'));
  mkdirSync(join(root, 'knowledge'));
  writeFileSync(join(root, 'knowledge/document.schema.json'), schema);
  writeFileSync(join(root, 'README.md'), document(metadata('ta-pago.readme')));
  writeFileSync(join(root, 'AGENTS.md'), document(metadata('ta-pago.agents', { indexable: false })));
  return root;
}
function put(root, extra, body = '') {
  writeFileSync(join(root, 'docs/example.md'), document(metadata('ta-pago.example', extra), body));
}

test('catálogo determinístico exclui não indexáveis', (t) => {
  const root = fixture(t);
  assert.equal(collect(root).length, 2);
  assert.equal(buildManifest(root).documents.length, 1);
  assert.equal(serialize(buildManifest(root)), serialize(buildManifest(root)));
});

for (const [label, extra, expected] of [
  ['ID duplicado', { id: 'ta-pago.readme' }, /ID duplicado/],
  ['estado inválido', { status: 'implemented' }, /valor inválido/],
  ['booleano como texto', { indexable: 'true' }, /tipo inválido/],
  ['data impossível', { updated_at: '2026-02-30' }, /data inválida/],
  ['data futura', { updated_at: '2999-01-01' }, /futura/],
  ['campo extra', { secret: 'placeholder' }, /desconhecido/],
  ['tags vazias', { tags: [] }, /vazio/],
  ['obsoleto indexável', { status: 'deprecated' }, /obsoleto/],
  ['fonte ausente', { sources: ['missing.ts'] }, /fonte ausente/],
  ['fonte externa', { sources: ['https://example.com'] }, /somente caminhos locais/],
  ['fonte fora da raiz', { sources: ['../outside'] }, /fora do repositório/],
]) {
  test(`rejeita ${label}`, (t) => {
    const root = fixture(t); put(root, extra);
    assert.throws(() => collect(root), expected);
  });
}

test('rejeita ausência de campo obrigatório e de front matter', (t) => {
  const root = fixture(t);
  const meta = metadata('ta-pago.test'); delete meta.owner;
  writeFileSync(join(root, 'docs/example.md'), document(meta));
  assert.throws(() => collect(root), /obrigatório owner/);
  writeFileSync(join(root, 'docs/example.md'), '# Sem metadados\n');
  assert.throws(() => collect(root), /front matter ausente/);
});

test('links locais inline e referências devem existir; URLs não são acessadas', (t) => {
  const root = fixture(t);
  put(root, {}, '[OK](../README.md) [URL](https://example.invalid/)');
  assert.doesNotThrow(() => collect(root));
  put(root, {}, '[Quebrado](missing.md)');
  assert.throws(() => collect(root), /link local quebrado/);
  put(root, {}, '[Outro][ref]\n\n[ref]: missing.md');
  assert.throws(() => collect(root), /link local quebrado/);
});

test('rejeita links fora da raiz e arquivos simbólicos', (t) => {
  const root = fixture(t);
  put(root, {}, '[Externo](../../outside.md)');
  assert.throws(() => collect(root), /fora do repositório/);
  rmSync(join(root, 'docs/example.md'));
  symlinkSync(join(root, 'README.md'), join(root, 'docs/link.md'));
  assert.throws(() => collect(root), /simbólico/);
});

test('mudança de conteúdo ou metadados altera hash', (t) => {
  const root = fixture(t); put(root, {});
  const first = buildManifest(root).documents.find((d) => d.id === 'ta-pago.example');
  put(root, {}, 'Novo conteúdo');
  const second = buildManifest(root).documents.find((d) => d.id === 'ta-pago.example');
  assert.notEqual(first.sha256, second.sha256);
  put(root, { owner: 'another' }, 'Novo conteúdo');
  assert.notEqual(second.sha256, buildManifest(root).documents.find((d) => d.id === first.id).sha256);
});

test('plano representa primeira carga, atualização, renomeação e remoção', (t) => {
  const root = fixture(t); put(root, {});
  const before = buildManifest(root);
  assert.equal(incrementalPlan({ schema_version: 1, documents: [] }, before).added.length, 2);
  const unchanged = incrementalPlan(before, before);
  assert.equal(unchanged.unchanged.length, 2);
  assert.equal(unchanged.applied, false);
  put(root, {}, 'Alterado');
  assert.equal(incrementalPlan(before, buildManifest(root)).updated.length, 1);
  const renamed = structuredClone(before); renamed.documents[1].path = 'docs/renamed.md';
  assert.equal(incrementalPlan(before, renamed).updated.length, 1);
  put(root, { indexable: false });
  assert.equal(incrementalPlan(before, buildManifest(root)).removed[0].id, 'ta-pago.example');
  rmSync(join(root, 'docs/example.md'));
  assert.equal(incrementalPlan(before, buildManifest(root)).removed.length, 1);
});

test('baseline inválido falha em vez de produzir exclusões silenciosas', (t) => {
  const root = fixture(t); const manifest = buildManifest(root);
  assert.throws(() => incrementalPlan({ schema_version: 2, documents: [] }, manifest), /incompatível/);
  const duplicate = structuredClone(manifest); duplicate.documents.push(duplicate.documents[0]);
  assert.throws(() => validateManifest(duplicate), /duplicada/);
  const invalid = structuredClone(manifest); invalid.documents[0].sha256 = 'invalid';
  assert.throws(() => validateManifest(invalid), /inválida/);
  invalid.documents[0] = { ...manifest.documents[0], path: 'docs/../outside.md' };
  assert.throws(() => validateManifest(invalid), /inválida/);
});

test('CLI rejeita opções desconhecidas e baseline ausente', () => {
  for (const args of [['unknown'], ['check', '--fix'], ['plan']]) {
    const result = spawnSync(process.execPath, [join(ROOT, 'scripts/docs/cli.mjs'), ...args], { encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.ok(result.stderr.trim());
  }
});

test('CLI detecta manifesto ausente e desatualizado e build repara somente o catálogo', (t) => {
  const root = fixture(t);
  mkdirSync(join(root, 'scripts/docs'), { recursive: true });
  for (const file of ['lib.mjs', 'cli.mjs']) copyFileSync(join(ROOT, 'scripts/docs', file), join(root, 'scripts/docs', file));
  const run = (command) => spawnSync(process.execPath, [join(root, 'scripts/docs/cli.mjs'), command], { encoding: 'utf8' });
  assert.equal(run('check').status, 1);
  assert.equal(run('build').status, 0);
  assert.equal(run('check').status, 0);
  put(root, {}, 'Nova fonte');
  assert.equal(run('check').status, 1);
  const source = readFileSync(join(root, 'docs/example.md'), 'utf8');
  assert.equal(run('build').status, 0);
  assert.equal(run('check').status, 0);
  assert.equal(readFileSync(join(root, 'docs/example.md'), 'utf8'), source);
});
