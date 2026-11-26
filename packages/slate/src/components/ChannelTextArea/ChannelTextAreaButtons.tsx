import {
  memo,
  useCallback,
  useContext,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ReactNode,
  type Ref,
} from 'react';
import clsx from 'clsx';
import lottie, { type AnimationItem } from 'lottie-web';
import { animated, useSpring } from '@react-spring/web';
import { AccessibilityPreferencesContext, Clickable, Tooltip, useTransition } from '@discord-mana/components';
import { PlusLargeIcon, SendMessageIcon } from '@discord-mana/icons';
import type { ChatInputType } from '../../chatInputTypes';
import attachStyles from './AttachButton.module.css';
import buttonStyles from './ChannelTextAreaButton.module.css';
import styles from './ChannelTextArea.module.css';
import emojiStyles from './EmojiButton.module.css';
import giftStyles from './GiftButton.module.css';
import appLauncherStyles from './AppLauncherButton.module.css';
import lottieStyles from './LottieIcon.module.css';
import sendStyles from './sendButton.module.css';
import appsAnimation from './lottie/apps.json';
import gifAnimation from './lottie/gif.json';
import giftAnimation from './lottie/gift.json';
import stickerAnimation from './lottie/sticker.json';

/** The class the client's expression picker positions against. */
const EXPRESSION_PICKER_BUTTON = 'expression-picker-chat-input-button';

interface LottieMarker {
  name: string;
  start: number;
  duration: number;
}

const HOVER_MARKERS: Record<string, LottieMarker> = {
  click: { name: 'click', start: 0, duration: 66 },
  hover: { name: 'hover', start: 90, duration: 40 },
};

export interface LottieIconHandle {
  play: (marker: string) => void;
  stopIfPlaying: (marker: string) => void;
}

/** An icon drawn by a Lottie animation that plays a segment on hover or click (`refresh_sm`, 20px). */
export const LottieIcon = ({
  ref,
  animationData,
  markers,
  size = 20,
  className,
}: {
  ref?: Ref<LottieIconHandle>;
  animationData: object;
  markers: Record<string, LottieMarker>;
  size?: number;
  className?: string;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<AnimationItem | null>(null);
  const currentRef = useRef<string | null>(null);
  const reducedMotion = useContext(AccessibilityPreferencesContext).reducedMotion.enabled;
  useImperativeHandle(
    ref,
    () => ({
      play(marker) {
        const animation = animationRef.current;
        if (animation == null) return;
        currentRef.current = marker;
        const { start, duration } = markers[marker];
        if (reducedMotion) {
          animation.resetSegments(true);
          animation.setSegment(start + duration, start + duration);
          animation.stop();
        } else {
          animation.setLoop(false);
          animation.resetSegments(true);
          animation.playSegments([start, start + duration], true);
        }
      },
      stopIfPlaying(marker) {
        const animation = animationRef.current;
        if (animation == null || reducedMotion || currentRef.current !== marker) return;
        const { start } = markers[marker];
        animation.resetSegments(true);
        animation.setSegment(start, start);
        animation.stop();
      },
    }),
    [markers, reducedMotion],
  );
  useEffect(() => {
    if (containerRef.current == null) return;
    const names = Object.values(markers);
    const initial = names.length === 1 ? names[0] : undefined;
    animationRef.current = lottie.loadAnimation({
      container: containerRef.current,
      renderer: 'svg',
      loop: false,
      autoplay: false,
      animationData: structuredClone(animationData),
      initialSegment: initial != null ? [initial.start, initial.start + initial.duration] : undefined,
    });
    return () => animationRef.current?.destroy();
  }, [animationData, markers]);
  return (
    <div
      ref={containerRef}
      className={clsx(lottieStyles.lottieIcon, lottieStyles.lottieIconColors, className)}
      style={
        { '--__lottieIconColor': 'currentColor', display: 'flex', width: size, height: size } as React.CSSProperties
      }
    />
  );
};

LottieIcon.displayName = 'LottieIcon';

const APP_LAUNCHER_MARKERS: Record<string, LottieMarker> = {
  hover: { name: 'hover', start: 0, duration: 59 },
  click: { name: 'click', start: 68, duration: 26 },
};

// The expression picker's id, which the picker buttons point `aria-controls` at.
let pickerCount = 0;
const usePickerId = () => {
  const [id] = useState(() => `uid_${++pickerCount}`);
  return id;
};

const useLottieButton = (animationData: object, markers: Record<string, LottieMarker> = HOVER_MARKERS) => {
  const ref = useRef<LottieIconHandle>(null);
  const Component = useCallback(
    () => <LottieIcon ref={ref} animationData={animationData} markers={markers} />,
    [animationData, markers],
  );
  return {
    Component,
    events: {
      onMouseEnter: () => ref.current?.play('hover'),
      onMouseLeave: () => ref.current?.stopIfPlaying('hover'),
    },
    play: () => ref.current?.play('click'),
  };
};

const ICON_TRANSITION = {
  config: { friction: 26, tension: 700, mass: 1 },
  initial: { scale: 1, opacity: 1 },
  from: { scale: 0.6, opacity: 0 },
  enter: { scale: 1, opacity: 1 },
  leave: { scale: 0.6, opacity: 0 },
};

export interface ChannelTextAreaButtonProps {
  ref?: Ref<HTMLElement>;
  className?: string;
  childClassName?: string;
  disabled?: boolean;
  isActive?: boolean;
  noHover?: boolean;
  pulse?: boolean;
  children?: ReactNode;
  onClick?: (event: React.MouseEvent<HTMLElement>) => void;
  onDoubleClick?: (event: React.MouseEvent<HTMLElement>) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  'aria-label'?: string;
  'aria-expanded'?: boolean;
  'aria-haspopup'?: React.AriaAttributes['aria-haspopup'];
  'aria-controls'?: string;
  'aria-keyshortcuts'?: string;
}

/** A chat bar button (GIF, sticker, gift, send): a clickable whose icon scales in. */
export const ChannelTextAreaButton = memo(
  ({
    ref,
    className,
    childClassName,
    disabled = false,
    isActive,
    noHover,
    pulse,
    children,
    onClick,
    onDoubleClick,
    onMouseEnter,
    onMouseLeave,
    'aria-label': ariaLabel,
    'aria-expanded': ariaExpanded,
    'aria-haspopup': ariaHasPopup,
    'aria-controls': ariaControls,
    'aria-keyshortcuts': ariaKeyShortcuts,
    // Only the listed props reach the element (a wrapping tooltip's aria-describedby doesn't, like the client).
  }: ChannelTextAreaButtonProps & Record<string, unknown>) => {
    const transition = useTransition(children != null, {
      ...ICON_TRANSITION,
      keys: (shown: boolean) => (shown ? 'children' : 'icon'),
    });
    return (
      <Clickable
        innerRef={ref}
        aria-label={ariaLabel}
        aria-expanded={ariaExpanded}
        aria-haspopup={ariaHasPopup}
        aria-controls={ariaControls}
        aria-keyshortcuts={ariaKeyShortcuts}
        aria-disabled={disabled}
        tabIndex={disabled ? -1 : 0}
        className={clsx(className, buttonStyles.button, {
          [buttonStyles.active]: isActive,
          [buttonStyles.noHover]: noHover,
          [buttonStyles.pulseButton]: pulse,
          [buttonStyles.disabled]: disabled,
        })}
        onClick={disabled ? undefined : onClick}
        onDoubleClick={disabled ? undefined : onDoubleClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        focusProps={{ offset: { top: 4, bottom: 4 } }}
      >
        {transition((style, shown, { key }) =>
          shown ? (
            <animated.div key={key} style={style} className={clsx(buttonStyles.buttonWrapper, childClassName)}>
              {children}
            </animated.div>
          ) : null,
        )}
      </Clickable>
    );
  },
);

ChannelTextAreaButton.displayName = 'ChannelTextAreaButton';

const SPRITE_COUNT = 77;

/** The emoji picker button: a greyscale emoji face that turns into a random coloured one on hover. */
export const EmojiButton = ({
  ref,
  className,
  active,
  onClick,
  'aria-label': ariaLabel = 'Add Emoji',
  'aria-controls': ariaControls,
}: {
  ref?: Ref<HTMLElement>;
  className?: string;
  active?: boolean;
  onClick?: (event: React.MouseEvent<HTMLElement>) => void;
  'aria-label'?: string;
  'aria-controls'?: string;
}) => {
  const [hovered, setHovered] = useState(false);
  const [sprite, setSprite] = useState(50);
  const reducedMotion = useContext(AccessibilityPreferencesContext).reducedMotion.enabled;
  const highlighted = hovered || active === true;
  const enter = useCallback(() => {
    if (highlighted) return;
    setHovered(true);
    setSprite(Math.floor(SPRITE_COUNT * Math.random()));
  }, [highlighted]);
  const { value } = useSpring({ value: highlighted ? 1 : 0, config: { tension: 800, friction: 24 } });
  const spriteStyle = {
    '--custom-emoji-sprite-size': '18px',
    '--custom-emoji-sprite-row': Math.floor(sprite / 20),
    '--custom-emoji-sprite-col': sprite % 20,
  } as React.CSSProperties;
  return (
    <Clickable
      innerRef={ref}
      className={clsx(highlighted ? emojiStyles.emojiButtonHovered : emojiStyles.emojiButtonNormal, className)}
      aria-expanded={active}
      onMouseEnter={enter}
      onMouseOver={enter}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      aria-label={ariaLabel}
      aria-controls={ariaControls}
      tabIndex={0}
      focusProps={{ offset: { top: 4, bottom: 4, left: -4, right: -4 } }}
    >
      <animated.div
        className={emojiStyles.spriteContainer}
        style={{ ...spriteStyle, transform: value.to([0, 1], [1, 1.14]).to((scale) => `scale(${scale})`) }}
      >
        <div
          className={clsx(
            emojiStyles.sprite,
            emojiStyles.spriteColored,
            highlighted ? emojiStyles.active : emojiStyles.inactive,
          )}
        />
        <div
          className={clsx(
            emojiStyles.sprite,
            emojiStyles.spriteGreyscale,
            highlighted ? emojiStyles.inactive : emojiStyles.active,
            {
              [emojiStyles.reducedMotion]: reducedMotion,
            },
          )}
        />
      </animated.div>
    </Clickable>
  );
};

EmojiButton.displayName = 'EmojiButton';

/** The "+" button left of the input (the client opens its upload and app menu from it). */
export const AttachButton = ({
  className,
  onClick,
  'aria-label': ariaLabel = 'More message options',
}: {
  className?: string;
  onClick?: (event: React.MouseEvent<HTMLElement>) => void;
  'aria-label'?: string;
}) => (
  <>
    <div className={attachStyles.uploadInput}>
      <input
        className="file-input"
        tabIndex={-1}
        multiple
        accept=""
        aria-hidden
        type="file"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          opacity: 0,
          cursor: 'pointer',
          fontSize: 0,
        }}
      />
    </div>
    <div className={attachStyles.attachWrapper}>
      <ChannelTextAreaButton
        className={clsx(attachStyles.attachButton, className)}
        childClassName={attachStyles.attachButtonInner}
        isActive={false}
        aria-label={ariaLabel}
        aria-expanded={false}
        aria-haspopup="menu"
        onClick={onClick}
      >
        <PlusLargeIcon size="refresh_sm" color="currentColor" colorClass={attachStyles.attachButtonPlus} />
      </ChannelTextAreaButton>
    </div>
  </>
);

AttachButton.displayName = 'AttachButton';

const LottieButton = ({
  animationData,
  label,
  tooltip,
  className,
  onClick,
}: {
  animationData: object;
  label: string;
  /** The GIF button carries a tooltip that only shows after a GIF is favourited. */
  tooltip?: string;
  className?: string;
  onClick?: () => void;
}) => {
  const { Component, events, play } = useLottieButton(animationData);
  const pickerId = usePickerId();
  const button = (
    <div className={clsx(EXPRESSION_PICKER_BUTTON, styles.buttonContainer)}>
      <ChannelTextAreaButton
        className={clsx(styles.button, className)}
        {...events}
        onClick={() => {
          onClick?.();
          play();
        }}
        isActive={false}
        aria-label={label}
        aria-expanded={false}
        aria-haspopup="dialog"
        aria-controls={pickerId}
      >
        <Component />
      </ChannelTextAreaButton>
    </div>
  );
  return tooltip != null ? (
    <Tooltip text={tooltip} shouldShow={false}>
      {button}
    </Tooltip>
  ) : (
    button
  );
};

LottieButton.displayName = 'LottieButton';

/** The Nitro gift button (the generic gift icon; seasonal gift promotions aren't modelled). */
const GiftButton = ({ onClick }: { onClick?: () => void }) => {
  const [hovered, setHovered] = useState(false);
  const { Component, events, play } = useLottieButton(giftAnimation);
  return (
    <div
      className={clsx(giftStyles.container, { [giftStyles.containerHovered]: hovered })}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Tooltip text="Upgrade your friends! Gift them awesome chat perks with Nitro.">
        <ChannelTextAreaButton
          className={styles.button}
          isActive={false}
          aria-label="Send a gift"
          aria-haspopup="dialog"
          onClick={() => {
            onClick?.();
            play();
          }}
          {...events}
        >
          <Component />
        </ChannelTextAreaButton>
      </Tooltip>
    </div>
  );
};

GiftButton.displayName = 'GiftButton';

export interface ChannelTextAreaButtonsProps {
  type: ChatInputType;
  disabled?: boolean;
  /** The text is empty (the send button is disabled then). */
  isEmpty?: boolean;
  onSubmit?: () => void;
  onEmojiClick?: () => void;
  onGifClick?: () => void;
  onStickerClick?: () => void;
  onGiftClick?: () => void;
  /** The gift button shows for chats with users who can receive Nitro (the client checks the recipient). */
  showGiftButton?: boolean;
  /** The send button shows when the user turned it on in settings (or on mobile). */
  showSubmitButton?: boolean;
  /** False collapses the GIF and sticker buttons (narrow chat bars). */
  showAllButtons?: boolean;
  /** The Apps button (app commands and activities) for inputs with commands. */
  showAppLauncher?: boolean;
  onAppLauncherClick?: () => void;
}

/** The Apps button: opens the app launcher. */
export const AppLauncherButton = ({ onClick }: { onClick?: () => void }) => {
  const { Component, events, play } = useLottieButton(appsAnimation, APP_LAUNCHER_MARKERS);
  return (
    <div className={clsx(appLauncherStyles.buttonContainer, 'app-launcher-entrypoint')}>
      <Clickable
        tabIndex={0}
        className={appLauncherStyles.button}
        onClick={() => {
          onClick?.();
          play();
        }}
        aria-label="Apps"
        aria-expanded={false}
        aria-haspopup="dialog"
        focusProps={{ offset: { top: 4, bottom: 4, left: -4, right: -4 } }}
        {...events}
      >
        <Component />
      </Clickable>
    </div>
  );
};

AppLauncherButton.displayName = 'AppLauncherButton';

/** The buttons right of the input: gift, GIF, sticker, emoji and send, as the input type allows. */
export const ChannelTextAreaButtons = memo(
  ({
    type,
    disabled = false,
    isEmpty = true,
    onSubmit,
    onEmojiClick,
    onGifClick,
    onStickerClick,
    onGiftClick,
    showGiftButton = true,
    showSubmitButton = false,
    showAllButtons = true,
    showAppLauncher = true,
    onAppLauncherClick,
  }: ChannelTextAreaButtonsProps) => {
    const emojiPickerId = usePickerId();
    const buttons: ReactNode[] = [];
    if (type.gifts?.button != null && showGiftButton && !disabled)
      buttons.push(<GiftButton key="gift" onClick={onGiftClick} />);
    if (type.gifs?.button != null && showAllButtons && !disabled)
      buttons.push(
        <LottieButton
          key="gif"
          animationData={gifAnimation}
          label="Open GIF picker"
          tooltip="Send GIF"
          onClick={onGifClick}
        />,
      );
    if (type.stickers?.button != null && showAllButtons && !disabled)
      buttons.push(
        <LottieButton
          key="sticker"
          animationData={stickerAnimation}
          label="Open sticker picker"
          className={styles.stickerButton}
          onClick={onStickerClick}
        />,
      );
    if (type.emojis?.button != null && !disabled)
      buttons.push(
        <div key="emoji" className={clsx(EXPRESSION_PICKER_BUTTON, styles.buttonContainer)}>
          <EmojiButton
            className={styles.emojiButton}
            onClick={onEmojiClick}
            active={false}
            aria-controls={emojiPickerId}
          />
        </div>,
      );
    if (showAppLauncher && type.commands?.enabled)
      buttons.push(<AppLauncherButton key="appLauncher" onClick={onAppLauncherClick} />);
    if (type.submit?.button != null && (type.submit.ignorePreference || showSubmitButton))
      buttons.push(<SendButton key="submit" onClick={onSubmit} disabled={disabled || isEmpty} />);
    return buttons.length === 0 ? null : <div className={styles.buttons}>{buttons}</div>;
  },
);

ChannelTextAreaButtons.displayName = 'ChannelTextAreaButtons';

const SendButton = memo(({ onClick, disabled = false }: { onClick?: () => void; disabled?: boolean }) => (
  <>
    <div className={sendStyles.separator} />
    <div className={sendStyles.container}>
      <div className={sendStyles.buttonContainer}>
        <ChannelTextAreaButton
          className={sendStyles.button}
          childClassName={clsx(sendStyles.buttonChild, {
            [sendStyles.disabled]: disabled,
            [sendStyles.activeButtonChild]: !disabled,
          })}
          onClick={onClick}
          disabled={disabled}
          isActive={false}
          noHover={disabled}
          aria-label="Send Message"
        >
          <SendMessageIcon size="xs" color="currentColor" className={sendStyles.sendIcon} />
        </ChannelTextAreaButton>
      </div>
    </div>
  </>
));

SendButton.displayName = 'SendButton';
