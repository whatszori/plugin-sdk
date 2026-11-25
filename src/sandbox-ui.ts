import type { UINode } from './types.js';

// Short builders for the declarative UI of sandboxed plugins, so a panel reads like
//
//   ui.stack([
//     ui.heading('Weather'),
//     ui.text('Sunny', { muted: true }),
//     ui.button('Update', load, { variant: 'primary' }),
//   ])
//
// Every builder returns a plain object; writing { t: 'text', text: '…' } by hand works the same.

type Of<T extends string> = Extract<UINode, { t: T }>;
type Rest<T extends string, K extends keyof Of<T>> = Omit<Of<T>, 't' | K>;

export const ui = {
  text: (text: string, o: Rest<'text', 'text'> = {}): UINode => ({ t: 'text', text, ...o }),
  heading: (text: string): UINode => ({ t: 'heading', text }),
  stack: (children: UINode[], o: Rest<'stack', 'children'> = {}): UINode => ({ t: 'stack', children, ...o }),
  row: (children: UINode[], o: Rest<'row', 'children'> = {}): UINode => ({ t: 'row', children, ...o }),
  button: (label: string, onClick?: () => void, o: Rest<'button', 'label' | 'onClick'> = {}): UINode => ({
    t: 'button',
    label,
    onClick,
    ...o,
  }),
  iconButton: (label: string, icon: string, onClick?: () => void, active?: boolean): UINode => ({
    t: 'iconButton',
    label,
    icon,
    onClick,
    active,
  }),
  menuItem: (label: string, onClick?: () => void, o: Rest<'menuItem', 'label' | 'onClick'> = {}): UINode => ({
    t: 'menuItem',
    label,
    onClick,
    ...o,
  }),
  input: (o: Rest<'input', never> = {}): UINode => ({ t: 'input', ...o }),
  textarea: (o: Rest<'textarea', never> = {}): UINode => ({ t: 'textarea', ...o }),
  toggle: (label: string, checked: boolean, onChange?: (v: boolean) => void, description?: string): UINode => ({
    t: 'toggle',
    label,
    checked,
    onChange,
    description,
  }),
  select: (value: string, options: { value: string; label: string }[], onChange?: (v: string) => void): UINode => ({
    t: 'select',
    value,
    options,
    onChange,
  }),
  badge: (text: string): UINode => ({ t: 'badge', text }),
  image: (src: string, o: Rest<'image', 'src'> = {}): UINode => ({ t: 'image', src, ...o }),
  list: (items: Of<'list'>['items']): UINode => ({ t: 'list', items }),
  code: (text: string): UINode => ({ t: 'code', text }),
  link: (text: string, href: string): UINode => ({ t: 'link', text, href }),
  progress: (value: number): UINode => ({ t: 'progress', value }),
  spinner: (): UINode => ({ t: 'spinner' }),
  divider: (): UINode => ({ t: 'divider' }),
};
