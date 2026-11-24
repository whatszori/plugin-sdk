// The automatic JSX runtime for plugins: `"jsxImportSource": "@whatszori/plugin-sdk"` in
// tsconfig, and JSX turns into elements of the app's React.
import type { ReactElement } from 'react';
import { hostReact } from './host.js';
import { Fragment } from './react.js';

export { Fragment };

type Props = Record<string, unknown> & { children?: unknown };

export function jsx(type: unknown, props: Props, key?: string | number): ReactElement {
  const { children, ...rest } = props ?? {};
  const p: Record<string, unknown> = key === undefined ? rest : { ...rest, key };
  // children stay as given: an array here means the user wrote an array, so React keeps its
  // "each child needs a key" check, like with the real runtime
  if (children !== undefined) p.children = children;
  return hostReact().createElement(type as never, p);
}

// several static children: spread so React doesn't ask for keys on them
export function jsxs(type: unknown, props: Props, key?: string | number): ReactElement {
  const { children, ...rest } = props ?? {};
  const p: Record<string, unknown> = key === undefined ? rest : { ...rest, key };
  const kids = Array.isArray(children) ? children : [children];
  return hostReact().createElement(type as never, p, ...(kids as never[]));
}

export const jsxDEV = (type: unknown, props: Props, key?: string | number) =>
  jsx(type, props, key);

export namespace JSX {
  export type ElementType = import('react').JSX.ElementType;
  export type Element = import('react').JSX.Element;
  export type ElementClass = import('react').JSX.ElementClass;
  export type ElementAttributesProperty = import('react').JSX.ElementAttributesProperty;
  export type ElementChildrenAttribute = import('react').JSX.ElementChildrenAttribute;
  export type IntrinsicAttributes = import('react').JSX.IntrinsicAttributes;
  export type IntrinsicClassAttributes<T> = import('react').JSX.IntrinsicClassAttributes<T>;
  export type IntrinsicElements = import('react').JSX.IntrinsicElements;
  export type LibraryManagedAttributes<C, P> = import('react').JSX.LibraryManagedAttributes<C, P>;
}
