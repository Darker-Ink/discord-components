export default {
  fetch: (request: Request) => {
    const url = new URL(request.url);
    url.hostname = 'discord-mana.dev';
    return Response.redirect(url.toString(), 301);
  },
};
