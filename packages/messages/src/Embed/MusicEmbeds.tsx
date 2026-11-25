import clsx from 'clsx';
import { isThemeDark, useManaContext } from '@discord-components/components';
import { EmbedType, type MessageEmbed } from './types';
import styles from './Embed.module.css';
import playStationStyles from './PlayStationEmbed.module.css';

const IFRAME_SANDBOX =
  'allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts';

const parseUrl = (url: string) => {
  try {
    return new URL(url);
  } catch {
    return null;
  }
};

interface MusicEmbedProps {
  embed: MessageEmbed;
  className?: string;
}

// Apple Music

const isAppleMusicHost = (host: string | null | undefined) => host === 'music.apple.com';

export const isAppleMusicEmbed = (embed: MessageEmbed) =>
  embed.url != null &&
  embed.provider?.name === 'Apple Music' &&
  (embed.type === EmbedType.Article || embed.type === EmbedType.Link) &&
  isAppleMusicHost(parseUrl(embed.url)?.host);

export const AppleMusicEmbed = ({ className, embed: { url } }: MusicEmbedProps) => {
  const { theme } = useManaContext();
  if (url == null) return null;
  const parsed = parseUrl(url);
  if (parsed == null || !isAppleMusicHost(parsed.host)) return null;
  let path = parsed.pathname;
  const songId = parsed.searchParams.get('i');
  // Paths start with a storefront ("/us/album/…") and sometimes a language ("/us-en/…").
  const typeIndex = /^\/([a-z]{2}(?:-[a-z]{2})?)\//.test(path) ? 2 : 1;
  let type = path.split('/')[typeIndex]?.toLowerCase();
  if (songId != null) type = 'song';
  const height = type === 'song' ? 175 : type === 'music-video' ? 371 : 450;
  path = path.substring(1);
  return (
    <iframe
      className={clsx(styles.embedAppleMusic, className)}
      src={`https://embed.music.apple.com/${path}?theme=${isThemeDark(theme) ? 'dark' : 'light'}&i=${songId != null ? encodeURIComponent(songId) : ''}`}
      style={{ maxWidth: 660, minWidth: 300, width: '100%', height }}
      frameBorder={0}
      sandbox="allow-forms allow-popups allow-same-origin allow-scripts allow-storage-access-by-user-activation"
      allow="encrypted-media *; fullscreen *; clipboard-write"
    />
  );
};

AppleMusicEmbed.displayName = 'AppleMusicEmbed';

// Amazon Music

const AMAZON_MUSIC_HOST = /^music\.amazon\.(?:com|co\.uk|de|co\.jp|es|fr|it|com\.au|in|ca|com\.mx|com\.br)/;

const parseAmazonMusicUrl = (url: string) => {
  const parsed = parseUrl(url);
  return parsed != null && AMAZON_MUSIC_HOST.test(parsed.host) ? parsed : null;
};

export const AmazonMusicEmbed = ({ className, embed: { url, thumbnail } }: MusicEmbedProps) => {
  if (url == null || thumbnail == null) return null;
  const parsed = parseAmazonMusicUrl(url);
  if (parsed == null) return null;
  const iframeUrl = parsed.searchParams.getAll('iframe_url');
  if (iframeUrl.length !== 1 || parseAmazonMusicUrl(iframeUrl[0]) == null) return null;
  const { width, height } = thumbnail;
  let frameWidth = width;
  let frameHeight = height;
  if (width > 500 || height > 400) {
    if (width > height) {
      frameWidth = 500;
      frameHeight = (500 * height) / width;
    } else {
      frameWidth = (400 * width) / height;
      frameHeight = 400;
    }
  }
  return (
    <iframe
      className={clsx(styles.embedAmazonMusic, className)}
      src={iframeUrl[0]}
      style={{ width: frameWidth, height: frameHeight }}
      frameBorder={0}
      sandbox={IFRAME_SANDBOX}
    />
  );
};

AmazonMusicEmbed.displayName = 'AmazonMusicEmbed';

// Spotify

export const SpotifyResourceType = {
  TRACK: 'track',
  ARTIST: 'artist',
  ALBUM: 'album',
  PLAYLIST: 'playlist',
  EPISODE: 'episode',
  SHOW: 'show',
} as const;

export type SpotifyResourceType = (typeof SpotifyResourceType)[keyof typeof SpotifyResourceType];

const SPOTIFY_EMBED_HEIGHTS: Record<SpotifyResourceType, number> = {
  track: 80,
  episode: 232,
  show: 232,
  album: 352,
  artist: 352,
  playlist: 352,
};

const toSpotifyResourceType = (value: string | null | undefined) =>
  value != null && Object.values<string>(SpotifyResourceType).includes(value) ? (value as SpotifyResourceType) : null;

export interface SpotifyEmbedPlayerProps {
  className?: string;
  resourceId: string;
  resourceType: SpotifyResourceType;
  onLoad?: () => void;
  allowEncryptedMedia?: boolean;
}

export const SpotifyEmbedPlayer = ({
  className,
  resourceId,
  resourceType,
  onLoad,
  allowEncryptedMedia = false,
}: SpotifyEmbedPlayerProps) =>
  resourceId === '' ? null : (
    <iframe
      className={className ?? undefined}
      src={`https://open.spotify.com/embed/${resourceType}/${resourceId}?utm_source=discord&utm_medium=desktop`}
      style={{ maxWidth: 400, minWidth: 300, width: '100%', height: SPOTIFY_EMBED_HEIGHTS[resourceType] }}
      frameBorder={0}
      sandbox={IFRAME_SANDBOX}
      allow={allowEncryptedMedia ? 'encrypted-media; clipboard-write' : 'clipboard-write'}
      onLoad={onLoad}
      title="Spotify"
    />
  );

SpotifyEmbedPlayer.displayName = 'SpotifyEmbedPlayer';

const parseSpotifyUrl = (url: string) => parseUrl(url.replace(/intl-[^/]+\//, ''));

export const isSpotifyEmbed = (embed: MessageEmbed) =>
  embed.url != null &&
  embed.provider?.name === 'Spotify' &&
  embed.type === EmbedType.Link &&
  parseSpotifyUrl(embed.url)?.host === 'open.spotify.com';

export const SpotifyEmbed = ({ className, embed: { url } }: MusicEmbedProps) => {
  if (url == null) return null;
  const parsed = parseSpotifyUrl(url);
  if (parsed?.host !== 'open.spotify.com') return null;
  const parts = parsed.pathname.split('/');
  const kind = parts[1] != null ? parts[1].toLowerCase() : null;
  const iframeClassName = clsx(styles.embedSpotify, className);
  if (kind === 'user') {
    const userResource = parts[3] != null ? parts[3].toLowerCase() : null;
    const playlistId = parts[4];
    return userResource !== 'playlist' || playlistId == null ? null : (
      <SpotifyEmbedPlayer
        className={iframeClassName}
        resourceType={SpotifyResourceType.PLAYLIST}
        resourceId={playlistId}
      />
    );
  }
  const resourceType = toSpotifyResourceType(kind);
  const resourceId = parts[2];
  return resourceType == null || resourceId == null ? null : (
    <SpotifyEmbedPlayer className={iframeClassName} resourceType={resourceType} resourceId={resourceId} />
  );
};

SpotifyEmbed.displayName = 'SpotifyEmbed';

// PlayStation

const PLAYSTATION_HOSTS = ['sessionshare.sp-int.playstation.com', 'session-share.playstation.com'];

export const PlayStationEmbed = ({ className, embed: { url, provider } }: MusicEmbedProps) => {
  const { locale } = useManaContext();
  if (url == null || provider?.name == null) return null;
  const parsed = parseUrl(url);
  if (parsed == null || provider.name !== 'PlayStation') return null;
  const parts = parsed.pathname.split('/');
  if (!PLAYSTATION_HOSTS.includes(parsed.host) || parts.length !== 2) return null;
  return (
    <iframe
      src={`https://${parsed.host}/embed/${parts[1]}?locale=${locale}`}
      className={clsx(playStationStyles.embedIFrame, className)}
      style={{ width: 400, height: 300, borderRadius: 6 }}
      sandbox={IFRAME_SANDBOX}
    />
  );
};

PlayStationEmbed.displayName = 'PlayStationEmbed';
