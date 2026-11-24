import { homedir } from 'node:os';
import { join } from 'node:path';

// Where WhatsZori keeps its data: the same lookup as Go's os.UserConfigDir, plus the app's
// WHATSZORI_CONFIG_DIR override.
export function configDir(env = process.env, platform = process.platform, home = homedir()): string {
  if (env.WHATSZORI_CONFIG_DIR) return env.WHATSZORI_CONFIG_DIR;
  switch (platform) {
    case 'win32':
      return join(env.APPDATA || join(home, 'AppData', 'Roaming'), 'whatszori');
    case 'darwin':
      return join(home, 'Library', 'Application Support', 'whatszori');
    default:
      return join(env.XDG_CONFIG_HOME || join(home, '.config'), 'whatszori');
  }
}

export function pluginsDir(env = process.env, platform = process.platform, home = homedir()): string {
  return join(configDir(env, platform, home), 'plugins');
}
