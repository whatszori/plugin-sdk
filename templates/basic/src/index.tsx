import { definePlugin, type PluginContext, type SlotProps } from '@whatszori/plugin-sdk';
import { useEffect, useState } from 'react';

// A small plugin to start from:
// - a button next to the emoji button that inserts a greeting,
// - "Quote" in the message menu,
// - a settings block (Settings → Plugins) to change the greeting,
// - a counter of messages received while the app runs.
export default definePlugin((ctx) => {
  let received = 0;
  ctx.onEvent('msg:batch', ({ messages }) => {
    received += messages.filter((m) => !m.fromMe).length;
  });

  ctx.registerSlot('composer.actions', () => <GreetButton ctx={ctx} />);
  ctx.registerSlot('message.contextMenu', (p) => <QuoteItem ctx={ctx} {...p} />);
  ctx.registerSlot('settings.sections', () => <Settings ctx={ctx} received={() => received} />);

  ctx.log.info('started');
});

function GreetButton({ ctx }: { ctx: PluginContext }) {
  const greeting = useGreeting(ctx);
  return (
    <ctx.ui.IconButton
      label={`Insert “${greeting}”`}
      icon={<span aria-hidden="true">👋</span>}
      tooltipPlacement="top"
      onClick={() => ctx.actions.insertIntoComposer(greeting)}
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
        ctx.actions.insertIntoComposer(`> ${message.text}\n`);
        close();
      }}
    />
  );
}

function Settings({ ctx, received }: { ctx: PluginContext; received: () => number }) {
  const greeting = useGreeting(ctx);
  const [draft, setDraft] = useState(greeting);
  useEffect(() => setDraft(greeting), [greeting]);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '8px 16px' }}>
      <ctx.ui.Input
        aria-label="Greeting"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => void ctx.settings.set('greeting', draft.trim() || 'Hi!')}
      />
      <span>{received()} messages received since WhatsZori started.</span>
    </div>
  );
}

// settings are strings kept by the app; this reads one and keeps it fresh across components
const listeners = new Set<(g: string) => void>();
let current = 'Hi!';

function useGreeting(ctx: PluginContext): string {
  const [g, setG] = useState(current);
  useEffect(() => {
    listeners.add(setG);
    void ctx.settings.all().then((s) => {
      current = s.greeting ?? current;
      listeners.forEach((fn) => fn(current));
    });
    return () => void listeners.delete(setG);
  }, [ctx]);
  return g;
}
