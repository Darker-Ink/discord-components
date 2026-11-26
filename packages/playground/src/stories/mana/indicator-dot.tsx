import { Fragment } from 'react';
import clsx from 'clsx';
import {
  IndicatorDot,
  Text,
  ThemeProvider,
  type IndicatorDotCutout,
  type IndicatorDotSize,
  type IndicatorDotVariant,
} from '@discord-mana/components';
import { ThemeTypes } from '@discord-mana/tokens';
import type { StoryGroup } from '../../types';
import styles from './indicator-dot.module.css';

const VARIANTS: IndicatorDotVariant[] = ['primary', 'notification', 'neutral', 'active'];
const SIZES: IndicatorDotSize[] = ['xs', 'sm', 'md', 'lg'];

const IndicatorDotStory = ({
  variant,
  size,
  cutout,
  ariaLabel,
}: {
  variant: IndicatorDotVariant;
  size: IndicatorDotSize;
  cutout: IndicatorDotCutout | 'none';
  ariaLabel?: string;
}) => (
  <IndicatorDot
    variant={variant}
    size={size}
    cutout={cutout === 'none' ? undefined : cutout}
    aria-label={ariaLabel != null && ariaLabel !== '' ? ariaLabel : undefined}
  />
);

IndicatorDotStory.displayName = 'IndicatorDotStory';

const IndicatorDotGrid = () => (
  <div className={styles.grid}>
    <span />
    {SIZES.map((size) => (
      <Text key={size} variant="body-xs/semibold" color="text-subtle">
        {size}
      </Text>
    ))}
    {VARIANTS.map((variant) => (
      <Fragment key={variant}>
        <Text variant="body-xs/semibold" color="text-subtle">
          {variant}
        </Text>
        {SIZES.map((size) => (
          <span key={size} className={styles.cell}>
            <IndicatorDot variant={variant} size={size} />
          </span>
        ))}
      </Fragment>
    ))}
  </div>
);

IndicatorDotGrid.displayName = 'IndicatorDotGrid';

const IndicatorDotAll = () => (
  <div className={styles.surfaces}>
    {[ThemeTypes.LIGHT, ThemeTypes.DARK].map((theme) => (
      <ThemeProvider key={theme} theme={theme}>
        {(className) => (
          <div className={clsx(className, styles.surface)}>
            <IndicatorDotGrid />
          </div>
        )}
      </ThemeProvider>
    ))}
  </div>
);

IndicatorDotAll.displayName = 'IndicatorDotAll';

const indicatorDot: StoryGroup = {
  title: 'Indicator Dot',
  stories: [
    {
      name: 'Indicator Dot',
      id: 'indicator-dot',
      component: IndicatorDotStory,
      docs: 'https://design.discord.tools/components/web/indicator-dot',
      controls: {
        variant: {
          label: 'Variant',
          type: 'select',
          defaultValue: 'primary',
          options: [
            { label: 'Primary', value: 'primary' },
            { label: 'Notification', value: 'notification' },
            { label: 'Neutral', value: 'neutral' },
            { label: 'Active', value: 'active' },
          ],
        },
        size: {
          label: 'Size',
          type: 'select',
          defaultValue: 'md',
          options: [
            { label: 'XS (4px)', value: 'xs' },
            { label: 'SM (6px)', value: 'sm' },
            { label: 'MD (8px)', value: 'md' },
            { label: 'LG (10px)', value: 'lg' },
          ],
        },
        cutout: {
          label: 'Cutout',
          type: 'select',
          defaultValue: 'none',
          options: [
            { label: 'None', value: 'none' },
            { label: 'Base Lower', value: 'base-lower' },
          ],
        },
        ariaLabel: { label: 'Aria Label', type: 'text', defaultValue: undefined },
      },
    },
    {
      name: 'Indicator Dot (All)',
      id: 'indicator-dot-all',
      component: IndicatorDotAll,
      docs: 'https://design.discord.tools/components/web/indicator-dot',
    },
  ],
};

export default indicatorDot;
