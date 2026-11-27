// Renders a message's attachments the way the client's message accessories do (module 197832, renderAttachments):
// attachments -> mosaic items (96782 rC) with the accessories' render functions (450568) and the media viewer
// click handlers (492230 over 731068 Rr) -> MediaMosaic (349878).
async (ref, data) => {
  // File-type icons are reached through a require context (165025), which the static closure doesn't follow.
  const fileIcons = ['393105', '209899', '862047', '262369', '439205', '602462', '655514', '528736', '426658'];
  fileIcons.push('101233', '368877', '531449', '347810', '144374');
  await ref.boot(['349878', '96782', '450568', '492230', '731068', '253932', ...fileIcons]);
  // The clips player (682176) needs the client's Flux stores to initialize; clips aren't covered here.
  if (window.__ref.req.c['682176'] == null)
    window.__ref.modules['682176'] = (module) => (module.exports = { A: () => null });
  const h = ref.React.createElement;
  const MediaMosaic = ref.req('349878').A;
  const { rC: createMosaicItem } = ref.req('96782');
  const renderers = ref.req('450568');
  const { o: createHandlers } = ref.req('492230');
  const { Rr: toMediaItem } = ref.req('731068');
  const props = data.props ?? {};
  // The "Show image descriptions" user setting (off by default) is read through this setting object.
  const viewImageDescriptions = ref.req('253932')._z;
  viewImageDescriptions.getSetting = () => props.viewImageDescriptions ?? false;
  const base = data.message ?? { id: '1300000000000000000', channel_id: '1200000000000000000', content: '' };
  const message = {
    ...base,
    getChannelId: () => base.channel_id,
    author: { id: '1', bot: false },
    attachments: data.attachments,
    embeds: [],
    isPoll: () => false,
  };
  const inline = props.inlineAttachmentMedia ?? true;
  const visible = data.attachments.filter((a) => ((a.flags ?? 0) & 2) === 0);
  const mediaItems = visible
    .map((a) => ({ ...toMediaItem(a, message), original: a.url, srcIsAnimated: ((a.flags ?? 0) & 32) !== 0 }))
    .filter((item) => item.type !== 'INVALID');
  const options = { shouldHideMediaOptions: false };
  const all = createHandlers(mediaItems, options, 'Media Mosaic');
  const clicks = mediaItems.length > 1 ? all : createHandlers([], options, 'Media Mosaic');
  const canDelete = props.canDeleteAttachments ?? false;
  const items = visible.map((attachment) => {
    const item = {
      message,
      item: createMosaicItem(attachment, inline),
      autoPlayGif: props.gifAutoPlay ?? true,
      canRemoveItem: canDelete && (visible.length > 1 || base.content !== ''),
      onRemoveItem: () => {},
      canEditItem: canDelete,
      onEditItem: () => {},
      getObscureReason: (mosaicItem) => (((mosaicItem.originalItem.flags ?? 0) & 8) !== 0 ? 'spoiler' : null),
      renderAudioComponent: renderers.Nj,
      renderImageComponent: renderers.Cr,
      renderVideoComponent: renderers.I1,
      renderPlaintextFilePreview: renderers.R6,
      renderGenericFileComponent: renderers.UB,
      onPlay: () => {},
      gifFavoriteButton: () => null,
      allowFullScreen: true,
    };
    const src = attachment.proxy_url != null && attachment.proxy_url !== '' ? attachment.proxy_url : attachment.url;
    item.onOpenInMediaViewer = all.srcToSeekOverride[src];
    if (src in clicks.srcToOnClickOverride) {
      item.onClick = clicks.srcToOnClickOverride[src];
      item.handlePreloadImage = clicks.srcToHandlePreloadImage[src];
      item.onSeekRequest = clicks.srcToSeekOverride[src];
    }
    return item;
  });
  return h(MediaMosaic, { items });
};
