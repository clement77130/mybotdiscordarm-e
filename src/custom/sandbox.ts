import { ChildProcess, spawn } from 'child_process';
import path from 'path';
import { Ops, ProgramError } from './engine';
import { sanitizePayload } from './actions';

// Le script s'exécute dans un processus séparé (voir sandbox/runner.js). Ici : le pont validé entre le script et Discord.

const RUNNER = path.join(__dirname, '..', '..', 'sandbox', 'runner.js');
const TOTAL_TIMEOUT_MS = 20_000;
const MAX_CALLS = 80;
const MAX_SLEEP_TOTAL_MS = 12_000;

export interface MemberInfo {
  id: string;
  name: string;
  tag: string;
  nickname: string | null;
  roles: string[];
  isAdmin: boolean;
}

export interface SandboxHost {
  ops: Ops;
  memberInfo(userId: string): Promise<MemberInfo | null>;
  log(line: string): void;
}

// Indicateur du modèle de permissions de Node (--permission depuis Node 22.13, --experimental-permission avant)
export function permissionFlag(): string | null {
  const flags = process.allowedNodeEnvironmentFlags;
  if (flags.has('--permission')) return '--permission';
  if (flags.has('--experimental-permission')) return '--experimental-permission';
  return null;
}

export function sandboxAvailable(): boolean {
  return permissionFlag() !== null;
}

const asString = (v: unknown, max = 2000): string => (typeof v === 'string' ? v.slice(0, max) : String(v ?? '').slice(0, max));

async function bridge(method: string, args: unknown[], host: SandboxHost, sleepState: { total: number }): Promise<unknown> {
  const ops = host.ops;
  switch (method) {
    case 'reply': return void (await ops.reply(sanitizePayload(args[0])));
    case 'send': return void (await ops.send(asString(args[0], 30), sanitizePayload(args[1])));
    case 'dm': return void (await ops.dm(asString(args[0], 30), asString(args[1])));
    case 'addRole': return void (await ops.addRole(asString(args[0], 30), asString(args[1], 30)));
    case 'removeRole': return void (await ops.removeRole(asString(args[0], 30), asString(args[1], 30)));
    case 'timeout': return void (await ops.timeout(asString(args[0], 30), Number(args[1]) || 1, asString(args[2], 200)));
    case 'kick': return void (await ops.kick(asString(args[0], 30), asString(args[1], 200)));
    case 'ban': return void (await ops.ban(asString(args[0], 30), asString(args[1], 200)));
    case 'nickname': return void (await ops.nickname(asString(args[0], 30), asString(args[1], 32)));
    case 'member': return host.memberInfo(asString(args[0], 30));
    case 'dataGet': return ops.dataGet(args[0] === 'user' ? 'user' : 'guild', asString(args[1], 30), asString(args[2], 60));
    case 'dataSet': return void (await ops.dataSet(args[0] === 'user' ? 'user' : 'guild', asString(args[1], 30), asString(args[2], 60), asString(args[3], 1000)));
    case 'dataDelete': return void (await ops.dataDelete(args[0] === 'user' ? 'user' : 'guild', asString(args[1], 30), asString(args[2], 60)));
    case 'sleep': {
      const ms = Math.min(Math.max(Number(args[0]) || 0, 0), 10_000);
      sleepState.total += ms;
      if (sleepState.total > MAX_SLEEP_TOTAL_MS) throw new ProgramError('Attente totale trop longue');
      await new Promise(resolve => setTimeout(resolve, ms));
      return undefined;
    }
    case 'log': host.log(asString(args[0], 500)); return undefined;
    default: throw new ProgramError(`Fonction inconnue : ${method}`);
  }
}

export async function runScript(code: string, context: Record<string, unknown>, host: SandboxHost): Promise<void> {
  const flag = permissionFlag();
  if (!flag) {
    throw new ProgramError('Les scripts nécessitent Node.js 20 ou plus récent (modèle de permissions) : mettez Node à jour.');
  }

  const child: ChildProcess = spawn(
    process.execPath,
    [flag, `--allow-fs-read=${RUNNER}`, '--max-old-space-size=64', RUNNER],
    { stdio: ['ignore', 'ignore', 'pipe', 'ipc'], env: {}, windowsHide: true }
  );

  let stderr = '';
  child.stderr?.on('data', chunk => {
    if (stderr.length < 2000) stderr += String(chunk);
  });

  await new Promise<void>((resolve, reject) => {
    let finished = false;
    let calls = 0;
    const sleepState = { total: 0 };

    const finish = (error?: Error) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      child.kill('SIGKILL');
      error ? reject(error) : resolve();
    };

    const timer = setTimeout(() => finish(new ProgramError('Le script a dépassé le temps maximum (20 s)')), TOTAL_TIMEOUT_MS);

    child.on('error', error => finish(new ProgramError(`Impossible de lancer le script : ${error.message}`)));
    child.on('exit', code => {
      if (finished) return;
      const hint = /ERR_ACCESS_DENIED|permission/i.test(stderr) ? ' (permission refusée)' : '';
      finish(new ProgramError(`Le script s'est arrêté de façon inattendue${code ? ` (code ${code})` : ''}${hint}`));
    });

    child.on('message', async (msg: any) => {
      if (finished || !msg || typeof msg !== 'object') return;

      if (msg.type === 'done') return finish();
      if (msg.type === 'error') return finish(new ProgramError(`Erreur dans le script : ${asString(msg.message, 300)}`));

      if (msg.type === 'call' && typeof msg.id === 'number') {
        if (++calls > MAX_CALLS) return finish(new ProgramError(`Trop d'appels depuis le script (${MAX_CALLS} maximum)`));
        try {
          const args = JSON.parse(String(msg.args));
          const value = await bridge(String(msg.method), Array.isArray(args) ? args : [], host, sleepState);
          if (!finished) child.send({ type: 'result', id: msg.id, value: value === undefined ? '' : JSON.stringify(value) });
        } catch (error) {
          if (!finished) child.send({ type: 'result', id: msg.id, error: error instanceof Error ? error.message : 'Erreur' });
        }
      }
    });

    child.send({ type: 'run', code, context: JSON.stringify(context) });
  });
}
