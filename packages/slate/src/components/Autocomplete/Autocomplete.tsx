import { useImperativeHandle, type Ref, type RefObject } from 'react';
import type { ChatInputType } from '../../chatInputTypes';
import type { ChannelEditorHandle } from '../ChannelTextArea/ChannelEditor';

export interface AutocompleteHandle {
  onTabOrEnter: (isEnter: boolean) => boolean;
  onSpace: () => boolean;
  onMoveSelection: (delta: number) => boolean;
  onMaybeShowAutocomplete: () => void;
  onHideAutocomplete: () => void;
}

export interface AutocompleteProps {
  ref?: Ref<AutocompleteHandle>;
  editorRef: RefObject<ChannelEditorHandle | null>;
  type: ChatInputType;
  textValue: string;
  targetRef: RefObject<HTMLElement | null>;
  editorHeight: number;
  onPopupChange?: (popup: { id: string | null; activeDescendant: string | null }) => void;
}

export const Autocomplete = ({ ref }: AutocompleteProps) => {
  useImperativeHandle(ref, () => ({
    onTabOrEnter: () => false,
    onSpace: () => false,
    onMoveSelection: () => false,
    onMaybeShowAutocomplete: () => {},
    onHideAutocomplete: () => {},
  }));
  return null;
};

Autocomplete.displayName = 'Autocomplete';
