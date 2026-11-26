// The loading skeleton of preview pages, as static HTML (styled by public/boot.css). The Worker puts it in the page
// so it shows before any JS has loaded; the app shows the same markup until the messages are ready.

const group = (lines: number) =>
  `<div class="boot-group"><div class="boot-avatar"></div><div class="boot-lines"><div class="boot-name"></div>${'<div class="boot-line"></div>'.repeat(lines - 1)}<div class="boot-line boot-short"></div></div></div>`;

export const SKELETON_HTML = `<div class="boot" role="status"><span class="boot-label">Loading messages…</span>${[2, 1, 3, 1].map(group).join('')}</div>`;
