import * as React from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { definePlugin } from '../src/index.js';
import { jsx, jsxs } from '../src/jsx-runtime.js';
import * as SdkReact from '../src/react.js';
import type { PluginContext } from '../src/types.js';

describe('runtime', () => {
  it('refuses React before start, with a hint', () => {
    expect(() => SdkReact.createElement('p')).toThrow(/definePlugin/);
  });

  it('JSX and hooks run on the app React after definePlugin', async () => {
    let started = false;
    const plugin = definePlugin((ctx) => {
      started = ctx.pluginId === 'p';
    });
    await plugin.start({ pluginId: 'p', React } as unknown as PluginContext);
    expect(started).toBe(true);

    function Counter({ start }: { start: number }) {
      const [n] = SdkReact.useState(start);
      const label = SdkReact.useMemo(() => `n=${n}`, [n]);
      return jsxs('p', { children: [label, jsx('b', { children: '!' })] });
    }
    const html = renderToString(jsx(SdkReact.Fragment, { children: jsx(Counter, { start: 3 }) }));
    expect(html).toBe('<p>n=3<b>!</b></p>');
    expect(SdkReact.Fragment).toBe(React.Fragment);
    expect(SdkReact.default.version).toBe(React.version);
  });
});
