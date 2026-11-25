// Screen reader announcements through visually hidden live regions. This follows react-aria's live
// announcer, plus the ability to move the regions into another node: a modal marks everything
// outside itself `aria-hidden`, so announcements must be made from inside it.

export type Assertiveness = 'assertive' | 'polite';
export type Announcement = string | { 'aria-labelledby': string };

const DEFAULT_TIMEOUT = 7000;

class LiveAnnouncer {
  node: HTMLElement | null = null;
  parentNode: Element | null = null;
  assertiveLog: HTMLElement | null = null;
  politeLog: HTMLElement | null = null;

  constructor(parent: Element | null = null) {
    if (typeof document === 'undefined') return;
    this.node = document.createElement('div');
    this.parentNode = parent ?? document.body;
    this.node.dataset.liveAnnouncer = 'true';
    Object.assign(this.node.style, {
      border: 0,
      clip: 'rect(0 0 0 0)',
      clipPath: 'inset(50%)',
      height: '1px',
      margin: '-1px',
      overflow: 'hidden',
      padding: 0,
      position: 'absolute',
      width: '1px',
      whiteSpace: 'nowrap',
    });
    this.assertiveLog = this.createLog('assertive');
    this.node.appendChild(this.assertiveLog);
    this.politeLog = this.createLog('polite');
    this.node.appendChild(this.politeLog);
    this.parentNode.prepend(this.node);
  }

  isAttached() {
    return this.node?.isConnected;
  }

  createLog(assertiveness: Assertiveness) {
    const log = document.createElement('div');
    log.setAttribute('role', 'log');
    log.setAttribute('aria-live', assertiveness);
    log.setAttribute('aria-relevant', 'additions');
    return log;
  }

  destroy() {
    if (this.node && this.parentNode) {
      this.parentNode.removeChild(this.node);
      this.node = null;
    }
  }

  move(parent: Element | null = null) {
    if (!this.node) return;
    this.parentNode = parent ?? document.body;
    this.parentNode.prepend(this.node);
  }

  announce(message: Announcement, assertiveness: Assertiveness = 'assertive', timeout = DEFAULT_TIMEOUT) {
    if (!this.node) return;
    const node = document.createElement('div');
    if (typeof message === 'object') {
      node.setAttribute('role', 'img');
      node.setAttribute('aria-labelledby', message['aria-labelledby']);
    } else {
      node.textContent = message;
    }
    if (assertiveness === 'assertive') this.assertiveLog?.appendChild(node);
    else this.politeLog?.appendChild(node);
    if (message !== '') setTimeout(() => node.remove(), timeout);
  }

  clear(assertiveness?: Assertiveness) {
    if (!this.node) return;
    if ((!assertiveness || assertiveness === 'assertive') && this.assertiveLog) this.assertiveLog.innerHTML = '';
    if ((!assertiveness || assertiveness === 'polite') && this.politeLog) this.politeLog.innerHTML = '';
  }
}

let liveAnnouncer: LiveAnnouncer | null = null;

const announce = (message: Announcement, assertiveness: Assertiveness = 'assertive', timeout = DEFAULT_TIMEOUT) => {
  if (liveAnnouncer) {
    liveAnnouncer.announce(message, assertiveness, timeout);
    return;
  }
  liveAnnouncer = new LiveAnnouncer();
  // Give a freshly inserted live region a moment to be picked up before it changes.
  setTimeout(() => {
    if (liveAnnouncer?.isAttached()) liveAnnouncer.announce(message, assertiveness, timeout);
  }, 100);
};

const clearAnnouncements = (assertiveness?: Assertiveness) => liveAnnouncer?.clear(assertiveness);

const moveAnnouncer = (parent: Element | null = null) => {
  if (liveAnnouncer) liveAnnouncer.move(parent);
  else liveAnnouncer = new LiveAnnouncer(parent);
};

const containers = new Map<string, Element>();

export const AccessibilityAnnouncer = {
  announce,
  clearAnnouncements,
  // Moves announcements into `container` until `remove(key)`; the most recent container wins.
  moveTo: (key: string, container: Element | null | undefined) => {
    if (container == null || containers.has(key)) return;
    moveAnnouncer(container);
    containers.set(key, container);
  },
  remove: (key: string) => {
    if (!containers.delete(key)) return;
    const last = Array.from(containers.values()).pop();
    moveAnnouncer(last ?? null);
  },
};
