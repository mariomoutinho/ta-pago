// Auxílio para PostgreSQL nativo em Linux/WSL. Compose continua sendo a opção portátil.
import { existsSync, mkdirSync, writeFileSync, unlinkSync, chmodSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import pg from 'pg';
import { ROOT } from '../knowledge/common.mjs';
import { loadLocalEnvironment, loadConfig, RagError, publicError } from './config.mjs';

try {
  loadLocalEnvironment(ROOT);
  const action = process.argv[2] ?? 'status';
  if (!['start','stop','status'].includes(action)) throw new RagError('INVALID_COMMAND','Use knowledge:db -- start, stop ou status.');
  const config = loadConfig();
  if (!config.databaseUrl) throw new RagError('REQUIRES_EXTERNAL_CONFIGURATION','Configure DATABASE_URL no .env.');
  const url = new URL(config.databaseUrl);
  const port = Number(url.port || 5432);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new RagError('INVALID_CONFIGURATION','Porta local inválida.');
  if (url.hostname !== '127.0.0.1' || url.pathname !== '/ta_pago_knowledge' || url.username !== 'ta_pago' || !url.password) throw new RagError('INVALID_CONFIGURATION','O helper nativo aceita somente ta_pago/ta_pago_knowledge em 127.0.0.1 com senha.');
  const base = resolve(ROOT,'.rag/postgres'), data = resolve(base,'data'), socket = resolve(base,'socket');
  const bin = resolve(base,'runtime/usr/lib/postgresql/16/bin');
  if (!existsSync(resolve(bin,'pg_ctl'))) throw new RagError('REQUIRES_EXTERNAL_CONFIGURATION','Runtime nativo ausente; use compose.rag.yaml ou consulte a instalação Linux/WSL em knowledge/RAG.md.');
  const pgctl = resolve(bin,'pg_ctl');
  const running = () => existsSync(data) && spawnSync(pgctl,['-D',data,'status'],{stdio:'ignore'}).status === 0;
  if (action === 'status') console.log(JSON.stringify({database:running()?'RUNNING':'STOPPED',host:'127.0.0.1',port:Number(url.port),data_directory:'.rag/postgres/data'}));
  if (action === 'stop' && running()) execFileSync(pgctl,['-D',data,'-m','fast','-w','stop'],{stdio:'inherit'});
  if (action === 'start') {
    mkdirSync(socket,{recursive:true,mode:0o700});chmodSync(base,0o700);
    if (!existsSync(resolve(data,'PG_VERSION'))) {
      if (existsSync(data)) throw new RagError('LOCAL_DATABASE_EXISTS','Diretório de dados já existe sem PG_VERSION; não será sobrescrito.');
      const passwordFile=resolve(base,'init-password');
      writeFileSync(passwordFile,decodeURIComponent(url.password),{mode:0o600,flag:'wx'});
      try {
        execFileSync(resolve(bin,'initdb'),['-D',data,'-U','ta_pago','--pwfile',passwordFile,'--auth=scram-sha-256','--encoding=UTF8','--locale=C.UTF-8'],{stdio:'inherit'});
      } finally {unlinkSync(passwordFile);}
      writeFileSync(resolve(data,'postgresql.auto.conf'),`listen_addresses = '127.0.0.1'\nport = ${port}\nunix_socket_directories = '${socket.replaceAll("'","''")}'\n`,{mode:0o600});
    }
    const configuredPort = Number(execFileSync(resolve(bin,'postgres'),['-D',data,'-C','port'],{encoding:'utf8'}).trim());
    if (configuredPort !== port) throw new RagError('INVALID_CONFIGURATION','Porta do cluster local diverge de DATABASE_URL; preserve o cluster e corrija a configuração.');
    if (!running()) execFileSync(pgctl,['-D',data,'-l',resolve(base,'server.log'),'-w','start'],{stdio:'inherit'});
    const adminUrl = new URL(url);adminUrl.pathname='/postgres';
    const admin=new pg.Client({connectionString:adminUrl.toString(),connectionTimeoutMillis:5000});
    try {
      await admin.connect();
      for (const name of ['ta_pago_knowledge','ta_pago_rag_test']) {
        if (!(await admin.query('SELECT 1 FROM pg_database WHERE datname=$1',[name])).rows.length) await admin.query(`CREATE DATABASE ${name}`);
      }
    } finally {await admin.end();}
    console.log(JSON.stringify({status:'RUNNING',host:'127.0.0.1',port:Number(url.port),databases:['ta_pago_knowledge','ta_pago_rag_test']}));
  }
} catch (error) {console.error(JSON.stringify(publicError(error)));process.exitCode=2;}
