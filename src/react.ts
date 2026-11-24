// A stand-in for "react" inside plugins. The CLI's bundler points `react` here, so code written
// as `import { useState } from 'react'` (and libraries that do the same) runs on the app's React.
import type * as ReactNS from 'react';
import { hostReact } from './host.js';

type R = typeof ReactNS;

// React's element markers are global symbols, so these work before the host is known
export const Fragment = Symbol.for('react.fragment') as unknown as R['Fragment'];
export const StrictMode = Symbol.for('react.strict_mode') as unknown as R['StrictMode'];
export const Suspense = Symbol.for('react.suspense') as unknown as R['Suspense'];

export const createElement: R['createElement'] = ((...a: Parameters<R['createElement']>) =>
  hostReact().createElement(...a)) as R['createElement'];
export const cloneElement: R['cloneElement'] = ((...a: Parameters<R['cloneElement']>) =>
  hostReact().cloneElement(...a)) as R['cloneElement'];
export const isValidElement: R['isValidElement'] = ((o: unknown) =>
  hostReact().isValidElement(o)) as R['isValidElement'];
export const createContext: R['createContext'] = ((v: unknown) =>
  hostReact().createContext(v)) as R['createContext'];
export const createRef: R['createRef'] = () => hostReact().createRef();
export const forwardRef: R['forwardRef'] = ((render: never) =>
  hostReact().forwardRef(render)) as R['forwardRef'];
export const memo: R['memo'] = ((c: never, eq?: never) => hostReact().memo(c, eq)) as R['memo'];
export const lazy: R['lazy'] = ((f: never) => hostReact().lazy(f)) as R['lazy'];
export const startTransition: R['startTransition'] = (fn) => hostReact().startTransition(fn);

export const Children: R['Children'] = {
  map: (...a) => hostReact().Children.map(...(a as Parameters<R['Children']['map']>)),
  forEach: (...a) => hostReact().Children.forEach(...a),
  count: (...a) => hostReact().Children.count(...a),
  only: (...a) => hostReact().Children.only(...a),
  toArray: (...a) => hostReact().Children.toArray(...a),
} as R['Children'];

export const useState: R['useState'] = ((s?: unknown) => hostReact().useState(s)) as R['useState'];
export const useReducer: R['useReducer'] = ((...a: never[]) =>
  (hostReact().useReducer as (...x: never[]) => unknown)(...a)) as R['useReducer'];
export const useEffect: R['useEffect'] = (e, d) => hostReact().useEffect(e, d);
export const useLayoutEffect: R['useLayoutEffect'] = (e, d) => hostReact().useLayoutEffect(e, d);
export const useInsertionEffect: R['useInsertionEffect'] = (e, d) =>
  hostReact().useInsertionEffect(e, d);
export const useMemo: R['useMemo'] = (f, d) => hostReact().useMemo(f, d);
export const useCallback: R['useCallback'] = (f, d) => hostReact().useCallback(f, d);
export const useRef: R['useRef'] = ((v?: unknown) => hostReact().useRef(v)) as R['useRef'];
export const useContext: R['useContext'] = (c) => hostReact().useContext(c);
export const useId: R['useId'] = () => hostReact().useId();
export const useTransition: R['useTransition'] = () => hostReact().useTransition();
export const useDeferredValue: R['useDeferredValue'] = ((v: unknown) =>
  hostReact().useDeferredValue(v)) as R['useDeferredValue'];
export const useSyncExternalStore: R['useSyncExternalStore'] = (s, g, gs) =>
  hostReact().useSyncExternalStore(s, g, gs);
export const useImperativeHandle: R['useImperativeHandle'] = (r, i, d) =>
  hostReact().useImperativeHandle(r, i, d);
export const useDebugValue: R['useDebugValue'] = (v, f) => hostReact().useDebugValue(v, f);

// `import React from 'react'` gets the whole host React, looked up when used
const React = new Proxy({} as R, {
  get: (_, key) => (hostReact() as unknown as Record<PropertyKey, unknown>)[key],
});
export default React;
