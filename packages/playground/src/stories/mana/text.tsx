import { Card, ScrollerAuto, Text, TextVariants, type TextProps } from '@discord-components/components';
import type { StoryGroup } from '../../types';
import styles from './text.module.css';

const TypographyScales = (props: Omit<TextProps, 'variant'>) => (
  <ScrollerAuto className={styles.variants}>
    {TextVariants.map((variant) => (
      <Card key={variant} className={styles.card}>
        <Text {...props} variant={variant}>
          {props.children}
        </Text>
        <Text variant="body-xs/normal" color="text-subtle">
          {variant}
        </Text>
      </Card>
    ))}
  </ScrollerAuto>
);

TypographyScales.displayName = 'TypographyScales';

const text: StoryGroup = {
  title: 'Text',
  stories: [
    {
      name: 'Text',
      id: 'text',
      component: Text,
      controls: {
        variant: {
          label: 'Variant',
          type: 'select',
          defaultValue: 'body-sm/normal',
          options: TextVariants.map((variant) => ({ label: variant, value: variant })),
        },
        color: {
          label: 'Color',
          type: 'select',
          defaultValue: 'text-strong',
          options: [
            { label: 'Text Primary', value: 'text-strong' },
            { label: 'Text Secondary', value: 'text-subtle' },
            { label: 'Text Tertiary', value: 'text-muted' },
            { label: 'Text Muted', value: 'text-muted' },
            { label: 'Header Primary', value: 'text-strong' },
            { label: 'Header Secondary', value: 'text-default' },
            { label: 'Header Muted', value: 'text-muted' },
            { label: 'Feedback Positive', value: 'text-feedback-positive' },
            { label: 'Feedback Critical', value: 'text-feedback-critical' },
            { label: 'Feedback Warning', value: 'text-feedback-warning' },
            { label: 'Feedback Info', value: 'text-feedback-info' },
          ],
        },
        children: { label: 'Text', type: 'text', defaultValue: 'Hello, world!' },
      },
    },
    {
      name: 'Typography Scales',
      id: 'text-scales',
      component: TypographyScales,
      controls: { children: { label: 'Text', type: 'text', defaultValue: 'Hello, world!' } },
    },
  ],
};

export default text;
