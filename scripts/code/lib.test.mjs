import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, copyFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { ROOT, codePaths, buildInventory, buildManifest, codeManifest, validateInventory, routeFor, incrementalPlan, serialize } from './lib.mjs';
import { buildKnowledge } from '../knowledge/catalog.mjs';
import { hash, validateManifest, provenance, emptyManifest, CODE_EXTRACTOR } from '../knowledge/common.mjs';

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'ta-pago-code-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  for (const dir of ['src/components', 'src/hooks', 'src/app', 'src/constants', 'knowledge']) mkdirSync(join(root, dir), { recursive: true });
  copyFileSync(join(ROOT, 'knowledge/code.schema.json'), join(root, 'knowledge/code.schema.json'));
  writeFileSync(join(root, 'knowledge/config.json'), JSON.stringify({ repository: 'mariomoutinho/ta-pago', branch: 'main', commit_sha: null }));
  return root;
}
function put(root, path, content) { mkdirSync(dirname(join(root, path)), { recursive: true }); writeFileSync(join(root, path), content); }
function example(t) {
  const root = fixture(t);
  put(root, 'src/constants/theme.ts', 'export const Spacing = { small: 4 };');
  put(root, 'src/hooks/use-toggle.ts', "import { useState } from 'react'; export function useToggle() { const [open, setOpen] = useState(false); return {open, setOpen}; }");
  put(root, 'src/components/card.tsx', "import { View, Pressable, Text } from 'react-native'; import {useToggle} from '@/hooks/use-toggle'; import {Spacing} from '@/constants/theme'; type Props = { title: string }; export function Card({title}: Props) { const {open,setOpen} = useToggle(); return <View style={{padding:Spacing.small}}><Pressable onPress={() => setOpen(!open)}>{open && <Text>{title}</Text>}</Pressable></View>; }");
  put(root, 'src/app/index.tsx', "import {Card} from '../components/card'; export default function Home(){return <Card title='Demo'/>;}");
  put(root, 'src/app/_layout.tsx', "import {Stack} from 'expo-router'; export default function Layout(){return <Stack/>;}");
  put(root, 'src/functions.ts', 'export function twice(n:number):number { return n * 2; } export const plus = (n:number) => n + 1;');
  return root;
}

test('detecta componentes, props, callbacks, filhos, hooks, funções e constantes com evidência', (t) => {
  const root = example(t); const inventory = buildInventory(root);
  const find = (type, name) => inventory.entities.find((e) => e.entity_type === type && e.name === name);
  const card = find('component', 'Card');
  assert.ok(card); assert.equal(card.exported, true); assert.match(card.props.definitions[0], /title: string/);
  assert.equal(card.props.bindings[0].name, 'title'); assert.ok(card.children.includes('Pressable')); assert.equal(card.callbacks[0].event, 'onPress');
  assert.ok(find('function', 'Card/callback:onPress'));
  assert.equal(find('hook', 'useToggle').uses_state, true);
  assert.ok(find('hook', 'useToggle').consumers.includes(card.id));
  assert.equal(find('function', 'twice').return_type, 'number'); assert.ok(find('function', 'plus'));
  assert.equal(find('constant', 'Spacing').value, '{ small: 4 }');
  assert.ok(inventory.entities.every((e) => e.evidence.length && e.evidence[0].start_line >= 1 && e.evidence[0].snippet));
  assert.equal(card.confidence, 'observed');
});

test('deriva rotas de arquivos; layout não vira rota navegável', (t) => {
  const root = example(t); const inventory = buildInventory(root);
  const routes = inventory.entities.filter((e) => e.entity_type === 'route');
  assert.deepEqual(routes.map((e) => e.route.path), ['/']);
  assert.ok(routes[0].route.layout); assert.equal(inventory.layouts.length, 1);
  assert.equal(routeFor('src/app/_layout.tsx').navigable, false);
  assert.equal(routeFor('src/app/(tabs)/users/[id].tsx').path, '/users/[id]');
  assert.equal(routeFor('src/app/explore.tsx').path, '/explore');
  assert.equal(routeFor('src/app/health+api.ts'), null);
});

test('relações ligam IDs reais com evidência; convenção de layout é inferred', (t) => {
  const root = example(t); const inventory = buildInventory(root);
  assert.ok(inventory.symbol_relations.some((r) => r.relation.kind === 'renders' && r.name.includes('Card')));
  assert.ok(inventory.symbol_relations.some((r) => r.relation.kind === 'uses-hook'));
  assert.ok(inventory.symbol_relations.some((r) => r.relation.kind === 'uses-constant'));
  assert.equal(inventory.symbol_relations.find((r) => r.relation.kind === 'file-layout-includes').confidence, 'inferred');
  const ids = new Set(inventory.entities.map((e) => e.id));
  assert.ok(inventory.symbol_relations.every((r) => ids.has(r.relation.from) && ids.has(r.relation.to)));
});

test('escopo local não inventa relação com constante sombreada', (t) => {
  const root = fixture(t);
  put(root, 'src/a.ts', 'const size = 4; export function display(size: number) { return size; }');
  const inventory = buildInventory(root);
  assert.equal(inventory.symbol_relations.length, 0);
});

test('variantes web, reexportação de hook e destino dinâmico preservam incerteza', (t) => {
  const root = fixture(t);
  put(root, 'src/hooks/use-color.ts', "export {useColorScheme} from 'react-native';");
  put(root, 'src/hooks/use-color.web.ts', "import {useEffect,useState} from 'react'; export function useColorScheme(){const [ready,setReady]=useState(false);useEffect(()=>setReady(true),[]);return ready?'dark':'light';}");
  put(root, 'src/components/link.tsx', "import {Link} from 'expo-router'; import {useColorScheme} from '../hooks/use-color'; export function Button({href}:{href:string}){const theme=useColorScheme(); return <Link href={href}>{theme}</Link>;} ");
  const inventory = buildInventory(root);
  const web = inventory.entities.find((e) => e.entity_type === 'hook' && e.variant === 'web');
  assert.ok(web.uses_state && web.uses_effect);
  assert.ok(inventory.entities.some((e) => e.export_kind === 'reexport'));
  assert.ok(inventory.symbol_relations.some((e) => e.confidence === 'inferred'));
  assert.ok(inventory.entities.find((e) => e.name === 'Button').behavior.some((b) => b.confidence === 'unknown'));
});

test('chunks e resumos são determinísticos; relações mantêm os dois símbolos', (t) => {
  const root = example(t);
  const first = buildManifest(root), second = buildManifest(root);
  assert.equal(serialize(first), serialize(second));
  assert.equal(first.chunks.length, first.code_entities.length + first.symbol_relations.length);
  assert.equal(first.semantic_summaries.length, first.chunks.length);
  const card = first.chunks.find((c) => c.source_id.includes(':component:Card'));
  assert.match(card.content, /type Props/); assert.match(card.content, /title/);
  assert.ok(card.semantic_summary.evidence.length); assert.ok(card.token_estimate > 0);
  for (const chunk of first.chunks) { const {sha256,...body}=chunk; assert.equal(sha256,hash(body)); }
  const relation = first.symbol_relations[0];
  const chunk = first.chunks.find((c) => c.source_id === relation.id);
  assert.ok(chunk.semantic_summary.related_symbols.some((s) => s.id === relation.relation.from));
  assert.ok(chunk.semantic_summary.related_symbols.some((s) => s.id === relation.relation.to));
});

test('embeddings e vetores ausentes e índices declarados sem inventar valores', (t) => {
  const root = example(t); const manifest = buildManifest(root);
  assert.deepEqual(manifest.embeddings, {status:'not_generated',model:null,items:[]});
  assert.deepEqual(manifest.vectors, {status:'not_generated',store:null,items:[]});
  assert.deepEqual(manifest.indexes.map((i) => i.type), ['path','symbol','domain','lexical']);
  assert.ok(manifest.indexes.every((i) => i.items.length===0));
  assert.equal(manifest.documents.length,0);
});

test('plano incremental diferencia adição, alteração, remoção e invariância, inclusive chunks', (t) => {
  const root = example(t); const before=buildManifest(root);
  const same = incrementalPlan(before,before);
  assert.equal(same.applied,false); assert.equal(same.code_entities.unchanged.length,before.code_entities.length);
  const empty = emptyManifest(provenance(root),'code',CODE_EXTRACTOR);
  assert.equal(incrementalPlan(empty,before).code_entities.added.length,before.code_entities.length);
  put(root,'src/new.ts','export const threshold = 8;');
  let plan = incrementalPlan(before,buildManifest(root));
  assert.equal(plan.code_entities.added.length,1); assert.equal(plan.chunks.added.length,1);
  put(root,'src/functions.ts','export function twice(n:number):number { return n * 3; } export const plus = (n:number) => n + 1;');
  plan = incrementalPlan(before,buildManifest(root));
  assert.ok(plan.code_entities.updated.some((e)=>e.after.name==='twice')); assert.ok(plan.chunks.updated.length);
  rmSync(join(root,'src/functions.ts'));
  plan = incrementalPlan(before,buildManifest(root));
  assert.ok(plan.code_entities.removed.some((e)=>e.name==='twice')); assert.ok(plan.chunks.removed.length);
});

test('mudança de relação, metadados e versões invalida os artefatos afetados', (t) => {
  const root=example(t); const before=buildManifest(root);
  put(root,'src/app/index.tsx',"import {Card} from '../components/card'; export default function Home(){return null;}");
  const plan=incrementalPlan(before,buildManifest(root));
  assert.ok(plan.symbol_relations.removed.some((r)=>r.name.includes('renders Card')));
  const extractor=structuredClone(before); extractor.extractor_version=before.extractor_version+'-next';
  assert.equal(incrementalPlan(before,extractor).code_entities.updated.length,before.code_entities.length);
  const chunking=structuredClone(before);chunking.chunking_version='atomic-v2';
  assert.equal(incrementalPlan(before,chunking).chunks.updated.length,before.chunks.length);
  assert.equal(incrementalPlan(before,chunking).code_entities.updated.length,0);
  const metadata=structuredClone(before);metadata.code_entities[0].version='1.1.0';
  assert.equal(incrementalPlan(before,metadata).code_entities.updated.length,1);
});

test('rejeita caminho fora da raiz, hash falso e relação inexistente', (t) => {
  const root=example(t);const inventory=buildInventory(root);
  let bad=structuredClone(inventory);bad.entities[0].source_path='src/../../outside.ts';
  assert.throws(()=>validateInventory(bad,root),/fora do repositório/);
  bad=structuredClone(inventory);bad.entities[0].sha256='a'.repeat(64);
  assert.throws(()=>validateInventory(bad,root),/Hash/);
  bad=structuredClone(inventory);bad.entities[0].references=['ta-pago.code:missing'];
  assert.throws(()=>validateInventory(bad,root),/inexistente/);
  const manifest=buildManifest(root);manifest.chunks[0].content='alterado';
  assert.throws(()=>validateManifest(manifest),/Hash/);
});

test('não ingere env, imagens, node_modules, logs, caches ou código gerado', (t) => {
  const root=example(t);
  for (const path of ['src/.env','src/.env.local','src/image.png','src/a.svg','src/node_modules/x.ts','src/assets/x.ts','src/generated/x.ts','src/cache/x.ts','src/logs/x.ts','src/model.generated.ts','src/types.d.ts']) put(root,path,'PRIVATE_SENTINEL');
  const inventory=buildInventory(root), manifest=buildManifest(root,inventory);
  assert.ok(!serialize(manifest).includes('PRIVATE_SENTINEL'));
  assert.ok(inventory.files.every((f)=>!f.source_path.includes('node_modules')&&!f.source_path.includes('.env')&&!f.source_path.endsWith('.png')));
});

test('possíveis tokens e dados pessoais excluem o arquivo; constante sensível guarda só nome', (t) => {
  const root=example(t);const token='ghp_'+'A'.repeat(36);
  put(root,'src/private.ts',`export const API_TOKEN = '${token}'; export function leak(){return API_TOKEN;}`);
  put(root,'src/contact.ts',`export const contact = '${'fixture'+'@example.test'}';`);
  put(root,'src/cpf.ts',`export const record = '${'123.456.'+'789-00'}';`);
  const inventory=buildInventory(root), manifest=buildManifest(root,inventory);
  const serialized=serialize(inventory)+serialize(manifest);
  assert.ok(!serialized.includes(token)); assert.ok(!serialized.includes('fixture@example.test')); assert.ok(!serialized.includes('123.456.789-00'));
  const stub=inventory.entities.find((e)=>e.name==='API_TOKEN');
  assert.equal(stub.value,null);assert.equal(stub.redacted,true);assert.equal(stub.source_sha256,null);
  assert.equal(inventory.exclusions.filter((e)=>e.reason==='sensitive-content-file-excluded').length,3);
});

test('rejeita links simbólicos internos, externos e diretórios', (t) => {
  for (const kind of ['internal','external','directory']) {
    const root=fixture(t);
    if(kind==='internal') {put(root,'src/original.ts','export const x=1;');symlinkSync(join(root,'src/original.ts'),join(root,'src/link.ts'));}
    if(kind==='external') symlinkSync('/tmp/does-not-exist.ts',join(root,'src/link.ts'));
    if(kind==='directory') symlinkSync('/tmp',join(root,'src/linked'));
    assert.throws(()=>codePaths(root),/simbólico/);
  }
});

test('proveniência rejeita SHA inventado quando o Git está disponível', (t) => {
  const root=fixture(t);
  const git=(...args)=>execFileSync('git',['-C',root,...args],{stdio:'pipe',encoding:'utf8'}).trim();
  git('init','-b','main');git('config','user.name','Fixture');git('config','user.email','fixture@example.invalid');
  put(root,'source.txt','initial');git('add','source.txt');git('commit','-m','fixture');
  const sha=git('rev-parse','HEAD');
  writeFileSync(join(root,'knowledge/config.json'),JSON.stringify({repository:'mariomoutinho/ta-pago',branch:'main',commit_sha:sha}));
  assert.equal(provenance(root).commit_sha,sha);
  writeFileSync(join(root,'knowledge/config.json'),JSON.stringify({repository:'mariomoutinho/ta-pago',branch:'main',commit_sha:'f'.repeat(40)}));
  assert.throws(()=>provenance(root),/commit_sha/);
});

test('linhas de origem, tipo de constante, contagens e grupos conferem com entidades reais', (t) => {
  const root = example(t);
  const inventory = buildInventory(root);
  for (const [type, ids] of Object.entries(inventory.groups)) {
    assert.equal(ids.length, inventory.counts[type]);
    assert.ok(ids.every((id) => [...inventory.entities, ...inventory.symbol_relations].some((e) => e.id === id && e.entity_type === type)));
  }
  const value = inventory.entities.find((e) => e.entity_type === 'constant');
  assert.equal(value.value_type, 'ObjectLiteralExpression');
  for (const entity of [...inventory.entities, ...inventory.symbol_relations]) {
    assert.equal(entity.start_line, entity.evidence[0].start_line);
    assert.equal(entity.end_line, entity.evidence[0].end_line);
  }
});

test('não classifica função que retorna número como componente apenas por nome ou diretório', (t) => {
  const root = fixture(t);
  put(root, 'src/components/numeric.tsx', 'export function NumberHelper() { return 3; } export function Factory() { return () => <span/>; }');
  const inventory = buildInventory(root);
  assert.equal(inventory.entities.find((e) => e.name === 'NumberHelper').entity_type, 'function');
  assert.equal(inventory.entities.find((e) => e.name === 'Factory').entity_type, 'function');
});

test('handlers e variantes web têm relações com duas evidências para a variante', (t) => {
  const root = example(t);
  put(root, 'src/components/card.web.tsx', 'export function Card() { return <div/>; }');
  const inventory = buildInventory(root);
  const variant = inventory.symbol_relations.find((e) => e.relation.kind === 'has-web-variant');
  assert.ok(variant); assert.equal(variant.confidence, 'inferred'); assert.equal(variant.evidence.length, 2);
  assert.ok(inventory.symbol_relations.some((e) => e.relation.kind === 'handles-event'));
});

test('catálogo público de código usa entities e plano v1 expõe mudanças e permanece não aplicado', (t) => {
  const root = example(t);
  const before = codeManifest(root);
  assert.equal(before.schema_version, 1); assert.equal(before.version, 'code-knowledge-v1');
  assert.ok(before.entities.length); assert.ok(before.chunks.every((c) => c.source_type === 'code' && c.name && c.metadata.entity_type));
  put(root, 'src/new.ts', 'export const LIMIT = 4;');
  const plan = incrementalPlan(before, codeManifest(root));
  assert.equal(plan.schema_version, 1); assert.equal(plan.applied, false);
  assert.equal(plan.added.length, 1); assert.equal(plan.chunks.added.length, 1);
  assert.ok(plan.unchanged.length);
});

test('manifesto principal agrega extração real mesmo sem nenhum inventário gerado em disco', (t) => {
  const root = example(t);
  mkdirSync(join(root, 'docs'));
  copyFileSync(join(ROOT, 'knowledge/document.schema.json'), join(root, 'knowledge/document.schema.json'));
  const meta = JSON.parse(readFileSync(join(ROOT, 'README.md'), 'utf8').split('---')[1]);
  for (const name of ['README', 'AGENTS']) {
    const m = { ...meta, id: `ta-pago.${name}`, title: name, sources: [], related_documents: [], supersedes: [], indexable: name === 'README', commit_sha: null };
    put(root, `${name}.md`, `---\n${JSON.stringify(m)}\n---\n\n# ${name}\n\nDocumento de fixture.\n`);
  }
  const aggregate = buildKnowledge(root), code = codeManifest(root);
  assert.equal(aggregate.catalog, 'knowledge'); assert.equal(aggregate.schema_version, 2);
  assert.equal(aggregate.documents.length, 1);
  assert.deepEqual(aggregate.code_entities, code.entities);
  assert.deepEqual(aggregate.symbol_relations, code.symbol_relations);
  assert.deepEqual(aggregate.chunks.filter((c) => c.source_type === 'code'), code.chunks);
  assert.equal(aggregate.chunks.length, aggregate.semantic_summaries.length);
  assert.equal(aggregate.code_artifacts[1].sha256, hash(code));
  assert.equal(serialize(buildKnowledge(root)), serialize(aggregate));
});

test('code:check rejeita inventário/manifesto vazio, hash falso, relação falsa e fonte alterada', (t) => {
  const root = example(t);
  for (const dir of ['scripts/code', 'scripts/knowledge']) mkdirSync(join(root, dir), { recursive: true });
  for (const name of ['lib.mjs', 'cli.mjs']) copyFileSync(join(ROOT, 'scripts/code', name), join(root, 'scripts/code', name));
  copyFileSync(join(ROOT, 'scripts/knowledge/common.mjs'), join(root, 'scripts/knowledge/common.mjs'));
  symlinkSync(join(ROOT, 'node_modules'), join(root, 'node_modules'), 'dir');
  const run = (command) => spawnSync(process.execPath, [join(root, 'scripts/code/cli.mjs'), command], { encoding: 'utf8' });
  assert.equal(run('inventory').status, 0); assert.equal(run('check').status, 0);
  const originals = Object.fromEntries(['code-inventory.json', 'code-manifest.json'].map((name) => [name, readFileSync(join(root, 'knowledge', name), 'utf8')]));
  const checkMutation = (file, mutate) => {
    const data = JSON.parse(originals[file]); mutate(data);
    writeFileSync(join(root, 'knowledge', file), serialize(data));
    assert.equal(run('check').status, 1);
    writeFileSync(join(root, 'knowledge', file), originals[file]);
  };
  checkMutation('code-inventory.json', (d) => { d.entities = []; });
  checkMutation('code-manifest.json', (d) => { d.entities = []; d.chunks = []; d.symbol_relations = []; d.semantic_summaries = []; });
  checkMutation('code-manifest.json', (d) => { d.chunks[0].sha256 = '0'.repeat(64); });
  checkMutation('code-inventory.json', (d) => { d.symbol_relations[0].relation.to = 'ta-pago.code:missing'; });
  checkMutation('code-inventory.json', (d) => { d.entities[0].source_path = '../outside.ts'; });
  put(root, 'src/new.ts', 'export const NEW_LIMIT = 5;');
  assert.equal(run('check').status, 1);
  assert.equal(run('inventory').status, 0); assert.equal(run('check').status, 0);
});
