interface FullscreenElement extends Element {
  webkitRequestFullscreen?: () => void;
  webkitEnterFullscreen?: () => void;
  webkitDisplayingFullscreen?: boolean;
}

interface FullscreenDocument extends Document {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => void;
}

export const supportsFullscreen = (element: Element) => {
  const el = element as FullscreenElement;
  return el.requestFullscreen != null || el.webkitRequestFullscreen != null || el.webkitEnterFullscreen != null;
};

/** The first of `nodes` that can go full screen. */
export const findFullscreenNode = (...nodes: (Element | null | undefined)[]) =>
  nodes.find((node): node is Element => node != null && supportsFullscreen(node));

export const isFullscreen = (node?: Element | null, doc: Document = document) => {
  const d = doc as FullscreenDocument;
  return !!(
    d.fullscreenElement != null ||
    d.webkitFullscreenElement != null ||
    (node != null && (node as FullscreenElement).webkitDisplayingFullscreen)
  );
};

export const FULLSCREEN_CHANGE_EVENT = 'fullscreenchange';

export const requestFullscreen = (element: Element) => {
  const el = element as FullscreenElement;
  if (typeof el.requestFullscreen === 'function') void el.requestFullscreen();
  else if (typeof el.webkitRequestFullscreen === 'function') el.webkitRequestFullscreen();
  else if (typeof el.webkitEnterFullscreen === 'function') el.webkitEnterFullscreen();
};

export const exitFullscreen = (doc: Document = document) => {
  if (!isFullscreen(null, doc)) return;
  const d = doc as FullscreenDocument;
  if (typeof d.exitFullscreen === 'function') void d.exitFullscreen();
  else if (typeof d.webkitExitFullscreen === 'function') d.webkitExitFullscreen();
};
