/*
 * Copyright 2022 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

import {AriaLabelingProps, DOMProps as SharedDOMProps} from '@react-types/shared';
import {mergeProps, mergeRefs, useLayoutEffect, useObjectRef} from '@react-aria/utils';
import React, {Context, createContext, CSSProperties, ForwardedRef, JSX, ReactNode, RefCallback, RefObject, UIEvent, useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react';
import ReactDOM from 'react-dom';
import {useIsSSR} from 'react-aria';

// Override forwardRef types so generics work.
declare function forwardRef<T, P = {}>(
  render: (props: P, ref: React.Ref<T>) => React.ReactElement | null
): (props: P & React.RefAttributes<T>) => React.ReactElement | null;

export type forwardRefType = typeof forwardRef;

export const slotCallbackSymbol = Symbol('callback');
export const defaultSlot = Symbol('default');

interface SlottedValue<T> {
  slots?: Record<string | symbol, T>,
  [slotCallbackSymbol]?: (value: T) => void
}

export type SlottedContextValue<T> = SlottedValue<T> | T | null | undefined;
export type ContextValue<T, E extends Element> = SlottedContextValue<WithRef<T, E>>;

type ProviderValue<T> = [Context<T>, T];
type ProviderValues<A, B, C, D, E, F, G, H, I, J, K> =
  | [ProviderValue<A>]
  | [ProviderValue<A>, ProviderValue<B>]
  | [ProviderValue<A>, ProviderValue<B>, ProviderValue<C>]
  | [ProviderValue<A>, ProviderValue<B>, ProviderValue<C>, ProviderValue<D>]
  | [ProviderValue<A>, ProviderValue<B>, ProviderValue<C>, ProviderValue<D>, ProviderValue<E>]
  | [ProviderValue<A>, ProviderValue<B>, ProviderValue<C>, ProviderValue<D>, ProviderValue<E>, ProviderValue<F>]
  | [ProviderValue<A>, ProviderValue<B>, ProviderValue<C>, ProviderValue<D>, ProviderValue<E>, ProviderValue<F>, ProviderValue<G>]
  | [ProviderValue<A>, ProviderValue<B>, ProviderValue<C>, ProviderValue<D>, ProviderValue<E>, ProviderValue<F>, ProviderValue<G>, ProviderValue<H>]
  | [ProviderValue<A>, ProviderValue<B>, ProviderValue<C>, ProviderValue<D>, ProviderValue<E>, ProviderValue<F>, ProviderValue<G>, ProviderValue<H>, ProviderValue<I>]
  | [ProviderValue<A>, ProviderValue<B>, ProviderValue<C>, ProviderValue<D>, ProviderValue<E>, ProviderValue<F>, ProviderValue<G>, ProviderValue<H>, ProviderValue<I>, ProviderValue<J>]
  | [ProviderValue<A>, ProviderValue<B>, ProviderValue<C>, ProviderValue<D>, ProviderValue<E>, ProviderValue<F>, ProviderValue<G>, ProviderValue<H>, ProviderValue<I>, ProviderValue<J>, ProviderValue<K>];

interface ProviderProps<A, B, C, D, E, F, G, H, I, J, K> {
  values: ProviderValues<A, B, C, D, E, F, G, H, I, J, K>,
  children: ReactNode
}

export function Provider<A, B, C, D, E, F, G, H, I, J, K>({values, children}: ProviderProps<A, B, C, D, E, F, G, H, I, J, K>): JSX.Element {
  for (let [Context, value] of values) {
    // @ts-ignore
    children = <Context.Provider value={value}>{children}</Context.Provider>;
  }

  return children as JSX.Element;
}

export interface StyleProps {
  /** The CSS [className](https://developer.mozilla.org/en-US/docs/Web/API/Element/className) for the element. */
  className?: string,
  /** The inline [style](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/style) for the element. */
  style?: CSSProperties
}

export interface DOMProps extends StyleProps {
  /** The children of the component. */
  children?: ReactNode
}

export interface ScrollableProps<T extends Element> {
  /** Handler that is called when a user scrolls. See [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Element/scroll_event). */
  onScroll?: (e: UIEvent<T>) => void
}

export interface StyleRenderProps<T> {
  /** The CSS [className](https://developer.mozilla.org/en-US/docs/Web/API/Element/className) for the element. A function may be provided to compute the class based on component state. */
  className?: string | ((values: T) => string),
  /** The inline [style](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/style) for the element. A function may be provided to compute the style based on component state. */
  style?: CSSProperties | ((values: T) => CSSProperties)
}

export interface RenderProps<T> extends StyleRenderProps<T> {
  /** The children of the component. A function may be provided to alter the children based on component state. */
  children?: ReactNode | ((values: T) => ReactNode)
}

interface RenderPropsHookOptions<T> extends RenderProps<T>, SharedDOMProps, AriaLabelingProps {
  values: T,
  defaultChildren?: ReactNode,
  defaultClassName?: string
}

export function useRenderProps<T>(props: RenderPropsHookOptions<T>) {
  let {
    className,
    style,
    children,
    defaultClassName,
    defaultChildren,
    values
  } = props;

  return useMemo(() => {
    let computedClassName: string | undefined;
    let computedStyle: React.CSSProperties | undefined;
    let computedChildren: React.ReactNode | undefined;

    if (typeof className === 'function') {
      computedClassName = className(values);
    } else {
      computedClassName = className;
    }

    if (typeof style === 'function') {
      computedStyle = style(values);
    } else {
      computedStyle = style;
    }

    if (typeof children === 'function') {
      computedChildren = children(values);
    } else if (children == null) {
      computedChildren = defaultChildren;
    } else {
      computedChildren = children;
    }

    return {
      className: computedClassName ?? defaultClassName,
      style: computedStyle,
      children: computedChildren,
      'data-rac': ''
    };
  }, [className, style, children, defaultClassName, defaultChildren, values]);
}

export type WithRef<T, E> = T & {ref?: ForwardedRef<E>};
export interface SlotProps {
  /**
   * A slot name for the component. Slots allow the component to receive props from a parent component.
   * An explicit `null` value indicates that the local props completely override all props received from a parent.
   */
  slot?: string | null
}

export function useSlottedContext<T>(context: Context<SlottedContextValue<T>>, slot?: string | null): T | null | undefined {
  let ctx = useContext(context);
  if (slot === null) {
    // An explicit `null` slot means don't use context.
    return null;
  }
  if (ctx && typeof ctx === 'object' && 'slots' in ctx && ctx.slots) {
    let availableSlots = new Intl.ListFormat().format(Object.keys(ctx.slots).map(p => `"${p}"`));

    if (!slot && !ctx.slots[defaultSlot]) {
      throw new Error(`A slot prop is required. Valid slot names are ${availableSlots}.`);
    }
    let slotKey = slot || defaultSlot;
    if (!ctx.slots[slotKey]) {
      // @ts-ignore
      throw new Error(`Invalid slot "${slot}". Valid slot names are ${availableSlots}.`);
    }
    return ctx.slots[slotKey];
  }
  // @ts-ignore
  return ctx;
}

export function useContextProps<T, U extends SlotProps, E extends Element>(props: T & SlotProps, ref: ForwardedRef<E>, context: Context<ContextValue<U, E>>): [T, RefObject<E>] {
  let ctx = useSlottedContext(context, props.slot) || {};
  // @ts-ignore - TS says "Type 'unique symbol' cannot be used as an index type." but not sure why.
  let {ref: contextRef, [slotCallbackSymbol]: callback, ...contextProps} = ctx;
  let mergedRef = useObjectRef(useMemo(() => mergeRefs(ref, contextRef), [ref, contextRef]));
  let mergedProps = mergeProps(contextProps, props) as unknown as T;

  // mergeProps does not merge `style`. Adding this there might be a breaking change.
  if (
    'style' in contextProps &&
    contextProps.style &&
    typeof contextProps.style === 'object' &&
    'style' in props &&
    props.style &&
    typeof props.style === 'object'
  ) {
    // @ts-ignore
    mergedProps.style = {...contextProps.style, ...props.style};
  }

  // A parent component might need the props from a child, so call slot callback if needed.
  useEffect(() => {
    if (callback) {
      callback(props);
    }
  }, [callback, props]);

  return [mergedProps, mergedRef];
}

export function useSlot(): [RefCallback<Element>, boolean] {
  // Assume we do have the slot in the initial render.
  let [hasSlot, setHasSlot] = useState(true);
  let hasRun = useRef(false);

  // A callback ref which will run when the slotted element mounts.
  // This should happen before the useLayoutEffect below.
  let ref = useCallback(el => {
    hasRun.current = true;
    setHasSlot(!!el);
  }, []);

  // If the callback hasn't been called, then reset to false.
  useLayoutEffect(() => {
    if (!hasRun.current) {
      setHasSlot(false);
    }
  }, []);

  return [ref, hasSlot];
}

export function useEnterAnimation(ref: RefObject<HTMLElement>, isReady: boolean = true) {
  let [isEntering, setEntering] = useState(true);
  useAnimation(ref, isEntering && isReady, useCallback(() => setEntering(false), []));
  return isEntering && isReady;
}

export function useExitAnimation(ref: RefObject<HTMLElement>, isOpen: boolean) {
  // State to trigger a re-render after animation is complete, which causes the element to be removed from the DOM.
  // Ref to track the state we're in, so we don't immediately reset isExiting to true after the animation.
  let [isExiting, setExiting] = useState(false);
  let [exitState, setExitState] = useState('idle');

  // If isOpen becomes false, set isExiting to true.
  if (!isOpen && ref.current && exitState === 'idle') {
    isExiting = true;
    setExiting(true);
    setExitState('exiting');
  }

  // If we exited, and the element has been removed, reset exit state to idle.
  if (!ref.current && exitState === 'exited') {
    setExitState('idle');
  }

  useAnimation(
    ref,
    isExiting,
    useCallback(() => {
      setExitState('exited');
      setExiting(false);
    }, [])
  );

  return isExiting;
}

function useAnimation(ref: RefObject<HTMLElement>, isActive: boolean, onEnd: () => void) {
  let prevAnimation = useRef<string | null>(null);
  if (isActive && ref.current) {
    // This is ok because we only read it in the layout effect below, immediately after the commit phase.
    // We could move this to another effect that runs every render, but this would be unnecessarily slow.
    // We only need the computed style right before the animation becomes active.
    // eslint-disable-next-line rulesdir/pure-render
    prevAnimation.current = window.getComputedStyle(ref.current).animation;
  }

  useLayoutEffect(() => {
    if (isActive && ref.current) {
      // Make sure there's actually an animation, and it wasn't there before we triggered the update.
      let computedStyle = window.getComputedStyle(ref.current);
      if (computedStyle.animationName && computedStyle.animationName !== 'none' && computedStyle.animation !== prevAnimation.current) {
        let onAnimationEnd = (e: AnimationEvent) => {
          if (e.target === ref.current) {
            element.removeEventListener('animationend', onAnimationEnd);
            ReactDOM.flushSync(() => {onEnd();});
          }
        };

        let element = ref.current;
        element.addEventListener('animationend', onAnimationEnd);
        return () => {
          element.removeEventListener('animationend', onAnimationEnd);
        };
      } else {
        onEnd();
      }
    }
  }, [ref, isActive, onEnd]);
}

// React doesn't understand the <template> element, which doesn't have children like a normal element.
// It will throw an error during hydration when it expects the firstChild to contain content rendered
// on the server, when in reality, the browser will have placed this inside the `content` document fragment.
// This monkey patches the firstChild property for our special hidden template elements to work around this error.
// See https://github.com/facebook/react/issues/19932
if (typeof HTMLTemplateElement !== 'undefined') {
  const getFirstChild = Object.getOwnPropertyDescriptor(Node.prototype, 'firstChild')!.get!;
  Object.defineProperty(HTMLTemplateElement.prototype, 'firstChild', {
    configurable: true,
    enumerable: true,
    get: function () {
      if (this.dataset.reactAriaHidden) {
        return this.content.firstChild;
      } else {
        return getFirstChild.call(this);
      }
    }
  });
}

export const HiddenContext = createContext<boolean>(false);

// Portal to nowhere
const hiddenFragment = typeof DocumentFragment !== 'undefined' ? new DocumentFragment() : null;

export function Hidden(props: {children: ReactNode}) {
  let isHidden = useContext(HiddenContext);
  let isSSR = useIsSSR();
  if (isHidden) {
    // Don't hide again if we are already hidden.
    return <>{props.children}</>;
  }

  let children = (
    <HiddenContext.Provider value>
      {props.children}
    </HiddenContext.Provider>
  );

  // In SSR, portals are not supported by React. Instead, render into a <template>
  // element, which the browser will never display to the user. In addition, the
  // content is not part of the DOM tree, so it won't affect ids or other accessibility attributes.
  return isSSR
    ? <template data-react-aria-hidden>{children}</template>
    : ReactDOM.createPortal(children, hiddenFragment!);
}

// Creates a component that forwards its ref and returns null if it is in a <Hidden> subtree.
// Note: this function is handled specially in the documentation generator. If you change it, you'll need to update DocsTransformer as well.
export function createHideableComponent<T, P = {}>(fn: (props: P, ref: React.Ref<T>) => React.ReactElement | null): (props: P & React.RefAttributes<T>) => React.ReactElement | null {
  let Wrapper = (props: P, ref: React.Ref<T>) => {
    let isHidden = useContext(HiddenContext);
    if (isHidden) {
      return null;
    }

    return fn(props, ref);
  };
  // @ts-ignore - for react dev tools
  Wrapper.displayName = fn.displayName || fn.name;
  return (React.forwardRef as forwardRefType)(Wrapper);
}

/**
 * Filters out `data-*` attributes to keep them from being passed down and duplicated.
 * @param props
 */
export function removeDataAttributes<T>(props: T): T {
  const prefix = /^(data-.*)$/;
  let filteredProps = {} as T;

  for (const prop in props) {
    if (!prefix.test(prop)) {
      filteredProps[prop] = props[prop];
    }
  }

  return filteredProps;
}

// Override base type to change the default.
export interface RACValidation {
  /**
   * Whether to use native HTML form validation to prevent form submission
   * when the value is missing or invalid, or mark the field as required
   * or invalid via ARIA.
   * @default 'native'
   */
  validationBehavior?: 'native' | 'aria'
}
