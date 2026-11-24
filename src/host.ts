import type * as ReactNS from 'react';

// The app hands its React to every plugin in ctx. The JSX runtime and the hooks in
// "@whatszori/plugin-sdk/react" forward to it, so a plugin never bundles a React of its own (two
// Reacts in one tree break hooks).
let react: typeof ReactNS | null = null;

export function setHostReact(r: typeof ReactNS): void {
  react = r;
}

export function hostReact(): typeof ReactNS {
  if (!react) {
    throw new Error(
      'WhatsZori plugin: React is used before start(). Wrap the plugin in definePlugin() and ' +
        "create components inside start() or in render, not at the top of the module.",
    );
  }
  return react;
}
