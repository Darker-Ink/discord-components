import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { useManaContext } from '../ManaContext';
import type { ProgressBarProps } from '../ProgressBar';
import { TextButton, type TextButtonProps } from '../TextButton';
import { BaseModal, type BaseModalProps } from './BaseModal';
import { ModalActionBar, type ModalAction } from './ModalActionBar';
import { ModalBody, type ModalBodyListProps } from './ModalBody';
import { ExpressiveModalHeader, ModalHeader, type ExpressiveModalHeaderProps, type ModalSubtitle } from './ModalHeader';
import { ModalNotice, type ModalNoticeProps } from './ModalNotice';

export interface MultiStepModalContextValue {
  currentStepKey: string;
  goToStep: (stepKey: string) => void;
  goToNextStep: () => Promise<void>;
  goToPreviousStep: () => void;
  complete: () => Promise<void>;
}

const MultiStepModalContext = createContext<MultiStepModalContextValue | null>(null);

MultiStepModalContext.displayName = 'MultiStepModalContext';

export const useMultiStepModalContext = () => {
  const context = useContext(MultiStepModalContext);
  if (context == null) throw Error('useMultiStepModalContext must be used within a MultiStepModal');
  return context;
};

export interface MultiStepModalStepProps {
  title: string;
  subtitle?: ModalSubtitle;
  notice?: ModalNoticeProps;
  input?: ReactNode;
  listProps?: ModalBodyListProps;
}

// A step with a graphic gets the expressive header (and no input, list or notice).
export type MultiStepModalExpressiveStepProps = ExpressiveModalHeaderProps & { title: string };

export interface MultiStepModalStep {
  stepKey: string;
  modalProps: MultiStepModalStepProps | MultiStepModalExpressiveStepProps;
  body?: ReactNode;
  // Whether the next (or submit) button is enabled.
  nextEnabled?: boolean;
  // Runs before moving on; resolving to false stays on the step, throwing shows an error notice.
  onNext?: () => Promise<boolean> | boolean;
  nextButtonProps?: Partial<ModalAction>;
  backButtonProps?: Partial<TextButtonProps>;
  secondaryActionButtonProps?: Partial<ModalAction>;
  hideBackButton?: boolean;
}

export interface MultiStepModalProps extends Omit<BaseModalProps, 'paddingSize' | 'children'> {
  steps: MultiStepModalStep[];
  currentStepKey: string;
  // The steps that count towards the step indicator; it shows on those steps only.
  numberedSteps?: string[];
  onStepChange?: (stepKey: string, previousStepKey: string) => void;
  // Called after the last step's onNext, before the modal closes.
  onComplete?: () => Promise<void> | void;
}

const isExpressiveStep = (
  modalProps: MultiStepModalStep['modalProps'],
): modalProps is MultiStepModalExpressiveStepProps => 'graphic' in modalProps;

// A modal that walks through steps with Back/Next buttons, an optional step indicator and per-step
// validation. The caller owns the current step (`currentStepKey` + `onStepChange`).
export const MultiStepModal = ({
  steps,
  currentStepKey,
  numberedSteps,
  onStepChange,
  onComplete,
  ...props
}: MultiStepModalProps) => {
  const { i18n } = useManaContext();
  const onClose = props.onClose;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const step = steps.find((candidate) => candidate.stepKey === currentStepKey);
  if (step == null) throw Error(`Step with key ${currentStepKey} not found`);
  const index = steps.findIndex((candidate) => candidate.stepKey === currentStepKey);
  const isLast = index === steps.length - 1;
  const isFirst = index === 0;
  const [completed, setCompleted] = useState(false);
  const nextEnabled = step.nextEnabled ?? true;
  const goToStep = useCallback(
    (stepKey: string) => {
      setError(null);
      onStepChange?.(stepKey, currentStepKey);
    },
    [onStepChange, currentStepKey],
  );
  const complete = useCallback(async () => {
    await onComplete?.();
    setCompleted(true);
    onClose();
  }, [onComplete, onClose]);
  const goToNextStep = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (step.onNext != null && !(await step.onNext())) {
        setLoading(false);
        return;
      }
      if (isLast) await complete();
      else goToStep(steps[index + 1].stepKey);
    } catch {
      setError(i18n.INLINE_NOTICE_GENERIC_ERROR);
    } finally {
      setLoading(false);
    }
  }, [goToStep, index, steps, isLast, complete, step, i18n]);
  const goToPreviousStep = useCallback(() => {
    if (!isFirst) goToStep(steps[index - 1].stepKey);
  }, [goToStep, index, steps, isFirst]);
  const context = useMemo(
    () => ({ currentStepKey, goToStep, goToNextStep, goToPreviousStep, complete }),
    [currentStepKey, goToStep, goToNextStep, goToPreviousStep, complete],
  );
  const backButtonProps = { variant: 'secondary', text: i18n.BACK } as const;
  const nextButtonProps: ModalAction = {
    variant: 'primary',
    text: isLast ? i18n.SUBMIT : i18n.NEXT,
    disabled: !nextEnabled,
    loading,
    onClick: () => {
      if (nextEnabled && !loading) void goToNextStep();
    },
  };
  const cancelButtonProps: ModalAction = { text: i18n.CANCEL, variant: 'secondary', onClick: onClose };
  const secondaryButtonProps: ModalAction | null =
    step.secondaryActionButtonProps != null
      ? ({ variant: 'secondary', ...step.secondaryActionButtonProps } as ModalAction)
      : null;
  const backButton =
    step.hideBackButton || isFirst ? undefined : (
      <TextButton {...backButtonProps} {...step.backButtonProps} onClick={goToPreviousStep} />
    );
  const { modalProps } = step;
  const expressiveProps = isExpressiveStep(modalProps) ? modalProps : null;
  const isNumbered = numberedSteps != null && numberedSteps.length > 0 && numberedSteps.includes(currentStepKey);
  const stepNumber = isNumbered && !completed ? numberedSteps.indexOf(currentStepKey) + 1 : undefined;
  let progressBarProps: ProgressBarProps | undefined;
  if (isNumbered) {
    const stepCount = numberedSteps.length;
    progressBarProps = completed
      ? { value: 100, 'aria-label': i18n.PERCENT_COMPLETE(100), valueLabel: i18n.PERCENT_COMPLETE(100) }
      : {
          value: stepNumber,
          maxValue: stepCount + 1,
          'aria-label': i18n.STEP_INDICATOR(stepNumber ?? 0, stepCount),
          valueLabel: i18n.STEP_INDICATOR(stepNumber ?? 0, stepCount),
        };
  }
  const notice = 'notice' in modalProps ? modalProps.notice : undefined;
  return (
    <MultiStepModalContext.Provider value={context}>
      <BaseModal
        {...props}
        aria-label={props['aria-label'] ?? modalProps.title}
        paddingSize={expressiveProps != null ? 'lg' : 'sm'}
      >
        {expressiveProps != null ? (
          <ExpressiveModalHeader {...expressiveProps} />
        ) : (
          <ModalHeader title={modalProps.title} subtitle={modalProps.subtitle} progressBarProps={progressBarProps} />
        )}
        <ModalNotice
          key={currentStepKey}
          message={error ?? notice?.message}
          type={error != null ? 'critical' : notice?.type}
          role={error != null ? 'alert' : notice?.role}
        />
        {steps.map((candidate) => {
          const stepProps = isExpressiveStep(candidate.modalProps) ? null : candidate.modalProps;
          return (
            (candidate.body != null || stepProps?.input != null || stepProps?.listProps != null) && (
              <div
                key={candidate.stepKey}
                style={{ display: candidate.stepKey === currentStepKey ? 'contents' : 'none' }}
              >
                <ModalBody controls={stepProps?.input} listProps={stepProps?.listProps}>
                  {candidate.body}
                </ModalBody>
              </div>
            )
          );
        })}
        <ModalActionBar
          leading={backButton}
          actionsFullWidth={isFirst}
          actions={[
            ...(isFirst ? [cancelButtonProps] : []),
            ...(secondaryButtonProps != null ? [secondaryButtonProps] : []),
            { ...nextButtonProps, ...step.nextButtonProps } as ModalAction,
          ]}
        />
      </BaseModal>
    </MultiStepModalContext.Provider>
  );
};

MultiStepModal.displayName = 'MultiStepModal';
