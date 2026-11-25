import { useContext } from 'react';
import {
  useSpring as useReactSpring,
  useTransition as useReactTransition,
  type PickAnimated,
  type SpringRef,
  type SpringValues,
  type TransitionFn,
} from '@react-spring/web';
import { AccessibilityPreferencesContext } from '../AccessibilityPreferences';

// 'respect-motion-settings' skips the animation (jumps to the end) when the user prefers reduced
// motion; 'animate-never' always skips it.
export type MotionPreference = 'respect-motion-settings' | 'animate-always' | 'animate-never';

const IMMEDIATE = { immediate: true } as const;

const useSkipAnimation = (mode: MotionPreference) => {
  const { reducedMotion } = useContext(AccessibilityPreferencesContext);
  return mode !== 'animate-always' && (mode !== 'respect-motion-settings' || reducedMotion.enabled);
};

type Deps = readonly unknown[] | undefined;
type SpringTuple<Props extends object> = [SpringValues<PickAnimated<Props>>, SpringRef<PickAnimated<Props>>];

interface UseSpring {
  <Props extends object>(props: () => Props, mode?: MotionPreference, deps?: Deps): SpringTuple<Props>;
  <Props extends object>(props: Props, mode?: MotionPreference): SpringValues<PickAnimated<Props>>;
  <Props extends object>(props: Props, mode: MotionPreference, deps: Deps): SpringTuple<Props>;
}

// react-spring's useSpring, honouring the user's reduced motion preference.
export const useSpring = ((...args: [object | (() => object), MotionPreference?, Deps?]) => {
  const [props, mode = 'respect-motion-settings', deps] = args;
  const skip = useSkipAnimation(mode);
  let resolved = props;
  if (skip) resolved = typeof props === 'function' ? () => ({ ...props(), ...IMMEDIATE }) : { ...props, ...IMMEDIATE };
  // Always passing deps makes react-spring return [values, api]; unwrap to match its own overloads.
  const [values, api] = useReactSpring(resolved as object, deps as unknown[] | undefined);
  return typeof resolved === 'function' || args.length === 3 ? [values, api] : values;
}) as UseSpring;

type TransitionTuple<Item, Props extends object> = [
  TransitionFn<Item, PickAnimated<Props>>,
  SpringRef<PickAnimated<Props>>,
];

interface UseTransition {
  <Item, Props extends object>(
    data: Item | readonly Item[],
    props: Props,
    mode?: MotionPreference,
  ): TransitionFn<Item, PickAnimated<Props>>;
  <Item, Props extends object>(
    data: Item | readonly Item[],
    props: Props,
    mode: MotionPreference,
    deps: Deps,
  ): TransitionTuple<Item, Props>;
}

// react-spring's useTransition, honouring the user's reduced motion preference.
export const useTransition = ((...args: [unknown, object, MotionPreference?, Deps?]) => {
  const [data, props, mode = 'respect-motion-settings', deps] = args;
  const skip = useSkipAnimation(mode);
  const resolved = skip ? { ...props, ...IMMEDIATE } : props;
  const [transition, api] = useReactTransition(data, resolved as object, deps as unknown[] | undefined);
  return args.length === 4 ? [transition, api] : transition;
}) as UseTransition;
