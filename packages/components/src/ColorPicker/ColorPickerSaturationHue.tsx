import { memo } from 'react';
import { CustomPicker, type InjectedColorProps } from 'react-color';
import { Hue, Saturation } from 'react-color/lib/components/common/index.js';
import type { HueProps } from 'react-color/lib/components/common/Hue';
import type { SaturationProps } from 'react-color/lib/components/common/Saturation';
import styles from './ColorPickerSaturationHue.module.css';

// The saturation square and hue slider of the custom color picker, from react-color as in Discord.
// CustomPicker passes every color format (hsl, hsv, rgb, hex) plus onChange down to both.
const SaturationHue = (props: InjectedColorProps) => (
  <div className={styles.wrapper}>
    <div className={styles.saturation}>
      <Saturation {...(props as SaturationProps)} />
    </div>
    <div className={styles.hue}>
      <Hue {...(props as HueProps)} direction="horizontal" />
    </div>
  </div>
);

SaturationHue.displayName = 'ColorPickerSaturationHue';

export default memo(CustomPicker(SaturationHue));
