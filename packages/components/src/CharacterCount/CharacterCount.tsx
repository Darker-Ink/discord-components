import { useContext } from 'react';
import { FieldContext } from '../Field/FieldContext';
import { HiddenVisually } from '../HiddenVisually';
import { useManaContext } from '../ManaContext';
import { Text } from '../Text';
import { useCharacterLimitAnnouncement } from './useCharacterLimitAnnouncement';

export interface CharacterCountProps {
  value?: string | null;
  maxLength?: number;
}

/** "12 / 100" under an input, with the remaining count for screen readers. */
export const CharacterCount = ({ value, maxLength }: CharacterCountProps) => {
  const { i18n } = useManaContext();
  const field = useContext(FieldContext);
  const currentLength = value?.length ?? 0;
  useCharacterLimitAnnouncement({ currentLength, maxLength, message: i18n.CHARACTER_COUNT_LIMIT_REACHED });
  return (
    <>
      <Text variant="body-xs/normal" color="text-subtle" tabularNumbers aria-hidden={maxLength != null}>
        {currentLength}
        {maxLength != null && ` / ${maxLength}`}
      </Text>
      {maxLength != null && (
        <HiddenVisually id={field?.trailingAuxiliaryContentId}>
          {i18n.CHARACTER_COUNT_A11Y_LABEL(maxLength - currentLength)}
        </HiddenVisually>
      )}
    </>
  );
};

CharacterCount.displayName = 'CharacterCount';
