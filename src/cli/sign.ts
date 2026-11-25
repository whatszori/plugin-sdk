import {
  createHash,
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
  sign,
  verify,
  type KeyObject,
} from 'node:crypto';
import { lstat, readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';

// Plugin signatures, the same scheme WhatsZori checks (internal/plugins/sign.go): signature.json
// holds an Ed25519 public key and a signature over a digest of every other file in the folder.
// The digest is a header line, then "<sha256 hex>  <path>" per file, sorted by path.

export const SIGNATURE_FILE = 'signature.json';
const HEADER = 'whatszori-plugin-signature-v1\n';
const MAX_FILES = 2000;
const MAX_BYTES = 50 * 1024 * 1024;

export async function digest(folder: string): Promise<Buffer> {
  const files: { rel: string; sum: string }[] = [];
  let total = 0;
  const walk = async (dir: string) => {
    for (const e of await readdir(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      const st = await lstat(p);
      if (st.isSymbolicLink()) throw new Error(`links aren't allowed in a signed plugin: ${p}`);
      if (st.isDirectory()) {
        await walk(p);
        continue;
      }
      const rel = relative(folder, p).split(sep).join('/');
      if (rel === SIGNATURE_FILE) continue;
      if (files.length >= MAX_FILES) throw new Error('too many files to sign');
      total += st.size;
      if (total > MAX_BYTES) throw new Error('too big to sign (50 MB at most)');
      files.push({ rel, sum: createHash('sha256').update(await readFile(p)).digest('hex') });
    }
  };
  await walk(folder);
  // byte order, like Go's sort of strings
  files.sort((a, b) => Buffer.compare(Buffer.from(a.rel), Buffer.from(b.rel)));
  return Buffer.from(HEADER + files.map((f) => `${f.sum}  ${f.rel}\n`).join(''));
}

// the 32 raw bytes of an Ed25519 public key
export function rawPublicKey(key: KeyObject): Buffer {
  return (createPublicKey(key).export({ format: 'der', type: 'spki' }) as Buffer).subarray(-32);
}

export function fingerprint(raw: Buffer): string {
  const h = createHash('sha256').update(raw).digest('hex').slice(0, 16);
  return `${h.slice(0, 4)} ${h.slice(4, 8)} ${h.slice(8, 12)} ${h.slice(12, 16)}`;
}

export function keygen(): { privatePem: string; fingerprint: string } {
  const { privateKey } = generateKeyPairSync('ed25519');
  return {
    privatePem: privateKey.export({ format: 'pem', type: 'pkcs8' }) as string,
    fingerprint: fingerprint(rawPublicKey(privateKey)),
  };
}

export async function signFolder(folder: string, privatePem: string): Promise<string> {
  const key = createPrivateKey(privatePem);
  if (key.asymmetricKeyType !== 'ed25519') throw new Error('the key must be an Ed25519 key (wz-plugin keygen)');
  const d = await digest(folder);
  const pub = rawPublicKey(key);
  const content = { key: pub.toString('base64'), sig: sign(null, d, key).toString('base64') };
  await writeFile(join(folder, SIGNATURE_FILE), JSON.stringify(content, null, 2) + '\n');
  return fingerprint(pub);
}

export async function verifyFolder(
  folder: string,
): Promise<{ state: 'unsigned' | 'signed' | 'invalid'; key?: string; reason?: string }> {
  let raw: string;
  try {
    raw = await readFile(join(folder, SIGNATURE_FILE), 'utf8');
  } catch {
    return { state: 'unsigned' };
  }
  let c: { key?: string; sig?: string };
  try {
    c = JSON.parse(raw);
  } catch {
    return { state: 'invalid', reason: "signature.json isn't valid JSON" };
  }
  const pub = Buffer.from(c.key ?? '', 'base64');
  if (pub.length !== 32) return { state: 'invalid', reason: 'the key in signature.json is broken' };
  const key = createPublicKey({
    key: Buffer.concat([Buffer.from('302a300506032b6570032100', 'hex'), pub]),
    format: 'der',
    type: 'spki',
  });
  const ok = verify(null, await digest(folder), key, Buffer.from(c.sig ?? '', 'base64'));
  return ok
    ? { state: 'signed', key: fingerprint(pub) }
    : { state: 'invalid', key: fingerprint(pub), reason: 'files were changed after signing' };
}
