import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { digest, keygen, signFolder, verifyFolder } from '../src/cli/sign.js';

describe('signatures', () => {
  // the same files and digest as TestDigestFormat in the app (internal/plugins), so the two agree
  it('makes the digest the app checks', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'wz-sig-'));
    writeFileSync(join(dir, 'b.js'), 'b');
    writeFileSync(join(dir, 'a.js'), 'a');
    writeFileSync(join(dir, 'signature.json'), '{}');
    expect((await digest(dir)).toString()).toBe(
      'whatszori-plugin-signature-v1\n' +
        'ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb  a.js\n' +
        '3e23e8160039594a33894f6564e1b1348bbd7a0088d42c4acb73eeaed59c009d  b.js\n',
    );
  });

  it('signs and verifies', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'wz-sig-'));
    writeFileSync(join(dir, 'manifest.json'), '{"id":"s"}');
    const k = keygen();
    expect(await signFolder(dir, k.privatePem)).toBe(k.fingerprint);
    expect(await verifyFolder(dir)).toMatchObject({ state: 'signed', key: k.fingerprint });
    writeFileSync(join(dir, 'manifest.json'), '{"id":"t"}');
    expect((await verifyFolder(dir)).state).toBe('invalid');
  });
});
