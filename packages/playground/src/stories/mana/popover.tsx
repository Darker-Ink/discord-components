import { useCallback, useEffect, useRef, useState, type ReactNode, type Ref, type RefObject } from 'react';
import clsx from 'clsx';
import {
  BasePopover,
  Button,
  Graphic,
  Popover,
  PopoverCaret,
  PopoverCloseButton,
  PopoverHeader,
  Text,
  VideoPopover,
  type BadgeType,
  type ButtonProps,
  type GraphicProps,
  type PopoverAlignment,
  type PopoverCaretConfig,
  type PopoverEdgeAlign,
  type PopoverGradientColor,
  type PopoverPosition,
  type PopoverSize,
  type PopoverTextLink,
} from '@discord-mana/components';
import type { StoryGroup } from '../../types';
import styles from './popover.module.css';

const POPOVER_ASSET =
  'https://cdn.discordapp.com/assets/content/26736d800236761a21973e6fe690dfd5fa484f664976b3bba91b98d5d47bb1f7.svg';
const SMALL_POPOVER_ASSET =
  'https://cdn.discordapp.com/assets/content/7c8ee05f499cdf960d0b69208667276e8ca276aa2edcee6141d55e237d1ed5d2.svg';
const STEP_2_ASSET =
  'https://cdn.discordapp.com/assets/content/cd20f95b793bd4bdd462960744dae563a5409fc0a918a6a006c0d61f89fb6119.svg';

// Discord's strings for the multi-step popover's action and step counter.
const DONE = 'Done';
const NEXT = 'Next';
const formatStepCount = (count: number, totalSteps: number) => `${count} of ${totalSteps}`;

interface PopoverStoryProps {
  title: string;
  body: string;
  position: PopoverPosition;
  size: PopoverSize;
  badge: BadgeType | undefined;
  gradientColor: PopoverGradientColor | undefined;
  caretAlign: PopoverCaretConfig['align'];
  alignmentStrategy: 'trigger-center' | 'edge';
  align: PopoverEdgeAlign | undefined;
  showAsset: boolean;
  showActions: boolean;
  showTextLink: boolean;
}

const PopoverStory = ({
  showAsset,
  showActions,
  showTextLink,
  caretAlign,
  alignmentStrategy,
  align,
  size,
  position,
  ...props
}: PopoverStoryProps) => {
  const [shouldShow, setShouldShow] = useState(false);
  const targetRef = useRef<HTMLButtonElement>(null);
  const alignment = { alignmentStrategy, align } as PopoverAlignment;
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
      <Popover
        key={position}
        {...props}
        position={position}
        size={size}
        {...alignment}
        targetElementRef={targetRef}
        shouldShow={shouldShow}
        onRequestClose={() => setShouldShow(false)}
        graphic={showAsset ? { type: 'image', src: size === 'sm' ? SMALL_POPOVER_ASSET : POPOVER_ASSET } : undefined}
        caretConfig={{ align: caretAlign }}
        actions={showActions ? [{ text: 'Close', onClick: () => setShouldShow(false) }] : undefined}
        textLink={showTextLink ? { text: 'Learn More', link: 'https://discord.com', external: true } : undefined}
      />
      <Button
        variant="primary"
        text="Toggle Popover"
        buttonRef={targetRef}
        onClick={() => setShouldShow(!shouldShow)}
      />
    </div>
  );
};

PopoverStory.displayName = 'PopoverStory';

interface VideoPopoverStoryProps {
  showActions: boolean;
  previewUrl: string;
  assetUrl: string;
}

const VideoPopoverStory = ({ showActions, previewUrl, assetUrl, ...props }: VideoPopoverStoryProps) => {
  const [shouldShow, setShouldShow] = useState(false);
  const targetRef = useRef<HTMLButtonElement>(null);
  return (
    <div>
      <VideoPopover
        key={(props as { position?: string }).position}
        {...props}
        targetElementRef={targetRef}
        shouldShow={shouldShow}
        onRequestClose={() => setShouldShow(false)}
        title="Video Popover Demo"
        body="Click the video to view it in the media viewer!"
        assetUrl={assetUrl}
        previewUrl={previewUrl === '' ? undefined : previewUrl}
        badge="new"
        action={showActions ? { text: 'Learn More', onClick: () => setShouldShow(false) } : undefined}
      />
      <Button
        variant="primary"
        text="Show Video Popover"
        buttonRef={targetRef}
        onClick={() => setShouldShow(!shouldShow)}
      />
    </div>
  );
};

VideoPopoverStory.displayName = 'VideoPopoverStory';

interface MultiStepPopoverStep {
  title: string;
  body: string;
  graphic?: GraphicProps;
  asset?: ReactNode;
  badge?: BadgeType;
  action?: Partial<ButtonProps> & { text?: string };
  onCta?: () => void;
  gradientColor?: PopoverGradientColor;
  textLink?: PopoverTextLink;
}

type MultiStepPopoverProps = {
  steps: MultiStepPopoverStep[];
  caretConfig?: PopoverCaretConfig;
  size?: PopoverSize;
  onStepChange?: (step: number) => void;
  onRequestClose?: () => void;
  popoverRef?: Ref<HTMLDivElement>;
  shouldShow: boolean;
  position?: PopoverPosition;
  targetElementRef: RefObject<Element | null>;
  hasVideo?: boolean;
  scrollBehavior?: 'close' | 'sticky' | 'none';
} & PopoverAlignment;

// Defined in Discord's playground itself: a Popover that walks through several steps.
// Its layout classes come from Discord's popover stylesheet (copied into popover.module.css).
const MultiStepPopover = ({
  steps,
  caretConfig = { align: 'center' },
  size = 'md',
  onStepChange,
  onRequestClose,
  popoverRef,
  shouldShow,
  position,
  ...props
}: MultiStepPopoverProps) => {
  const [stepIndex, setStepIndex] = useState(0);
  useEffect(() => {
    // Every time it opens, it starts over.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (shouldShow) setStepIndex(0);
  }, [shouldShow]);
  useEffect(() => {
    onStepChange?.(stepIndex);
  }, [stepIndex, onStepChange]);
  const step = steps[stepIndex];
  const isLastStep = stepIndex + 1 === steps.length;
  const handleAction = useCallback(() => {
    step?.onCta?.();
    if (isLastStep) onRequestClose?.();
    else setStepIndex((index) => index + 1);
  }, [step, isLastStep, onRequestClose]);
  const handleRequestClose = useCallback(() => {
    onRequestClose?.();
  }, [onRequestClose]);
  const handleClose = useCallback(() => {
    onRequestClose?.();
  }, [onRequestClose]);
  if (!shouldShow || step == null) return null;
  const action: ButtonProps = {
    text: step.action?.text ?? (isLastStep ? DONE : NEXT),
    variant: step.action?.variant ?? 'primary',
    onClick: handleAction,
    ...step.action,
  };
  return (
    <BasePopover
      targetElementRef={props.targetElementRef}
      hasVideo={props.hasVideo}
      scrollBehavior={props.scrollBehavior}
      position={position}
      shouldShow={shouldShow}
      onRequestClose={handleRequestClose}
      gradientColor={step.gradientColor}
      caretConfig={caretConfig}
      {...(props.alignmentStrategy === 'edge'
        ? { alignmentStrategy: 'edge', align: props.align }
        : { alignmentStrategy: 'trigger-center' })}
    >
      <div ref={popoverRef}>
        <PopoverCloseButton onClick={handleClose} variant={step.gradientColor != null ? 'color-mix' : undefined} />
        {step.graphic != null && (
          <div className={clsx(styles.graphic, { [styles[`graphic--${size}`]]: size != null })}>
            <Graphic {...step.graphic} aspectRatio={step.graphic.aspectRatio ?? (size === 'sm' ? '2/1' : '16/9')} />
          </div>
        )}
        <PopoverHeader title={step.title} body={step.body} badge={step.badge} textLink={step.textLink} />
        <div className={styles.actionBar}>
          <div className={styles.multistepActionLayout}>
            <Text variant="body-xs/normal" className={styles.multistepIndicator}>
              {formatStepCount(stepIndex + 1, steps.length)}
            </Text>
            <Button size="sm" {...action} />
          </div>
        </div>
        <PopoverCaret />
      </div>
    </BasePopover>
  );
};

MultiStepPopover.displayName = 'MultiStepPopover';

interface MultiStepPopoverStoryProps {
  showExpressive: boolean;
  size: PopoverSize;
}

const MultiStepPopoverStory = ({ showExpressive, ...props }: MultiStepPopoverStoryProps) => {
  const [shouldShow, setShouldShow] = useState(false);
  const targetRef = useRef<HTMLButtonElement>(null);
  const steps: MultiStepPopoverStep[] = [
    {
      title: 'Welcome to the Feature!',
      body: 'This is the first step of our multi-step introduction.',
      asset: <img src={POPOVER_ASSET} alt="Step 1" />,
      badge: 'new',
      action: { text: 'Next' },
      gradientColor: 'blue',
    },
    {
      title: 'Learn the Benefits',
      body: 'Here are the amazing benefits you can enjoy with this feature.',
      asset: <img src={STEP_2_ASSET} alt="Step 2" />,
      action: { text: 'Continue' },
      gradientColor: 'purple',
    },
    {
      title: 'Get Started!',
      body: "You're all set to begin using this awesome feature.",
      asset: <img src={POPOVER_ASSET} alt="Step 3" />,
      action: { text: 'Get Started', variant: showExpressive ? 'expressive' : undefined },
      gradientColor: 'nitro-pink',
      textLink: { text: 'Learn More', link: 'https://discord.com', external: true },
    },
  ];
  return (
    <div>
      <MultiStepPopover
        key={(props as { position?: string }).position}
        {...props}
        targetElementRef={targetRef}
        shouldShow={shouldShow}
        onRequestClose={() => setShouldShow(false)}
        steps={steps}
        caretConfig={{ align: 'center' }}
        onStepChange={() => {}}
      />
      <Button
        variant="primary"
        text="Show Multi-Step"
        buttonRef={targetRef}
        onClick={() => setShouldShow(!shouldShow)}
      />
    </div>
  );
};

MultiStepPopoverStory.displayName = 'MultiStepPopoverStory';

const popover: StoryGroup = {
  title: 'Popover',
  stories: [
    {
      name: 'Popover',
      id: 'popover',
      docs: 'https://design.discord.tools/components/web/popover',
      component: PopoverStory,
      controls: {
        title: { label: 'Title', type: 'text', defaultValue: 'Sample Popover' },
        body: {
          label: 'Body Text',
          type: 'text',
          defaultValue: 'This is a sample popover with customizable properties.',
        },
        position: {
          label: 'Position',
          type: 'select',
          defaultValue: 'top',
          options: [
            { label: 'Top', value: 'top' },
            { label: 'Bottom', value: 'bottom' },
            { label: 'Left', value: 'left' },
            { label: 'Right', value: 'right' },
          ],
        },
        size: {
          label: 'Size',
          type: 'select',
          defaultValue: 'md',
          options: [
            { label: 'Small', value: 'sm' },
            { label: 'Medium', value: 'md' },
          ],
        },
        badge: {
          label: 'Badge',
          type: 'select',
          defaultValue: 'new',
          options: [
            { label: 'None', value: undefined },
            { label: 'New', value: 'new' },
            { label: 'Beta', value: 'beta' },
            { label: 'Early Access', value: 'early_access' },
          ],
        },
        gradientColor: {
          label: 'Gradient Color',
          type: 'select',
          defaultValue: undefined,
          options: [
            { label: 'None', value: undefined },
            { label: 'Purple', value: 'purple' },
            { label: 'Blue', value: 'blue' },
            { label: 'Nitro Pink', value: 'nitro-pink' },
          ],
        },
        caretAlign: {
          label: 'Caret Align',
          type: 'select',
          defaultValue: 'center',
          options: [
            { label: 'Center', value: 'center' },
            { label: 'Start', value: 'start' },
            { label: 'End', value: 'end' },
          ],
        },
        alignmentStrategy: {
          label: 'Alignment Strategy',
          type: 'select',
          defaultValue: 'trigger-center',
          options: [
            { label: 'Trigger Center (caret points at trigger)', value: 'trigger-center' },
            { label: 'Edge (popover edge aligns with trigger)', value: 'edge' },
          ],
        },
        align: {
          label: 'Align (only applies with "edge" strategy)',
          type: 'select',
          defaultValue: undefined,
          options: [
            { label: 'None', value: undefined },
            { label: 'Top', value: 'top' },
            { label: 'Center', value: 'center' },
            { label: 'Bottom', value: 'bottom' },
            { label: 'Left', value: 'left' },
            { label: 'Right', value: 'right' },
          ],
        },
        showAsset: { label: 'Show Asset', type: 'boolean', defaultValue: true },
        showActions: { label: 'Show Actions', type: 'boolean', defaultValue: true },
        showTextLink: { label: 'Show Text Link', type: 'boolean', defaultValue: false },
      },
    },
    {
      name: 'VideoPopover',
      id: 'video-popover',
      docs: 'https://design.discord.tools/components/web/popover',
      component: VideoPopoverStory,
      controls: {
        showActions: { label: 'Show Actions', type: 'boolean', defaultValue: true },
        assetUrl: {
          label: 'Asset URL',
          type: 'text',
          defaultValue: 'https://cdn.discordapp.com/assets/server-subscription-tier-template/upsell.mov',
        },
        previewUrl: { label: 'Preview URL', type: 'text', defaultValue: '' },
      },
    },
    {
      name: 'MultiStepPopover',
      id: 'multi-step-popover',
      docs: 'https://design.discord.tools/components/web/popover',
      component: MultiStepPopoverStory,
      controls: {
        showExpressive: { label: 'Show Expressive Button', type: 'boolean', defaultValue: false },
        size: {
          label: 'Size',
          type: 'select',
          defaultValue: 'md',
          options: [
            { label: 'Small', value: 'sm' },
            { label: 'Medium', value: 'md' },
          ],
        },
      },
    },
  ],
};

export default popover;
