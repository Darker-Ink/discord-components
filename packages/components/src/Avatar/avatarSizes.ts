export const AvatarSizes = {
  SIZE_16: 'SIZE_16',
  SIZE_20: 'SIZE_20',
  SIZE_24: 'SIZE_24',
  SIZE_32: 'SIZE_32',
  SIZE_40: 'SIZE_40',
  SIZE_44: 'SIZE_44',
  SIZE_48: 'SIZE_48',
  SIZE_56: 'SIZE_56',
  SIZE_72: 'SIZE_72',
  SIZE_80: 'SIZE_80',
  SIZE_96: 'SIZE_96',
  SIZE_120: 'SIZE_120',
  SIZE_152: 'SIZE_152',
  DEPRECATED_SIZE_30: 'DEPRECATED_SIZE_30',
  DEPRECATED_SIZE_60: 'DEPRECATED_SIZE_60',
  DEPRECATED_SIZE_100: 'DEPRECATED_SIZE_100',
} as const;

export type AvatarSize = (typeof AvatarSizes)[keyof typeof AvatarSizes];

export const SpeakingStates = { SPEAKING: 'speaking', PLAYING_SOUNDBOARD: 'soundboard' } as const;

export type SpeakingState = (typeof SpeakingStates)[keyof typeof SpeakingStates];

export const StatusBackdropColors = { BLACK: 'black', WHITE: 'white' } as const;

export type StatusBackdropColor = (typeof StatusBackdropColors)[keyof typeof StatusBackdropColors];

export const StatusBackdropOpacity = { HIGH: 0.7, LOW: 0.45 } as const;

export interface AvatarSpecs {
  size: number;
  status: number;
  stroke: number;
  offset: number;
}

export const AvatarSpecsBySize: Readonly<Record<AvatarSize, Readonly<AvatarSpecs>>> = Object.freeze({
  SIZE_16: Object.freeze({ size: 16, status: 6, stroke: 2, offset: 0 }),
  SIZE_20: Object.freeze({ size: 20, status: 6, stroke: 2, offset: 0 }),
  SIZE_24: Object.freeze({ size: 24, status: 8, stroke: 3, offset: 0 }),
  SIZE_32: Object.freeze({ size: 32, status: 10, stroke: 3, offset: 0 }),
  SIZE_40: Object.freeze({ size: 40, status: 12, stroke: 4, offset: 0 }),
  SIZE_44: Object.freeze({ size: 44, status: 12, stroke: 4, offset: 0 }),
  SIZE_48: Object.freeze({ size: 48, status: 12, stroke: 4, offset: 0 }),
  SIZE_56: Object.freeze({ size: 56, status: 14, stroke: 4, offset: 2 }),
  SIZE_72: Object.freeze({ size: 72, status: 16, stroke: 6, offset: 4 }),
  SIZE_80: Object.freeze({ size: 80, status: 16, stroke: 6, offset: 4 }),
  SIZE_96: Object.freeze({ size: 96, status: 20, stroke: 8, offset: 6 }),
  SIZE_120: Object.freeze({ size: 120, status: 24, stroke: 8, offset: 8 }),
  SIZE_152: Object.freeze({ size: 152, status: 30, stroke: 10, offset: 10 }),
  DEPRECATED_SIZE_30: Object.freeze({ size: 30, status: 0, stroke: 0, offset: 0 }),
  DEPRECATED_SIZE_60: Object.freeze({ size: 60, status: 0, stroke: 0, offset: 0 }),
  DEPRECATED_SIZE_100: Object.freeze({ size: 100, status: 0, stroke: 0, offset: 0 }),
});

export const getAvatarSpecs = (size: AvatarSize) => AvatarSpecsBySize[size];

export const getAvatarSize = (size: AvatarSize | number) =>
  typeof size !== 'number' ? getAvatarSpecs(size).size : size;

export const getSpeakingState = (isSpeaking: boolean, isPlayingSoundboard: boolean): SpeakingState | null =>
  isPlayingSoundboard ? 'soundboard' : isSpeaking ? 'speaking' : null;
