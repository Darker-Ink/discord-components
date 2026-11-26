import {
  AdvancedScrollerAuto,
  AdvancedScrollerNone,
  AdvancedScrollerThin,
  Card,
  CardTypes,
  Divider,
  GradientWrapper,
  ListAuto,
  ListThin,
  ScrollerAuto,
  ScrollerNone,
  ScrollerThin,
  Stack,
  Text,
  type CardType,
  type GradientColorName,
  type ScrollbarGutter,
  type ScrollerOrientation,
  type ScrollerOverflow,
  type StackAlign,
  type StackDirection,
  type StackJustify,
  type StackSpace,
} from '@discord-components/components';
import type { StoryGroup } from '../../types';
import styles from './components.module.css';
import { keyOptions, LOREM, valueOptions } from './shared';

const SPACES: StackSpace[] = [0, 4, 6, 8, 10, 12, 16, 20, 24, 26, 30, 32, 40, 48, 64, 80, 96, 128, 160, 192];
const SPACE_NAMES: StackSpace[] = ['xxs', 'xs', 'sm', 'md', 'lg', 'xl', 'xxl'];

const gutterOptions = [
  { label: 'stable', value: 'stable' },
  { label: 'both-edges', value: 'both-edges' },
  { label: 'none', value: false },
];

const Boxes = ({ count }: { count: number }) =>
  Array.from({ length: count }, (_, index) => (
    <div key={index} className={styles.box} style={{ minHeight: 40 + (index % 3) * 12 }}>
      {index + 1}
    </div>
  ));

interface StackStoryProps {
  direction: StackDirection;
  gap: StackSpace;
  align: StackAlign;
  justify: StackJustify;
  wrap: boolean;
  padding: StackSpace;
  fullWidth: boolean;
  items: number;
}

const StackStory = ({ items, ...props }: StackStoryProps) => (
  <Stack {...props} className={styles.frame}>
    <Boxes count={items} />
  </Stack>
);

StackStory.displayName = 'StackStory';

interface CardStoryProps {
  type: keyof typeof CardTypes;
  outline: boolean;
  text: string;
}

const CardStory = ({ type, outline, text }: CardStoryProps) => (
  <Card type={CardTypes[type] as CardType} outline={outline} style={{ padding: 16, maxWidth: 400 }}>
    <Text variant="body-md/normal">{text}</Text>
  </Card>
);

CardStory.displayName = 'CardStory';

const DividerStory = ({ gap }: { gap: number }) => (
  <div className={styles.media}>
    <Text variant="body-md/normal">Above the divider</Text>
    <Divider gap={gap} />
    <Text variant="body-md/normal">Below the divider</Text>
  </div>
);

DividerStory.displayName = 'DividerStory';

const SCROLLERS = { ScrollerThin, ScrollerAuto, ScrollerNone };
const ADVANCED_SCROLLERS = { AdvancedScrollerThin, AdvancedScrollerAuto, AdvancedScrollerNone };

const ScrollerRows = ({ orientation }: { orientation: ScrollerOrientation }) =>
  orientation === 'horizontal' ? (
    <div className={styles.horizontalRow}>
      <Boxes count={24} />
    </div>
  ) : (
    Array.from({ length: 30 }, (_, index) => (
      <div key={index} className={styles.scrollerRow}>
        Row {index + 1}
      </div>
    ))
  );

interface ScrollerStoryProps {
  scroller: keyof typeof SCROLLERS;
  orientation: ScrollerOrientation;
  fade: boolean;
  scrollbarGutter: ScrollbarGutter;
}

const ScrollerStory = ({ scroller, ...props }: ScrollerStoryProps) => {
  const Scroller = SCROLLERS[scroller];
  return (
    <Scroller {...props} className={styles.scroller}>
      <ScrollerRows orientation={props.orientation} />
    </Scroller>
  );
};

ScrollerStory.displayName = 'ScrollerStory';

interface AdvancedScrollerStoryProps extends Omit<ScrollerStoryProps, 'scroller'> {
  scroller: keyof typeof ADVANCED_SCROLLERS;
  overflow: ScrollerOverflow;
}

const AdvancedScrollerStory = ({ scroller, ...props }: AdvancedScrollerStoryProps) => {
  const Scroller = ADVANCED_SCROLLERS[scroller];
  return (
    <Scroller {...props} className={styles.scroller}>
      <ScrollerRows orientation={props.orientation} />
    </Scroller>
  );
};

AdvancedScrollerStory.displayName = 'AdvancedScrollerStory';

const LISTS = { ListThin, ListAuto };

interface ListScrollerStoryProps {
  list: keyof typeof LISTS;
  sections: number;
  rows: number;
  rowHeight: number;
  sectionHeight: number;
  fade: boolean;
}

const ListScrollerStory = ({ list, sections, rows, rowHeight, sectionHeight, fade }: ListScrollerStoryProps) => {
  const List = LISTS[list];
  return (
    <List
      className={styles.scroller}
      fade={fade}
      sections={Array.from({ length: sections }, () => rows)}
      sectionHeight={sectionHeight}
      rowHeight={rowHeight}
      renderSection={({ section }) => (
        <div key={`section-${section}`} className={styles.listSection} style={{ height: sectionHeight }}>
          <Text variant="body-xs/semibold" color="text-strong">
            Section {section + 1}
          </Text>
        </div>
      )}
      renderRow={({ section, row }) => (
        <div key={`row-${section}-${row}`} className={styles.scrollerRow} style={{ height: rowHeight }}>
          Item {row + 1}
        </div>
      )}
    />
  );
};

ListScrollerStory.displayName = 'ListScrollerStory';

interface GradientWrapperStoryProps {
  color: GradientColorName;
  offsetBottom: number;
}

const GradientWrapperStory = (props: GradientWrapperStoryProps) => (
  <GradientWrapper {...props} className={styles.gradient}>
    <Text variant="heading-lg/semibold">Gradient background</Text>
  </GradientWrapper>
);

GradientWrapperStory.displayName = 'GradientWrapperStory';

const orientationControl = {
  label: 'Orientation',
  type: 'select' as const,
  defaultValue: 'vertical',
  options: valueOptions(['vertical', 'horizontal', 'auto']),
};

const layout: StoryGroup = {
  title: 'Layout',
  stories: [
    {
      name: 'Stack',
      id: 'stack',
      component: StackStory,
      controls: {
        direction: {
          label: 'Direction',
          type: 'select',
          defaultValue: 'vertical',
          options: valueOptions(['vertical', 'vertical-reverse', 'horizontal', 'horizontal-reverse']),
        },
        gap: { label: 'Gap', type: 'select', defaultValue: 8, options: valueOptions([...SPACES, ...SPACE_NAMES]) },
        align: {
          label: 'Align',
          type: 'select',
          defaultValue: 'stretch',
          options: valueOptions(['start', 'end', 'center', 'stretch', 'baseline']),
        },
        justify: {
          label: 'Justify',
          type: 'select',
          defaultValue: 'start',
          options: valueOptions(['start', 'end', 'center', 'space-around', 'space-between']),
        },
        wrap: { label: 'Wrap', type: 'boolean', defaultValue: false },
        padding: { label: 'Padding', type: 'select', defaultValue: 0, options: valueOptions(SPACES) },
        fullWidth: { label: 'Full Width', type: 'boolean', defaultValue: true },
        items: { label: 'Items', type: 'slider', defaultValue: 4, minValue: 1, maxValue: 12 },
      },
    },
    {
      name: 'Card',
      id: 'card',
      component: CardStory,
      controls: {
        type: { label: 'Type', type: 'select', defaultValue: 'PRIMARY', options: keyOptions(CardTypes) },
        outline: { label: 'Outline', type: 'boolean', defaultValue: false },
        text: { label: 'Text', type: 'text', defaultValue: LOREM },
      },
    },
    {
      name: 'Divider',
      id: 'divider',
      component: DividerStory,
      controls: { gap: { label: 'Gap', type: 'number', defaultValue: 16 } },
    },
    {
      name: 'Scroller',
      id: 'scroller',
      component: ScrollerStory,
      controls: {
        scroller: { label: 'Scroller', type: 'select', defaultValue: 'ScrollerThin', options: keyOptions(SCROLLERS) },
        orientation: orientationControl,
        fade: { label: 'Fade', type: 'boolean', defaultValue: false },
        scrollbarGutter: { label: 'Scrollbar Gutter', type: 'select', defaultValue: 'stable', options: gutterOptions },
      },
    },
    {
      name: 'AdvancedScroller',
      id: 'advanced-scroller',
      component: AdvancedScrollerStory,
      controls: {
        scroller: {
          label: 'Scroller',
          type: 'select',
          defaultValue: 'AdvancedScrollerThin',
          options: keyOptions(ADVANCED_SCROLLERS),
        },
        orientation: orientationControl,
        overflow: {
          label: 'Overflow',
          type: 'select',
          defaultValue: 'scroll',
          options: valueOptions(['scroll', 'auto']),
        },
        fade: { label: 'Fade', type: 'boolean', defaultValue: false },
        scrollbarGutter: { label: 'Scrollbar Gutter', type: 'select', defaultValue: 'stable', options: gutterOptions },
      },
    },
    {
      name: 'List Scroller',
      id: 'list-scroller',
      component: ListScrollerStory,
      controls: {
        list: { label: 'List', type: 'select', defaultValue: 'ListThin', options: keyOptions(LISTS) },
        sections: { label: 'Sections', type: 'slider', defaultValue: 5, minValue: 1, maxValue: 20 },
        rows: { label: 'Rows per Section', type: 'slider', defaultValue: 20, minValue: 1, maxValue: 200 },
        rowHeight: { label: 'Row Height', type: 'number', defaultValue: 40 },
        sectionHeight: { label: 'Section Height', type: 'number', defaultValue: 32 },
        fade: { label: 'Fade', type: 'boolean', defaultValue: false },
      },
    },
    {
      name: 'GradientWrapper',
      id: 'gradient-wrapper',
      component: GradientWrapperStory,
      controls: {
        color: {
          label: 'Color',
          type: 'select',
          defaultValue: 'purple',
          options: valueOptions(['purple', 'blue', 'green', 'pink', 'nitro-pink', 'nitro-green']),
        },
        offsetBottom: { label: 'Offset Bottom', type: 'slider', defaultValue: 0, minValue: 0, maxValue: 1 },
      },
    },
  ],
};

export default layout;
