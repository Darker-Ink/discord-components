import { useCallback } from 'react';
import { RiveAnimation, type RiveAnimationProps, type RivePropertyType } from '../RiveAnimation';
import {
  RivePropertyBinding,
  useRiveDataBinding,
  type RiveColorValue,
  type RiveDynamicBinding,
  type RiveImageStatus,
} from '../RiveDataBinding';
import { RiveAssetStatus, useHasRiveAssetOverride, useRiveAsset } from '../useRiveAsset';

export type RiveArtboardProperties = Record<string, Record<string, RivePropertyType>>;

type PropertyValue<T> = T extends 'number'
  ? number
  : T extends 'string' | 'enum' | 'image' | 'artboard'
    ? string
    : T extends 'boolean'
      ? boolean
      : T extends 'color'
        ? RiveColorValue
        : T extends 'trigger'
          ? boolean | number
          : never;

type PropertyChange<T> = T extends 'number'
  ? (value: number) => void
  : T extends 'string' | 'enum'
    ? (value: string) => void
    : T extends 'boolean'
      ? (value: boolean) => void
      : T extends 'color'
        ? (argb: number) => void
        : T extends 'trigger'
          ? () => void
          : T extends 'image'
            ? (url: string, status: RiveImageStatus) => void
            : never;

type Distribute<U> = U extends unknown ? U : never;
type PropertyName<P extends RiveArtboardProperties> =
  Distribute<P[keyof P]> extends infer R
    ? R extends Record<string, RivePropertyType>
      ? keyof R & string
      : never
    : never;
type PropertyTypeOf<P extends RiveArtboardProperties, K extends string> = {
  [A in keyof P]: K extends keyof P[A] ? P[A][K] : never;
}[keyof P];

/** Values for the view model properties of any of the animation's artboards. */
export type RiveDataBindingValues<P extends RiveArtboardProperties> = {
  [K in PropertyName<P>]?: PropertyValue<PropertyTypeOf<P, K>>;
};

/** Listeners for changes the animation makes to its view model properties. */
export type RiveDataBindingChanges<P extends RiveArtboardProperties> = {
  [
    K in PropertyName<P> as K extends 'reducedMotion' ? never : PropertyTypeOf<P, K> extends 'artboard' ? never : K
  ]?: PropertyChange<PropertyTypeOf<P, K>>;
};

export type GeneratedRiveAnimationProps<P extends RiveArtboardProperties> = Omit<
  RiveAnimationProps,
  'buffer' | 'artboard'
> & {
  artboard?: keyof P & string;
  dataBinding?: RiveDataBindingValues<P>;
  onDataBindingChange?: RiveDataBindingChanges<P>;
};

export interface GeneratedRiveAnimationConfig<P extends RiveArtboardProperties> {
  src: string;
  defaultArtboard: keyof P & string;
  artboardProperties: P;
  artboardViewModelInstances: { [A in keyof P]: string[] };
  artboardStateMachines: { [A in keyof P]: string[] };
}

type BindingProps = {
  properties: Record<string, RivePropertyType>;
  dataBinding: Record<string, unknown> | undefined;
  onDataBindingChange: Record<string, ((...args: never[]) => void) | undefined> | undefined;
};

// Binds every property of the artboard. `reducedMotion` follows the user's preference unless it is given
// and isn't reported back; artboard properties can't be listened to.
const ArtboardDataBinding = ({ properties, dataBinding, onDataBindingChange }: BindingProps) => {
  const { reducedMotionEnabled } = useRiveDataBinding();
  return (
    <>
      {Object.entries(properties).map(([path, type]) => {
        const isReducedMotion = path === 'reducedMotion' && type === 'boolean';
        const value = isReducedMotion ? (dataBinding?.[path] ?? reducedMotionEnabled) : dataBinding?.[path];
        const onChange = isReducedMotion || type === 'artboard' ? undefined : onDataBindingChange?.[path];
        if (type === 'list' || type === 'viewModel') return null;
        return (
          <RivePropertyBinding
            key={path}
            path={path}
            binding={{ type, value } as RiveDynamicBinding}
            onChange={onChange}
          />
        );
      })}
    </>
  );
};

ArtboardDataBinding.displayName = 'ArtboardDataBinding';

/**
 * Builds the component for one of Discord's Rive files: it loads the file, picks the artboard and binds
 * the artboard's view model properties to `dataBinding`/`onDataBindingChange`.
 */
export const createRiveAnimation = <const P extends RiveArtboardProperties>(
  displayName: string,
  {
    src,
    defaultArtboard,
    artboardProperties,
    artboardViewModelInstances,
    artboardStateMachines,
  }: GeneratedRiveAnimationConfig<P>,
) => {
  const hasDataBinding = Object.values(artboardProperties).some((properties) => Object.keys(properties).length > 0);

  const Component = ({
    artboard = defaultArtboard,
    stateMachine,
    dataBinding,
    onDataBindingChange,
    ...props
  }: GeneratedRiveAnimationProps<P>) => {
    const { status, buffer } = useRiveAsset(src);
    const hasOverride = useHasRiveAssetOverride(src);
    const renderDataBinding = useCallback(() => {
      const properties = artboardProperties[artboard];
      if (properties == null || Object.keys(properties).length === 0) return null;
      return (
        <ArtboardDataBinding
          key={artboard}
          properties={properties}
          dataBinding={dataBinding as BindingProps['dataBinding']}
          onDataBindingChange={onDataBindingChange as BindingProps['onDataBindingChange']}
        />
      );
    }, [artboard, dataBinding, onDataBindingChange]);

    if (status === RiveAssetStatus.Loading) return null;
    return (
      <RiveAnimation
        // A replaced file needs a new runtime instance.
        {...(hasOverride ? { key: 'override' } : {})}
        buffer={buffer}
        artboard={artboard}
        stateMachine={stateMachine}
        artboardProperties={artboardProperties}
        artboardViewModelInstances={artboardViewModelInstances}
        artboardStateMachines={artboardStateMachines}
        {...(hasDataBinding ? { renderDataBinding } : {})}
        {...props}
      />
    );
  };

  Component.displayName = displayName;
  Component.riveSrc = src;
  return Component;
};
