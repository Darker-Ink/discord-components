// Renders a Components v2 media gallery the way the client's MediaGallery component does (module 713235, `nw`):
// unfurled media records (731068 Uv) -> mosaic items with the gallery's image/video renderers (383055 LL / $o),
// the media viewer click handlers (492230 over 541041 FX) -> MediaMosaic (349878) at Components v2 width.
async (ref, data) => {
  await ref.boot(['349878', '383055', '492230', '541041', '731068', '448381', '253932']);
  // The clips player (682176) needs the client's Flux stores to initialize; clips aren't covered here.
  if (window.__ref.req.c['682176'] == null)
    window.__ref.modules['682176'] = (module) => (module.exports = { A: () => null });
  const h = ref.React.createElement;
  const MediaMosaic = ref.req('349878').A;
  const media = ref.req('383055');
  const { o: createHandlers } = ref.req('492230');
  const { FX: toMediaItem } = ref.req('541041');
  const { Uv: toUnfurledMedia } = ref.req('731068');
  const { wz: getType } = ref.req('448381');
  const props = data.props ?? {};
  ref.req('253932')._z.getSetting = () => props.viewImageDescriptions ?? false;
  const message = {
    id: '1300000000000000000',
    channel_id: '1200000000000000000',
    author: { id: '1', bot: false },
    getChannelId: () => '1200000000000000000',
    attachments: [],
  };
  const items = data.items.map((item) => ({
    media: toUnfurledMedia({ proxy_url: item.media.url, ...item.media }),
    description: item.description,
    spoiler: item.spoiler ?? false,
  }));
  const viewerItems = items.map((item) => toMediaItem(item.media, message)).filter((item) => item.type !== 'INVALID');
  const handlers =
    viewerItems.length > 1
      ? createHandlers(viewerItems, { shouldHideMediaOptions: false }, 'Media Mosaic')
      : { srcToOnClickOverride: {}, srcToHandlePreloadImage: {}, srcToSeekOverride: {} };
  const renderImage = (e) => {
    const m = e.item.originalItem.media;
    return media.LL({
      ...e,
      alt: e.item.originalItem.description,
      src: m.proxyUrl,
      original: m.url,
      placeholder: m.placeholder,
      placeholderVersion: m.placeholderVersion,
      contentType: m.contentType,
      originalContentType: m.originalContentType,
      sourceMetadata: { message: e.message },
      analyticsSource: 'renderImageComponentForGalleryItem',
      srcIsAnimated: e.item.srcIsAnimated,
    });
  };
  const renderVideo = (e) => {
    const m = e.item.originalItem.media;
    const poster = new URL(m.proxyUrl);
    poster.searchParams.append('format', 'webp');
    return media.$o({
      ...e,
      poster: poster.toString(),
      alt: e.item.originalItem.description,
      src: m.proxyUrl,
      placeholder: m.placeholder,
      placeholderVersion: m.placeholderVersion,
      sourceMetadata: { message: e.message },
    });
  };
  const noop = () => {};
  const mosaicItems = items.map((item, index) => {
    const m = item.media;
    const props = {
      message,
      item: {
        uniqueId: `${m.proxyUrl}--${index}`,
        originalItem: item,
        type: getType(m),
        downloadUrl: m.url,
        height: m.height,
        width: m.width,
        spoiler: item.spoiler,
        contentType: m.contentType,
        srcIsAnimated: (m.flags & 1) !== 0,
      },
      autoPlayGif: true,
      getObscureReason: (mosaicItem) => (mosaicItem.originalItem.spoiler ? 'spoiler' : null),
      renderImageComponent: renderImage,
      renderVideoComponent: renderVideo,
      renderVisualPlaceholderComponent: () => null,
      renderAudioComponent: noop,
      renderPlaintextFilePreview: noop,
      renderGenericFileComponent: noop,
      gifFavoriteButton: () => null,
      onPlay: noop,
      canRemoveItem: false,
      canEditItem: false,
      onRemoveItem: noop,
      onEditItem: noop,
    };
    const src = m.proxyUrl != null && m.proxyUrl !== '' ? m.proxyUrl : m.url;
    if (src in handlers.srcToOnClickOverride) {
      props.onClick = handlers.srcToOnClickOverride[src];
      props.handlePreloadImage = handlers.srcToHandlePreloadImage[src];
      props.onSeekRequest = handlers.srcToSeekOverride[src];
    }
    return props;
  });
  return h('div', null, h(MediaMosaic, { items: mosaicItems, isInAppComponentsV2: true, hideClipMessageNotice: true }));
};
