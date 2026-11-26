import clsx from 'clsx';
import { Text } from '../Text';
import styles from './ToastEntity.module.css';

// Something a toast is about, shown in place of its icon.
export type ToastEntity =
  | { type: 'emoji'; unicode: string }
  | { type: 'emoji'; src: string; alt?: string }
  | { type: 'avatar'; src: string; alt?: string }
  | { type: 'guild'; src: string | null; name: string }
  | { type: 'image'; src: string; alt?: string };

export const isToastEntity = (value: unknown): value is ToastEntity =>
  typeof value === 'object' && value != null && 'type' in value && typeof value.type === 'string';

// A server's initials, as on its icon when it has no image.
export const getAcronym = (name: string | null | undefined) =>
  name != null
    ? name
        .replace(/'s /g, ' ')
        .replace(/\w+/g, (word) => word[0])
        .replace(/\s/g, '')
    : '';

const acronymTextProps = (acronym: string) => {
  if (acronym.length <= 1) return { variant: 'body-xs/normal' } as const;
  if (acronym.length <= 4) return { variant: 'footnote/normal' } as const;
  if (acronym.length === 5) return { variant: 'footnote/normal', style: { fontSize: 7 } } as const;
  return { variant: 'footnote/normal', style: { fontSize: 5 } } as const;
};

const ToastEntityContent = ({ entity }: { entity: ToastEntity }) => {
  switch (entity.type) {
    case 'emoji':
      if ('unicode' in entity)
        return (
          <Text variant="body-lg/normal" color="text-default" tag="span" lineClamp={1}>
            {entity.unicode}
          </Text>
        );
      return <img className={styles.image} src={entity.src} alt={entity.alt ?? ''} draggable={false} />;
    case 'avatar':
      return <img className={styles.image} src={entity.src} alt={entity.alt ?? ''} draggable={false} />;
    case 'guild': {
      if (entity.src == null) {
        const acronym = getAcronym(entity.name);
        return (
          <Text {...acronymTextProps(acronym)} color="text-default" tag="span" lineClamp={1}>
            {acronym}
          </Text>
        );
      }
      return <img className={styles.image} src={entity.src} alt={entity.name} draggable={false} />;
    }
    case 'image':
      return (
        <img
          className={clsx(styles.image, styles.imageContain)}
          src={entity.src}
          alt={entity.alt ?? ''}
          draggable={false}
        />
      );
  }
};

ToastEntityContent.displayName = 'ToastEntityContent';

export const ToastEntityIcon = ({ entity, className }: { entity: ToastEntity; className?: string }) => (
  <span
    className={clsx(
      styles.entity,
      {
        [styles.avatar]: entity.type === 'avatar',
        [styles.guild]: entity.type === 'guild',
        [styles.guildAcronym]: entity.type === 'guild' && entity.src == null,
      },
      className,
    )}
    aria-hidden
  >
    <ToastEntityContent entity={entity} />
  </span>
);

ToastEntityIcon.displayName = 'ToastEntityIcon';
