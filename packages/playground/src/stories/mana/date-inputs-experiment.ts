import { createElement } from 'react';
import { InlineNotice, useManaContext } from '@discord-components/components';

// Discord gates the date stories on this client experiment and shows a notice while it's off.
export const DATE_INPUTS_EXPERIMENT = '2025-10-mana-date-inputs';

export const useDateInputsExperiment = () =>
  useManaContext().experiments?.enabledExperiments.includes(DATE_INPUTS_EXPERIMENT) ?? false;

export const DateInputsExperimentNotice = () =>
  createElement(InlineNotice, {
    type: 'critical',
    message: `This component is experimental and only available behind the ${DATE_INPUTS_EXPERIMENT} experiment. Do not use this in production yet.`,
    role: 'none',
  });
