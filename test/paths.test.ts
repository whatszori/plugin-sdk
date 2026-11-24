import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { configDir, pluginsDir } from '../src/cli/paths.js';

describe('config folder', () => {
  it('follows the app', () => {
    expect(configDir({ APPDATA: 'C:\\Users\\a\\AppData\\Roaming' }, 'win32', 'C:\\Users\\a')).toBe(
      join('C:\\Users\\a\\AppData\\Roaming', 'whatszori'),
    );
    expect(configDir({}, 'linux', '/home/a')).toBe(join('/home/a', '.config', 'whatszori'));
    expect(configDir({ XDG_CONFIG_HOME: '/cfg' }, 'linux', '/home/a')).toBe(join('/cfg', 'whatszori'));
    expect(configDir({}, 'darwin', '/Users/a')).toBe(join('/Users/a', 'Library', 'Application Support', 'whatszori'));
    expect(pluginsDir({ WHATSZORI_CONFIG_DIR: '/tmp/wz' }, 'linux', '/home/a')).toBe(join('/tmp/wz', 'plugins'));
  });
});
