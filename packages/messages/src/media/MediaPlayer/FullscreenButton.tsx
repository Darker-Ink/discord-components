import { useSyncExternalStore, type ComponentType, type MouseEvent } from 'react';
import clsx from 'clsx';
import { FocusRing, Tooltip } from '@discord-components/components';
import { FullscreenEnterIcon, FullscreenExitIcon, type IconProps } from '@discord-components/icons';
import type { FocusRingProps } from 'react-focus-rings';
import { useMediaContext } from '../MediaContext';
import { isFullscreen } from './fullscreen';
import legacyButtonStyles from './LegacyButton.module.css';
import controlStyles from './ControlButton.module.css';

interface ControlButtonProps {
  label: string;
  iconComponent: ComponentType<IconProps>;
  focusProps?: FocusRingProps;
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  className?: string;
  iconClassName?: string;
  iconColor?: string;
  isActive?: boolean;
  'aria-label'?: string;
}

// The client's call-control button (a blank legacy Button with a tooltip), as the video player uses it.
const ControlButton = ({
  label,
  iconComponent: Icon,
  focusProps,
  onClick,
  className,
  iconClassName,
  iconColor = 'currentColor',
  isActive = false,
  'aria-label': ariaLabel,
}: ControlButtonProps) => (
  <div>
    <Tooltip position="top" __unsupportedReactNodeAsText={label} ariaHidden>
      <FocusRing {...focusProps}>
        <button
          aria-label={ariaLabel ?? label}
          onMouseDown={(event) => event.preventDefault()}
          onClick={onClick}
          type="button"
          className={clsx(
            { [controlStyles.active]: isActive },
            className,
            legacyButtonStyles.button,
            legacyButtonStyles.lookBlank,
            legacyButtonStyles.colorBrand,
            legacyButtonStyles.grow,
          )}
        >
          <div className={clsx(legacyButtonStyles.contents, controlStyles.lineHeightReset)}>
            <Icon
              size="md"
              className={clsx(iconClassName, controlStyles.controlIcon, { [controlStyles.active]: isActive })}
              color={iconColor}
            />
          </div>
        </button>
      </FocusRing>
    </Tooltip>
  </div>
);

ControlButton.displayName = 'ControlButton';

export interface FullscreenButtonProps extends Omit<ControlButtonProps, 'label' | 'iconComponent'> {
  /** The element that goes full screen. */
  node: Element | null | undefined;
  guestWindow?: Window;
}

const subscribe = (callback: () => void) => {
  document.addEventListener('fullscreenchange', callback);
  return () => document.removeEventListener('fullscreenchange', callback);
};

export const FullscreenButton = ({ node, guestWindow, ...props }: FullscreenButtonProps) => {
  const { i18n } = useMediaContext();
  const fullscreen = useSyncExternalStore(subscribe, () => isFullscreen(node, guestWindow?.document));
  return (
    <ControlButton
      label={fullscreen ? i18n.EXIT_FULL_SCREEN : i18n.ENTER_FULL_SCREEN}
      iconComponent={fullscreen ? FullscreenExitIcon : FullscreenEnterIcon}
      {...props}
    />
  );
};

FullscreenButton.displayName = 'FullscreenButton';
