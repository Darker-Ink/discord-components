import clsx from 'clsx';
import { ButtonColors, ButtonSizes, LegacyButton, LoadingDots } from '@discord-components/components';
import { ShopIcon, WindowLaunchIcon } from '@discord-components/icons';
import { Emoji } from '../Emoji/Emoji';
import { useMessageI18n } from '../Message/messageI18n';
import { useMessageActions } from './MessageActions';
import { ComponentVisualState, useComponentState } from './ComponentState';
import { ButtonStyle, type ButtonComponent } from './types';
import styles from './ComponentButton.module.css';

const getButtonColor = (style: ButtonStyle) => {
  switch (style) {
    case ButtonStyle.Primary:
    case ButtonStyle.Premium:
      return ButtonColors.BRAND;
    case ButtonStyle.Success:
      return ButtonColors.GREEN;
    case ButtonStyle.Danger:
      return ButtonColors.RED;
    default:
      return ButtonColors.PRIMARY;
  }
};

/** Store data of a premium button's SKU (the client fetches it from the app's storefront). */
export interface ComponentButtonSKU {
  name: string;
  available?: boolean;
  /** Smallest currency unit, e.g. cents. */
  price?: { amount: number; currency: string } | null;
}

const formatPrice = (amount: number, currency: string) =>
  new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount / 100);

/** A message component button: the legacy small button with the component's label, emoji and link icon. */
export const ComponentButton = (component: ButtonComponent) => {
  const { label, style, disabled = false, emoji, url, skuId } = component;
  const { executeStateUpdate, visualState, isDisabled } = useComponentState(component);
  const i18n = useMessageI18n();
  const actions = useMessageActions();
  const isPremium = skuId != null && style === ButtonStyle.Premium;
  const sku = isPremium ? actions.resolveSKU?.(skuId) : undefined;
  const premium = (() => {
    if (!isPremium || sku == null) return undefined;
    if (sku.available === false || sku.price == null) return { disabled: true, label: i18n.PRODUCT_UNAVAILABLE };
    return { disabled: false, label: i18n.PRODUCT_PRICE(sku.name, formatPrice(sku.price.amount, sku.price.currency)) };
  })();
  const premiumDisabled = isPremium && premium?.disabled;
  const text = isPremium ? premium?.label : label;
  const hasEmoji = emoji != null;
  const hasLabel = text != null && text.length > 0;
  const isLink = style === ButtonStyle.Link && url != null && url.length > 0;
  // Premium buttons load their SKU before they show a label.
  const loading = visualState === ComponentVisualState.LOADING || (isPremium && premium == null);
  const onClick = isLink
    ? () => actions.openLink(url ?? '')
    : isPremium
      ? premium != null && !premium.disabled
        ? () => actions.openSKU?.(skuId)
        : undefined
      : () => executeStateUpdate(null);
  return (
    <LegacyButton
      data-migration-pending
      color={getButtonColor(style)}
      size={ButtonSizes.SMALL}
      disabled={disabled || visualState === ComponentVisualState.DISABLED || isDisabled || premiumDisabled}
      onClick={onClick}
      onContextMenu={isLink ? (event) => actions.onLinkContextMenu?.(event, url ?? '') : undefined}
      role={isLink ? 'link' : 'button'}
    >
      <div
        className={clsx(styles.content, { [styles.hidden]: loading, [styles.premium]: isPremium })}
        aria-hidden={loading}
      >
        {isPremium ? (
          <div className={styles.shopIcon}>
            <ShopIcon size="xs" color="white" />
          </div>
        ) : null}
        {hasEmoji ? (
          <Emoji
            className={clsx({ [styles.textEmoji]: hasLabel })}
            src={emoji.src}
            emojiId={emoji.id}
            emojiName={emoji.name}
            animated={emoji.animated}
          />
        ) : null}
        {hasLabel ? <div className={styles.label}>{text}</div> : null}
        {isLink ? <WindowLaunchIcon size="xs" color="currentColor" className={styles.launchIcon} /> : null}
      </div>
      {loading ? (
        <div className={styles.loading}>
          <LoadingDots dotRadius={3.5} themed />
        </div>
      ) : null}
    </LegacyButton>
  );
};

ComponentButton.displayName = 'ComponentButton';
