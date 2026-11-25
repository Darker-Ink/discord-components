import { useEffect, useRef } from 'react';
import { AccessibilityAnnouncer } from '../AccessibilityAnnouncer';

/** Announces `message` once each time the length reaches the limit. */
export const useCharacterLimitAnnouncement = ({
  currentLength,
  maxLength,
  message,
}: {
  currentLength: number;
  maxLength: number | undefined;
  message: string;
}) => {
  const announced = useRef(false);
  useEffect(() => {
    if (maxLength == null) return;
    const reached = currentLength >= maxLength;
    if (reached && !announced.current) {
      announced.current = true;
      AccessibilityAnnouncer.announce(message, 'assertive');
    } else if (!reached) {
      announced.current = false;
    }
  }, [currentLength, maxLength, message]);
};
