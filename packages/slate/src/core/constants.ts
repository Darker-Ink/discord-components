import type { Path, Point } from 'slate';

export const EDITOR_ROOT_PATH: Path = [];
export const FIRST_BLOCK_PATH: Path = [0];
export const FIRST_TEXT_PATH: Path = [0, 0];
export const EDITOR_START_POINT: Point = { path: [0, 0], offset: 0 };
/** Void types the caret may sit inside (application command options). */
export const SELECTABLE_VOID_TYPES: string[] = ['applicationCommandOption'];
export const WORD_SEPARATOR_RE = /(\t|\s)/;
