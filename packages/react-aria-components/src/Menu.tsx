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


import {AriaMenuProps, mergeProps, useFocusRing, useMenu, useMenuItem, useMenuSection, useMenuTrigger} from 'react-aria';
import {BaseCollection, CollectionProps, ItemRenderProps, useCachedChildren, useCollection, useSSRCollectionNode} from './Collection';
import {MenuTriggerProps as BaseMenuTriggerProps, Node, TreeState, useMenuTriggerState, useTreeState} from 'react-stately';
import {ContextValue, forwardRefType, Provider, RenderProps, ScrollableProps, SlotProps, StyleProps, useContextProps, useRenderProps, useSlot} from './utils';
import {filterDOMProps, mergeRefs, useObjectRef, useResizeObserver} from '@react-aria/utils';
import {Header} from './Header';
import {Key, LinkDOMProps} from '@react-types/shared';
import {KeyboardContext} from './Keyboard';
import {OverlayTriggerStateContext} from './Dialog';
import {PopoverContext} from './Popover';
import {PressResponder} from '@react-aria/interactions';
import React, {createContext, ForwardedRef, forwardRef, ReactNode, RefObject, useCallback, useContext, useRef, useState} from 'react';
import {Separator, SeparatorContext} from './Separator';
import {TextContext} from './Text';

export const MenuContext = createContext<ContextValue<MenuProps<any>, HTMLDivElement>>(null);
export const MenuStateContext = createContext<TreeState<unknown> | null>(null);

export interface MenuTriggerProps extends BaseMenuTriggerProps {
  children?: ReactNode
}

export function MenuTrigger(props: MenuTriggerProps) {
  let state = useMenuTriggerState(props);

  let ref = useRef<HTMLButtonElement>(null);
  let {menuTriggerProps, menuProps} = useMenuTrigger({
    ...props,
    type: 'menu'
  }, state, ref);
  // Allows menu width to match button
  let [buttonWidth, setButtonWidth] = useState<string | null>(null);
  let onResize = useCallback(() => {
    if (ref.current) {
      setButtonWidth(ref.current.offsetWidth + 'px');
    }
  }, [ref]);

  useResizeObserver({
    ref: ref,
    onResize: onResize
  });

  return (
    <Provider
      values={[
        [MenuContext, menuProps],
        [OverlayTriggerStateContext, state],
        [PopoverContext, {
          trigger: 'MenuTrigger',
          triggerRef: ref,
          placement: 'bottom start',
          style: {'--trigger-width': buttonWidth} as React.CSSProperties
        }]
      ]}>
      <PressResponder {...menuTriggerProps} ref={ref} isPressed={state.isOpen}>
        {props.children}
      </PressResponder>
    </Provider>
  );
}

export interface MenuProps<T> extends Omit<AriaMenuProps<T>, 'children'>, CollectionProps<T>, StyleProps, SlotProps, ScrollableProps<HTMLDivElement> {}

function Menu<T extends object>(props: MenuProps<T>, ref: ForwardedRef<HTMLDivElement>) {
  [props, ref] = useContextProps(props, ref, MenuContext);
  let {portal, collection} = useCollection(props);

  // Delay rendering the actual menu until we have the collection so that auto focus works properly.
  return (
    <>
      {collection.size > 0 && <MenuInner props={props} collection={collection} menuRef={ref} />}
      {portal}
    </>
  );
}

interface MenuInnerProps<T> {
  props: MenuProps<T>,
  collection: BaseCollection<T>,
  menuRef: RefObject<HTMLDivElement>
}

function MenuInner<T extends object>({props, collection, menuRef: ref}: MenuInnerProps<T>) {
  let state = useTreeState({
    ...props,
    collection,
    children: undefined
  });
  let {menuProps} = useMenu(props, state, ref);

  let children = useCachedChildren({
    items: state.collection,
    children: (item) => {
      switch (item.type) {
        case 'section':
          return <MenuSection section={item} />;
        case 'separator':
          return <Separator {...item.props} />;
        case 'item':
          return <MenuItemInner item={item} />;
        default:
          throw new Error('Unsupported node type in Menu: ' + item.type);
      }
    }
  });

  return (
    <div
      {...filterDOMProps(props)}
      {...menuProps}
      ref={ref}
      slot={props.slot || undefined}
      onScroll={props.onScroll}
      style={props.style}
      className={props.className ?? 'react-aria-Menu'}>
      <Provider
        values={[
          [MenuStateContext, state],
          [SeparatorContext, {elementType: 'div'}]
        ]}>
        {children}
      </Provider>
    </div>
  );
}

/**
 * A menu displays a list of actions or options that a user can choose.
 */
const _Menu = /*#__PURE__*/ (forwardRef as forwardRefType)(Menu);
export {_Menu as Menu};

interface MenuSectionProps<T> extends StyleProps {
  section: Node<T>
}

function MenuSection<T>({section, className, style, ...otherProps}: MenuSectionProps<T>) {
  let state = useContext(MenuStateContext)!;
  let [headingRef, heading] = useSlot();
  let {headingProps, groupProps} = useMenuSection({
    heading,
    'aria-label': section['aria-label'] ?? undefined
  });

  let children = useCachedChildren({
    items: state.collection.getChildren!(section.key),
    children: item => {
      switch (item.type) {
        case 'header': {
          let {ref, ...otherProps} = item.props;
          return (
            <Header
              {...headingProps}
              {...otherProps}
              ref={mergeRefs(headingRef, ref)}>
              {item.rendered}
            </Header>
          );
        }
        case 'item':
          return <MenuItemInner item={item} />;
        default:
          throw new Error('Unsupported element type in Section: ' + item.type);
      }
    }
  });

  return (
    <section
      {...filterDOMProps(otherProps)}
      {...groupProps}
      className={className || section.props?.className || 'react-aria-Section'}
      style={style || section.props?.style}
      ref={section.props.ref}>
      {children}
    </section>
  );
}

export interface MenuItemRenderProps extends ItemRenderProps {}

export interface MenuItemProps<T = object> extends RenderProps<MenuItemRenderProps>, LinkDOMProps {
  /** The unique id of the item. */
  id?: Key,
  /** The object value that this item represents. When using dynamic collections, this is set automatically. */
  value?: T,
  /** A string representation of the item's contents, used for features like typeahead. */
  textValue?: string,
  /** An accessibility label for this item. */
  'aria-label'?: string
}

function MenuItem<T extends object>(props: MenuItemProps<T>, ref: ForwardedRef<HTMLDivElement>): JSX.Element | null {
  return useSSRCollectionNode('item', props, ref, props.children);
}

/**
 * A MenuItem represents an individual action in a Menu.
 */
const _MenuItem = /*#__PURE__*/ (forwardRef as forwardRefType)(MenuItem);
export {_MenuItem as MenuItem};

interface MenuItemInnerProps<T> {
  item: Node<T>
}

function MenuItemInner<T>({item}: MenuItemInnerProps<T>) {
  let state = useContext(MenuStateContext)!;
  let ref = useObjectRef<any>(item.props.ref);
  let {menuItemProps, labelProps, descriptionProps, keyboardShortcutProps, ...states} = useMenuItem({key: item.key}, state, ref);

  let props: MenuItemProps<T> = item.props;
  let {isFocusVisible, focusProps} = useFocusRing();
  let renderProps = useRenderProps({
    ...props,
    id: undefined,
    children: item.rendered,
    defaultClassName: 'react-aria-MenuItem',
    values: {
      ...states,
      isHovered: states.isFocused,
      isFocusVisible,
      selectionMode: state.selectionManager.selectionMode,
      selectionBehavior: state.selectionManager.selectionBehavior
    }
  });

  let ElementType: React.ElementType = props.href ? 'a' : 'div';

  return (
    <ElementType
      {...mergeProps(menuItemProps, focusProps)}
      {...renderProps}
      ref={ref}
      data-disabled={states.isDisabled || undefined}
      data-hovered={states.isFocused || undefined}
      data-focused={states.isFocused || undefined}
      data-focus-visible={isFocusVisible || undefined}
      data-pressed={states.isPressed || undefined}
      data-selected={states.isSelected || undefined}
      data-selection-mode={state.selectionManager.selectionMode === 'none' ? undefined : state.selectionManager.selectionMode}>
      <Provider
        values={[
          [TextContext, {
            slots: {
              label: labelProps,
              description: descriptionProps
            }
          }],
          [KeyboardContext, keyboardShortcutProps]
        ]}>
        {renderProps.children}
      </Provider>
    </ElementType>
  );
}
