import { useCallback, type ComponentType } from 'react';
import {
  RiveAnimation,
  useRiveAsset,
  useRiveDataBinding,
  useRiveNumberProperty,
  RiveAssetStatus,
  type RiveAnimationProps,
} from '../Rive';

const RIVE_SRC =
  'https://cdn.discordapp.com/assets/content/bd712b6e0f8e5ee33f7f102f7bb02e40850fe06ccdf425523f3093c838ef6a28.riv';

export type ExpressiveButtonArtboard =
  'HoverDarkmode' | 'ButtonFillDarkmode' | 'BaseGlowRemapped' | 'BaseGlow' | 'HoverLightmode' | 'ButtonFillLightmode';

interface HoverBinding {
  posx?: number;
  posy?: number;
}

interface HoverBindingChange {
  posx?: (value: number) => void;
  posy?: (value: number) => void;
}

interface DataBindingProps {
  dataBinding?: HoverBinding;
  onDataBindingChange?: HoverBindingChange;
}

const HoverDataBinding = ({ dataBinding, onDataBindingChange }: DataBindingProps) => {
  const { instance, playIfNeeded } = useRiveDataBinding();
  useRiveNumberProperty('posy', instance, dataBinding?.posy, onDataBindingChange?.posy, playIfNeeded);
  useRiveNumberProperty('posx', instance, dataBinding?.posx, onDataBindingChange?.posx, playIfNeeded);
  return null;
};

HoverDataBinding.displayName = 'HoverDataBinding';

const ARTBOARD_VIEW_MODEL_INSTANCES: Record<ExpressiveButtonArtboard, string[]> = {
  HoverDarkmode: ['Instance'],
  ButtonFillDarkmode: [],
  BaseGlowRemapped: [],
  BaseGlow: [],
  HoverLightmode: ['Instance'],
  ButtonFillLightmode: [],
};

const DATA_BINDINGS: Partial<Record<ExpressiveButtonArtboard, ComponentType<DataBindingProps>>> = {
  HoverDarkmode: HoverDataBinding,
  HoverLightmode: HoverDataBinding,
};

export interface ExpressiveButtonRiveProps
  extends
    Omit<RiveAnimationProps, 'buffer' | 'artboard' | 'artboardViewModelInstances' | 'renderDataBinding'>,
    DataBindingProps {
  artboard?: ExpressiveButtonArtboard;
}

/** The glow, hover and fill animations layered behind expressive buttons. */
export const ExpressiveButtonRive = ({
  artboard = 'HoverDarkmode',
  stateMachine,
  dataBinding,
  onDataBindingChange,
  ...props
}: ExpressiveButtonRiveProps) => {
  const { status, buffer } = useRiveAsset(RIVE_SRC);
  const renderDataBinding = useCallback(() => {
    const DataBinding = DATA_BINDINGS[artboard];
    return DataBinding == null ? null : (
      <DataBinding dataBinding={dataBinding} onDataBindingChange={onDataBindingChange} />
    );
  }, [artboard, dataBinding, onDataBindingChange]);

  if (status === RiveAssetStatus.Loading) return null;
  return (
    <RiveAnimation
      buffer={buffer}
      artboard={artboard}
      stateMachine={stateMachine}
      artboardViewModelInstances={ARTBOARD_VIEW_MODEL_INSTANCES}
      renderDataBinding={renderDataBinding}
      {...props}
    />
  );
};

ExpressiveButtonRive.displayName = 'ExpressiveButtonRive';
ExpressiveButtonRive.riveSrc = RIVE_SRC;
