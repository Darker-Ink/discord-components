import { createContext, useContext, useEffect, useMemo, useRef } from 'react';
import {
  decodeImage,
  type Rive,
  type ViewModelInstance,
  type ViewModelInstanceBoolean,
  type ViewModelInstanceColor,
  type ViewModelInstanceEnum,
  type ViewModelInstanceNumber,
  type ViewModelInstanceString,
  type ViewModelInstanceTrigger,
} from '@rive-app/react-canvas';
import { AccessibilityPreferencesContext } from '../AccessibilityPreferences';
import { useManaContext } from '../ManaContext';
import type { TokenContext } from '../tokens';
import { getRiveCanvas } from './getRiveCanvas';
import { trackCurrentColor } from './trackCurrentColor';

export interface RiveDataBindingContextValue {
  instance: ViewModelInstance | null;
  rive: Rive | null;
  reducedMotionEnabled: boolean;
  playIfNeeded: () => void;
  /** Draws a color change right away, in the frame it happened in (`frameTime`). */
  showColorChange?: (frameTime?: number) => void;
}

export const RiveDataBindingContext = createContext<RiveDataBindingContextValue>({
  instance: null,
  rive: null,
  reducedMotionEnabled: false,
  playIfNeeded: () => {},
});

RiveDataBindingContext.displayName = 'RiveDataBindingContext';

export const useRiveDataBinding = () => useContext(RiveDataBindingContext);

/**
 * A color for a view model color property: ARGB as a number, a color token, RGB(A) channels (0-255,
 * alpha 0-1), or `currentColor` to follow the CSS color of the canvas' parent, transitions included.
 */
export type RiveColorValue =
  | number
  | 'currentColor'
  | { resolve: (context: TokenContext) => { rgba: () => [number, number, number, number] } }
  | { r: number; g: number; b: number; a?: number };

export type RiveImageStatus = 'loaded' | 'failed';

interface ListenableProperty {
  on: (callback: () => void) => void;
  off: (callback: () => void) => void;
}

const getNumber = (instance: ViewModelInstance, path: string) => instance.number(path);
const getString = (instance: ViewModelInstance, path: string) => instance.string(path);
const getBoolean = (instance: ViewModelInstance, path: string) => instance.boolean(path);
const getColor = (instance: ViewModelInstance, path: string) => instance.color(path);
const getEnum = (instance: ViewModelInstance, path: string) => instance.enum(path);
const getTrigger = (instance: ViewModelInstance, path: string) => instance.trigger(path);

const readValue = <T,>(property: { value: T }) => property.value;

// Calls `onChange` with the property's value now and whenever the animation changes it.
const usePropertyListener = <P extends ListenableProperty, V>(
  instance: ViewModelInstance | null,
  path: string,
  getProperty: (instance: ViewModelInstance, path: string) => P | null,
  read: (property: P) => V,
  onChange: ((value: V) => void) | undefined,
) => {
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  const readRef = useRef(read);
  useEffect(() => {
    readRef.current = read;
  }, [read]);
  const listening = onChange != null;
  useEffect(() => {
    const property = instance != null && listening ? getProperty(instance, path) : null;
    if (property == null) return;
    const notify = () => onChangeRef.current?.(readRef.current(property));
    notify();
    property.on(notify);
    return () => property.off(notify);
  }, [instance, path, getProperty, listening]);
};

// Writes `value` into a property (waking the animation up to draw it) and listens to changes.
const useValueProperty = <P extends ListenableProperty & { value: V }, V>(
  getProperty: (instance: ViewModelInstance, path: string) => P | null,
  path: string,
  instance: ViewModelInstance | null,
  value: V | undefined,
  onChange: ((value: V) => void) | undefined,
  playIfNeeded: (() => void) | undefined,
) => {
  useEffect(() => {
    const property = instance == null || value == null ? null : getProperty(instance, path);
    if (property == null || value == null) return;
    property.value = value;
    playIfNeeded?.();
  }, [value, playIfNeeded, path, instance, getProperty]);
  usePropertyListener(instance, path, getProperty, readValue<V>, onChange);
};

/**
 * Two-way binds a number property of a view model instance: `value` is written into the animation
 * (waking it up to draw the change) and `onChange` hears about changes made by the animation itself.
 * The other `useRive*Property` hooks work the same way for their property types.
 */
export const useRiveNumberProperty = (
  path: string,
  instance: ViewModelInstance | null,
  value: number | undefined,
  onChange: ((value: number) => void) | undefined,
  playIfNeeded: (() => void) | undefined,
) => useValueProperty<ViewModelInstanceNumber, number>(getNumber, path, instance, value, onChange, playIfNeeded);

export const useRiveStringProperty = (
  path: string,
  instance: ViewModelInstance | null,
  value: string | undefined,
  onChange: ((value: string) => void) | undefined,
  playIfNeeded: (() => void) | undefined,
) => useValueProperty<ViewModelInstanceString, string>(getString, path, instance, value, onChange, playIfNeeded);

export const useRiveBooleanProperty = (
  path: string,
  instance: ViewModelInstance | null,
  value: boolean | undefined,
  onChange: ((value: boolean) => void) | undefined,
  playIfNeeded: (() => void) | undefined,
) => useValueProperty<ViewModelInstanceBoolean, boolean>(getBoolean, path, instance, value, onChange, playIfNeeded);

export const useRiveEnumProperty = (
  path: string,
  instance: ViewModelInstance | null,
  value: string | undefined,
  onChange: ((value: string) => void) | undefined,
  playIfNeeded: (() => void) | undefined,
) => useValueProperty<ViewModelInstanceEnum, string>(getEnum, path, instance, value, onChange, playIfNeeded);

/** `onChange` receives the color as ARGB. */
export const useRiveColorProperty = (
  path: string,
  instance: ViewModelInstance | null,
  value: RiveColorValue | undefined,
  onChange: ((value: number) => void) | undefined,
  playIfNeeded: (() => void) | undefined,
) => {
  const { theme, saturation } = useManaContext();
  const { highContrastModeEnabled } = useContext(AccessibilityPreferencesContext);
  const { rive, showColorChange } = useRiveDataBinding();
  const redraw: ((frameTime?: number) => void) | undefined = showColorChange ?? playIfNeeded;
  const followsCurrentColor = value === 'currentColor';

  useEffect(() => {
    if (value == null || value === 'currentColor') return;
    const property = instance == null ? null : getColor(instance, path);
    if (property == null) return;
    if (typeof value === 'number') {
      property.value = value;
    } else if ('resolve' in value) {
      const [r, g, b, a] = value.resolve({ theme, saturation, highContrastModeEnabled }).rgba();
      property.rgba(r, g, b, 255 * a);
    } else {
      property.rgba(value.r, value.g, value.b, (value.a ?? 1) * 255);
    }
    redraw?.();
  }, [value, theme, saturation, highContrastModeEnabled, redraw, path, instance]);

  useEffect(() => {
    if (!followsCurrentColor || instance == null || rive == null) return;
    const canvas = getRiveCanvas(rive);
    const property = getColor(instance, path);
    if (canvas == null || property == null) return;
    return trackCurrentColor(canvas, (argb, frameTime) => {
      property.argb(argb >>> 24, (argb >>> 16) & 255, (argb >>> 8) & 255, argb & 255);
      redraw?.(frameTime);
    });
  }, [followsCurrentColor, instance, rive, path, redraw]);

  usePropertyListener<ViewModelInstanceColor, number>(instance, path, getColor, readValue<number>, onChange);
};

/** Fires the trigger whenever `value` changes to `true` or a non-zero number. */
export const useRiveTriggerProperty = (
  path: string,
  instance: ViewModelInstance | null,
  value: boolean | number | undefined,
  onChange: (() => void) | undefined,
  playIfNeeded: (() => void) | undefined,
) => {
  const lastApplied = useRef<{ instance: ViewModelInstance; value: boolean | number | undefined } | null>(null);
  useEffect(() => {
    if (instance == null) return;
    const last = lastApplied.current;
    if (last?.instance === instance && last.value === value) return;
    lastApplied.current = { instance, value };
    if (typeof value === 'boolean' ? value : value != null && value !== 0) {
      getTrigger(instance, path)?.trigger();
      playIfNeeded?.();
    }
  }, [value, playIfNeeded, path, instance]);

  const onFire = useMemo(() => (onChange == null ? undefined : () => onChange()), [onChange]);
  const onFireRef = useRef(onFire);
  useEffect(() => {
    onFireRef.current = onFire;
  }, [onFire]);
  const listening = onFire != null;
  useEffect(() => {
    const property: ViewModelInstanceTrigger | null = instance != null && listening ? getTrigger(instance, path) : null;
    if (property == null) return;
    const notify = () => onFireRef.current?.();
    property.on(notify);
    return () => property.off(notify);
  }, [instance, path, listening]);
};

/** Loads the image at the URL `value` into the property; `onChange` hears whether that worked. */
export const useRiveImageProperty = (
  path: string,
  instance: ViewModelInstance | null,
  value: string | undefined,
  onChange: ((url: string, status: RiveImageStatus) => void) | undefined,
  playIfNeeded: (() => void) | undefined,
) => {
  const decoded = useRef<Record<string, Awaited<ReturnType<typeof decodeImage>>>>({});
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  const playIfNeededRef = useRef(playIfNeeded);
  useEffect(() => {
    playIfNeededRef.current = playIfNeeded;
  }, [playIfNeeded]);

  useEffect(() => {
    if (instance == null || value == null) return;
    const controller = new AbortController();
    const { signal } = controller;
    const load = async (url: string) => {
      const cached = decoded.current[url];
      if (cached != null) return cached;
      try {
        const response = await fetch(url, { signal });
        if (!response.ok) return null;
        const image = await decodeImage(new Uint8Array(await response.arrayBuffer()));
        if (image == null) return null;
        decoded.current[url] = image;
        return image;
      } catch {
        return null;
      }
    };
    void (async () => {
      const image = await load(value);
      if (signal.aborted) return;
      let status: RiveImageStatus = 'failed';
      const property = instance.image(path);
      if (image != null && property != null) {
        property.value = image;
        playIfNeededRef.current?.();
        status = 'loaded';
      }
      onChangeRef.current?.(value, status);
    })();
    return () => controller.abort('New image value applied.');
  }, [value, path, instance]);
};

/** Shows the file's artboard named `value` in an artboard property. */
export const useRiveArtboardProperty = (
  path: string,
  instance: ViewModelInstance | null,
  rive: Rive | null,
  value: string | undefined,
  playIfNeeded: (() => void) | undefined,
) => {
  useEffect(() => {
    if (instance == null || rive == null || value == null) return;
    const property = instance.artboard(path);
    const artboard = rive.getBindableArtboard(value);
    if (property != null && artboard != null) {
      property.value = artboard;
      playIfNeeded?.();
    }
  }, [rive, value, playIfNeeded, path, instance]);
};

export type RiveDynamicBinding =
  | { type: 'number'; value: number | undefined }
  | { type: 'string'; value: string | undefined }
  | { type: 'boolean'; value: boolean | undefined }
  | { type: 'color'; value: RiveColorValue | undefined }
  | { type: 'enum'; value: string | undefined }
  | { type: 'trigger'; value: boolean | number | undefined }
  | { type: 'image'; value: string | undefined }
  | { type: 'artboard'; value: string | undefined };

type BindingProps<T, C = (value: T) => void> = { path: string; value: T | undefined; onChange?: C };

const NumberBinding = ({ path, value, onChange }: BindingProps<number>) => {
  const { instance, playIfNeeded } = useRiveDataBinding();
  useRiveNumberProperty(path, instance, value, onChange, playIfNeeded);
  return null;
};
NumberBinding.displayName = 'NumberBinding';

const StringBinding = ({ path, value, onChange }: BindingProps<string>) => {
  const { instance, playIfNeeded } = useRiveDataBinding();
  useRiveStringProperty(path, instance, value, onChange, playIfNeeded);
  return null;
};
StringBinding.displayName = 'StringBinding';

const BooleanBinding = ({ path, value, onChange }: BindingProps<boolean>) => {
  const { instance, playIfNeeded } = useRiveDataBinding();
  useRiveBooleanProperty(path, instance, value, onChange, playIfNeeded);
  return null;
};
BooleanBinding.displayName = 'BooleanBinding';

const ColorBinding = ({ path, value, onChange }: BindingProps<RiveColorValue, (value: number) => void>) => {
  const { instance, playIfNeeded } = useRiveDataBinding();
  useRiveColorProperty(path, instance, value, onChange, playIfNeeded);
  return null;
};
ColorBinding.displayName = 'ColorBinding';

const EnumBinding = ({ path, value, onChange }: BindingProps<string>) => {
  const { instance, playIfNeeded } = useRiveDataBinding();
  useRiveEnumProperty(path, instance, value, onChange, playIfNeeded);
  return null;
};
EnumBinding.displayName = 'EnumBinding';

const TriggerBinding = ({ path, value, onChange }: BindingProps<boolean | number, () => void>) => {
  const { instance, playIfNeeded } = useRiveDataBinding();
  useRiveTriggerProperty(path, instance, value, onChange, playIfNeeded);
  return null;
};
TriggerBinding.displayName = 'TriggerBinding';

const ImageBinding = ({
  path,
  value,
  onChange,
}: BindingProps<string, (url: string, status: RiveImageStatus) => void>) => {
  const { instance, playIfNeeded } = useRiveDataBinding();
  useRiveImageProperty(path, instance, value, onChange, playIfNeeded);
  return null;
};
ImageBinding.displayName = 'ImageBinding';

const ArtboardBinding = ({ path, value }: BindingProps<string, never>) => {
  const { instance, rive, playIfNeeded } = useRiveDataBinding();
  useRiveArtboardProperty(path, instance, rive, value, playIfNeeded);
  return null;
};
ArtboardBinding.displayName = 'ArtboardBinding';

/** Binds one view model property of the surrounding animation by its type. */
export const RivePropertyBinding = ({
  path,
  binding,
  onChange,
}: {
  path: string;
  binding: RiveDynamicBinding;
  // The listener matching the property type (see the `useRive*Property` hooks).
  onChange?: (...args: never[]) => void;
}) => {
  const listener = onChange as never;
  switch (binding.type) {
    case 'number':
      return <NumberBinding path={path} value={binding.value} onChange={listener} />;
    case 'string':
      return <StringBinding path={path} value={binding.value} onChange={listener} />;
    case 'boolean':
      return <BooleanBinding path={path} value={binding.value} onChange={listener} />;
    case 'color':
      return <ColorBinding path={path} value={binding.value} onChange={listener} />;
    case 'enum':
      return <EnumBinding path={path} value={binding.value} onChange={listener} />;
    case 'trigger':
      return <TriggerBinding path={path} value={binding.value} onChange={listener} />;
    case 'image':
      return <ImageBinding path={path} value={binding.value} onChange={listener} />;
    case 'artboard':
      return <ArtboardBinding path={path} value={binding.value} />;
    default:
      return null;
  }
};
RivePropertyBinding.displayName = 'RivePropertyBinding';

const ReducedMotionBinding = () => {
  const { instance, reducedMotionEnabled, playIfNeeded } = useRiveDataBinding();
  useRiveBooleanProperty('reducedMotion', instance, reducedMotionEnabled, undefined, playIfNeeded);
  return null;
};
ReducedMotionBinding.displayName = 'ReducedMotionBinding';

/**
 * Binds properties given at runtime by path and type (for animations without generated bindings).
 * `reducedMotion` follows the user's preference unless it is given.
 */
export const RiveDynamicDataBinding = ({
  dynamicDataBinding,
}: {
  dynamicDataBinding?: Record<string, RiveDynamicBinding | null | undefined>;
}) => (
  <>
    {dynamicDataBinding?.reducedMotion == null ? <ReducedMotionBinding /> : null}
    {Object.entries(dynamicDataBinding ?? {}).map(([path, binding]) =>
      binding == null ? null : <RivePropertyBinding key={`${path}:${binding.type}`} path={path} binding={binding} />,
    )}
  </>
);

RiveDynamicDataBinding.displayName = 'RiveDynamicDataBinding';
