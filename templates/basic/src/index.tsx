import { definePlugin, type PluginContext, type SlotProps } from '@whatszori/plugin-sdk';
import { useEffect, useState } from 'react';

// A small plugin to start from:
// - a 👋 button next to the emoji button that inserts the greeting from the settings
//   (the settings form comes from manifest.json),
// - "Quote" in the message menu,
// - a command in the palette (Ctrl+Shift+P) with a shortcut,
// - a side panel with how many messages arrived while the app runs.
// manifest.json asks for "composer" and "messages"; the user allows them when turning it on.
export default definePlugin((ctx) => {
  let received = 0;
  ctx.events.onMessage((m) => {
    if (!m.fromMe) received++;
  });

  ctx.registerSlot('composer.actions', () => <GreetButton ctx={ctx} />);
  ctx.registerSlot('message.contextMenu', (p) => <QuoteItem ctx={ctx} {...p} />);
  ctx.commands.register({
    id: 'greet',
    title: 'Insert the greeting',
    shortcut: 'Ctrl+Alt+G',
    when: () => ctx.data.activeChat() !== null,
    run: async () => ctx.composer.insert(String((await ctx.settings.get('greeting')) ?? 'Hi!')),
  });
  ctx.panels.register({
    id: 'counter',
    title: 'Messages so far',
    icon: '📨',
    render: () => <p>{received} messages received since WhatsZori started.</p>,
  });

  ctx.log.info('started');
});

function GreetButton({ ctx }: { ctx: PluginContext }) {
  const greeting = useSetting(ctx, 'greeting', 'Hi!');
  return (
    <ctx.ui.IconButton
      label={`Insert “${greeting}”`}
      icon={<span aria-hidden="true">👋</span>}
      tooltipPlacement="top"
      onClick={() => ctx.composer.insert(greeting)}
    />
  );
}

function QuoteItem({ ctx, message, close }: { ctx: PluginContext } & SlotProps['message.contextMenu']) {
  if (!message.text) return null;
  return (
    <ctx.ui.MenuItem
      label="Quote"
      icon={<span aria-hidden="true">❝</span>}
      onSelect={() => {
        ctx.composer.insert(`> ${message.text}\n`);
        close();
      }}
    />
  );
}

// a manifest setting, kept fresh when the user changes it in Settings → Plugins
function useSetting(ctx: PluginContext, key: string, fallback: string): string {
  const [value, setValue] = useState(fallback);
  useEffect(() => {
    void ctx.settings.get<string>(key).then((v) => setValue(v ?? fallback));
    return ctx.settings.onChange((k, v) => k === key && setValue(String(v ?? fallback)));
  }, [ctx, key, fallback]);
  return value;
}
