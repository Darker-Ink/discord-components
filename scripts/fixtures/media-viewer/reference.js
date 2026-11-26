// Opens Discord's media viewer the way clicking media does (module 256905 R: openModalLazy with the lightbox
// backdrop); the reference root renders the client's modal stack (638495), which shows the viewer (2323).
async (ref, data) => {
  // The viewer (2323) is lazily loaded; booting it pulls its dependencies from the main bundle too.
  await ref.boot(['638495', '256905', '192308', '2323']);
  // The clips player (682176) needs the client's Flux stores to initialise; clips aren't covered here.
  if (window.__ref.req.c['682176'] == null)
    window.__ref.modules['682176'] = (module) => (module.exports = { A: () => null });
  // The keybind manager (775121) hooks a key-combo library that doesn't initialise outside the client; the
  // viewer only toggles its arrow/escape bindings through it.
  if (window.__ref.req.c['775121'] == null) {
    const keybinds = { disable() {}, enable() {}, enableTemp() {}, disableTemp() {} };
    window.__ref.modules['775121'] = (module) => (module.exports = { A: keybinds });
  }
  const h = ref.React.createElement;
  const { R: openMediaViewer } = ref.req('256905');
  const message = data.message ?? null;
  const items = data.items.map((item) => ({ ...item, sourceMetadata: message != null ? { message } : undefined }));
  setTimeout(
    () =>
      openMediaViewer({
        items,
        startingIndex: data.startingIndex ?? 0,
        shouldHideMediaOptions: data.shouldHideMediaOptions ?? false,
        location: 'fixture',
      }),
    0,
  );
  return h('div');
};
