import { useRef, useState } from 'react';
import {
  BackdropStyles,
  Button,
  CloseButton,
  Dialog,
  Heading,
  LegacyModalCloseButton,
  LegacyModalFooter,
  LegacyModalHeader,
  Menu,
  MenuControlItem,
  MenuItem,
  MenuSearchControl,
  MenuSeparator,
  MenuSliderControl,
  MenuSpinner,
  MenuTextInputItem,
  ModalAnimation,
  ModalContent,
  ModalRoot,
  ModalSize,
  openModal,
  Popout,
  Stack,
  Text,
  type BackdropStyle,
  type ModalAnimationValue,
  type ModalScrollbarType,
  type ModalSizeValue,
  type PopoutAnimationType,
} from '@discord-mana/components';
import type { StoryGroup } from '../../types';
import styles from './components.module.css';
import { keyOptions, LOREM, noop, valueOptions } from './shared';

type Position = 'top' | 'bottom' | 'left' | 'right';
type Align = 'top' | 'bottom' | 'left' | 'right' | 'center';

interface PopoutStoryProps {
  position: Position;
  align: Align | 'default';
  animation: keyof typeof Popout.Animation;
  spacing: number;
  autoInvert: boolean;
  nudgeAlignIntoViewport: boolean;
}

const PopoutStory = ({ align, animation, ...props }: PopoutStoryProps) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  return (
    <div style={{ padding: 160 }}>
      <Popout
        {...props}
        targetElementRef={buttonRef}
        align={align === 'default' ? undefined : align}
        animation={Popout.Animation[animation] as PopoutAnimationType}
        renderPopout={({ closePopout }) => (
          <div className={styles.popoutContent}>
            <Stack gap={8} align="start">
              <Text variant="body-md/semibold">A popout</Text>
              <Text variant="body-sm/normal" color="text-subtle">
                Click outside or press Escape to close it.
              </Text>
              <Button size="sm" variant="secondary" text="Close" onClick={() => closePopout()} />
            </Stack>
          </div>
        )}
      >
        {(triggerProps, { isShown }) => (
          <Button {...triggerProps} buttonRef={buttonRef} text={isShown ? 'Close popout' : 'Open popout'} />
        )}
      </Popout>
    </div>
  );
};

PopoutStory.displayName = 'PopoutStory';

const DialogStory = ({ modal }: { modal: boolean }) => {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  if (!open) return <Button buttonRef={buttonRef} text="Open dialog" onClick={() => setOpen(true)} />;
  return (
    <Dialog
      modal={modal}
      returnRef={buttonRef}
      aria-labelledby="dialog-story-title"
      className={styles.dialog}
      onKeyDown={(event) => {
        if (event.key === 'Escape') setOpen(false);
      }}
    >
      <Stack gap={12}>
        <Stack direction="horizontal" justify="space-between" align="center">
          <Heading variant="heading-md/semibold" id="dialog-story-title">
            A dialog
          </Heading>
          <CloseButton size="sm" onClick={() => setOpen(false)} />
        </Stack>
        <Text variant="body-sm/normal">
          {modal ? 'Focus stays inside this dialog until it closes.' : 'Focus can leave this dialog.'}
        </Text>
        <Button text="Done" onClick={() => setOpen(false)} />
      </Stack>
    </Dialog>
  );
};

DialogStory.displayName = 'DialogStory';

interface OpenModalStoryProps {
  title: string;
  size: ModalSizeValue;
  animation: ModalAnimationValue;
  backdropStyle: BackdropStyle;
  dismissable: boolean;
  instant: boolean;
  headerSeparator: boolean;
  footerSeparator: boolean;
  circleCloseButton: boolean;
  scrollbarType: ModalScrollbarType;
  paragraphs: number;
}

// The client's older modal API: openModal renders ModalRoot with the legacy header, content and footer.
const OpenModalStory = ({
  title,
  size,
  animation,
  backdropStyle,
  dismissable,
  instant,
  headerSeparator,
  footerSeparator,
  circleCloseButton,
  scrollbarType,
  paragraphs,
}: OpenModalStoryProps) => (
  <Button
    text="Open modal"
    onClick={() =>
      openModal(
        ({ transitionState, onClose }) => (
          <ModalRoot transitionState={transitionState} size={size} animation={animation}>
            <LegacyModalHeader separator={headerSeparator}>
              <Heading variant="heading-lg/semibold" style={{ flex: 1 }}>
                {title}
              </Heading>
              <LegacyModalCloseButton onClick={onClose} withCircleBackground={circleCloseButton} />
            </LegacyModalHeader>
            <ModalContent scrollbarType={scrollbarType}>
              {Array.from({ length: paragraphs }, (_, index) => (
                <Text key={index} variant="body-md/normal" style={{ marginBottom: 16 }}>
                  {LOREM}
                </Text>
              ))}
            </ModalContent>
            <LegacyModalFooter separator={footerSeparator}>
              <Button text="Done" onClick={onClose} />
            </LegacyModalFooter>
          </ModalRoot>
        ),
        { dismissable, instant, backdropStyle },
      )
    }
  />
);

OpenModalStory.displayName = 'OpenModalStory';

const MenuControlsStory = ({ loading }: { loading: boolean }) => {
  const [volume, setVolume] = useState(100);
  const [query, setQuery] = useState('');
  const [nickname, setNickname] = useState('');
  if (loading) return <MenuSpinner />;
  return (
    <Menu navId="menu-controls-story" aria-label="Menu controls" onClose={noop} onSelect={noop}>
      <MenuControlItem
        id="search"
        control={({ disabled, onInteraction }, ref) => (
          <MenuSearchControl
            ref={ref}
            query={query}
            onChange={setQuery}
            disabled={disabled}
            onInteraction={onInteraction}
          />
        )}
      />
      <MenuSeparator />
      <MenuControlItem
        id="user-volume"
        label="User Volume"
        control={({ tabIndex, onInteraction }, ref) => (
          <MenuSliderControl
            ref={ref}
            value={volume}
            maxValue={200}
            tabIndex={tabIndex}
            onChange={setVolume}
            onInteraction={onInteraction}
            aria-label="User Volume"
          />
        )}
      />
      <MenuTextInputItem id="nickname" value={nickname} onChange={setNickname} placeholder="Nickname" maxLength={32} />
      <MenuSeparator />
      <MenuItem id="reset" label="Reset Volume" action={() => setVolume(100)} />
    </Menu>
  );
};

MenuControlsStory.displayName = 'MenuControlsStory';

const overlays: StoryGroup = {
  title: 'Overlays',
  stories: [
    {
      name: 'Popout',
      id: 'popout',
      component: PopoutStory,
      controls: {
        position: {
          label: 'Position',
          type: 'select',
          defaultValue: 'right',
          options: valueOptions(['top', 'bottom', 'left', 'right']),
        },
        align: {
          label: 'Align',
          type: 'select',
          defaultValue: 'default',
          options: valueOptions(['default', 'top', 'bottom', 'left', 'right', 'center']),
        },
        animation: {
          label: 'Animation',
          type: 'select',
          defaultValue: 'TRANSLATE',
          options: keyOptions(Popout.Animation),
        },
        spacing: { label: 'Spacing', type: 'number', defaultValue: 8 },
        autoInvert: { label: 'Auto Invert', type: 'boolean', defaultValue: true },
        nudgeAlignIntoViewport: { label: 'Nudge Into Viewport', type: 'boolean', defaultValue: true },
      },
    },
    {
      name: 'Dialog',
      id: 'dialog',
      component: DialogStory,
      controls: { modal: { label: 'Modal', type: 'boolean', defaultValue: true } },
    },
    {
      name: 'openModal (ModalRoot)',
      id: 'open-modal',
      component: OpenModalStory,
      controls: {
        title: { label: 'Title', type: 'text', defaultValue: 'Modal Title' },
        size: {
          label: 'Size',
          type: 'select',
          defaultValue: ModalSize.SMALL,
          options: valueOptions(Object.values(ModalSize)),
        },
        animation: {
          label: 'Animation',
          type: 'select',
          defaultValue: ModalAnimation.DEFAULT,
          options: valueOptions(Object.values(ModalAnimation)),
        },
        backdropStyle: {
          label: 'Backdrop',
          type: 'select',
          defaultValue: BackdropStyles.DARK,
          options: valueOptions(Object.values(BackdropStyles)),
        },
        dismissable: { label: 'Dismissable', type: 'boolean', defaultValue: true },
        instant: { label: 'Instant', type: 'boolean', defaultValue: false },
        headerSeparator: { label: 'Header Separator', type: 'boolean', defaultValue: true },
        footerSeparator: { label: 'Footer Separator', type: 'boolean', defaultValue: true },
        circleCloseButton: { label: 'Circle Close Button', type: 'boolean', defaultValue: false },
        scrollbarType: {
          label: 'Scrollbar',
          type: 'select',
          defaultValue: 'thin',
          options: valueOptions(['thin', 'auto', 'none']),
        },
        paragraphs: { label: 'Paragraphs', type: 'slider', defaultValue: 3, minValue: 1, maxValue: 20 },
      },
    },
    {
      name: 'Menu Controls',
      id: 'menu-controls',
      component: MenuControlsStory,
      controls: { loading: { label: 'Loading', type: 'boolean', defaultValue: false } },
    },
  ],
};

export default overlays;
