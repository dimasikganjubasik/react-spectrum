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
import {AriaCheckboxGroupProps, AriaCheckboxProps, HoverEvents, mergeProps, useCheckbox, useCheckboxGroup, useCheckboxGroupItem, useFocusRing, useHover, VisuallyHidden} from 'react-aria';
import {CheckboxGroupState, useCheckboxGroupState, useToggleState} from 'react-stately';
import {ContextValue, forwardRefType, Provider, RACValidation, RenderProps, SlotProps, useContextProps, useRenderProps, useSlot} from './utils';
import {FieldErrorContext} from './FieldError';
import {filterDOMProps} from '@react-aria/utils';
import {LabelContext} from './Label';
import React, {createContext, ForwardedRef, forwardRef, useContext, useRef} from 'react';
import {TextContext} from './Text';

export interface CheckboxGroupProps extends Omit<AriaCheckboxGroupProps, 'children' | 'label' | 'description' | 'errorMessage' | 'validationState' | 'validationBehavior'>, RACValidation, RenderProps<CheckboxGroupRenderProps>, SlotProps {}
export interface CheckboxProps extends Omit<AriaCheckboxProps, 'children' | 'validationState' | 'validationBehavior'>, HoverEvents, RACValidation, RenderProps<CheckboxRenderProps>, SlotProps {}

export interface CheckboxGroupRenderProps {
  /**
   * Whether the checkbox group is disabled.
   * @selector [data-disabled]
   */
  isDisabled: boolean,
  /**
   * Whether the checkbox group is read only.
   * @selector [data-readonly]
   */
  isReadOnly: boolean,
  /**
   * Whether the checkbox group is required.
   * @selector [data-required]
   */
  isRequired: boolean,
  /**
   * Whether the checkbox group is invalid.
   * @selector [data-invalid]
   */
  isInvalid: boolean,
  /**
   * State of the checkbox group.
   */
  state: CheckboxGroupState
}

export interface CheckboxRenderProps {
  /**
   * Whether the checkbox is selected.
   * @selector [data-selected]
   */
  isSelected: boolean,
  /**
   * Whether the checkbox is indeterminate.
   * @selector [data-indeterminate]
   */
  isIndeterminate: boolean,
  /**
   * Whether the checkbox is currently hovered with a mouse.
   * @selector [data-hovered]
   */
  isHovered: boolean,
  /**
   * Whether the checkbox is currently in a pressed state.
   * @selector [data-pressed]
   */
  isPressed: boolean,
  /**
   * Whether the checkbox is focused, either via a mouse or keyboard.
   * @selector [data-focused]
   */
  isFocused: boolean,
  /**
   * Whether the checkbox is keyboard focused.
   * @selector [data-focus-visible]
   */
  isFocusVisible: boolean,
  /**
   * Whether the checkbox is disabled.
   * @selector [data-disabled]
   */
  isDisabled: boolean,
  /**
   * Whether the checkbox is read only.
   * @selector [data-readonly]
   */
  isReadOnly: boolean,
  /**
   * Whether the checkbox invalid.
   * @selector [data-invalid]
   */
  isInvalid: boolean,
  /**
   * Whether the checkbox is required.
   * @selector [data-required]
   */
  isRequired: boolean
}

export const CheckboxGroupContext = createContext<ContextValue<CheckboxGroupProps, HTMLDivElement>>(null);
export const CheckboxGroupStateContext = createContext<CheckboxGroupState | null>(null);

function CheckboxGroup(props: CheckboxGroupProps, ref: ForwardedRef<HTMLDivElement>) {
  [props, ref] = useContextProps(props, ref, CheckboxGroupContext);
  let state = useCheckboxGroupState({
    ...props,
    validationBehavior: props.validationBehavior ?? 'native'
  });
  let [labelRef, label] = useSlot();
  let {groupProps, labelProps, descriptionProps, errorMessageProps, ...validation} = useCheckboxGroup({
    ...props,
    label,
    validationBehavior: props.validationBehavior ?? 'native'
  }, state);

  let renderProps = useRenderProps({
    ...props,
    values: {
      isDisabled: state.isDisabled,
      isReadOnly: state.isReadOnly,
      isRequired: props.isRequired || false,
      isInvalid: state.isInvalid,
      state
    },
    defaultClassName: 'react-aria-CheckboxGroup'
  });

  return (
    <div
      {...groupProps}
      {...renderProps}
      ref={ref}
      slot={props.slot || undefined}
      data-readonly={state.isReadOnly || undefined}
      data-required={props.isRequired || undefined}
      data-invalid={state.isInvalid || undefined}
      data-disabled={props.isDisabled || undefined}>
      <Provider
        values={[
          [CheckboxGroupStateContext, state],
          [LabelContext, {...labelProps, ref: labelRef, elementType: 'span'}],
          [TextContext, {
            slots: {
              description: descriptionProps,
              errorMessage: errorMessageProps
            }
          }],
          [FieldErrorContext, validation]
        ]}>
        {renderProps.children}
      </Provider>
    </div>
  );
}

export const CheckboxContext = createContext<ContextValue<CheckboxProps, HTMLLabelElement>>(null);

function Checkbox(props: CheckboxProps, ref: ForwardedRef<HTMLLabelElement>) {
  [props, ref] = useContextProps(props, ref, CheckboxContext);
  let inputRef = useRef<HTMLInputElement>(null);
  let groupState = useContext(CheckboxGroupStateContext);
  let {labelProps, inputProps, isSelected, isDisabled, isReadOnly, isPressed, isInvalid} = groupState
    // eslint-disable-next-line react-hooks/rules-of-hooks
    ? useCheckboxGroupItem({
      ...props,
      // Value is optional for standalone checkboxes, but required for CheckboxGroup items;
      // it's passed explicitly here to avoid typescript error (requires ignore).
      // @ts-ignore
      value: props.value,
      // ReactNode type doesn't allow function children.
      children: typeof props.children === 'function' ? true : props.children
    }, groupState, inputRef)
    // eslint-disable-next-line react-hooks/rules-of-hooks
    : useCheckbox({
      ...props,
      children: typeof props.children === 'function' ? true : props.children,
      validationBehavior: props.validationBehavior ?? 'native'
    // eslint-disable-next-line react-hooks/rules-of-hooks
    }, useToggleState(props), inputRef);
  let {isFocused, isFocusVisible, focusProps} = useFocusRing();
  let isInteractionDisabled = isDisabled || isReadOnly;

  let {hoverProps, isHovered} = useHover({
    ...props,
    isDisabled: isInteractionDisabled
  });

  let renderProps = useRenderProps({
    // TODO: should data attrs go on the label or on the <input>? useCheckbox passes them to the input...
    ...props,
    defaultClassName: 'react-aria-Checkbox',
    values: {
      isSelected,
      isIndeterminate: props.isIndeterminate || false,
      isPressed,
      isHovered,
      isFocused,
      isFocusVisible,
      isDisabled,
      isReadOnly,
      isInvalid,
      isRequired: props.isRequired || false
    }
  });

  let DOMProps = filterDOMProps(props);
  delete DOMProps.id;

  return (
    <label
      {...mergeProps(DOMProps, labelProps, hoverProps, renderProps)}
      ref={ref}
      slot={props.slot || undefined}
      data-selected={isSelected || undefined}
      data-indeterminate={props.isIndeterminate || undefined}
      data-pressed={isPressed || undefined}
      data-hovered={isHovered || undefined}
      data-focused={isFocused || undefined}
      data-focus-visible={isFocusVisible || undefined}
      data-disabled={isDisabled || undefined}
      data-readonly={isReadOnly || undefined}
      data-invalid={isInvalid || undefined}
      data-required={props.isRequired || undefined}>
      <VisuallyHidden elementType="span">
        <input {...inputProps} {...focusProps} ref={inputRef} />
      </VisuallyHidden>
      {renderProps.children}
    </label>
  );
}

/**
 * A checkbox allows a user to select multiple items from a list of individual items, or
 * to mark one individual item as selected.
 */
const _Checkbox = /*#__PURE__*/ (forwardRef as forwardRefType)(Checkbox);

/**
 * A checkbox group allows a user to select multiple items from a list of options.
 */
const _CheckboxGroup = /*#__PURE__*/ (forwardRef as forwardRefType)(CheckboxGroup);

export {_Checkbox as Checkbox, _CheckboxGroup as CheckboxGroup};
