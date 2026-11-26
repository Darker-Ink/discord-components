import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  BaseModal,
  Button,
  CheckboxGroup,
  ExpressiveModal,
  LayerModal,
  Modal,
  ModalBody,
  MultiStepModal,
  RiveAnimation,
  Select,
  RiveAssetStatus,
  SearchBar,
  Stack,
  Text,
  TextInput,
  openConfirmModal,
  openModal,
  openModalLazy,
  useRiveAsset,
  type GraphicProps,
  type ModalNoticeProps,
  type ModalRenderProps,
  type MultiStepModalStep,
} from '@discord-components/components';
import { TextIcon } from '@discord-components/icons';
import { DynamicGraphicComponent } from '../../dynamicGraphics';
import type { StoryGroup } from '../../types';

const GRAPHIC_IMAGE = '/mana/expressive-modal-graphic.svg';

const BOX_WUMPUS_RIVE =
  'https://cdn.discordapp.com/assets/content/a9d4129fe10ee310d96f95d04fbf382b9c26914a30780ebb307e908a826248f2.riv';

// The Rive animation the ExpressiveModal story shows.
const BoxWumpusRive = ({
  artboard = 'box-wumpus',
  stateMachine,
  ...props
}: {
  artboard?: string;
  stateMachine?: string;
  className?: string;
  withReducedMotion?: 'short-loop';
  autoplay?: boolean;
  fit?: 'contain';
  alignment?: 'center';
}) => {
  const { status, buffer } = useRiveAsset(BOX_WUMPUS_RIVE);
  if (status === RiveAssetStatus.Loading) return null;
  return <RiveAnimation buffer={buffer} artboard={artboard} stateMachine={stateMachine} {...props} />;
};

BoxWumpusRive.displayName = 'BoxWumpusRive';

type NoticeType = NonNullable<ModalNoticeProps['type']>;

const RadnessHelp = () => (
  <Text variant="body-sm/normal" color="text-subtle">
    Lost access to your radness? Talk to your radness provider to refresh your aura.
  </Text>
);

RadnessHelp.displayName = 'RadnessHelp';

const SAFETY_OPTIONS = [
  { label: 'I am wearing a helmet', value: 'helmet' },
  { label: 'I know where to find my personal flotation device', value: 'pfd' },
  { label: 'I completed the safety training', value: 'training' },
];

const SafetyChecklist = ({
  setIsSafetyAccepted,
  setIsHelmetSelected,
}: {
  setIsSafetyAccepted: (accepted: boolean) => void;
  setIsHelmetSelected: (selected: boolean) => void;
}) => {
  const [selected, setSelected] = useState<string[]>([]);
  const options = SAFETY_OPTIONS;
  useEffect(() => {
    setIsSafetyAccepted(selected.length === options.length);
    setIsHelmetSelected(selected.includes('helmet'));
  }, [selected, options.length, setIsSafetyAccepted, setIsHelmetSelected]);
  return <CheckboxGroup label="Safety checklist" options={options} selectedValues={selected} onChange={setSelected} />;
};

SafetyChecklist.displayName = 'SafetyChecklist';

const PasscodeInput = ({ setIsPasscodeValid }: { setIsPasscodeValid: (valid: boolean) => void }) => {
  const [value, setValue] = useState('');
  return (
    <TextInput
      placeholder="Enter your passcode..."
      value={value}
      onChange={(next: string) => {
        setValue(next);
        setIsPasscodeValid(next.length > 0);
      }}
    />
  );
};

PasscodeInput.displayName = 'PasscodeInput';

interface RadnessModalProps extends ModalRenderProps {
  callbackDelay: number;
  failOnNext: boolean;
  failOnComplete: boolean;
  onCompleteAlert: boolean;
  onNextAlert: boolean;
  customErrorNotice: string;
  errorNoticeType: NoticeType;
}

const RadnessVerificationModal = ({
  callbackDelay,
  failOnNext,
  failOnComplete,
  onCompleteAlert,
  onNextAlert,
  customErrorNotice,
  errorNoticeType,
  ...props
}: RadnessModalProps) => {
  const [currentStepKey, setCurrentStepKey] = useState('intro');
  const [isSafetyAccepted, setIsSafetyAccepted] = useState(false);
  const [isPasscodeValid, setIsPasscodeValid] = useState(false);
  const [isHelmetSelected, setIsHelmetSelected] = useState(false);
  const [notice, setNotice] = useState<ModalNoticeProps | null>(null);
  const onNext = useCallback(async () => {
    setNotice(null);
    if (callbackDelay > 0) await new Promise((resolve) => setTimeout(resolve, 1000 * callbackDelay));
    if (onNextAlert) alert('onNext callback fired');
    if (failOnNext) {
      if (customErrorNotice.trim() !== '') {
        setNotice({
          message: customErrorNotice,
          type: errorNoticeType,
          role: errorNoticeType === 'critical' ? 'alert' : 'status',
        });
        return false;
      }
      throw Error('onNext failed');
    }
    return true;
  }, [callbackDelay, failOnNext, onNextAlert, customErrorNotice, errorNoticeType]);
  const onComplete = useCallback(async () => {
    setNotice(null);
    if (callbackDelay > 0) await new Promise((resolve) => setTimeout(resolve, 1000 * callbackDelay));
    if (onCompleteAlert) alert('onComplete callback fired');
    if (failOnComplete) {
      if (customErrorNotice.trim() !== '') {
        setNotice({
          message: customErrorNotice,
          type: errorNoticeType,
          role: errorNoticeType === 'critical' ? 'alert' : 'status',
        });
        throw Error('Custom error');
      }
      throw Error('onComplete failed');
    }
  }, [callbackDelay, failOnComplete, onCompleteAlert, customErrorNotice, errorNoticeType]);
  const steps: MultiStepModalStep[] = [
    {
      stepKey: 'intro',
      modalProps: {
        title: 'Verify radness',
        subtitle: 'To verify your radness, we need to ask you a few deep and personal questions.',
        notice: notice ?? undefined,
      },
      body: <RadnessHelp />,
      nextButtonProps: { text: 'Verify' },
      onNext,
    },
    {
      stepKey: 'safety',
      modalProps: {
        title: 'Safety first',
        subtitle: "Before we get started verifying your radness, we need to make sure you're safe and sound.",
        notice:
          notice != null
            ? notice
            : isHelmetSelected
              ? {
                  message: 'Great job, helmets are important for protecting your brain!',
                  type: 'warning',
                  role: 'status',
                }
              : undefined,
      },
      body: <SafetyChecklist setIsSafetyAccepted={setIsSafetyAccepted} setIsHelmetSelected={setIsHelmetSelected} />,
      nextEnabled: isSafetyAccepted,
      onNext,
    },
    {
      stepKey: 'passcode',
      modalProps: {
        title: 'Enter passcode',
        subtitle: 'Enter your passcode to complete the radness verification process.',
        notice: notice ?? undefined,
      },
      body: <PasscodeInput setIsPasscodeValid={setIsPasscodeValid} />,
      nextButtonProps: { text: 'Verify passcode' },
      nextEnabled: isPasscodeValid,
    },
  ];
  const numberedSteps = steps.slice(1).map((step) => step.stepKey);
  return (
    <MultiStepModal
      steps={steps}
      currentStepKey={currentStepKey}
      numberedSteps={numberedSteps}
      onStepChange={setCurrentStepKey}
      onComplete={onComplete}
      {...props}
    />
  );
};

RadnessVerificationModal.displayName = 'RadnessVerificationModal';

// Turns **text** into <strong> (the ConfirmModal story's subtitle formatting).
const formatBold = (text: string): ReactNode => {
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  const pattern = /\*\*(.+?)\*\*/g;
  let key = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.substring(lastIndex, match.index));
    parts.push(<strong key={key++}>{match[1]}</strong>);
    lastIndex = pattern.lastIndex;
  }
  if (lastIndex < text.length) parts.push(text.substring(lastIndex));
  return parts.length > 0 ? parts : text;
};

const GRADIENT_OPTIONS = [
  { label: 'Purple', value: 'purple' },
  { label: 'Blue', value: 'blue' },
  { label: 'Nitro Pink', value: 'nitro-pink' },
];

const BADGE_OPTIONS = [
  { label: 'None', value: undefined },
  { label: 'New', value: 'new' },
  { label: 'Beta', value: 'beta' },
  { label: 'Early Access', value: 'early_access' },
];

const SELECT_OPTIONS = Array.from({ length: 8 }, (_, index) => ({
  label: `Option ${index + 1}`,
  value: `option${index + 1}`,
  id: `option${index + 1}`,
}));

/* eslint-disable @typescript-eslint/no-explicit-any -- story props come from the controls. */
const ModalStory = ({ showPreview, showInput, subtitleIcon, ...props }: any) => {
  const subtitle = subtitleIcon
    ? { text: props.subtitle ?? 'Default subtitle', leadingIcon: TextIcon }
    : props.subtitle;
  return (
    <Stack gap={16} align="center">
      <Text variant="body-md/normal">Click the button below to open the modal</Text>
      <Button
        variant="primary"
        text="Open Modal"
        onClick={() =>
          openModal(
            (renderProps) => (
              <Modal
                {...renderProps}
                {...props}
                title={props.title}
                subtitle={subtitle}
                input={showInput ? <SearchBar placeholder="Search..." onChange={() => {}} query="" /> : undefined}
                preview={
                  showPreview ? (
                    <Stack gap={8}>
                      <Text variant="body-lg/semibold">Preview Content</Text>
                      <Text variant="body-md/normal" color="text-subtle">
                        This is preview content that appears in the modal footer.
                      </Text>
                    </Stack>
                  ) : undefined
                }
                actions={[
                  { variant: 'secondary', text: 'Cancel', onClick: renderProps.onClose },
                  { variant: 'primary', text: 'Submit', onClick: renderProps.onClose },
                ]}
              >
                <Stack gap={16}>
                  {/* Discord's story leaves the multiple selection uncontrolled (no value). */}
                  <Select
                    value={undefined as unknown as string[]}
                    maxOptionsVisible={10}
                    label="Example Select"
                    selectionMode="multiple"
                    options={SELECT_OPTIONS}
                    onSelectionChange={() => {}}
                  />
                  <TextInput label="Example Input" placeholder="Enter some text..." />
                  <Text variant="body-md/normal">
                    This is the main content area of the modal. You can place any content here.
                  </Text>
                </Stack>
              </Modal>
            ),
            { dismissable: props.dismissable },
          )
        }
      />
    </Stack>
  );
};

ModalStory.displayName = 'ModalStory';

const ConfirmModalStory = ({ cancelText, confirmDelay, confirmError, subtitle, formatSubtitle, ...props }: any) => {
  const formattedSubtitle = useMemo(
    () => (formatSubtitle ? formatBold(subtitle) : subtitle),
    [subtitle, formatSubtitle],
  );
  return (
    <Stack gap={16} align="center">
      <Text variant="body-md/normal">Click the button below to open the confirm modal</Text>
      <Button
        variant="primary"
        text="Open Confirm Modal"
        onClick={() =>
          openConfirmModal({
            ...props,
            subtitle: formattedSubtitle,
            cancelText: cancelText === '' ? undefined : cancelText,
            onConfirm: async (setError) => {
              try {
                await new Promise((resolve) => setTimeout(resolve, 1000 * confirmDelay));
                if (confirmError) throw Error('Confirm error');
              } catch (error) {
                setError('Something went wrong reticulating splines. Please try again later.');
                throw error;
              }
            },
          })
        }
      />
    </Stack>
  );
};

ConfirmModalStory.displayName = 'ConfirmModalStory';

const ExpressiveModalStory = ({ graphic: graphicIndex, subtitleIcon, ...props }: any) => {
  const subtitle = subtitleIcon
    ? { text: props.subtitle ?? 'Default subtitle', leadingIcon: TextIcon }
    : props.subtitle;
  const graphic = useMemo((): GraphicProps | undefined => {
    switch (graphicIndex) {
      case 0:
        return { type: 'image', src: GRAPHIC_IMAGE };
      case 1:
        return {
          type: 'lottie',
          // Discord's story loads its Lottie animation from a lazy chunk; Lottie isn't rendered here.
          lottie: () => Promise.resolve({}),
          aspectRatio: '6/4',
        };
      case 2:
        return { type: 'rive', rive: BoxWumpusRive };
      case 3:
        return {
          type: 'video',
          src: 'https://cdn.discordapp.com/assets/content/06fafa729efafb6235e0ee9df9482566fa9e74b96a792a9265dca70113c71ab7.webm',
          fallbackImageSrc: GRAPHIC_IMAGE,
          loop: true,
          loopAt: 2.5,
        };
      case 4:
        return {
          type: 'dynamic',
          component: DynamicGraphicComponent.DEMO,
          aspectRatio: '6/4',
          props: { text: 'Dynamic Content' },
        };
      default:
        return undefined;
    }
  }, [graphicIndex]);
  return (
    <Stack gap={16} align="center">
      <Text variant="body-md/normal">Click the button below to open the expressive modal</Text>
      <Button
        variant="primary"
        text="Open ExpressiveModal"
        onClick={() =>
          openModal(
            (renderProps) => (
              <ExpressiveModal
                {...renderProps}
                {...props}
                title={props.title}
                subtitle={subtitle}
                graphic={graphic}
                actions={[
                  { variant: 'secondary', text: 'Cancel', onClick: renderProps.onClose },
                  { variant: 'primary', text: 'Submit', onClick: renderProps.onClose },
                ]}
              >
                <Stack gap={16}>
                  <Text variant="body-md/normal">
                    This is an expressive modal with a gradient background and optional badge.
                  </Text>
                </Stack>
              </ExpressiveModal>
            ),
            { dismissable: props.dismissable },
          )
        }
      />
    </Stack>
  );
};

ExpressiveModalStory.displayName = 'ExpressiveModalStory';

const DynamicGraphicModalStory = ({ dynamicText, ...props }: any) => {
  const graphic: GraphicProps = {
    type: 'dynamic',
    component: DynamicGraphicComponent.DEMO,
    aspectRatio: '6/4',
    props: { text: dynamicText },
  };
  return (
    <Stack gap={16} align="center">
      <Text variant="body-md/normal">
        This example demonstrates the DynamicGraphic component rendering a React component inside the modal header.
      </Text>
      <Button
        variant="primary"
        text="Open Dynamic Graphic Modal"
        onClick={() =>
          openModalLazy(
            async () => {
              const { ExpressiveModal: LazyExpressiveModal } = await import('@discord-components/components');
              // A render function for the modal stack, not a component.
              // eslint-disable-next-line react/display-name
              return (renderProps) => (
                <LazyExpressiveModal
                  {...renderProps}
                  {...props}
                  title={props.title}
                  subtitle={props.subtitle}
                  graphic={graphic}
                  actions={[
                    { variant: 'secondary', text: 'Cancel', onClick: renderProps.onClose },
                    { variant: 'primary', text: 'Submit', onClick: renderProps.onClose },
                  ]}
                >
                  <Stack gap={16}>
                    <Text variant="body-md/normal">
                      The header above is rendered using a React component via DynamicGraphic, allowing for dynamic,
                      interactive content in the modal header.
                    </Text>
                  </Stack>
                </LazyExpressiveModal>
              );
            },
            { dismissable: props.dismissable },
          )
        }
      />
    </Stack>
  );
};

DynamicGraphicModalStory.displayName = 'DynamicGraphicModalStory';

const LayerModalStory = ({ ...props }: any) => (
  <Stack gap={16} align="center">
    <Text variant="body-md/normal">Click the button below to open the layer modal</Text>
    <Button
      variant="primary"
      text="Open Layer Modal"
      onClick={() =>
        openModal((renderProps) => (
          <LayerModal {...renderProps} {...props}>
            <Stack gap={16}>
              <Text variant="body-md/normal">This is the layer modal content</Text>
            </Stack>
          </LayerModal>
        ))
      }
    />
  </Stack>
);

LayerModalStory.displayName = 'LayerModalStory';

const MultiStepModalStory = ({
  callbackDelay,
  failOnNext,
  failOnComplete,
  onCompleteAlert,
  onNextAlert,
  customErrorNotice,
  errorNoticeType,
}: any) => (
  <Stack gap={16} align="center">
    <Text variant="body-md/normal">Click the button below to open the multi-step modal</Text>
    <Button
      variant="primary"
      text="Open MultiStepModal"
      onClick={() =>
        openModal((renderProps) => (
          <RadnessVerificationModal
            {...renderProps}
            callbackDelay={callbackDelay}
            failOnNext={failOnNext}
            failOnComplete={failOnComplete}
            onCompleteAlert={onCompleteAlert}
            onNextAlert={onNextAlert}
            customErrorNotice={customErrorNotice}
            errorNoticeType={errorNoticeType}
          />
        ))
      }
    />
  </Stack>
);

MultiStepModalStory.displayName = 'MultiStepModalStory';

const BaseModalStory = ({ dismissable, tallContent, ...props }: any) => (
  <Stack gap={16} align="center">
    <Text variant="body-md/normal">Click the button below to open the base modal</Text>
    <Button
      variant="primary"
      text="Open BaseModal"
      onClick={() =>
        openModal(
          (renderProps) => (
            <BaseModal {...renderProps} {...props} aria-label="Base Modal Example">
              <ModalBody>
                <Stack gap={16}>
                  <Text variant="body-lg/semibold">BaseModal Content</Text>
                  <Text variant="body-md/normal">
                    This is the raw BaseModal container. It provides the modal chrome (animation, sizing, padding, focus
                    management) without any opinionated header, body, or action bar layout.
                  </Text>
                  {tallContent
                    ? Array.from({ length: 20 }, (_, index) => (
                        <Text key={index} variant="body-md/normal">
                          Item {index + 1} — This is filler content to demonstrate overflow and scrolling behavior.
                        </Text>
                      ))
                    : null}
                </Stack>
              </ModalBody>
            </BaseModal>
          ),
          { dismissable },
        )
      }
    />
  </Stack>
);
/* eslint-enable @typescript-eslint/no-explicit-any */

BaseModalStory.displayName = 'BaseModalStory';

const modal: StoryGroup = {
  title: 'Modal',
  stories: [
    {
      name: 'Modal',
      id: 'modal',
      docs: 'https://design.discord.tools/components/web/modals/modal',
      component: ModalStory,
      controls: {
        title: { label: 'Title', type: 'text', defaultValue: 'Example Modal' },
        subtitle: { label: 'Subtitle', type: 'text', defaultValue: 'This is a modal subtitle' },
        subtitleIcon: { label: 'Subtitle Icon', type: 'boolean', defaultValue: false },
        size: {
          label: 'Size',
          type: 'select',
          defaultValue: 'md',
          options: [
            { label: 'Small', value: 'sm' },
            { label: 'Medium', value: 'md' },
          ],
        },
        showInput: { label: 'Show Search Input', type: 'boolean', defaultValue: false },
        showPreview: { label: 'Show Preview', type: 'boolean', defaultValue: false },
        dismissable: { label: 'Dismissable', type: 'boolean', defaultValue: true },
      },
    },
    {
      name: 'ConfirmModal [Alpha]',
      id: 'confirm-modal',
      component: ConfirmModalStory,
      controls: {
        title: { label: 'Title', type: 'text', defaultValue: 'Reticulate splines' },
        subtitle: {
          label: 'Subtitle',
          type: 'text',
          defaultValue: 'Are you sure you want to permanently reticulate **Spliney McSplineface**?',
        },
        formatSubtitle: { label: 'Format Subtitle (**bold**)', type: 'boolean', defaultValue: true },
        confirmText: { label: 'Confirm Text', type: 'text', defaultValue: 'Reticulate' },
        cancelText: { label: 'Cancel Text', type: 'text', defaultValue: '' },
        variant: {
          label: 'Variant',
          type: 'select',
          defaultValue: 'critical',
          options: [
            { label: 'Primary', value: 'primary' },
            { label: 'Critical', value: 'critical' },
          ],
        },
        confirmDelay: { label: 'Confirm Delay (seconds)', type: 'number', defaultValue: 0 },
        confirmError: { label: 'Confirm Error', type: 'boolean', defaultValue: false },
      },
    },
    {
      name: 'ExpressiveModal',
      id: 'expressive-modal',
      docs: 'https://design.discord.tools/components/web/modals/expressive-modal',
      component: ExpressiveModalStory,
      controls: {
        title: { label: 'Title', type: 'text', defaultValue: 'Expressive Modal' },
        subtitle: { label: 'Subtitle', type: 'text', defaultValue: 'This modal has a gradient background' },
        subtitleIcon: { label: 'Subtitle Icon', type: 'boolean', defaultValue: false },
        gradientColor: { label: 'Gradient Color', type: 'select', defaultValue: 'purple', options: GRADIENT_OPTIONS },
        graphic: {
          label: 'Graphic',
          type: 'select',
          defaultValue: 0,
          options: [
            { label: 'Image', value: 0 },
            { label: 'Lottie', value: 1 },
            { label: 'Rive', value: 2 },
            { label: 'Looping Video', value: 3 },
            { label: 'Dynamic Content', value: 4 },
          ],
        },
        badge: { label: 'Badge', type: 'select', defaultValue: 'new', options: BADGE_OPTIONS },
        dismissable: { label: 'Dismissable', type: 'boolean', defaultValue: true },
      },
    },
    {
      name: 'Dynamic Graphic Modal',
      id: 'dynamic-graphic-modal',
      component: DynamicGraphicModalStory,
      controls: {
        title: { label: 'Title', type: 'text', defaultValue: 'Dynamic Graphic Modal' },
        subtitle: {
          label: 'Subtitle',
          type: 'text',
          defaultValue: 'This modal uses a React component in the header',
        },
        dynamicText: { label: 'Dynamic Text', type: 'text', defaultValue: 'Hello from DynamicGraphic!' },
        gradientColor: { label: 'Gradient Color', type: 'select', defaultValue: 'purple', options: GRADIENT_OPTIONS },
        badge: { label: 'Badge', type: 'select', defaultValue: undefined, options: BADGE_OPTIONS },
        dismissable: { label: 'Dismissable', type: 'boolean', defaultValue: true },
      },
    },
    {
      name: 'LayerModal',
      id: 'layer-modal',
      component: LayerModalStory,
    },
    {
      name: 'MultiStepModal [Alpha]',
      id: 'multi-step-modal',
      component: MultiStepModalStory,
      controls: {
        callbackDelay: { label: 'Delay Callbacks (seconds)', type: 'number', defaultValue: 0 },
        failOnNext: { label: 'Fail onNext', type: 'boolean', defaultValue: false },
        failOnComplete: { label: 'Fail onComplete', type: 'boolean', defaultValue: false },
        onCompleteAlert: { label: 'onComplete Alert', type: 'boolean', defaultValue: false },
        onNextAlert: { label: 'onNext Alert', type: 'boolean', defaultValue: false },
        customErrorNotice: { label: 'Custom Error Notice', type: 'text', defaultValue: '' },
        errorNoticeType: {
          label: 'Error Notice Type',
          type: 'select',
          defaultValue: 'critical',
          options: [
            { label: 'Critical', value: 'critical' },
            { label: 'Warning', value: 'warning' },
            { label: 'Info', value: 'info' },
            { label: 'Success', value: 'success' },
          ],
        },
      },
    },
    {
      name: 'BaseModal',
      id: 'base-modal',
      component: BaseModalStory,
      controls: {
        size: {
          label: 'Size',
          type: 'select',
          defaultValue: 'md',
          options: [
            { label: 'Small', value: 'sm' },
            { label: 'Medium', value: 'md' },
            { label: 'Large', value: 'lg' },
            { label: 'Extra Large', value: 'xl' },
            { label: 'Extra Extra Large', value: 'xxl' },
          ],
        },
        paddingSize: {
          label: 'Padding Size',
          type: 'select',
          defaultValue: 'sm',
          options: [
            { label: 'Small (24px)', value: 'sm' },
            { label: 'Large (32px)', value: 'lg' },
          ],
        },
        animationVariant: {
          label: 'Animation Variant',
          type: 'select',
          defaultValue: 'default',
          options: [
            { label: 'Default', value: 'default' },
            { label: 'Subtle', value: 'subtle' },
          ],
        },
        fullScreenOnMobile: { label: 'Full Screen on Mobile', type: 'boolean', defaultValue: true },
        role: {
          label: 'Role',
          type: 'select',
          defaultValue: 'dialog',
          options: [
            { label: 'Dialog', value: 'dialog' },
            { label: 'Alert Dialog', value: 'alertdialog' },
          ],
        },
        maxHeight: {
          label: 'Max Height',
          type: 'select',
          defaultValue: 'default',
          options: [
            { label: 'Default', value: 'default' },
            { label: 'Viewport', value: 'viewport' },
          ],
        },
        dismissable: { label: 'Dismissable', type: 'boolean', defaultValue: true },
        tallContent: { label: 'Tall Content', type: 'boolean', defaultValue: false },
      },
    },
  ],
};

export default modal;
