// Renders a message's embeds the way the client's message accessories do (module 197832, renderEmbeds):
// API embeds -> embed records (659674 fK, merged by url with nh) -> Embed (265705) with the accessories'
// media render functions (383055). Titles and descriptions render as raw text (markdown is out of scope).
async (ref, data) => {
  await ref.boot(['265705', '383055', '659674', '643612', '343552']);
  const h = ref.React.createElement;
  const Embed = ref.req('265705').Ay;
  const { fK: createEmbed, nh: mergeEmbeds } = ref.req('659674');
  const media = ref.req('383055');
  const base = data.message ?? { id: '1300000000000000000', channel_id: '1200000000000000000' };
  // The media mosaic expects a message record.
  const message = {
    ...base,
    getChannelId: () => base.channel_id,
    author: { id: '1', bot: false },
    attachments: [],
    embeds: [],
  };
  const embeds = mergeEmbeds(data.embeds.map((embed) => createEmbed(message.channel_id, message.id, embed)));
  const props = data.props ?? {};
  return h(
    ref.React.Fragment,
    null,
    embeds.map((embed, index) =>
      h(Embed, {
        key: embed.id,
        embed,
        obscureReason: props.obscureReason,
        autoPlayGif: props.autoPlayGif ?? false,
        hideMedia: props.hideMedia ?? false,
        allowFullScreen: true,
        onSuppressEmbed: props.canSuppressEmbeds ? () => {} : undefined,
        renderTitle: (embed, title) => title,
        renderDescription: (embed, description) => description,
        message,
        embedIndex: index,
        shouldAgeVerify: props.shouldAgeVerify ?? false,
        renderImageComponent: media.LL,
        renderVideoComponent: (videoProps) => media.$o({ ...videoProps, showPlaybackSpeedControl: true }),
        renderLinkComponent: media.bU,
      }),
    ),
  );
};
