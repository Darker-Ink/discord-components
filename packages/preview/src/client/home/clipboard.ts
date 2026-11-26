import { showToast } from '@discord-mana/components';

/** Copies text and confirms with a toast; returns whether it worked. */
export const copyText = async (text: string, what: string) => {
  try {
    await navigator.clipboard.writeText(text);
    showToast({ text: `${what} copied to clipboard`, variant: 'success', toastKey: 'copy' });
    return true;
  } catch {
    showToast({ text: `Couldn't copy. Select the text and copy it yourself.`, variant: 'critical', toastKey: 'copy' });
    return false;
  }
};
