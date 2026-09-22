import ts from 'typescript';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { posix } from 'node:path';
import { ROOT, CODE_EXTRACTOR, CHUNKING, safePath, readJSON, provenance, fail, hash, canonical, byId, unique, emptyManifest, makeChunk, summaries, validateValue, validateManifest, incrementalPlan as planV2 } from '../knowledge/common.mjs';
export { ROOT, serialize } from '../knowledge/common.mjs';
export const INVENTORY = 'knowledge/code-inventory.json';
export const MANIFEST = 'knowledge/code-manifest.json';
const blockedDirs = new Set(['node_modules', 'assets', 'dist', 'build', 'generated', '__generated__', 'coverage', 'logs', 'cache', 'caches', 'fixtures', '__fixtures__', 'personal-data']);
const secretName = /(?:api[_-]?key|password|passwd|secret|token|credential|private[_-]?key)/i;
const privateValue = /-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----|gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|AKIA[0-9A-Z]{16}|sk-[A-Za-z0-9]{20,}|Bearer\s+[A-Za-z0-9._-]{12,}|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|\b\d{3}\.\d{3}\.\d{3}-\d{2}\b|\+\d[\d ()-]{10,}\d/i;

export function codePaths(root) {
  const paths = [], exclusions = [];
  function walk(dir) {
    for (const item of readdirSync(safePath(root, dir), { withFileTypes: true })) {
      const path = `${dir}/${item.name}`;
      // Recusar links antes de qualquer tentativa de leitura, inclusive em diretórios excluídos.
      safePath(root, path);
      if (item.name.startsWith('.') || blockedDirs.has(item.name)) {
        exclusions.push({ source_path: path, reason: 'excluded-path' }); continue;
      }
      if (item.isDirectory()) walk(path);
      else if (/\.(ts|tsx)$/.test(path) && !/\.d\.ts$|\.(generated|gen|test|spec)\.tsx?$/.test(path)) paths.push(path);
      else exclusions.push({ source_path: path, reason: 'not-source-or-generated' });
    }
  }
  walk('src');
  return { paths: paths.sort(), exclusions: exclusions.sort((a, b) => a.source_path < b.source_path ? -1 : 1) };
}

const walk = (node, fn) => { fn(node); ts.forEachChild(node, (child) => walk(child, fn)); };
const text = (node, sf) => node?.getText(sf) ?? null;
const modified = (node, kind) => node.modifiers?.some((m) => m.kind === kind) ?? false;
const functionNode = (node) => ts.isFunctionDeclaration(node) || ts.isArrowFunction(node) || ts.isFunctionExpression(node) || ts.isMethodDeclaration(node);
const jsxNode = (node) => ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node);
const idFor = (path, kind, name) => `ta-pago.code:${path}:${kind}:${encodeURIComponent(name)}`;
const isFunctionName = (name) => /^use[A-Z0-9]/.test(name);


function ownReturns(node) {
  if (ts.isArrowFunction(node) && !ts.isBlock(node.body)) return [node.body];
  const returns = [];
  function visit(child) {
    if (child !== node && functionNode(child)) return;
    if (ts.isReturnStatement(child) && child.expression) returns.push(child.expression);
    ts.forEachChild(child, visit);
  }
  visit(node);
  return returns;
}
function containsReturnedJSX(expression) {
  let found = false;
  function visit(node) {
    if (functionNode(node)) return;
    if (jsxNode(node) || ts.isJsxFragment(node)) found = true;
    ts.forEachChild(node, visit);
  }
  visit(expression);
  return found;
}
export const ENTITY_TYPES = ['component', 'hook', 'route', 'function', 'constant', 'interface-behavior', 'symbol-relation'];
export function groupsOf(inventory) {
  return Object.fromEntries(ENTITY_TYPES.map((kind) => [kind, [...inventory.entities, ...inventory.symbol_relations].filter((e) => e.entity_type === kind).map((e) => e.id).sort()]));
}
export function countsOf(inventory) { return Object.fromEntries(Object.entries(groupsOf(inventory)).map(([kind, ids]) => [kind, ids.length])); }

export function routeFor(path) {
  if (!/^src\/app\/.+\.tsx?$/.test(path) || /(?:\+api|\.(?:api|test|spec))\.tsx?$/.test(path)) return null;
  const stem = path.slice('src/app/'.length).replace(/\.(?:web|native|ios|android)\.tsx?$/, '').replace(/\.tsx?$/, '');
  const parts = stem.split('/');
  if (parts.at(-1) === '_layout') return { kind: 'layout', path: null, navigable: false };
  if (parts.at(-1).startsWith('+')) return null;
  return { kind: 'screen', path: '/' + parts.filter((p, i) => !/^\(.+\)$/.test(p) && !(p === 'index' && i === parts.length - 1)).join('/'), navigable: true };
}

function evidence(node, sf, path, snippet = text(node, sf)) {
  return { source_path: path, start_line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1,
    end_line: sf.getLineAndCharacterOfPosition(node.end).line + 1, snippet };
}

function importsOf(sf) {
  const imports = [];
  for (const node of sf.statements) {
    if (!ts.isImportDeclaration(node)) continue;
    const source = node.moduleSpecifier.text;
    const clause = node.importClause;
    if (!clause) { imports.push({ source, imported: null, local: null, type_only: false }); continue; }
    if (clause.name) imports.push({ source, imported: 'default', local: clause.name.text, type_only: !!clause.isTypeOnly });
    const bindings = clause.namedBindings;
    if (bindings && ts.isNamespaceImport(bindings)) imports.push({ source, imported: '*', local: bindings.name.text, type_only: !!clause.isTypeOnly });
    else for (const binding of bindings?.elements ?? []) imports.push({ source, imported: binding.propertyName?.text ?? binding.name.text, local: binding.name.text, type_only: !!clause.isTypeOnly || !!binding.isTypeOnly });
  }
  return imports;
}

function propsOf(node, sf) {
  const first = node.parameters?.[0];
  if (!first) return { signature: null, bindings: [], definitions: [] };
  const definitions = [];
  const seen = new Set();
  function resolveType(type) {
    if (!type) return;
    walk(type, (child) => {
      if (!ts.isTypeReferenceNode(child)) return;
      const name = child.typeName.getText(sf);
      if (seen.has(name)) return;
      seen.add(name);
      const decl = sf.statements.find((s) => (ts.isTypeAliasDeclaration(s) || ts.isInterfaceDeclaration(s)) && s.name.text === name);
      if (decl) { definitions.push(decl.getText(sf)); resolveType(decl); }
    });
  }
  resolveType(first.type);
  return { signature: first.getText(sf), bindings: ts.isObjectBindingPattern(first.name) ? first.name.elements.map((b) => ({ name: b.name.getText(sf), property: b.propertyName?.getText(sf) ?? b.name.getText(sf), default: text(b.initializer, sf), rest: !!b.dotDotDotToken })) : [], definitions };
}

function observations(node, sf, path) {
  const children = [], calls = [], events = [], links = [], conditions = [], returns = [];
  walk(node, (child) => {
    if (jsxNode(child)) children.push({ name: child.tagName.getText(sf), node: child.tagName });
    if (ts.isCallExpression(child)) calls.push({ name: child.expression.getText(sf), node: child });
    if (ts.isJsxAttribute(child)) {
      const name = child.name.getText(sf);
      if (/^on[A-Z]/.test(name) || (name === 'style' && child.initializer && child.initializer.getText(sf).includes('=>'))) events.push({ name, expression: text(child.initializer, sf), node: child });
      if (name === 'href') {
        const init = child.initializer;
        const literal = init && (ts.isStringLiteral(init) ? init : ts.isJsxExpression(init) && init.expression && ts.isStringLiteral(init.expression) ? init.expression : null);
        links.push({ target: literal?.text ?? null, expression: text(init, sf), node: child });
      }
    }
    if (ts.isIfStatement(child)) conditions.push(text(child.expression, sf));
    if (ts.isConditionalExpression(child)) conditions.push(text(child.condition, sf));
    if (ts.isBinaryExpression(child) && child.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) conditions.push(text(child.left, sf));
    if (ts.isReturnStatement(child)) returns.push(text(child.expression, sf));
  });
  return { children, calls, events, links, conditions: unique(conditions.filter(Boolean)), returns: unique(returns.filter(Boolean)) };
}

export function buildInventory(root = ROOT) {
  const config = provenance(root);
  const { paths, exclusions } = codePaths(root);
  const files = new Map();
  const rejectedConstants = [];
  for (const path of paths) {
    const raw = readFileSync(safePath(root, path), 'utf8');
    const sf = ts.createSourceFile(path, raw, ts.ScriptTarget.Latest, true, path.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    if (sf.parseDiagnostics.length) fail(`${path}: TypeScript não pôde ser analisado`);
    const sensitive = [];
    walk(sf, (node) => {
      if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && secretName.test(node.name.text)) sensitive.push(node);
    });
    if (privateValue.test(raw) || sensitive.length) {
      exclusions.push({ source_path: path, reason: 'sensitive-content-file-excluded', symbols: sensitive.map((n) => n.name.text).sort() });
      // Somente nome e localização são preservados; nenhum valor, comentário ou hash do segredo.
      for (const node of sensitive) rejectedConstants.push({ name: node.name.text, path, line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1 });
      continue;
    }
    if (/@generated|<auto-generated/i.test(raw)) { exclusions.push({ source_path: path, reason: 'generated-source' }); continue; }
    files.set(path, { raw, sf, imports: importsOf(sf) });
  }
  const entities = [], records = new Map(), declarations = new Map(), exportMap = new Map();
  const common = (path, kind, name, node, sf) => ({ id: idFor(path, kind, name), entity_type: kind, name, source_path: path, ...config, version: '1.0.0', framework_version: 'Expo 57; React Native 0.86.2; TypeScript 6',
    domain: kind === 'hook' ? 'hooks' : kind === 'route' ? 'routing' : kind === 'component' ? 'components' : 'ui',
    exported: false, export_kind: 'none', parent: null, references: [], imports: [], props: null, parameters: [], return_type: null, route: null, behavior: [],
    start_line: evidence(node, sf, path).start_line, end_line: evidence(node, sf, path).end_line, value_type: null,
    evidence: [evidence(node, sf, path)], confidence: 'observed', status: 'current', source_sha256: hash(files.get(path).raw),
    extractor_version: CODE_EXTRACTOR, chunking_version: CHUNKING, variant: /\.(web|native|ios|android)\.tsx?$/.exec(path)?.[1] ?? 'shared',
    consumers: [], callbacks: [], children: [], calls: [], links: [], uses_state: false, uses_effect: false, uses_theme: false, native_components: [] });
  const add = (entity, node, sf, path) => {
    if (records.has(entity.id)) fail(`Colisão de ID: ${entity.id}`);
    entities.push(entity); records.set(entity.id, { entity, node, sf, path });
    if (node) declarations.set(node, entity);
    return entity;
  };
  for (const [path, file] of files) {
    const { sf, imports } = file;
    const named = new Map();
    const processFunction = (node, name, owner, exportKind = 'none') => {
      const isHook = isFunctionName(name) && exportKind !== 'none';
      const returns = ownReturns(node);
      const renders = returns.some(containsReturnedJSX);
      const counterpart = files.get(path.replace('.web.', '.'))?.sf.statements.find((n) => ts.isFunctionDeclaration(n) && n.name?.text === name);
      const nullVariant = path.includes('.web.') && returns.length && returns.every((expr) => expr.kind === ts.SyntaxKind.NullKeyword) && counterpart && ownReturns(counterpart).some(containsReturnedJSX);
      const isComponent = !owner && /^[A-Z]/.test(name) && (renders || nullVariant);
      const kind = isHook ? 'hook' : isComponent ? 'component' : 'function';
      const entity = common(path, kind, name, node, sf);
      entity.exported = exportKind !== 'none'; entity.export_kind = exportKind;
      if (isComponent && !renders) entity.confidence = 'inferred';
      entity.parent = owner?.id ?? null; entity.imports = imports;
      entity.parameters = (node.parameters ?? []).map((p) => p.getText(sf));
      entity.return_type = text(node.type, sf);
      entity.props = isComponent ? propsOf(node, sf) : null;
      const obs = observations(node, sf, path);
      entity.children = unique(obs.children.map((c) => c.name));
      entity.calls = unique(obs.calls.map((c) => c.name));
      entity.links = obs.links.map((l) => ({ target: l.target, expression: l.expression }));
      entity.callbacks = obs.events.map((e) => ({ event: e.name, expression: e.expression }));
      const importedHook = (imported) => imports.some((i) => i.imported === imported && entity.calls.includes(i.local));
      entity.uses_state = importedHook('useState'); entity.uses_effect = importedHook('useEffect');
      entity.uses_theme = entity.calls.some((c) => /useTheme|useColorScheme|useRNColorScheme/.test(c));
      entity.native_components = entity.children.filter((name) => imports.some((i) => i.source === 'react-native' && i.local === name));
      const behavior = (description, nodeForEvidence = node, confidence = 'observed') => entity.behavior.push({ description, evidence: [evidence(nodeForEvidence, sf, path)], confidence });
      if (entity.children.length) behavior(`Contém JSX que referencia ${entity.children.join(', ')}; a execução visual não foi testada.`);
      if (entity.uses_state) behavior('Declara estado React com useState.');
      if (entity.uses_effect) behavior('Declara efeito React com useEffect; efeito e dependências constam na evidência.');
      if (entity.uses_theme) behavior(`Consulta tema/esquema de cores pelas chamadas ${entity.calls.filter((c) => /useTheme|useColorScheme|useRNColorScheme/.test(c)).join(', ')}; não implica controle manual de tema.`);
      for (const event of obs.events) behavior(`Associa ${event.name} à expressão ${event.expression}.`, event.node);
      for (const link of obs.links) behavior(link.target ? `Declara link href=${JSON.stringify(link.target)}.` : `Recebe destino de link pela expressão ${link.expression}; destino em execução não resolvido.`, link.node, link.target ? 'observed' : 'unknown');
      if (obs.conditions.length) behavior(`Condiciona execução/renderização a: ${obs.conditions.join('; ')}.`);
      if (entity.variant !== 'shared') behavior(`Variante ${entity.variant} identificada pelo nome do arquivo.`);
      if (isHook && obs.returns.length) behavior(`Expressões de retorno declaradas: ${obs.returns.join('; ')}.`);
      if (obs.returns.length === 1 && obs.returns[0] === 'null') behavior('Retorna null; esta implementação não renderiza conteúdo.');
      if (!entity.behavior.length && entity.calls.length) behavior(`Declara chamadas a ${entity.calls.join(', ')}; efeitos externos não foram executados.`);
      if (!entity.behavior.length) behavior(`Declara ${kind} ${name}; sem efeito de interface demonstrável pela análise local.`, node, 'unknown');
      add(entity, node, sf, path); named.set(name, entity);
      if (node.parent && ts.isVariableDeclaration(node.parent)) declarations.set(node.parent, entity);
      if (entity.exported) exportMap.set(`${path}:${exportKind === 'default' ? 'default' : name}`, entity);
      const callbacks = new Map();
      function nested(child) {
        if (child !== node && functionNode(child)) {
          let label;
          if (child.name) label = child.name.getText(sf);
          else if (ts.isVariableDeclaration(child.parent)) label = child.parent.name.getText(sf);
          else {
            let ancestor = child.parent;
            while (ancestor && ancestor !== node && !ts.isJsxAttribute(ancestor) && !ts.isCallExpression(ancestor)) ancestor = ancestor.parent;
            label = ts.isJsxAttribute(ancestor) ? `callback:${ancestor.name.getText(sf)}` : ts.isCallExpression(ancestor) ? `callback:${ancestor.expression.getText(sf)}` : 'callback';
          }
          const count = (callbacks.get(label) ?? 0) + 1; callbacks.set(label, count);
          processFunction(child, `${name}/${label}${count > 1 ? ':' + count : ''}`, entity);
          return;
        }
        ts.forEachChild(child, nested);
      }
      ts.forEachChild(node, nested);
      return entity;
    };
    for (const node of sf.statements) {
      const exportKind = modified(node, ts.SyntaxKind.DefaultKeyword) ? 'default' : modified(node, ts.SyntaxKind.ExportKeyword) ? 'named' : 'none';
      if (ts.isFunctionDeclaration(node) && node.body) processFunction(node, node.name?.text ?? 'default', null, exportKind);
      else if (ts.isVariableStatement(node) && (node.declarationList.flags & ts.NodeFlags.Const)) {
        for (const decl of node.declarationList.declarations) {
          if (!ts.isIdentifier(decl.name)) continue;
          if (decl.initializer && functionNode(decl.initializer)) processFunction(decl.initializer, decl.name.text, null, exportKind);
          else {
            const entity = common(path, 'constant', decl.name.text, decl, sf);
            entity.exported = exportKind !== 'none'; entity.export_kind = exportKind; entity.imports = imports;
            entity.value = text(decl.initializer, sf);
            entity.value_type = decl.type?.getText(sf) ?? (decl.initializer ? ts.SyntaxKind[decl.initializer.kind] : null);
            entity.behavior = [{ description: `Declara a constante ${decl.name.text}; valor/expressão presente na evidência, sem executar inicializador.`, evidence: entity.evidence, confidence: 'observed' }];
            add(entity, decl, sf, path); named.set(entity.name, entity);
            if (entity.exported) exportMap.set(`${path}:${entity.name}`, entity);
          }
        }
      } else if (ts.isExportDeclaration(node) && node.exportClause && ts.isNamedExports(node.exportClause)) {
        for (const binding of node.exportClause.elements) {
          if (node.moduleSpecifier && isFunctionName(binding.name.text)) {
            const entity = common(path, 'hook', binding.name.text, node, sf);
            entity.exported = true; entity.export_kind = 'reexport';
            entity.imports = [{ source: node.moduleSpecifier.text, imported: binding.propertyName?.text ?? binding.name.text, local: binding.name.text, type_only: false }];
            entity.behavior = [{ description: `Reexporta ${binding.name.text} de ${node.moduleSpecifier.text}; implementação externa não ingerida.`, evidence: entity.evidence, confidence: 'observed' }];
            add(entity, node, sf, path); named.set(entity.name, entity); exportMap.set(`${path}:${entity.name}`, entity);
          }
        }
      }
    }
    // Exportação local separada da declaração, inclusive export default ArrowComponent.
    for (const node of sf.statements) {
      if (ts.isExportAssignment(node) && ts.isIdentifier(node.expression)) {
        const entity = named.get(node.expression.text);
        if (entity) { entity.exported = true; entity.export_kind = 'default'; exportMap.set(`${path}:default`, entity); }
      }
      if (ts.isExportDeclaration(node) && !node.moduleSpecifier && node.exportClause && ts.isNamedExports(node.exportClause)) {
        for (const binding of node.exportClause.elements) {
          const entity = named.get(binding.propertyName?.text ?? binding.name.text);
          if (entity) { entity.exported = true; entity.export_kind = 'named'; exportMap.set(`${path}:${binding.name.text}`, entity); }
        }
      }
    }
    const info = routeFor(path), screen = exportMap.get(`${path}:default`);
    if (info && screen) {
      if (info.kind === 'layout') screen.route = { ...info, layout: null, components: screen.children, links: screen.links };
      else {
        const entity = common(path, 'route', info.path, records.get(screen.id).node, sf);
        entity.exported = true; entity.export_kind = 'default'; entity.references = [screen.id];
        entity.route = { ...info, layout: null, components: screen.children, links: screen.links };
        entity.behavior = [{ description: `Arquivo de página Expo Router corresponde a ${info.path}; exportação default ${screen.name}.`, evidence: entity.evidence, confidence: 'observed' }];
        // A declaração continua apontando ao componente, não ao metadado de rota.
        entities.push(entity); records.set(entity.id, { entity, node: records.get(screen.id).node, sf, path });
      }
    }
  }
  // O checker resolve escopos locais. O host nunca lê imports externos ou node_modules.
  const host = { getSourceFile: (name) => files.get(name)?.sf, getDefaultLibFileName: () => '', writeFile() {}, getCurrentDirectory: () => '', getDirectories: () => [], fileExists: (name) => files.has(name), readFile: (name) => files.get(name)?.raw, getCanonicalFileName: (name) => name, useCaseSensitiveFileNames: () => true, getNewLine: () => '\n' };
  const program = ts.createProgram([...files.keys()], { noResolve: true, noLib: true, jsx: ts.JsxEmit.Preserve }, host);
  const checker = program.getTypeChecker();
  function resolveImport(path, imp) {
    if (!imp || imp.type_only || !(imp.source.startsWith('.') || imp.source.startsWith('@/'))) return null;
    const base = imp.source.startsWith('@/') ? 'src/' + imp.source.slice(2) : posix.normalize(posix.join(posix.dirname(path), imp.source));
    const web = path.includes('.web.');
    const extensions = web ? ['.web.tsx', '.web.ts', '.tsx', '.ts', '/index.web.tsx', '/index.web.ts', '/index.tsx', '/index.ts'] : ['.tsx', '.ts', '/index.tsx', '/index.ts'];
    const target = [base, ...extensions.map((ext) => base + ext)].find((candidate) => files.has(candidate));
    return target ? exportMap.get(`${target}:${imp.imported}`) ?? null : null;
  }
  const relations = new Map();
  function relate(from, to, kind, ev, confidence = 'observed', additionalEvidence = []) {
    if (!to || from.id === to.id) return;
    const id = idFor(from.source_path, 'symbol-relation', `${from.id}|${kind}|${to.id}`);
    if (relations.has(id)) return;
    const entity = { ...from, id, entity_type: 'symbol-relation', name: `${from.name} ${kind} ${to.name}`, exported: false, export_kind: 'none', parent: from.id,
      references: [from.id, to.id], imports: [], props: null, parameters: [], return_type: null, route: null, callbacks: [], children: [], calls: [], links: [], consumers: [],
      relation: { from: from.id, to: to.id, kind }, start_line: ev.start_line, end_line: ev.end_line, value_type: null, evidence: [ev, ...additionalEvidence], confidence,
      behavior: [{ description: `${from.name} ${kind} ${to.name}.`, evidence: [ev], confidence }] };
    delete entity.value;
    relations.set(id, entity); from.references.push(to.id); to.consumers.push(from.id);
  }
  for (const record of records.values()) {
    const { entity, node, sf, path } = record;
    if (entity.entity_type === 'route') {
      relate(entity, exportMap.get(`${path}:default`), 'renders', entity.evidence[0]); continue;
    }
    walk(node, (n) => {
      if (!ts.isIdentifier(n)) return;
      const symbol = checker.getSymbolAtLocation(n);
      const decl = symbol?.declarations?.[0];
      let target = declarations.get(decl);
      let confidence = 'observed';
      if (!target && (decl && (ts.isImportSpecifier(decl) || ts.isImportClause(decl)) || !decl)) {
        const imp = files.get(path).imports.find((i) => i.local === n.text);
        target = resolveImport(path, imp);
        // Módulo compartilhado pode ter variante web selecionada pelo bundler em runtime.
        if (target && !path.includes('.web.') && files.has(target.source_path.replace(/\.tsx?$/, (ext) => '.web' + ext))) confidence = 'inferred';
      }
      if (!target) return;
      if (decl === n.parent || ts.isParameter(n.parent)) return;
      const parent = n.parent;
      const kind = jsxNode(parent) && parent.tagName === n ? 'renders' : ts.isCallExpression(parent) && parent.expression === n ? (target.entity_type === 'hook' ? 'uses-hook' : 'calls') : target.entity_type === 'constant' ? 'uses-constant' : 'references';
      relate(entity, target, kind, evidence(n, sf, path), confidence);
    });
  }
  const routes = entities.filter((e) => e.entity_type === 'route');
  const layouts = entities.filter((e) => e.route?.kind === 'layout');
  for (const entity of [...routes, ...layouts]) {
    const dir = posix.dirname(entity.source_path);
    const layout = layouts.filter((l) => l.id !== entity.id && (dir === posix.dirname(l.source_path) || dir.startsWith(posix.dirname(l.source_path) + '/'))).sort((a, b) => b.source_path.length - a.source_path.length)[0];
    if (layout) {
      entity.route.layout = layout.id;
      relate(layout, entity, 'file-layout-includes', layout.evidence[0], 'inferred');
    }
  }
  for (const entity of entities) for (const link of entity.links) {
    for (const route of routes.filter((r) => r.route.path === link.target)) relate(entity, route, 'links-to', entity.evidence[0]);
  }
  for (const entity of entities) {
    if (['component', 'hook'].includes(entity.entity_type) && entity.variant === 'shared') {
      const variant = entities.find((v) => v.entity_type === entity.entity_type && v.name === entity.name && v.source_path === entity.source_path.replace(/\.tsx?$/, (ext) => '.web' + ext));
      if (variant) relate(entity, variant, 'has-web-variant', entity.evidence[0], 'inferred', variant.evidence);
    }
    if (entity.entity_type === 'function' && /\/callback:on[A-Z][^/]*$/.test(entity.name)) {
      const parent = records.get(entity.parent)?.entity;
      if (parent) relate(entity, parent, 'handles-event', entity.evidence[0]);
    }
  }
  // Uma unidade explícita para cada comportamento de componente/hook/rota/função.
  const behaviors = entities.filter((e) => ['component', 'hook', 'route', 'function'].includes(e.entity_type)).map((source) => ({
    ...source, id: idFor(source.source_path, 'interface-behavior', source.name), entity_type: 'interface-behavior', name: `Comportamento de ${source.name}`,
    exported: false, export_kind: 'none', parent: source.id, references: [source.id, ...source.references], props: null, parameters: [], return_type: null, route: null,
    confidence: source.behavior.some((b) => b.confidence === 'unknown') ? 'unknown' : source.behavior.some((b) => b.confidence === 'inferred') ? 'inferred' : 'observed' }));
  for (const source of rejectedConstants) {
    const stub = { id: idFor(source.path, 'constant', source.name), entity_type: 'constant', name: source.name, source_path: source.path, ...config, version: '1.0.0', framework_version: null, domain: 'development', exported: false, export_kind: 'unknown', parent: null, references: [], imports: [], props: null, parameters: [], return_type: null, route: null, behavior: [], evidence: [{ source_path: source.path, start_line: source.line, end_line: source.line, snippet: '[valor e declaração excluídos por possível conteúdo sensível]' }], confidence: 'unknown', status: 'current', start_line: source.line, end_line: source.line, value_type: null, source_sha256: null, extractor_version: CODE_EXTRACTOR, chunking_version: CHUNKING, redacted: true, value: null, variant: 'unknown', consumers: [], callbacks: [], children: [], calls: [], links: [], uses_state: false, uses_effect: false, uses_theme: false, native_components: [] };
    entities.push(stub);
  }
  const finalize = (entity) => {
    entity.references = unique(entity.references); entity.consumers = unique(entity.consumers);
    return { ...entity, sha256: hash(entity) };
  };
  const inventory = { schema_version: 1, ...config, version: 'code-inventory-v1', extractor_version: CODE_EXTRACTOR, chunking_version: CHUNKING,
    files: [...files].map(([path, f]) => ({ source_path: path, sha256: hash(f.raw) })),
    exclusions: exclusions.sort((a, b) => a.source_path < b.source_path ? -1 : 1),
    entities: [...entities, ...behaviors].map(finalize).sort(byId), symbol_relations: [...relations.values()].map(finalize).sort(byId), layouts: layouts.map((e) => e.id).sort() };
  inventory.counts = countsOf(inventory);
  inventory.groups = groupsOf(inventory);
  validateInventory(inventory, root);
  return inventory;
}

export function validateInventory(inventory, root = ROOT) {
  const schema = readJSON(root, 'knowledge/code.schema.json');
  const config = provenance(root);
  const all = [...inventory.entities, ...inventory.symbol_relations];
  const ids = new Set(all.map((e) => e.id));
  if (ids.size !== all.length) fail('ID de código duplicado');
  for (const entity of all) {
    validateValue(entity, schema, entity.id);
    for (const key of ['repository', 'branch', 'commit_sha']) if (entity[key] !== config[key]) fail(`Código com ${key} inconsistente`);
    if (!/^src\/.+\.tsx?$/.test(entity.source_path)) fail('Caminho fora do corpus de código');
    safePath(root, entity.source_path);
    if (!existsSync(safePath(root, entity.source_path))) fail('Fonte de código ausente');
    if (entity.references.some((id) => !ids.has(id)) || (entity.parent && !ids.has(entity.parent))) fail('Referência de código inexistente');
    const { sha256, ...body } = entity;
    if (sha256 !== hash(body)) fail('Hash de entidade inválido');
    if (!entity.evidence.length) fail('Entidade sem evidência');
    if (entity.start_line !== entity.evidence[0].start_line || entity.end_line !== entity.evidence[0].end_line || entity.start_line > entity.end_line) fail('Linhas de evidência inconsistentes');
    if (entity.relation && (entity.references.length !== 2 || !ids.has(entity.relation.from) || !ids.has(entity.relation.to) || !entity.references.includes(entity.relation.from) || !entity.references.includes(entity.relation.to))) fail('Relação de código inexistente ou inconsistente');
    if (privateValue.test(canonical(entity))) fail('Possível dado sensível no inventário');
  }
  if (canonical(inventory.counts) !== canonical(countsOf(inventory)) || canonical(inventory.groups) !== canonical(groupsOf(inventory))) fail('Contagens ou grupos inconsistentes');
  return inventory;
}

export function buildManifest(root = ROOT, inventory = buildInventory(root)) {
  const manifest = emptyManifest(provenance(root), 'code', CODE_EXTRACTOR);
  manifest.code_entities = inventory.entities;
  manifest.symbol_relations = inventory.symbol_relations;
  const entities = new Map([...inventory.entities, ...inventory.symbol_relations].map((e) => [e.id, e]));
  manifest.chunks = [...entities.values()].map((entity) => {
    const summary = { representation: `${entity.entity_type}: ${entity.name}`, responsibility: entity.behavior.map((b) => b.description).join(' ') || 'Constante com conteúdo excluído por possível sensibilidade.',
      related_symbols: entity.references.map((id) => ({ id, name: entities.get(id).name })), status: entity.status, evidence: entity.evidence.map(({ source_path, start_line, end_line }) => ({ source_path, start_line, end_line })), confidence: entity.confidence };
    // Assinatura, props, evidência e extremos das relações ficam juntos, sem corte por tokens.
    const content = canonical({ name: entity.name, entity_type: entity.entity_type, parameters: entity.parameters, props: entity.props, return_type: entity.return_type,
      behavior: entity.behavior, evidence: entity.evidence, related_symbols: summary.related_symbols, route: entity.route });
    return makeChunk(entity, 'code', content, summary, CODE_EXTRACTOR);
  }).sort(byId);
  manifest.semantic_summaries = summaries(manifest.chunks);
  validateManifest(manifest);
  return manifest;
}

// Formato público do catálogo de código, independente do manifesto principal v2.
export function codeManifest(root = ROOT, inventory = buildInventory(root)) {
  const { code_entities, documents, ...bundle } = buildManifest(root, inventory);
  return { ...bundle, schema_version: 1, version: 'code-knowledge-v1', entities: code_entities };
}
export function normalizeCodeManifest(manifest) {
  if (manifest?.schema_version === 1 && manifest.version === 'code-knowledge-v1' && Array.isArray(manifest.entities)) {
    const { entities, ...rest } = manifest;
    return { ...rest, schema_version: 2, documents: [], code_entities: entities };
  }
  // Leitura explícita do formato local anterior v2 para migração incremental.
  if (manifest?.schema_version === 2 && manifest.catalog === 'code') return manifest;
  fail('Manifesto de código inválido ou versão incompatível');
}
export function incrementalPlan(before, after) {
  const plan = planV2(normalizeCodeManifest(before), normalizeCodeManifest(after));
  return { ...plan, schema_version: 1, ...plan.code_entities };
}
