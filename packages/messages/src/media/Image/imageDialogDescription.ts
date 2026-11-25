import { useEffect } from 'react';

const DESCRIPTION_ID = 'uid_image_dialog_description';
const DESCRIPTION_TEXT = 'click to open image dialog';

// Clickable images point aria-describedby at a hidden node the client appends to <body> once.
const ensureDescription = () => {
  if (typeof document === 'undefined' || document.getElementById(DESCRIPTION_ID) != null) return;
  const node = document.createElement('div');
  node.setAttribute('id', DESCRIPTION_ID);
  node.innerText = DESCRIPTION_TEXT;
  node.style.display = 'none';
  document.body.appendChild(node);
};

export const useImageDialogDescriptionId = (enabled: boolean) => {
  useEffect(() => {
    if (enabled) ensureDescription();
  }, [enabled]);
  return DESCRIPTION_ID;
};
