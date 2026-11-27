// The client's URL hygiene for markdown links: stripping invisible characters, folding look-alike characters,
// re-encoding characters that could disguise a URL, and detecting Discord links (invites, channel links…) so a
// masked link can't hide one behind different text.

const INVISIBLE_EXTRA = ['\u034F', '\u17B4', '\u17B5', '\u1160', '\u3164', '\uFFA0'];
const INVISIBLE_RE = new RegExp(
  `${/\p{Cf}|\p{Zl}|\p{Zp}|[^\P{Cc}\n]|[^\P{Zs} ]/gu.source}|${INVISIBLE_EXTRA.join('|')}`,
  'gu',
);

const homoglyphs = (characters: string[]) => new RegExp(characters.join('|'), 'gu');

const HOMOGLYPHS = [
  {
    character: 'h',
    matcher: homoglyphs([
      'H',
      '\u04BB',
      '\u0570',
      '\u13C2',
      '\u210E',
      '\uD835\uDC21',
      '\uD835\uDC89',
      '\uD835\uDCBD',
      '\uD835\uDCF1',
      '\uD835\uDD25',
      '\uD835\uDD59',
      '\uD835\uDD8D',
      '\uD835\uDDC1',
      '\uD835\uDDF5',
      '\uD835\uDE29',
      '\uD835\uDE5D',
      '\uD835\uDE91',
      '\uFF48',
    ]),
  },
  {
    character: 't',
    matcher: homoglyphs([
      'T',
      '\uD835\uDC2D',
      '\uD835\uDC61',
      '\uD835\uDC95',
      '\uD835\uDCC9',
      '\uD835\uDCFD',
      '\uD835\uDD31',
      '\uD835\uDD65',
      '\uD835\uDD99',
      '\uD835\uDDCD',
      '\uD835\uDE01',
      '\uD835\uDE35',
      '\uD835\uDE69',
      '\uD835\uDE9D',
    ]),
  },
  {
    character: 'p',
    matcher: homoglyphs([
      'P',
      '\u03C1',
      '\u03F1',
      '\u0440',
      '\u2374',
      '\u2CA3',
      '\uD835\uDC29',
      '\uD835\uDC5D',
      '\uD835\uDC91',
      '\uD835\uDCC5',
      '\uD835\uDCF9',
      '\uD835\uDD2D',
      '\uD835\uDD61',
      '\uD835\uDD95',
      '\uD835\uDDC9',
      '\uD835\uDDFD',
      '\uD835\uDE31',
      '\uD835\uDE65',
      '\uD835\uDE99',
      '\uD835\uDED2',
      '\uD835\uDEE0',
      '\uD835\uDF0C',
      '\uD835\uDF1A',
      '\uD835\uDF46',
      '\uD835\uDF54',
      '\uD835\uDF80',
      '\uD835\uDF8E',
      '\uD835\uDFBA',
      '\uD835\uDFC8',
      '\uFF50',
      '\u048F',
    ]),
  },
  {
    character: 's',
    matcher: homoglyphs([
      'S',
      '\u01BD',
      '\u0455',
      '\uA731',
      '\uABAA',
      '\uD801\uDC48',
      '\uD806\uDCC1',
      '\uD835\uDC2C',
      '\uD835\uDC60',
      '\uD835\uDC94',
      '\uD835\uDCC8',
      '\uD835\uDCFC',
      '\uD835\uDD30',
      '\uD835\uDD64',
      '\uD835\uDD98',
      '\uD835\uDDCC',
      '\uD835\uDE00',
      '\uD835\uDE34',
      '\uD835\uDE68',
      '\uD835\uDE9C',
      '\uFF53',
    ]),
  },
  {
    character: ':',
    matcher: homoglyphs([
      '\u02D0',
      '\u02F8',
      '\u0589',
      '\u05C3',
      '\u0703',
      '\u0704',
      '\u0903',
      '\u0A83',
      '\u16EC',
      '\u1803',
      '\u1809',
      '\u205A',
      '\u2236',
      '\uA4FD',
      '\uA789',
      '\uFE30',
      '\uFF1A',
      ';',
      '\u037E',
    ]),
  },
  {
    character: '/',
    matcher: homoglyphs([
      '\u1735',
      '\u2041',
      '\u2044',
      '\u2215',
      '\u2571',
      '\u27CB',
      '\u29F8',
      '\u2CC6',
      '\u2F03',
      '\u3033',
      '\u30CE',
      '\u31D3',
      '\u4E3F',
      '\uD834\uDE3A',
    ]),
  },
];

/** Removes invisible and control characters (newlines stay). */
export const stripInvisibleCharacters = (text: string) => text.replace(INVISIBLE_RE, '');

/** Replaces characters that look like `h`, `t`, `p`, `s`, `:` and `/` with them. */
export const foldHomoglyphs = (text: string) => {
  let result = text;
  HOMOGLYPHS.forEach(({ character, matcher }) => {
    result = result.replace(matcher, character);
  });
  return result;
};

const safeDecodeURIComponent = (text: string) => {
  try {
    return decodeURIComponent(text);
  } catch {
    return null;
  }
};

const toURLSafe = (url: string, base?: string) => {
  try {
    return new URL(url, base);
  } catch {
    return null;
  }
};

// ASCII characters that may stay decoded in a displayed URL.
const SAFE_ASCII = [
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 1, 0, 1, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
  1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 0,
];

const mustStayEncoded = (code: number) =>
  code >= 0 && code < 128
    ? SAFE_ASCII[code] !== 1
    : code === 8206 ||
      code === 8207 ||
      code === 8234 ||
      code === 8235 ||
      code === 8236 ||
      code === 8237 ||
      code === 8238 ||
      code === 1564 ||
      code === 8294 ||
      code === 8295 ||
      code === 8296 ||
      code === 8297 ||
      code === 128271 ||
      code === 128272 ||
      code === 128274 ||
      code === 128275 ||
      code === 133 ||
      code === 160 ||
      code === 5760 ||
      (code >= 8192 && code <= 8202) ||
      code === 8232 ||
      code === 8233 ||
      code === 8239 ||
      code === 8287 ||
      code === 12288 ||
      code === 10240 ||
      code === 173 ||
      code === 847 ||
      (code >= 1536 && code <= 1541) ||
      code === 1757 ||
      code === 1807 ||
      code === 2274 ||
      code === 4447 ||
      code === 4448 ||
      code === 6068 ||
      code === 6069 ||
      (code >= 6155 && code <= 6158) ||
      (code >= 8203 && code <= 8205) ||
      (code >= 8288 && code <= 8293) ||
      (code >= 8298 && code <= 8303) ||
      code === 12644 ||
      (code >= 65520 && code <= 65528) ||
      (code >= 65024 && code <= 65039) ||
      code === 65279 ||
      code === 65440 ||
      code === 65529 ||
      code === 65530 ||
      code === 65531 ||
      code === 69821 ||
      code === 69837 ||
      (code >= 78896 && code <= 78904) ||
      (code >= 113824 && code <= 113827) ||
      (code >= 119155 && code <= 119162) ||
      (code >= 917504 && code <= 921599);

// Decodes percent-escapes for display, except characters that could disguise the URL.
const decodeForDisplay = (encoded: string) => {
  const decoded = safeDecodeURIComponent(encoded);
  if (decoded == null) return encoded;
  let result = '';
  let rest = encoded;
  let restDecoded = decoded;
  while (rest.length > 0) {
    const raw = rest.codePointAt(0)!;
    const code = restDecoded.codePointAt(0)!;
    if (raw === code) {
      const char = String.fromCodePoint(raw);
      result += char;
      rest = rest.substring(char.length);
      restDecoded = restDecoded.substring(char.length);
      continue;
    }
    const char = String.fromCodePoint(code);
    const reencoded = encodeURIComponent(char);
    const consumed = reencoded === char ? 3 : reencoded.length;
    result += mustStayEncoded(code) ? reencoded : char;
    rest = rest.substring(consumed);
    restDecoded = restDecoded.substring(char.length);
  }
  return result;
};

const formatURL = (url: URL) => {
  let origin: string;
  if (url.origin === 'null' && url.pathname.startsWith('//')) origin = url.protocol;
  else {
    let auth = '';
    if (url.username !== '') auth += url.username;
    if (url.password !== '') auth += ':' + url.password;
    if (auth !== '') auth += '@';
    const slashes = url.href.substr(url.protocol.length, 2) === '//';
    origin = `${url.protocol}${slashes ? '//' : ''}${auth}${url.host}`;
  }
  return origin + decodeForDisplay(url.pathname) + decodeForDisplay(url.search) + decodeForDisplay(url.hash);
};

// Discord's hosts and the paths it recognizes as invites, channel links and other in-app links.
const INVITE_HOST = { host: 'discord.gg', pathPrefix: null };
const TEMPLATE_HOST = { host: 'discord.new', pathPrefix: null };
const PRIMARY_HOSTS = [
  { host: 'discord.com', pathPrefix: null },
  { host: 'canary.discord.com', pathPrefix: null },
  { host: 'ptb.discord.com', pathPrefix: null },
  { host: 'discordapp.com', pathPrefix: null },
  { host: 'discord.com', pathPrefix: null },
];
type Host = { host: string; pathPrefix: string | null };

const escapeRegExp = (text: string) => text.replace(/[\\^$.*+?()[\]{}|]/g, '\\$&');
const BARE_HOST_RE = new RegExp(
  `((https?://[^ ]*)|^|\\s)(${[INVITE_HOST, TEMPLATE_HOST, PRIMARY_HOSTS[1], PRIMARY_HOSTS[3], PRIMARY_HOSTS[0]]
    .map((h) => escapeRegExp(h.host))
    .join('|')})`,
  'g',
);
const IPV4 = '(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)(?:\\.(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)){3}';
const URL_RE = new RegExp(
  `(?:(?:(?:https?:)?//)|www\\.)(?:[^\\s:@]+(?::[^\\s@]*)?@)?(?:localhost|${IPV4}|(?:[a-z\\u00a1-\\uffff0-9-_]+\\.)+(?:(?:[a-z\\u00a1-\\uffff]{2,})))(?::\\d{2,5})?(?:[/?#][^\\s"()\\[\\]<>]*)?`,
  'ig',
);
const CODE_RE = /`{3,}[\s\S]*?(?:`{3,}|$)|(`{1,2})[^`]+\1(?!`)/g;
const TRAILING_PUNCTUATION_RE = /[.,;:?'*_~|]+$/;
const DEV_LINK_RE = /dev:\/\/[\w-.~:/?#[\]@!$&'()*+,;=%]+/i;

const CODE_PATH_RE = /^\/([a-zA-Z0-9-]+)$/;
const CHANNEL_PATH_RE = /^\/channels\/([0-9]+|@me)\/([0-9]+)$/;
const INVITE_PATH_RE = /^\/(invite|template)\/([a-zA-Z0-9-]+)\/?\.?$/;
const EVENT_PATH_RE = /^\/events\/(\d+)(?:\/)(\d+)?((?:\/)(\d+))?/;
const APP_DIRECTORY_RE =
  /^\/(application-directory|discovery\/applications)\/([0-9-]+)\/?((about|images|privacy)\/?)?$/;
const APP_STOREFRONT_RE = /^\/(application-directory|discovery\/applications)\/([0-9-]+)\/store\/?([0-9-]+)?\/?$/;
const ACTIVITY_RE = /^\/activities\/([0-9-]+)\/?$/;
const GUILD_PRODUCT_RE = /^\/channels\/([0-9]+)\/shop\/([0-9]+)$/;
const GAME_SHOP_RE =
  /^(?:\/game-shop\/([0-9]+)(?:\/([0-9]+)(?:\/[^/]+)?)?|\/channels\/([0-9]+)\/game-shop(?:\/([0-9]+)(?:\/([0-9]+)(?:\/[^/]+)?)?)?)\/?$/;
const SERVER_SHOP_RE = /^\/channels\/([0-9]+)\/shop$/;
const QUEST_RE = /^\/quests\/([0-9-]+)\/?$/;
const GAME_SERVER_SHARE_RE = /^\/game-servers\/share\/([A-Za-z0-9_-]+)$/;
const GAME_ORGANIZATION_INVITE_RE = /^\/game-organizations\/invite\/([A-Za-z0-9_-]+)\/?$/;
const GAME_PROFILE_RE = /^\/games\/([0-9]+)(?:\/[A-Za-z0-9-]*)?\/?$/;
const USER_PROFILE_RE = /^\/users\/([0-9]+)\/?$/;
const OAUTH2_RE = /^\/oauth2\/authorize/;

const parseURL = (url: string) => {
  const parsed = toURLSafe(url);
  // Like the legacy url parser the client uses, a protocol-relative or bare URL has no host.
  if (parsed == null || !/^[a-z][a-z0-9+.-]*:\/\//i.test(url)) return null;
  return parsed;
};

const sameHost = (host: Host, url: URL) => url.host.replace(/^www[.]/i, '') === host.host;

const remainingPath = (host: Host, url: URL) => {
  if (!sameHost(host, url)) return null;
  const path = url.pathname ?? '';
  const prefix = host.pathPrefix ?? '';
  if (!path.startsWith(prefix)) return null;
  const rest = path.substring(prefix.length);
  return rest === '' ? null : rest;
};

const primaryRemainingPath = (url: URL) => {
  for (const host of PRIMARY_HOSTS) {
    const rest = remainingPath(host, url);
    if (rest != null) return rest;
  }
  return null;
};

/** Whether a URL with backslashes points at an invite (backslashes can trick some URL parsers). */
export const isSuspiciousInviteURL = (url: string) => {
  if (!url.includes('\\')) return false;
  const parsed = parseURL(url);
  if (parsed == null) return false;
  if (sameHost(INVITE_HOST, parsed)) return true;
  if (PRIMARY_HOSTS.some((host) => sameHost(host, parsed))) return parsed.pathname.toUpperCase().includes('INVITE');
  return false;
};

/** Whether the text contains a link the client treats specially (invites, templates, channel links, events…). */
export const containsDiscordLinks = (text: string | null | undefined) => {
  if (text == null) return false;
  const withSchemes = text.replace(BARE_HOST_RE, (match, prefix, url, host) =>
    url == null ? `${prefix}http://${host}` : match,
  );
  const urls = (withSchemes.replaceAll(CODE_RE, ' ').match(URL_RE) ?? []).map((url) =>
    url.replace(TRAILING_PUNCTUATION_RE, ''),
  );
  const devLinks = withSchemes.match(DEV_LINK_RE) ?? [];
  for (const raw of [...urls, ...devLinks]) {
    const url = parseURL(raw);
    if (url == null) continue;
    const inviteRest = remainingPath(INVITE_HOST, url);
    const templateRest = remainingPath(TEMPLATE_HOST, url);
    const primaryRest = primaryRemainingPath(url);
    const query = url.search.length > 1 && url.search.length <= 1001 ? url.search.slice(1) : null;
    if (inviteRest?.match(CODE_PATH_RE) != null && (url.protocol === 'https:' || url.protocol === 'http:')) {
      if (!raw.includes('\\')) return true;
      continue;
    }
    if (templateRest?.match(CODE_PATH_RE) != null) return true;
    const invite = primaryRest?.match(INVITE_PATH_RE);
    if (invite != null) {
      if (invite[1].toUpperCase() === 'INVITE' && raw.includes('\\')) continue;
      return true;
    }
    if (primaryRest?.match(CHANNEL_PATH_RE) != null) return true;
    const event = url.pathname.match(EVENT_PATH_RE);
    if (event != null && event[2] != null) return true;
    if (primaryRest?.match(OAUTH2_RE) != null && query != null) {
      const params = new URLSearchParams(query);
      const clientId = params.get('client_id');
      const scopes = params.get('scope')?.split(' ') ?? [];
      if (clientId != null && clientId !== '' && !scopes.some((scope) => scope !== 'applications.commands'))
        return true;
    }
    if (
      primaryRest != null &&
      [
        APP_DIRECTORY_RE,
        APP_STOREFRONT_RE,
        ACTIVITY_RE,
        GUILD_PRODUCT_RE,
        SERVER_SHOP_RE,
        QUEST_RE,
        GAME_PROFILE_RE,
        GAME_SERVER_SHARE_RE,
        GAME_ORGANIZATION_INVITE_RE,
        USER_PROFILE_RE,
      ].some((re) => re.test(primaryRest))
    )
      return true;
    const gameShop = primaryRest?.match(GAME_SHOP_RE);
    if (gameShop != null && (gameShop[3] == null || gameShop[4] != null)) {
      const params = query != null ? new URLSearchParams(query) : null;
      if (gameShop[2] ?? gameShop[5] ?? params?.get('skuIds')) return true;
    }
    if (primaryRest === '/shop') return true;
  }
  return false;
};

const SANITIZE_CACHE = new Map<string, { whitespaceSanitized: string; fullySanitized: string }>();

/** The text with invisible characters removed, and additionally with look-alike characters folded. */
export const sanitizeLinkText = (text: string) => {
  const cached = SANITIZE_CACHE.get(text);
  if (cached != null) return cached;
  const whitespaceSanitized = stripInvisibleCharacters(text);
  const result = { whitespaceSanitized, fullySanitized: foldHomoglyphs(whitespaceSanitized) };
  if (SANITIZE_CACHE.size >= 50) SANITIZE_CACHE.delete(SANITIZE_CACHE.keys().next().value!);
  SANITIZE_CACHE.set(text, result);
  return result;
};

const ALLOWED_PROTOCOLS = ['http:', 'https:', 'discord:', 'tel:', 'sms:', 'mailto:'];

/** Whether the URL could mislead: invisible characters, backslash invites, or an encoded host. */
export const isSuspiciousURL = (url: string) => {
  if (isSuspiciousInviteURL(url) || sanitizeLinkText(url).whitespaceSanitized !== url) return true;
  const parsed = toURLSafe(url);
  if (parsed == null) return true;
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
  const parts = url.split('/');
  return parts.length < 3 || parts[1] !== '' || safeDecodeURIComponent(parts[2]) !== parts[2];
};

/**
 * Validates a link target like the client: only some protocols, no misleading characters. Returns the URL to
 * open and the URL to display (without credentials), or null.
 */
export const validateLinkTarget = (url: string) => {
  try {
    if (isSuspiciousURL(url)) throw new Error('Rejected due to suspicious characters in URL: ' + JSON.stringify(url));
    const parsed = new URL(url);
    const protocol = parsed.protocol ?? '';
    if (!ALLOWED_PROTOCOLS.includes(protocol.toLowerCase())) throw new Error('Provided protocol is not allowed');
    if ((protocol === 'http:' || protocol === 'https:') && (parsed.hostname == null || parsed.hostname.length === 0))
      throw new Error('no hostname');
    const target = formatURL(parsed);
    parsed.username = '';
    parsed.password = '';
    return { target, displayTarget: formatURL(parsed) };
  } catch {
    return null;
  }
};

const primaryPathOf = (url: string) => {
  const parsed = parseURL(url);
  return parsed == null ? null : primaryRemainingPath(parsed);
};

/** Whether the URL is a quest link (shown as an embed instead of text when it's all the message has). */
export const containsQuestLink = (url: string) => primaryPathOf(url)?.match(QUEST_RE) != null;

/** Whether the URL shares a game server (always shown as an embed). */
export const containsGameServerShareLink = (url: string) => primaryPathOf(url)?.match(GAME_SERVER_SHARE_RE) != null;
