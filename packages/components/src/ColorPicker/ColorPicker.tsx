import type { CSSProperties, ReactNode, Ref } from 'react';
import clsx from 'clsx';
import { CheckmarkLargeIcon, PencilIcon } from '@discord-components/icons';
import { FocusRing } from '../FocusRing';
import {
  ListNavigatorContainer,
  ListNavigatorProvider,
  ListOrientation,
  useListItem,
  useListNavigator,
} from '../ListNavigator';
import { tokens } from '../tokens';
import { DEFAULT_ROLE_COLOR, getDarkness, getGradientBackground, int2hex } from './colorUtils';
import styles from './ColorPicker.module.css';

// The client's English strings.
const GRADIENT_LABEL = 'Gradient';
const PICK_A_COLOR_LABEL = 'Pick a Color';

export interface ColorPickerSwatchProps {
  color: number | null | undefined;
  listItemId?: string;
  isDefault?: boolean;
  isCustom?: boolean;
  isSelected?: boolean;
  disabled?: boolean;
  style?: CSSProperties;
  className?: string;
  onClick?: (color: number | null | undefined | readonly number[]) => void;
  isGradient?: boolean;
  'aria-label'?: string;
  'aria-selected'?: boolean;
  gradientColors?: readonly number[];
  gradientDegrees?: number;
}

export const ColorPickerSwatch = ({
  color,
  listItemId,
  isDefault = false,
  isCustom = false,
  isSelected = false,
  disabled = false,
  style = {},
  onClick,
  isGradient = false,
  'aria-label': ariaLabel,
  gradientColors,
  gradientDegrees = 180,
  className,
  'aria-selected': ariaSelected,
}: ColorPickerSwatchProps) => {
  const listItemProps = useListItem(listItemId ?? `color-${color}`);
  const background: CSSProperties =
    isGradient && gradientColors != null && gradientColors.length > 0
      ? { background: getGradientBackground(gradientColors, gradientDegrees) }
      : { backgroundColor: color != null ? int2hex(color) : style.backgroundColor };
  const swatchColor = isGradient ? gradientColors?.[0] : color;
  // White marks on dark swatches, black on light ones.
  let light = false;
  if (isCustom && !isSelected) light = true;
  else if (isCustom || isSelected) light = getDarkness(swatchColor ?? DEFAULT_ROLE_COLOR) > 0.2;
  const markColor = light ? tokens.colors.WHITE.css : tokens.colors.BLACK.css;

  const renderCheckmark = () => {
    let width: number | string = 16;
    let height: number | string = 16;
    if (isCustom || isDefault) {
      width = '38%';
      height = 'auto';
    }
    if (isSelected) return <CheckmarkLargeIcon size="custom" width={width} height={height} color={markColor} />;
  };

  return (
    <FocusRing offset={-2}>
      <button
        type="button"
        className={clsx(styles.colorPickerSwatch, className, {
          [styles.disabled]: disabled,
          [styles.default]: isDefault,
          [styles.custom]: isCustom,
          [styles.noColor]: color == null && !isGradient,
          [styles.gradientPreset]: isGradient,
        })}
        disabled={disabled}
        onClick={() => onClick?.(isGradient ? gradientColors : color)}
        style={{ ...style, ...background }}
        aria-label={ariaLabel ?? (isGradient ? GRADIENT_LABEL : (background.backgroundColor as string | undefined))}
        {...listItemProps}
        role={ariaSelected != null ? 'option' : listItemProps.role}
        aria-selected={ariaSelected}
      >
        {isCustom ? (
          <PencilIcon size="custom" className={styles.colorPickerDropper} width={14} height={14} color={markColor} />
        ) : null}
        {renderCheckmark()}
      </button>
    </FocusRing>
  );
};

ColorPickerSwatch.displayName = 'ColorPickerSwatch';

export interface DefaultColorButtonProps {
  color: number;
  value: number | null | undefined;
  onChange?: (color: number) => void;
  disabled?: boolean;
  allowBlackCustomColor?: boolean;
}

export const DefaultColorButton = ({
  color,
  onChange,
  value,
  disabled,
  allowBlackCustomColor,
}: DefaultColorButtonProps) => (
  <ColorPickerSwatch
    isDefault
    listItemId="default"
    color={color}
    isSelected={color === value || (value === 0 && !allowBlackCustomColor)}
    onClick={onChange as ColorPickerSwatchProps['onClick']}
    disabled={disabled}
  />
);

DefaultColorButton.displayName = 'DefaultColorButton';

export interface CustomColorButtonProps {
  customColor: number | null | undefined;
  value: number | null | undefined;
  disabled?: boolean;
  'aria-label'?: string;
  presets: readonly number[];
}

export const CustomColorButton = ({
  customColor,
  value,
  disabled,
  'aria-label': ariaLabel,
  presets,
}: CustomColorButtonProps) => (
  <ColorPickerSwatch
    isCustom
    listItemId="custom"
    color={customColor}
    isSelected={value === customColor && !presets.includes(customColor as number)}
    disabled={disabled}
    aria-label={ariaLabel}
  />
);

CustomColorButton.displayName = 'CustomColorButton';

export interface ColorPickerGradientPreset {
  name: string;
  colors: readonly number[];
}

export interface ColorPickerProps {
  className?: string;
  defaultColor: number;
  customColor: number | null | undefined;
  // Preset colors, or gradient presets when isGradient is set.
  colors: readonly number[] | readonly ColorPickerGradientPreset[];
  value: number | null | undefined;
  gradientColors?: readonly number[];
  disabled?: boolean;
  onChange: (color: number | null | undefined | readonly number[]) => void;
  renderDefaultButton: (props: DefaultColorButtonProps) => ReactNode;
  renderCustomButton: (props: CustomColorButtonProps) => ReactNode;
  colorContainerClassName?: string;
  isGradient?: boolean;
  renderGradientCustomButton?: () => ReactNode;
  gradientDegrees?: number;
  gradientWidth?: string | number;
  allowBlackCustomColor?: boolean;
  shouldRenderSingleRow?: boolean;
  swatchClassName?: string;
}

const resolved = () => Promise.resolve();

export const ColorPicker = ({
  className,
  defaultColor,
  customColor,
  colors,
  value,
  gradientColors,
  disabled,
  onChange,
  renderDefaultButton,
  renderCustomButton,
  colorContainerClassName,
  isGradient,
  renderGradientCustomButton,
  gradientDegrees,
  gradientWidth,
  allowBlackCustomColor,
  shouldRenderSingleRow = false,
  swatchClassName,
}: ColorPickerProps) => {
  const fullWidth = gradientWidth === '100%';
  const navigator = useListNavigator({
    id: 'color-picker',
    isEnabled: true,
    orientation: ListOrientation.HORIZONTAL,
    scrollToStart: resolved,
    scrollToEnd: resolved,
  });

  const renderRow = (row: ColorPickerProps['colors']) => (
    <div
      className={clsx(styles.colorPickerRow, { [styles.singleRow]: shouldRenderSingleRow })}
      role={shouldRenderSingleRow ? 'listbox' : undefined}
      aria-label={shouldRenderSingleRow ? PICK_A_COLOR_LABEL : undefined}
      aria-orientation={shouldRenderSingleRow ? 'horizontal' : undefined}
    >
      {isGradient
        ? (row as readonly ColorPickerGradientPreset[]).map((preset) => {
            const key = preset.colors.join('-');
            const selected = gradientColors?.join('-') === key;
            return (
              <ColorPickerSwatch
                key={key}
                listItemId={`gradient-${key}`}
                gradientColors={preset.colors}
                color={0}
                isSelected={selected}
                className={swatchClassName}
                aria-selected={shouldRenderSingleRow ? selected : undefined}
                onClick={() => onChange(preset.colors)}
                disabled={disabled}
                isGradient
                aria-label={preset.name}
                gradientDegrees={gradientDegrees}
              />
            );
          })
        : (row as readonly number[]).map((color) => (
            <ColorPickerSwatch
              key={color}
              listItemId={`preset-${color}`}
              color={color}
              isSelected={color === value}
              className={swatchClassName}
              aria-selected={shouldRenderSingleRow ? color === value : undefined}
              onClick={onChange}
              disabled={disabled}
              isGradient={false}
            />
          ))}
    </div>
  );

  const firstRow = colors.slice(0, colors.length / 2) as ColorPickerProps['colors'];
  const secondRow = colors.slice(colors.length / 2, colors.length) as ColorPickerProps['colors'];

  return (
    <ListNavigatorProvider navigator={navigator}>
      <ListNavigatorContainer>
        {({ ref, ...containerProps }) => (
          <div
            className={clsx(styles.container, className, {
              [styles.gradient]: isGradient,
              [styles.gradientFullWidth]: isGradient && fullWidth,
            })}
            ref={ref as Ref<HTMLDivElement>}
            {...containerProps}
            role={shouldRenderSingleRow ? 'group' : containerProps.role}
            aria-orientation={shouldRenderSingleRow ? undefined : containerProps['aria-orientation']}
          >
            {!isGradient && (
              <>
                <div className={clsx(styles.defaultContainer, colorContainerClassName)}>
                  {renderDefaultButton({ value, color: defaultColor, onChange, disabled, allowBlackCustomColor })}
                </div>
                <div className={clsx(styles.customContainer, colorContainerClassName)}>
                  {renderCustomButton({ value, customColor, disabled, presets: colors as readonly number[] })}
                </div>
              </>
            )}
            {isGradient && renderGradientCustomButton != null && <div>{renderGradientCustomButton()}</div>}
            <div>
              {renderRow(shouldRenderSingleRow ? colors : firstRow)}
              {!shouldRenderSingleRow && renderRow(secondRow)}
            </div>
          </div>
        )}
      </ListNavigatorContainer>
    </ListNavigatorProvider>
  );
};

ColorPicker.displayName = 'ColorPicker';
