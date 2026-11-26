// Opens an interaction modal the way the client does when an app responds with a modal (module 121338,
// `openInteractionModal`): the API modal's components become component records (257249 ZV) and the modal
// gets the app (name, icon), the channel it was opened in and the interaction id. The modal renders into the
// app's modal layer, so fixtures compare the viewport and the layer's DOM. The client's stores are patched like
// the message fixtures: the channel store returns the fixture's channel (file uploads need it).
async (ref, data) => {
  await ref.boot(['486020', '121338', '257249', '95701', '734057', '46054']);
  const h = ref.React.createElement;
  const req = ref.req;
  const { createChannelRecord } = req('95701');
  const channel = createChannelRecord(
    data.channel ?? { id: '1200000000000000000', type: 0, guild_id: '1100000000000000000', name: 'general' },
  );
  const ChannelStore = req('734057').A;
  const getChannel = ChannelStore.getChannel.bind(ChannelStore);
  ChannelStore.getChannel = (id) => (id === channel.id ? channel : getChannel(id));
  ChannelStore.getBasicChannel = ChannelStore.getChannel;
  // Text Displays show their raw text (markdown is out of scope).
  req('46054').A.parse = (text) => text;
  const { ZV: createComponents } = req('257249');
  const { openInteractionModal } = req('121338');
  const application = data.application ?? { id: '1000000000000000002', name: 'Helper', icon: null };
  // The app icon comes from the fixture's assets instead of the CDN.
  if (application.icon_url != null) {
    const icons = req('486020').Ay;
    icons.getApplicationIconURL = () => application.icon_url;
  }
  openInteractionModal({
    id: '1300000000000000005',
    channelId: channel.id,
    application,
    customId: data.modal.custom_id,
    title: data.modal.title,
    components: createComponents(data.modal.components),
  });
  return h('div', null);
};
