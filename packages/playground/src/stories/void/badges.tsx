import { BadgeShapes, Heading, IconBadge, NumberBadge, Stack, type IconBadgeProps } from '@discord-mana/components';
import { BellIcon, CheckmarkLargeIcon, LockIcon, NitroWheelIcon, StarIcon } from '@discord-mana/icons';
import type { Controls, StoryGroup } from '../../types';

type ShapeName = keyof typeof BadgeShapes;

const SHAPE_NAMES = Object.keys(BadgeShapes) as ShapeName[];

const SHAPE_OPTIONS: { label: string; value: ShapeName }[] = [
  { label: 'Round', value: 'ROUND' },
  { label: 'Round Left', value: 'ROUND_LEFT' },
  { label: 'Round Right', value: 'ROUND_RIGHT' },
  { label: 'Square', value: 'SQUARE' },
];

const ICONS: Record<string, IconBadgeProps['icon']> = {
  bell: BellIcon,
  star: StarIcon,
  checkmark: CheckmarkLargeIcon,
  lock: LockIcon,
  nitro: NitroWheelIcon,
};

const COUNTS = [1, 42, 999, 1500];

const optionalColor = (color: string | undefined) => (color != null && color !== '' ? color : undefined);

const SHARED_CONTROLS: Controls = {
  shape: { label: 'Shape', type: 'select', defaultValue: 'ROUND', options: SHAPE_OPTIONS },
  color: { label: 'Background color', type: 'color', defaultValue: undefined },
  disableColor: { label: 'Disable background color', type: 'boolean', defaultValue: false },
};

interface SharedProps {
  shape: ShapeName;
  color?: string;
  disableColor: boolean;
}

const NumberBadgeStory = ({ count, shape, color, disableColor }: SharedProps & { count: number }) => (
  <NumberBadge count={count} shape={BadgeShapes[shape]} color={optionalColor(color)} disableColor={disableColor} />
);

NumberBadgeStory.displayName = 'NumberBadgeStory';

const IconBadgeStory = ({ icon, shape, color, disableColor }: SharedProps & { icon: string }) =>
  disableColor ? (
    <IconBadge icon={ICONS[icon]} shape={BadgeShapes[shape]} disableColor aria-label={icon} />
  ) : (
    <IconBadge icon={ICONS[icon]} shape={BadgeShapes[shape]} color={optionalColor(color)} aria-label={icon} />
  );

IconBadgeStory.displayName = 'IconBadgeStory';

const AllBadges = () => (
  <Stack gap={16}>
    {SHAPE_NAMES.map((name) => {
      const shape = BadgeShapes[name];
      const label = SHAPE_OPTIONS.find((option) => option.value === name)?.label ?? name;
      return (
        <Stack key={name} gap={8}>
          <Heading variant="heading-xs/semibold">{label}</Heading>
          <Stack direction="horizontal" gap={8} align="center">
            {COUNTS.map((count) => (
              <NumberBadge key={count} count={count} shape={shape} />
            ))}
            <IconBadge icon={BellIcon} shape={shape} aria-label="bell" />
          </Stack>
        </Stack>
      );
    })}
  </Stack>
);

AllBadges.displayName = 'AllBadges';

const badges: StoryGroup = {
  title: 'Badges',
  stories: [
    {
      name: 'NumberBadge',
      id: 'number-badge',
      component: NumberBadgeStory,
      controls: { count: { label: 'Count', type: 'number', defaultValue: 5, minValue: 0 }, ...SHARED_CONTROLS },
    },
    {
      name: 'IconBadge',
      id: 'icon-badge',
      component: IconBadgeStory,
      controls: {
        icon: {
          label: 'Icon',
          type: 'select',
          defaultValue: 'bell',
          options: [
            { label: 'Bell', value: 'bell' },
            { label: 'Star', value: 'star' },
            { label: 'Checkmark', value: 'checkmark' },
            { label: 'Lock', value: 'lock' },
            { label: 'Nitro', value: 'nitro' },
          ],
        },
        ...SHARED_CONTROLS,
      },
    },
    { name: 'All Badges', id: 'badges-all', component: AllBadges },
  ],
};

export default badges;
