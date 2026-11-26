import { Text } from '@discord-components/components';
import type { SelectOption, StoryGroup } from '../../types';

// Discord's story lists the components its asset pipeline generates for animated assets. The build has none,
// so the story only shows its empty state; the options below stay empty for the same reason.
const ASSET_OPTIONS: SelectOption<string>[] = [];

const ASSET_DEFAULT = 'asset-default';
const TOKEN = 'token';

const AnimatedAssetStory = () => (
  <Text variant="body-sm/normal" color="text-subtle">
    No animated assets yet. They show up here once the asset pipeline has generated their components.
  </Text>
);

AnimatedAssetStory.displayName = 'AnimatedAssetStory';

const animatedAsset: StoryGroup = {
  title: 'Animated Asset',
  stories: [
    {
      name: 'Animated Asset',
      id: 'animated-asset',
      component: AnimatedAssetStory,
      controls: {
        assetName: {
          label: 'Asset',
          hint: 'The generated component for each asset in the manifest.',
          type: 'select',
          defaultValue: ASSET_OPTIONS[0]?.value ?? '',
          options: ASSET_OPTIONS,
        },
        width: {
          label: 'Width',
          hint: 'Pixels (320) or any CSS length (50%). Empty fills the parent.',
          type: 'text',
          defaultValue: undefined,
        },
        height: {
          label: 'Height',
          hint: 'Pixels or any CSS length. Empty follows the ratio.',
          type: 'text',
          defaultValue: undefined,
        },
        aspectRatio: {
          label: 'Aspect ratio',
          hint: 'A number (1.5) or a ratio (16/9).',
          type: 'text',
          defaultValue: undefined,
        },
        fit: {
          label: 'Fit',
          type: 'select',
          defaultValue: 'crop',
          options: [
            { label: 'Crop', value: 'crop' },
            { label: 'Pad', value: 'pad' },
          ],
        },
        anchor: {
          label: 'Anchor',
          type: 'select',
          hint: "Asset default uses the asset's meta.json, or center.",
          defaultValue: ASSET_DEFAULT,
          options: [
            { label: 'Asset default', value: ASSET_DEFAULT },
            ...['center', 'top', 'bottom', 'left', 'right', 'top-left', 'top-right', 'bottom-left', 'bottom-right'].map(
              (anchor) => ({ label: anchor, value: anchor }),
            ),
          ],
        },
        padColor: {
          label: 'Pad colour',
          type: 'select',
          hint: "Asset default uses the asset's meta.json, or transparent.",
          defaultValue: ASSET_DEFAULT,
          options: [
            { label: 'Asset default', value: ASSET_DEFAULT },
            { label: 'Transparent', value: 'transparent' },
            { label: 'Opaque #RRGGBB', value: '#5865f2' },
            { label: 'Translucent #RRGGBBAA', value: '#5865f280' },
            { label: 'Token: background base low', value: TOKEN },
          ],
          isVisible: (props) => props.fit === 'pad',
        },
        autoPlay: { label: 'Autoplay', type: 'boolean', defaultValue: true },
        loop: { label: 'Loop', type: 'boolean', defaultValue: true },
        paused: { label: 'Paused', type: 'boolean', defaultValue: false },
        pauseWhenOffscreen: { label: 'Pause when offscreen', type: 'boolean', defaultValue: true },
        forceReducedMotion: {
          label: 'Force reduced motion',
          hint: 'Off follows your own reduced motion setting.',
          type: 'boolean',
          defaultValue: false,
        },
        stageWidth: { label: 'Stage width (%)', type: 'slider', defaultValue: 60, minValue: 10, maxValue: 100 },
        stageHeight: {
          label: 'Stage height',
          hint: 'Empty fits the asset. Needed for a % height.',
          type: 'text',
          defaultValue: undefined,
        },
        checkerboard: { label: 'Checkerboard', type: 'boolean', defaultValue: true },
        showBoxEdge: { label: 'Show box edge', type: 'boolean', defaultValue: true },
      },
    },
  ],
};

export default animatedAsset;
