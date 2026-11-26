import { Chip, type ChipVariant } from '@discord-components/components';
import type { StoryGroup } from '../../types';
import styles from './chip.module.css';

const SECTIONS: { lightness: string; variants: ChipVariant[] }[] = [
  {
    lightness: 'Light',
    variants: ['blurpleLight', 'greenLight', 'orangeLight', 'yellowLight', 'redLight', 'grayLight'],
  },
  { lightness: 'Medium', variants: ['grayMedium'] },
  { lightness: 'Dark', variants: ['blurpleDark', 'greenDark', 'redDark', 'grayDark'] },
];

const AllVariants = () => (
  <div className={styles.allChips}>
    {SECTIONS.map(({ lightness, variants }) => (
      <div key={lightness} className={styles.section}>
        <h3 className={styles.sectionTitle}>{lightness}</h3>
        <div className={styles.chipGrid}>
          {variants.map((variant) => (
            <Chip key={variant} text={variant.replace(lightness, '')} variant={variant} />
          ))}
        </div>
      </div>
    ))}
  </div>
);

AllVariants.displayName = 'AllVariants';

const chip: StoryGroup = {
  title: 'Chip',
  stories: [
    {
      name: 'Chip',
      id: 'chip',
      component: Chip,
      controls: {
        text: { label: 'Text', type: 'text', defaultValue: 'New' },
        variant: {
          label: 'Variant',
          type: 'select',
          defaultValue: 'grayLight',
          options: [
            { label: 'Blurple Light', value: 'blurpleLight' },
            { label: 'Blurple Dark', value: 'blurpleDark' },
            { label: 'Green Light', value: 'greenLight' },
            { label: 'Green Dark', value: 'greenDark' },
            { label: 'Orange Light', value: 'orangeLight' },
            { label: 'Yellow Light', value: 'yellowLight' },
            { label: 'Red Light', value: 'redLight' },
            { label: 'Red Dark', value: 'redDark' },
            { label: 'Gray Light', value: 'grayLight' },
            { label: 'Gray Medium', value: 'grayMedium' },
            { label: 'Gray Dark', value: 'grayDark' },
          ],
        },
      },
    },
    { name: 'All Variants', id: 'chip-all-variants', component: AllVariants },
  ],
};

export default chip;
