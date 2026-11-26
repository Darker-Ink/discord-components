// Ported from Discord's mask library (the SVG <mask> definitions the client renders once at its root).
import { Fragment, memo, useMemo, type CSSProperties, type ReactNode, type SVGProps } from 'react';
import { jsx, jsxs } from 'react/jsx-runtime';
import clsx from 'clsx';
import { AvatarSizes, getAvatarSpecs, type AvatarSize, type AvatarSpecs } from '../Avatar/avatarSizes';
import { registerMasks, useRegisteredMaskIds, useRegisterMask } from './maskRegistry';
import styles from './Mask.module.css';

export const MaskIDs = {
  SQUIRCLE: 'svg-mask-squircle',
  NOTCHED_SQUIRCLE_16: 'svg-mask-notched-squircle-16',
  NOTCHED_SQUIRCLE_20: 'svg-mask-notched-squircle-20',
  NOTCHED_SQUIRCLE_24: 'svg-mask-notched-squircle-24',
  HEADER_BAR_BADGE_TOP: 'svg-mask-header-bar-badge-top',
  HEADER_BAR_BADGE_BOTTOM: 'svg-mask-header-bar-badge-bottom',
  VOICE_USER_SUMMARY_ITEM: 'svg-mask-voice-user-summary-item',
  VERTICAL_FADE: 'svg-mask-vertical-fade',
  PANEL_BUTTON: 'svg-mask-panel-button',
  CHANNEL_CALL_CONTROL_BUTTON: 'svg-mask-channel-call-control-button',
  CHANNEL_CALL_CONTROL_BUTTON_BADGE_16: 'svg-mask-channel-call-control-button-badge-16',
  CHANNEL_CALL_CONTROL_BUTTON_BADGE_22: 'svg-mask-channel-call-control-button-badge-22',
  CHANNEL_CALL_CONTROL_BUTTON_BADGE_29: 'svg-mask-channel-call-control-button-badge-29',
  AVATAR_DEFAULT: 'svg-mask-avatar-default',
  AVATAR_STATUS_ROUND_16: 'svg-mask-avatar-status-round-16',
  AVATAR_STATUS_ROUND_20: 'svg-mask-avatar-status-round-20',
  AVATAR_STATUS_ROUND_24: 'svg-mask-avatar-status-round-24',
  AVATAR_STATUS_ROUND_32: 'svg-mask-avatar-status-round-32',
  AVATAR_STATUS_ROUND_40: 'svg-mask-avatar-status-round-40',
  AVATAR_STATUS_ROUND_44: 'svg-mask-avatar-status-round-44',
  AVATAR_STATUS_ROUND_48: 'svg-mask-avatar-status-round-48',
  AVATAR_STATUS_ROUND_56: 'svg-mask-avatar-status-round-56',
  AVATAR_STATUS_ROUND_72: 'svg-mask-avatar-status-round-72',
  AVATAR_STATUS_ROUND_80: 'svg-mask-avatar-status-round-80',
  AVATAR_STATUS_ROUND_96: 'svg-mask-avatar-status-round-96',
  AVATAR_STATUS_ROUND_100: 'svg-mask-avatar-status-round-100',
  AVATAR_STATUS_ROUND_120: 'svg-mask-avatar-status-round-120',
  DIAGONAL_FACEPILE_16: 'svg-mask-diagonal-facepile-16',
  DIAGONAL_FACEPILE_20: 'svg-mask-diagonal-facepile-20',
  DIAGONAL_FACEPILE_24: 'svg-mask-diagonal-facepile-24',
  DIAGONAL_FACEPILE_32: 'svg-mask-diagonal-facepile-32',
  DIAGONAL_FACEPILE_40: 'svg-mask-diagonal-facepile-40',
  DIAGONAL_FACEPILE_44: 'svg-mask-diagonal-facepile-44',
  DIAGONAL_FACEPILE_48: 'svg-mask-diagonal-facepile-48',
  DIAGONAL_FACEPILE_56: 'svg-mask-diagonal-facepile-56',
  DIAGONAL_FACEPILE_72: 'svg-mask-diagonal-facepile-72',
  DIAGONAL_FACEPILE_80: 'svg-mask-diagonal-facepile-80',
  DIAGONAL_FACEPILE_96: 'svg-mask-diagonal-facepile-96',
  DIAGONAL_FACEPILE_100: 'svg-mask-diagonal-facepile-100',
  DIAGONAL_FACEPILE_120: 'svg-mask-diagonal-facepile-120',
  DIAGONAL_FACEPILE_BACK_16: 'svg-mask-diagonal-facepile-back-16',
  DIAGONAL_FACEPILE_BACK_20: 'svg-mask-diagonal-facepile-back-20',
  DIAGONAL_FACEPILE_BACK_24: 'svg-mask-diagonal-facepile-back-24',
  DIAGONAL_FACEPILE_BACK_32: 'svg-mask-diagonal-facepile-back-32',
  DIAGONAL_FACEPILE_BACK_40: 'svg-mask-diagonal-facepile-back-40',
  DIAGONAL_FACEPILE_BACK_44: 'svg-mask-diagonal-facepile-back-44',
  DIAGONAL_FACEPILE_BACK_48: 'svg-mask-diagonal-facepile-back-48',
  DIAGONAL_FACEPILE_BACK_56: 'svg-mask-diagonal-facepile-back-56',
  DIAGONAL_FACEPILE_BACK_72: 'svg-mask-diagonal-facepile-back-72',
  DIAGONAL_FACEPILE_BACK_80: 'svg-mask-diagonal-facepile-back-80',
  DIAGONAL_FACEPILE_BACK_96: 'svg-mask-diagonal-facepile-back-96',
  DIAGONAL_FACEPILE_BACK_100: 'svg-mask-diagonal-facepile-back-100',
  DIAGONAL_FACEPILE_BACK_120: 'svg-mask-diagonal-facepile-back-120',
  DIAGONAL_FACEPILE_STATUS_16: 'svg-mask-diagonal-facepile-status-16',
  DIAGONAL_FACEPILE_STATUS_20: 'svg-mask-diagonal-facepile-status-20',
  DIAGONAL_FACEPILE_STATUS_24: 'svg-mask-diagonal-facepile-status-24',
  DIAGONAL_FACEPILE_STATUS_32: 'svg-mask-diagonal-facepile-status-32',
  DIAGONAL_FACEPILE_STATUS_40: 'svg-mask-diagonal-facepile-status-40',
  DIAGONAL_FACEPILE_STATUS_44: 'svg-mask-diagonal-facepile-status-44',
  DIAGONAL_FACEPILE_STATUS_48: 'svg-mask-diagonal-facepile-status-48',
  DIAGONAL_FACEPILE_STATUS_56: 'svg-mask-diagonal-facepile-status-56',
  DIAGONAL_FACEPILE_STATUS_72: 'svg-mask-diagonal-facepile-status-72',
  DIAGONAL_FACEPILE_STATUS_80: 'svg-mask-diagonal-facepile-status-80',
  DIAGONAL_FACEPILE_STATUS_96: 'svg-mask-diagonal-facepile-status-96',
  DIAGONAL_FACEPILE_STATUS_100: 'svg-mask-diagonal-facepile-status-100',
  DIAGONAL_FACEPILE_STATUS_120: 'svg-mask-diagonal-facepile-status-120',
  DIAGONAL_FACEPILE_TYPING_16: 'svg-mask-diagonal-facepile-typing-16',
  DIAGONAL_FACEPILE_TYPING_20: 'svg-mask-diagonal-facepile-typing-20',
  DIAGONAL_FACEPILE_TYPING_24: 'svg-mask-diagonal-facepile-typing-24',
  DIAGONAL_FACEPILE_TYPING_32: 'svg-mask-diagonal-facepile-typing-32',
  DIAGONAL_FACEPILE_TYPING_40: 'svg-mask-diagonal-facepile-typing-40',
  DIAGONAL_FACEPILE_TYPING_44: 'svg-mask-diagonal-facepile-typing-44',
  DIAGONAL_FACEPILE_TYPING_48: 'svg-mask-diagonal-facepile-typing-48',
  DIAGONAL_FACEPILE_TYPING_56: 'svg-mask-diagonal-facepile-typing-56',
  DIAGONAL_FACEPILE_TYPING_72: 'svg-mask-diagonal-facepile-typing-72',
  DIAGONAL_FACEPILE_TYPING_80: 'svg-mask-diagonal-facepile-typing-80',
  DIAGONAL_FACEPILE_TYPING_96: 'svg-mask-diagonal-facepile-typing-96',
  DIAGONAL_FACEPILE_TYPING_100: 'svg-mask-diagonal-facepile-typing-100',
  DIAGONAL_FACEPILE_TYPING_120: 'svg-mask-diagonal-facepile-typing-120',
  AVATAR_STATUS_MOBILE_16: 'svg-mask-avatar-status-mobile-16',
  AVATAR_STATUS_MOBILE_20: 'svg-mask-avatar-status-mobile-20',
  AVATAR_STATUS_MOBILE_24: 'svg-mask-avatar-status-mobile-24',
  AVATAR_STATUS_MOBILE_32: 'svg-mask-avatar-status-mobile-32',
  AVATAR_STATUS_MOBILE_40: 'svg-mask-avatar-status-mobile-40',
  AVATAR_STATUS_MOBILE_44: 'svg-mask-avatar-status-mobile-44',
  AVATAR_STATUS_MOBILE_48: 'svg-mask-avatar-status-mobile-48',
  AVATAR_STATUS_MOBILE_56: 'svg-mask-avatar-status-mobile-56',
  AVATAR_STATUS_MOBILE_72: 'svg-mask-avatar-status-mobile-72',
  AVATAR_STATUS_MOBILE_80: 'svg-mask-avatar-status-mobile-80',
  AVATAR_STATUS_MOBILE_96: 'svg-mask-avatar-status-mobile-96',
  AVATAR_STATUS_MOBILE_100: 'svg-mask-avatar-status-mobile-100',
  AVATAR_STATUS_MOBILE_120: 'svg-mask-avatar-status-mobile-120',
  AVATAR_STATUS_TYPING_16: 'svg-mask-avatar-status-typing-16',
  AVATAR_STATUS_TYPING_20: 'svg-mask-avatar-status-typing-20',
  AVATAR_STATUS_TYPING_24: 'svg-mask-avatar-status-typing-24',
  AVATAR_STATUS_TYPING_32: 'svg-mask-avatar-status-typing-32',
  AVATAR_STATUS_TYPING_40: 'svg-mask-avatar-status-typing-40',
  AVATAR_STATUS_TYPING_44: 'svg-mask-avatar-status-typing-44',
  AVATAR_STATUS_TYPING_48: 'svg-mask-avatar-status-typing-48',
  AVATAR_STATUS_TYPING_56: 'svg-mask-avatar-status-typing-56',
  AVATAR_STATUS_TYPING_72: 'svg-mask-avatar-status-typing-72',
  AVATAR_STATUS_TYPING_80: 'svg-mask-avatar-status-typing-80',
  AVATAR_STATUS_TYPING_96: 'svg-mask-avatar-status-typing-96',
  AVATAR_STATUS_TYPING_100: 'svg-mask-avatar-status-typing-100',
  AVATAR_STATUS_TYPING_120: 'svg-mask-avatar-status-typing-120',
  AVATAR_STATUS_VR_16: 'svg-mask-avatar-status-vr-16',
  AVATAR_STATUS_VR_20: 'svg-mask-avatar-status-vr-20',
  AVATAR_STATUS_VR_24: 'svg-mask-avatar-status-vr-24',
  AVATAR_STATUS_VR_32: 'svg-mask-avatar-status-vr-32',
  AVATAR_STATUS_VR_40: 'svg-mask-avatar-status-vr-40',
  AVATAR_STATUS_VR_44: 'svg-mask-avatar-status-vr-44',
  AVATAR_STATUS_VR_48: 'svg-mask-avatar-status-vr-48',
  AVATAR_STATUS_VR_56: 'svg-mask-avatar-status-vr-56',
  AVATAR_STATUS_VR_72: 'svg-mask-avatar-status-vr-72',
  AVATAR_STATUS_VR_80: 'svg-mask-avatar-status-vr-80',
  AVATAR_STATUS_VR_96: 'svg-mask-avatar-status-vr-96',
  AVATAR_STATUS_VR_120: 'svg-mask-avatar-status-vr-120',
  AVATAR_DECORATION_STATUS_ROUND_16: 'svg-mask-avatar-decoration-status-round-16',
  AVATAR_DECORATION_STATUS_ROUND_20: 'svg-mask-avatar-decoration-status-round-20',
  AVATAR_DECORATION_STATUS_ROUND_24: 'svg-mask-avatar-decoration-status-round-24',
  AVATAR_DECORATION_STATUS_ROUND_32: 'svg-mask-avatar-decoration-status-round-32',
  AVATAR_DECORATION_STATUS_ROUND_40: 'svg-mask-avatar-decoration-status-round-40',
  AVATAR_DECORATION_STATUS_ROUND_44: 'svg-mask-avatar-decoration-status-round-44',
  AVATAR_DECORATION_STATUS_ROUND_48: 'svg-mask-avatar-decoration-status-round-48',
  AVATAR_DECORATION_STATUS_ROUND_56: 'svg-mask-avatar-decoration-status-round-56',
  AVATAR_DECORATION_STATUS_ROUND_72: 'svg-mask-avatar-decoration-status-round-72',
  AVATAR_DECORATION_STATUS_ROUND_80: 'svg-mask-avatar-decoration-status-round-80',
  AVATAR_DECORATION_STATUS_ROUND_96: 'svg-mask-avatar-decoration-status-round-96',
  AVATAR_DECORATION_STATUS_ROUND_120: 'svg-mask-avatar-decoration-status-round-120',
  AVATAR_DECORATION_STATUS_MOBILE_16: 'svg-mask-avatar-decoration-status-mobile-16',
  AVATAR_DECORATION_STATUS_MOBILE_20: 'svg-mask-avatar-decoration-status-mobile-20',
  AVATAR_DECORATION_STATUS_MOBILE_24: 'svg-mask-avatar-decoration-status-mobile-24',
  AVATAR_DECORATION_STATUS_MOBILE_32: 'svg-mask-avatar-decoration-status-mobile-32',
  AVATAR_DECORATION_STATUS_MOBILE_40: 'svg-mask-avatar-decoration-status-mobile-40',
  AVATAR_DECORATION_STATUS_MOBILE_44: 'svg-mask-avatar-decoration-status-mobile-44',
  AVATAR_DECORATION_STATUS_MOBILE_48: 'svg-mask-avatar-decoration-status-mobile-48',
  AVATAR_DECORATION_STATUS_MOBILE_56: 'svg-mask-avatar-decoration-status-mobile-56',
  AVATAR_DECORATION_STATUS_MOBILE_72: 'svg-mask-avatar-decoration-status-mobile-72',
  AVATAR_DECORATION_STATUS_MOBILE_80: 'svg-mask-avatar-decoration-status-mobile-80',
  AVATAR_DECORATION_STATUS_MOBILE_96: 'svg-mask-avatar-decoration-status-mobile-96',
  AVATAR_DECORATION_STATUS_MOBILE_100: 'svg-mask-avatar-decoration-status-mobile-100',
  AVATAR_DECORATION_STATUS_MOBILE_120: 'svg-mask-avatar-decoration-status-mobile-120',
  AVATAR_DECORATION_STATUS_TYPING_16: 'svg-mask-avatar-decoration-status-typing-16',
  AVATAR_DECORATION_STATUS_TYPING_20: 'svg-mask-avatar-decoration-status-typing-20',
  AVATAR_DECORATION_STATUS_TYPING_24: 'svg-mask-avatar-decoration-status-typing-24',
  AVATAR_DECORATION_STATUS_TYPING_32: 'svg-mask-avatar-decoration-status-typing-32',
  AVATAR_DECORATION_STATUS_TYPING_40: 'svg-mask-avatar-decoration-status-typing-40',
  AVATAR_DECORATION_STATUS_TYPING_44: 'svg-mask-avatar-decoration-status-typing-44',
  AVATAR_DECORATION_STATUS_TYPING_48: 'svg-mask-avatar-decoration-status-typing-48',
  AVATAR_DECORATION_STATUS_TYPING_56: 'svg-mask-avatar-decoration-status-typing-56',
  AVATAR_DECORATION_STATUS_TYPING_72: 'svg-mask-avatar-decoration-status-typing-72',
  AVATAR_DECORATION_STATUS_TYPING_80: 'svg-mask-avatar-decoration-status-typing-80',
  AVATAR_DECORATION_STATUS_TYPING_96: 'svg-mask-avatar-decoration-status-typing-96',
  AVATAR_DECORATION_STATUS_TYPING_100: 'svg-mask-avatar-decoration-status-typing-100',
  AVATAR_DECORATION_STATUS_TYPING_120: 'svg-mask-avatar-decoration-status-typing-120',
  AVATAR_DECORATION_STATUS_VR_16: 'svg-mask-avatar-decoration-status-vr-16',
  AVATAR_DECORATION_STATUS_VR_20: 'svg-mask-avatar-decoration-status-vr-20',
  AVATAR_DECORATION_STATUS_VR_24: 'svg-mask-avatar-decoration-status-vr-24',
  AVATAR_DECORATION_STATUS_VR_32: 'svg-mask-avatar-decoration-status-vr-32',
  AVATAR_DECORATION_STATUS_VR_40: 'svg-mask-avatar-decoration-status-vr-40',
  AVATAR_DECORATION_STATUS_VR_44: 'svg-mask-avatar-decoration-status-vr-44',
  AVATAR_DECORATION_STATUS_VR_48: 'svg-mask-avatar-decoration-status-vr-48',
  AVATAR_DECORATION_STATUS_VR_56: 'svg-mask-avatar-decoration-status-vr-56',
  AVATAR_DECORATION_STATUS_VR_72: 'svg-mask-avatar-decoration-status-vr-72',
  AVATAR_DECORATION_STATUS_VR_80: 'svg-mask-avatar-decoration-status-vr-80',
  AVATAR_DECORATION_STATUS_VR_96: 'svg-mask-avatar-decoration-status-vr-96',
  AVATAR_DECORATION_STATUS_VR_120: 'svg-mask-avatar-decoration-status-vr-120',
  AVATAR_CALL_16: 'svg-mask-avatar-call-16',
  AVATAR_CALL_20: 'svg-mask-avatar-call-20',
  AVATAR_CALL_24: 'svg-mask-avatar-call-24',
  AVATAR_CALL_32: 'svg-mask-avatar-call-32',
  AVATAR_CALL_40: 'svg-mask-avatar-call-40',
  AVATAR_CALL_44: 'svg-mask-avatar-call-44',
  AVATAR_CALL_48: 'svg-mask-avatar-call-48',
  AVATAR_CALL_56: 'svg-mask-avatar-call-56',
  AVATAR_CALL_72: 'svg-mask-avatar-call-72',
  AVATAR_CALL_80: 'svg-mask-avatar-call-80',
  AVATAR_CALL_96: 'svg-mask-avatar-call-96',
  AVATAR_CALL_120: 'svg-mask-avatar-call-120',
  AVATAR_CALL_ICON_16: 'svg-mask-avatar-call-icon-16',
  AVATAR_CALL_ICON_20: 'svg-mask-avatar-call-icon-20',
  AVATAR_CALL_ICON_24: 'svg-mask-avatar-call-icon-24',
  AVATAR_CALL_ICON_32: 'svg-mask-avatar-call-icon-32',
  AVATAR_CALL_ICON_40: 'svg-mask-avatar-call-icon-40',
  AVATAR_CALL_ICON_44: 'svg-mask-avatar-call-icon-44',
  AVATAR_CALL_ICON_48: 'svg-mask-avatar-call-icon-48',
  AVATAR_CALL_ICON_56: 'svg-mask-avatar-call-icon-56',
  AVATAR_CALL_ICON_72: 'svg-mask-avatar-call-icon-72',
  AVATAR_CALL_ICON_80: 'svg-mask-avatar-call-icon-80',
  AVATAR_CALL_ICON_96: 'svg-mask-avatar-call-icon-96',
  AVATAR_CALL_ICON_120: 'svg-mask-avatar-call-icon-120',
  AVATAR_CALL_STATUS_16: 'svg-mask-avatar-call-status-16',
  AVATAR_CALL_STATUS_20: 'svg-mask-avatar-call-status-20',
  AVATAR_CALL_STATUS_24: 'svg-mask-avatar-call-status-24',
  AVATAR_CALL_STATUS_32: 'svg-mask-avatar-call-status-32',
  AVATAR_CALL_STATUS_40: 'svg-mask-avatar-call-status-40',
  AVATAR_CALL_STATUS_44: 'svg-mask-avatar-call-status-44',
  AVATAR_CALL_STATUS_48: 'svg-mask-avatar-call-status-48',
  AVATAR_CALL_STATUS_56: 'svg-mask-avatar-call-status-56',
  AVATAR_CALL_STATUS_72: 'svg-mask-avatar-call-status-72',
  AVATAR_CALL_STATUS_80: 'svg-mask-avatar-call-status-80',
  AVATAR_CALL_STATUS_96: 'svg-mask-avatar-call-status-96',
  AVATAR_CALL_STATUS_120: 'svg-mask-avatar-call-status-120',
  AVATAR_CALL_ICON_STATUS_16: 'svg-mask-avatar-call-icon-status-16',
  AVATAR_CALL_ICON_STATUS_20: 'svg-mask-avatar-call-icon-status-20',
  AVATAR_CALL_ICON_STATUS_24: 'svg-mask-avatar-call-icon-status-24',
  AVATAR_CALL_ICON_STATUS_32: 'svg-mask-avatar-call-icon-status-32',
  AVATAR_CALL_ICON_STATUS_40: 'svg-mask-avatar-call-icon-status-40',
  AVATAR_CALL_ICON_STATUS_44: 'svg-mask-avatar-call-icon-status-44',
  AVATAR_CALL_ICON_STATUS_48: 'svg-mask-avatar-call-icon-status-48',
  AVATAR_CALL_ICON_STATUS_56: 'svg-mask-avatar-call-icon-status-56',
  AVATAR_CALL_ICON_STATUS_72: 'svg-mask-avatar-call-icon-status-72',
  AVATAR_CALL_ICON_STATUS_80: 'svg-mask-avatar-call-icon-status-80',
  AVATAR_CALL_ICON_STATUS_96: 'svg-mask-avatar-call-icon-status-96',
  AVATAR_CALL_ICON_STATUS_120: 'svg-mask-avatar-call-icon-status-120',
  AVATAR_DECORATION_CALL_16: 'svg-mask-avatar-decoration-voice-call-16',
  AVATAR_DECORATION_CALL_20: 'svg-mask-avatar-decoration-voice-call-20',
  AVATAR_DECORATION_CALL_24: 'svg-mask-avatar-decoration-voice-call-24',
  AVATAR_DECORATION_CALL_32: 'svg-mask-avatar-decoration-voice-call-32',
  AVATAR_DECORATION_CALL_40: 'svg-mask-avatar-decoration-voice-call-40',
  AVATAR_DECORATION_CALL_44: 'svg-mask-avatar-decoration-voice-call-44',
  AVATAR_DECORATION_CALL_48: 'svg-mask-avatar-decoration-voice-call-48',
  AVATAR_DECORATION_CALL_56: 'svg-mask-avatar-decoration-voice-call-56',
  AVATAR_DECORATION_CALL_72: 'svg-mask-avatar-decoration-voice-call-72',
  AVATAR_DECORATION_CALL_80: 'svg-mask-avatar-decoration-voice-call-80',
  AVATAR_DECORATION_CALL_96: 'svg-mask-avatar-decoration-voice-call-96',
  AVATAR_DECORATION_CALL_120: 'svg-mask-avatar-decoration-voice-call-120',
  AVATAR_DECORATION_CALL_ICON_16: 'svg-mask-avatar-decoration-call-icon-16',
  AVATAR_DECORATION_CALL_ICON_20: 'svg-mask-avatar-decoration-call-icon-20',
  AVATAR_DECORATION_CALL_ICON_24: 'svg-mask-avatar-decoration-call-icon-24',
  AVATAR_DECORATION_CALL_ICON_32: 'svg-mask-avatar-decoration-call-icon-32',
  AVATAR_DECORATION_CALL_ICON_40: 'svg-mask-avatar-decoration-call-icon-40',
  AVATAR_DECORATION_CALL_ICON_44: 'svg-mask-avatar-decoration-call-icon-44',
  AVATAR_DECORATION_CALL_ICON_48: 'svg-mask-avatar-decoration-call-icon-48',
  AVATAR_DECORATION_CALL_ICON_56: 'svg-mask-avatar-decoration-call-icon-56',
  AVATAR_DECORATION_CALL_ICON_72: 'svg-mask-avatar-decoration-call-icon-72',
  AVATAR_DECORATION_CALL_ICON_80: 'svg-mask-avatar-decoration-call-icon-80',
  AVATAR_DECORATION_CALL_ICON_96: 'svg-mask-avatar-decoration-call-icon-96',
  AVATAR_DECORATION_CALL_ICON_120: 'svg-mask-avatar-decoration-call-icon-120',
  AVATAR_DECORATION_CALL_STATUS_16: 'svg-mask-avatar-decoration-call-status-16',
  AVATAR_DECORATION_CALL_STATUS_20: 'svg-mask-avatar-decoration-call-status-20',
  AVATAR_DECORATION_CALL_STATUS_24: 'svg-mask-avatar-decoration-call-status-24',
  AVATAR_DECORATION_CALL_STATUS_32: 'svg-mask-avatar-decoration-call-status-32',
  AVATAR_DECORATION_CALL_STATUS_40: 'svg-mask-avatar-decoration-call-status-40',
  AVATAR_DECORATION_CALL_STATUS_44: 'svg-mask-avatar-decoration-call-status-44',
  AVATAR_DECORATION_CALL_STATUS_48: 'svg-mask-avatar-decoration-call-status-48',
  AVATAR_DECORATION_CALL_STATUS_56: 'svg-mask-avatar-decoration-call-status-56',
  AVATAR_DECORATION_CALL_STATUS_72: 'svg-mask-avatar-decoration-call-status-72',
  AVATAR_DECORATION_CALL_STATUS_80: 'svg-mask-avatar-decoration-call-status-80',
  AVATAR_DECORATION_CALL_STATUS_96: 'svg-mask-avatar-decoration-call-status-96',
  AVATAR_DECORATION_CALL_STATUS_120: 'svg-mask-avatar-decoration-call-status-120',
  AVATAR_DECORATION_CALL_ICON_STATUS_16: 'svg-mask-avatar-decoration-call-icon-status-16',
  AVATAR_DECORATION_CALL_ICON_STATUS_20: 'svg-mask-avatar-decoration-call-icon-status-20',
  AVATAR_DECORATION_CALL_ICON_STATUS_24: 'svg-mask-avatar-decoration-call-icon-status-24',
  AVATAR_DECORATION_CALL_ICON_STATUS_32: 'svg-mask-avatar-decoration-call-icon-status-32',
  AVATAR_DECORATION_CALL_ICON_STATUS_40: 'svg-mask-avatar-decoration-call-icon-status-40',
  AVATAR_DECORATION_CALL_ICON_STATUS_44: 'svg-mask-avatar-decoration-call-icon-status-44',
  AVATAR_DECORATION_CALL_ICON_STATUS_48: 'svg-mask-avatar-decoration-call-icon-status-48',
  AVATAR_DECORATION_CALL_ICON_STATUS_56: 'svg-mask-avatar-decoration-call-icon-status-56',
  AVATAR_DECORATION_CALL_ICON_STATUS_72: 'svg-mask-avatar-decoration-call-icon-status-72',
  AVATAR_DECORATION_CALL_ICON_STATUS_80: 'svg-mask-avatar-decoration-call-icon-status-80',
  AVATAR_DECORATION_CALL_ICON_STATUS_96: 'svg-mask-avatar-decoration-call-icon-status-96',
  AVATAR_DECORATION_CALL_ICON_STATUS_120: 'svg-mask-avatar-decoration-call-icon-status-120',
  STATUS_ONLINE_MOBILE: 'svg-mask-status-online-mobile',
  STATUS_ONLINE_VR: 'svg-mask-status-online-vr',
  STATUS_ONLINE: 'svg-mask-status-online',
  STATUS_IDLE: 'svg-mask-status-idle',
  STATUS_DND: 'svg-mask-status-dnd',
  STATUS_OFFLINE: 'svg-mask-status-offline',
  STATUS_STREAMING: 'svg-mask-status-streaming',
  STATUS_TYPING: 'svg-mask-status-typing',
  STATUS_SCREENSHARE: 'svg-mask-status-screenshare',
  STICKER_ROUNDED_RECT: 'svg-mask-sticker-rounded-rect',
  STICKER_SHOP_NOTIFICATION: 'svg-mask-sticker-shop-notification',
  GUILD_ICON_WITH_CHANNEL_TYPE: 'svg-mask-guild-icon-with-channel-type',
  CHANNEL_ICON_WITH_GUILD_ICON: 'svg-mask-channel-icon-with-guild-icon',
  GUILD_POPOUT_FACE_PILE_AVATAR: 'svg-mask-guild-popout-activity-icon',
  CHAT_INPUT_BUTTON_NOTIFICATION: 'svg-mask-chat-input-button-notification',
  AUTOCOMPLETE_EMOJI_UPSELL_EMOJI: 'svg-mask-autocomplete-emoji-upsell-emoji',
  EVENT_TICKET: 'svg-mask-event-ticket',
  CONTENT_INVENTORY_CARD_FACE_PILE_AVATAR: 'svg-mask-content-inventory-card-face-pile-avatar',
  CLAN_ICON: 'svg-mask-clan-icon',
  BADGED_GUILD_ICON: 'svg-mask-badged-guild-icon',
  FORWARD_ATTACHMENT_PILE_OVERFLOW: 'svg-mask-forward-attachment-pile-overflow',
  GAMEPLAY_HIGH_ACTIVITY_ICON: 'svg-mask-gameplay-high-activity-icon',
  CONTENT_IMAGE_60: 'svg-mask-content-image-60',
  CONTENT_IMAGE_72: 'svg-mask-content-image-72',
  CONTENT_IMAGE_100: 'svg-mask-content-image-100',
  USER_AVATAR_WITH_GAME_ICON: 'svg-mask-user-avatar-with-game-icon',
} as const;

export type MaskID = (typeof MaskIDs)[keyof typeof MaskIDs];

interface StatusCornerOptions {
  withBottomRightStatus?: boolean;
  withTopRightStatus?: boolean;
}

interface FacepileSpecs {
  totalSize: number;
  backAvatarSize: number;
  frontAvatarSize: number;
  backAvatarCenter: number;
  frontAvatarCenter: number;
  strokeMaskRadius: number;
}

export interface MaskProps extends Omit<SVGProps<SVGSVGElement>, 'mask' | 'width' | 'height'> {
  mask?: string | null;
  width?: number;
  height?: number;
  rightOverhang?: number;
  bottomOverhang?: number;
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
  'aria-label'?: string;
}

export const AvatarCallMasks: Readonly<Partial<Record<AvatarSize, string>>> = Object.freeze({
  [AvatarSizes.SIZE_16]: 'svg-mask-avatar-call-16',
  [AvatarSizes.SIZE_20]: 'svg-mask-avatar-call-20',
  [AvatarSizes.SIZE_24]: 'svg-mask-avatar-call-24',
  [AvatarSizes.SIZE_32]: 'svg-mask-avatar-call-32',
  [AvatarSizes.SIZE_40]: 'svg-mask-avatar-call-40',
  [AvatarSizes.SIZE_44]: 'svg-mask-avatar-call-44',
  [AvatarSizes.SIZE_48]: 'svg-mask-avatar-call-48',
  [AvatarSizes.SIZE_56]: 'svg-mask-avatar-call-56',
  [AvatarSizes.SIZE_72]: 'svg-mask-avatar-call-72',
  [AvatarSizes.SIZE_80]: 'svg-mask-avatar-call-80',
  [AvatarSizes.SIZE_96]: 'svg-mask-avatar-call-96',
  [AvatarSizes.SIZE_120]: 'svg-mask-avatar-call-120',
});

export const AvatarCallIconMasks: Readonly<Partial<Record<AvatarSize, string>>> = Object.freeze({
  [AvatarSizes.SIZE_16]: 'svg-mask-avatar-call-icon-16',
  [AvatarSizes.SIZE_20]: 'svg-mask-avatar-call-icon-20',
  [AvatarSizes.SIZE_24]: 'svg-mask-avatar-call-icon-24',
  [AvatarSizes.SIZE_32]: 'svg-mask-avatar-call-icon-32',
  [AvatarSizes.SIZE_40]: 'svg-mask-avatar-call-icon-40',
  [AvatarSizes.SIZE_44]: 'svg-mask-avatar-call-icon-44',
  [AvatarSizes.SIZE_48]: 'svg-mask-avatar-call-icon-48',
  [AvatarSizes.SIZE_56]: 'svg-mask-avatar-call-icon-56',
  [AvatarSizes.SIZE_72]: 'svg-mask-avatar-call-icon-72',
  [AvatarSizes.SIZE_80]: 'svg-mask-avatar-call-icon-80',
  [AvatarSizes.SIZE_96]: 'svg-mask-avatar-call-icon-96',
  [AvatarSizes.SIZE_120]: 'svg-mask-avatar-call-icon-120',
});

export const AvatarCallStatusMasks: Readonly<Partial<Record<AvatarSize, string>>> = Object.freeze({
  [AvatarSizes.SIZE_16]: 'svg-mask-avatar-call-status-16',
  [AvatarSizes.SIZE_20]: 'svg-mask-avatar-call-status-20',
  [AvatarSizes.SIZE_24]: 'svg-mask-avatar-call-status-24',
  [AvatarSizes.SIZE_32]: 'svg-mask-avatar-call-status-32',
  [AvatarSizes.SIZE_40]: 'svg-mask-avatar-call-status-40',
  [AvatarSizes.SIZE_44]: 'svg-mask-avatar-call-status-44',
  [AvatarSizes.SIZE_48]: 'svg-mask-avatar-call-status-48',
  [AvatarSizes.SIZE_56]: 'svg-mask-avatar-call-status-56',
  [AvatarSizes.SIZE_72]: 'svg-mask-avatar-call-status-72',
  [AvatarSizes.SIZE_80]: 'svg-mask-avatar-call-status-80',
  [AvatarSizes.SIZE_96]: 'svg-mask-avatar-call-status-96',
  [AvatarSizes.SIZE_120]: 'svg-mask-avatar-call-status-120',
});

export const AvatarCallIconStatusMasks: Readonly<Partial<Record<AvatarSize, string>>> = Object.freeze({
  [AvatarSizes.SIZE_16]: 'svg-mask-avatar-call-icon-status-16',
  [AvatarSizes.SIZE_20]: 'svg-mask-avatar-call-icon-status-20',
  [AvatarSizes.SIZE_24]: 'svg-mask-avatar-call-icon-status-24',
  [AvatarSizes.SIZE_32]: 'svg-mask-avatar-call-icon-status-32',
  [AvatarSizes.SIZE_40]: 'svg-mask-avatar-call-icon-status-40',
  [AvatarSizes.SIZE_44]: 'svg-mask-avatar-call-icon-status-44',
  [AvatarSizes.SIZE_48]: 'svg-mask-avatar-call-icon-status-48',
  [AvatarSizes.SIZE_56]: 'svg-mask-avatar-call-icon-status-56',
  [AvatarSizes.SIZE_72]: 'svg-mask-avatar-call-icon-status-72',
  [AvatarSizes.SIZE_80]: 'svg-mask-avatar-call-icon-status-80',
  [AvatarSizes.SIZE_96]: 'svg-mask-avatar-call-icon-status-96',
  [AvatarSizes.SIZE_120]: 'svg-mask-avatar-call-icon-status-120',
});

export const AvatarDecorationVoiceCallMasks: Readonly<Partial<Record<AvatarSize, string>>> = Object.freeze({
  [AvatarSizes.SIZE_16]: 'svg-mask-avatar-decoration-voice-call-16',
  [AvatarSizes.SIZE_20]: 'svg-mask-avatar-decoration-voice-call-20',
  [AvatarSizes.SIZE_24]: 'svg-mask-avatar-decoration-voice-call-24',
  [AvatarSizes.SIZE_32]: 'svg-mask-avatar-decoration-voice-call-32',
  [AvatarSizes.SIZE_40]: 'svg-mask-avatar-decoration-voice-call-40',
  [AvatarSizes.SIZE_44]: 'svg-mask-avatar-decoration-voice-call-44',
  [AvatarSizes.SIZE_48]: 'svg-mask-avatar-decoration-voice-call-48',
  [AvatarSizes.SIZE_56]: 'svg-mask-avatar-decoration-voice-call-56',
  [AvatarSizes.SIZE_72]: 'svg-mask-avatar-decoration-voice-call-72',
  [AvatarSizes.SIZE_80]: 'svg-mask-avatar-decoration-voice-call-80',
  [AvatarSizes.SIZE_96]: 'svg-mask-avatar-decoration-voice-call-96',
  [AvatarSizes.SIZE_120]: 'svg-mask-avatar-decoration-voice-call-120',
});

export const AvatarDecorationCallIconMasks: Readonly<Partial<Record<AvatarSize, string>>> = Object.freeze({
  [AvatarSizes.SIZE_16]: 'svg-mask-avatar-decoration-call-icon-16',
  [AvatarSizes.SIZE_20]: 'svg-mask-avatar-decoration-call-icon-20',
  [AvatarSizes.SIZE_24]: 'svg-mask-avatar-decoration-call-icon-24',
  [AvatarSizes.SIZE_32]: 'svg-mask-avatar-decoration-call-icon-32',
  [AvatarSizes.SIZE_40]: 'svg-mask-avatar-decoration-call-icon-40',
  [AvatarSizes.SIZE_44]: 'svg-mask-avatar-decoration-call-icon-44',
  [AvatarSizes.SIZE_48]: 'svg-mask-avatar-decoration-call-icon-48',
  [AvatarSizes.SIZE_56]: 'svg-mask-avatar-decoration-call-icon-56',
  [AvatarSizes.SIZE_72]: 'svg-mask-avatar-decoration-call-icon-72',
  [AvatarSizes.SIZE_80]: 'svg-mask-avatar-decoration-call-icon-80',
  [AvatarSizes.SIZE_96]: 'svg-mask-avatar-decoration-call-icon-96',
  [AvatarSizes.SIZE_120]: 'svg-mask-avatar-decoration-call-icon-120',
});

export const AvatarDecorationCallStatusMasks: Readonly<Partial<Record<AvatarSize, string>>> = Object.freeze({
  [AvatarSizes.SIZE_16]: 'svg-mask-avatar-decoration-call-status-16',
  [AvatarSizes.SIZE_20]: 'svg-mask-avatar-decoration-call-status-20',
  [AvatarSizes.SIZE_24]: 'svg-mask-avatar-decoration-call-status-24',
  [AvatarSizes.SIZE_32]: 'svg-mask-avatar-decoration-call-status-32',
  [AvatarSizes.SIZE_40]: 'svg-mask-avatar-decoration-call-status-40',
  [AvatarSizes.SIZE_44]: 'svg-mask-avatar-decoration-call-status-44',
  [AvatarSizes.SIZE_48]: 'svg-mask-avatar-decoration-call-status-48',
  [AvatarSizes.SIZE_56]: 'svg-mask-avatar-decoration-call-status-56',
  [AvatarSizes.SIZE_72]: 'svg-mask-avatar-decoration-call-status-72',
  [AvatarSizes.SIZE_80]: 'svg-mask-avatar-decoration-call-status-80',
  [AvatarSizes.SIZE_96]: 'svg-mask-avatar-decoration-call-status-96',
  [AvatarSizes.SIZE_120]: 'svg-mask-avatar-decoration-call-status-120',
});

export const AvatarDecorationCallIconStatusMasks: Readonly<Partial<Record<AvatarSize, string>>> = Object.freeze({
  [AvatarSizes.SIZE_16]: 'svg-mask-avatar-decoration-call-icon-status-16',
  [AvatarSizes.SIZE_20]: 'svg-mask-avatar-decoration-call-icon-status-20',
  [AvatarSizes.SIZE_24]: 'svg-mask-avatar-decoration-call-icon-status-24',
  [AvatarSizes.SIZE_32]: 'svg-mask-avatar-decoration-call-icon-status-32',
  [AvatarSizes.SIZE_40]: 'svg-mask-avatar-decoration-call-icon-status-40',
  [AvatarSizes.SIZE_44]: 'svg-mask-avatar-decoration-call-icon-status-44',
  [AvatarSizes.SIZE_48]: 'svg-mask-avatar-decoration-call-icon-status-48',
  [AvatarSizes.SIZE_56]: 'svg-mask-avatar-decoration-call-icon-status-56',
  [AvatarSizes.SIZE_72]: 'svg-mask-avatar-decoration-call-icon-status-72',
  [AvatarSizes.SIZE_80]: 'svg-mask-avatar-decoration-call-icon-status-80',
  [AvatarSizes.SIZE_96]: 'svg-mask-avatar-decoration-call-icon-status-96',
  [AvatarSizes.SIZE_120]: 'svg-mask-avatar-decoration-call-icon-status-120',
});

const scaleIntoDecoration = (e: number, t?: number): number => {
  return (e - 0.5) / (t ?? 1.2) + 0.5;
};
const getStatusCutout = (e: AvatarSize) => {
  const t = getAvatarSpecs(e),
    n = (t.status / 2 + t.offset) / t.size;
  return { corner: n, radius: n + 0.05 };
};
const avatarCallMask = (e: string, t: AvatarSize, options: StatusCornerOptions = {}) => {
  const { withBottomRightStatus: n = false, withTopRightStatus: i = false } = options,
    { corner: a, radius: s } = getStatusCutout(t);
  return jsxs('mask', {
    id: e,
    maskContentUnits: 'objectBoundingBox',
    viewBox: '0 0 1 1',
    children: [
      jsx('circle', { fill: 'white', cx: 0.5, cy: 0.5, r: 0.5 }),
      n && jsx('circle', { fill: 'black', cx: 1 - a, cy: 1 - a, r: s }),
      i && jsx('circle', { fill: 'black', cx: 1 - a, cy: a, r: s }),
    ],
  });
};
const avatarDecorationCallMask = (e: string, t: AvatarSize, options: StatusCornerOptions = {}) => {
  const { withBottomRightStatus: n = false, withTopRightStatus: i = false } = options,
    { corner: a, radius: s } = getStatusCutout(t),
    l = scaleIntoDecoration(a),
    o = s / 1.2;
  return jsxs('mask', {
    id: e,
    maskContentUnits: 'objectBoundingBox',
    viewBox: '0 0 1 1',
    children: [
      jsx('rect', { fill: 'white', x: 0, y: 0, width: '100%', height: '100%' }),
      n && jsx('circle', { fill: 'black', cx: 1 - l, cy: 1 - l, r: o }),
      i && jsx('circle', { fill: 'black', cx: 1 - l, cy: l, r: o }),
    ],
  });
};
const callControlBadgeMask = (e: string, t: number) => {
  return jsxs('mask', {
    id: e,
    maskContentUnits: 'objectBoundingBox',
    viewBox: '0 0 1 1',
    children: [
      jsx('circle', { fill: 'white', cx: 0.5, cy: 0.5, r: 0.5 }),
      jsx('rect', {
        fill: 'black',
        x: (56 - t - 4 - 0) / 56,
        y: -4 / 56,
        width: (t + 8) / 56,
        height: 24 / 56,
        rx: 12 / 56,
        ry: 12 / 56,
      }),
    ],
  });
};
const headerBarBadgeMask = (e: string, t: number) => {
  return jsxs('mask', {
    id: e,
    maskContentUnits: 'objectBoundingBox',
    viewBox: '0 0 1 1',
    children: [
      jsx('rect', { fill: 'white', x: 0, y: 0, width: 1, height: 1 }),
      jsx('circle', { fill: 'black', cx: 0.75, cy: (24 * t) / 24, r: 0.25 }),
    ],
  });
};
const getFacepileSpecs = (e: AvatarSpecs): FacepileSpecs => {
  const t = e.size,
    n = e.size / 1.5,
    i = +n;
  return {
    totalSize: t,
    backAvatarSize: n,
    frontAvatarSize: i,
    backAvatarCenter: n / 2 / t,
    frontAvatarCenter: (0.5 * n) / t + i / 2 / t,
    strokeMaskRadius: (3 + i / 2) / t,
  };
};
const facepileBackMask = (e: string, t: AvatarSize) => {
  const n = getFacepileSpecs(getAvatarSpecs(t));
  return jsx('mask', {
    id: e,
    maskContentUnits: 'objectBoundingBox',
    viewBox: '0 0 1 1',
    children: (function (e) {
      const {
        totalSize: t,
        backAvatarSize: n,
        frontAvatarSize: i,
        backAvatarCenter: a,
        frontAvatarCenter: s,
        strokeMaskRadius: l,
      } = e;
      return jsxs(Fragment, {
        children: [
          jsx('circle', { fill: 'white', cx: a, cy: a, r: n / 2 / t }),
          jsx('circle', { fill: 'black', cx: s, cy: s, r: l }),
          jsx('circle', { fill: 'black', cx: s, cy: s, r: i / 2 / t }),
        ],
      });
    })(n),
  });
};
const facepileShapes = (e: FacepileSpecs) => {
  const {
    totalSize: t,
    backAvatarSize: n,
    frontAvatarSize: i,
    backAvatarCenter: a,
    frontAvatarCenter: s,
    strokeMaskRadius: l,
  } = e;
  return jsxs(Fragment, {
    children: [
      jsx('circle', { fill: 'white', cx: a, cy: a, r: n / 2 / t }),
      jsx('circle', { fill: 'black', cx: s, cy: s, r: l }),
      jsx('circle', { fill: 'white', cx: s, cy: s, r: i / 2 / t }),
    ],
  });
};
const facepileMask = (e: string, t: AvatarSize) => {
  const n = getFacepileSpecs(getAvatarSpecs(t));
  return jsx('mask', { id: e, maskContentUnits: 'objectBoundingBox', viewBox: '0 0 1 1', children: facepileShapes(n) });
};
const facepileStatusMask = (e: string, t: AvatarSize) => {
  const n = getAvatarSpecs(t),
    i = getFacepileSpecs(n),
    a = i.totalSize,
    s = n.status / 2;
  return jsxs('mask', {
    id: e,
    maskContentUnits: 'objectBoundingBox',
    viewBox: '0 0 1 1',
    children: [
      facepileShapes(i),
      jsx('circle', {
        fill: 'black',
        cx: (a - s - n.offset) / a,
        cy: (a - s - n.offset) / a,
        r: (s + n.stroke) / a,
      }),
    ],
  });
};
const facepileTypingMask = (e: string, t: AvatarSize) => {
  const n = getAvatarSpecs(t),
    i = getFacepileSpecs(n),
    a = i.totalSize,
    s = (2.5 * n.status - n.status + 2 * n.stroke) / 2,
    l = n.size - n.status - s - n.offset,
    o = n.status + 2 * n.stroke;
  return jsxs('mask', {
    id: e,
    maskContentUnits: 'objectBoundingBox',
    viewBox: '0 0 1 1',
    children: [
      facepileShapes(i),
      jsx('rect', {
        fill: 'black',
        x: l / a,
        y: (a - n.status - n.stroke - n.offset) / a,
        width: (2.5 * n.status + 2 * n.stroke) / a,
        height: o / a,
        rx: o / 2 / a,
        ry: o / 2 / a,
      }),
    ],
  });
};
export const SQUIRCLE_PATH =
    'M0 0.464C0 0.301585 0 0.220377 0.0316081 0.158343C0.0594114 0.103776 0.103776 0.0594114 0.158343 0.0316081C0.220377 0 0.301585 0 0.464 0H0.536C0.698415 0 0.779623 0 0.841657 0.0316081C0.896224 0.0594114 0.940589 0.103776 0.968392 0.158343C1 0.220377 1 0.301585 1 0.464V0.536C1 0.698415 1 0.779623 0.968392 0.841657C0.940589 0.896224 0.896224 0.940589 0.841657 0.968392C0.779623 1 0.698415 1 0.536 1H0.464C0.301585 1 0.220377 1 0.158343 0.968392C0.103776 0.940589 0.0594114 0.896224 0.0316081 0.841657C0 0.779623 0 0.698415 0 0.536V0.464Z',
  NOTCH_SIZES: Record<number, number> = { 16: 3, 20: 4, 24: 5 };
const notchedSquircleMask = (e: string, t: number) => {
  const n = NOTCH_SIZES[t];
  return jsxs('mask', {
    id: e,
    maskContentUnits: 'objectBoundingBox',
    viewBox: '0 0 1 1',
    children: [
      jsx('path', { fill: 'white', d: SQUIRCLE_PATH }),
      jsx('path', {
        fill: 'black',
        stroke: 'black',
        strokeWidth: (2 / t) * 2,
        strokeLinejoin: 'round',
        d: SQUIRCLE_PATH,
        transform: `translate(${(t - n) / t} 0)`,
      }),
    ],
  });
};
const circleMask = (e: string) => {
  return jsx('mask', {
    id: e,
    maskContentUnits: 'objectBoundingBox',
    viewBox: '0 0 1 1',
    children: jsx('circle', { fill: 'white', cx: 0.5, cy: 0.5, r: 0.5 }),
  });
};
const avatarStatusRoundMask = (e: string, t: AvatarSize) => {
  const n = getAvatarSpecs(t),
    i = n.status / 2;
  return jsxs('mask', {
    id: e,
    maskContentUnits: 'objectBoundingBox',
    viewBox: '0 0 1 1',
    children: [
      jsx('circle', {
        fill: 'white',
        cx: n.size / 2 / n.size,
        cy: n.size / 2 / n.size,
        r: n.size / 2 / n.size,
      }),
      jsx('circle', {
        fill: 'black',
        cx: (n.size - i - n.offset) / n.size,
        cy: (n.size - i - n.offset) / n.size,
        r: (i + n.stroke) / n.size,
      }),
    ],
  });
};
const avatarDecorationStatusRoundMask = (e: string, t: AvatarSize) => {
  const n = getAvatarSpecs(t),
    i = n.status / 2,
    a = (i + n.stroke) / n.size / 1.2,
    s = scaleIntoDecoration((n.size - i - n.offset) / n.size);
  return jsxs('mask', {
    id: e,
    maskContentUnits: 'objectBoundingBox',
    viewBox: '0 0 1 1',
    children: [
      jsx('rect', { fill: 'white', x: 0, y: 0, width: '100%', height: '100%' }),
      jsx('circle', { fill: 'black', cx: s, cy: s, r: a }),
    ],
  });
};
const avatarStatusTypingMask = (e: string, t: AvatarSize) => {
  const n = getAvatarSpecs(t),
    i = (2.5 * n.status - n.status + 2 * n.stroke) / 2,
    a = n.size - n.status - i - n.offset,
    s = n.status + 2 * n.stroke;
  return jsxs('mask', {
    id: e,
    maskContentUnits: 'objectBoundingBox',
    viewBox: '0 0 1 1',
    children: [
      jsx('circle', {
        fill: 'white',
        cx: n.size / 2 / n.size,
        cy: n.size / 2 / n.size,
        r: n.size / 2 / n.size,
      }),
      jsx('rect', {
        fill: 'black',
        x: a / n.size,
        y: (n.size - n.status - n.stroke - n.offset) / n.size,
        width: (2.5 * n.status + 2 * n.stroke) / n.size,
        height: s / n.size,
        rx: s / 2 / n.size,
        ry: s / 2 / n.size,
      }),
    ],
  });
};
const avatarDecorationStatusTypingMask = (e: string, t: AvatarSize) => {
  const n = getAvatarSpecs(t),
    i = (2.5 * n.status - n.status + 2 * n.stroke) / 2,
    a = scaleIntoDecoration((n.size - n.status - n.stroke - n.offset) / n.size),
    s = scaleIntoDecoration((n.size - n.status - i - n.offset) / n.size),
    l = (2.5 * n.status + 2 * n.stroke) / n.size / 1.2,
    o = (n.status + 2 * n.stroke) / n.size / 1.2,
    c = scaleIntoDecoration(o / 2 / n.size);
  return jsxs('mask', {
    id: e,
    maskContentUnits: 'objectBoundingBox',
    viewBox: '0 0 1 1',
    children: [
      jsx('rect', { fill: 'white', x: 0, y: 0, width: '100%', height: '100%' }),
      jsx('rect', { fill: 'black', x: s, y: a, width: l, height: o, rx: c, ry: c }),
    ],
  });
};
const avatarStatusMobileMask = (e: string, t: AvatarSize) => {
  const n = getAvatarSpecs(t);
  return jsxs('mask', {
    id: e,
    maskContentUnits: 'objectBoundingBox',
    viewBox: '0 0 1 1',
    children: [
      jsx('circle', {
        fill: 'white',
        cx: n.size / 2 / n.size,
        cy: n.size / 2 / n.size,
        r: n.size / 2 / n.size,
      }),
      jsx('rect', {
        fill: 'black',
        x: (n.size - n.status - n.stroke - n.offset) / n.size,
        y: (n.size - 1.5 * n.status - n.stroke - n.offset) / n.size,
        width: (n.status + 2 * n.stroke) / n.size,
        height: (1.5 * n.status + 2 * n.stroke) / n.size,
        rx: ((1.5 * n.status + 2 * n.stroke) * 0.2) / n.size,
        ry: ((1.5 * n.status + 2 * n.stroke) * 0.2) / n.size,
      }),
    ],
  });
};
const avatarDecorationStatusMobileMask = (e: string, t: AvatarSize) => {
  const n = getAvatarSpecs(t),
    i = scaleIntoDecoration((n.size - n.status - n.stroke - n.offset) / n.size),
    a = scaleIntoDecoration((n.size - 1.5 * n.status - n.stroke - n.offset) / n.size),
    s = (n.status + 2 * n.stroke) / n.size / 1.2,
    l = (1.5 * n.status + 2 * n.stroke) / n.size / 1.2;
  return jsxs('mask', {
    id: e,
    maskContentUnits: 'objectBoundingBox',
    viewBox: '0 0 1 1',
    children: [
      jsx('rect', { fill: 'white', x: 0, y: 0, width: '100%', height: '100%' }),
      jsx('rect', {
        fill: 'black',
        x: i,
        y: a,
        width: s,
        height: l,
        rx: ((1.5 * n.status + 2 * n.stroke) * 0.2) / n.size,
        ry: ((1.5 * n.status + 2 * n.stroke) * 0.2) / n.size,
      }),
    ],
  });
};
const avatarStatusVRMask = (e: string, t: AvatarSize) => {
  const n = getAvatarSpecs(t),
    i = +n.status,
    a = 1.5 * i,
    s = a + 2 * n.stroke,
    l = i + 2 * n.stroke;
  return jsxs('mask', {
    id: e,
    maskContentUnits: 'objectBoundingBox',
    viewBox: '0 0 1 1',
    children: [
      jsx('circle', {
        fill: 'white',
        cx: n.size / 2 / n.size,
        cy: n.size / 2 / n.size,
        r: n.size / 2 / n.size,
      }),
      jsx('rect', {
        fill: 'black',
        x: (n.size - a - n.stroke - n.offset) / n.size,
        y: (n.size - i - n.stroke - n.offset) / n.size,
        width: s / n.size,
        height: l / n.size,
        rx: (0.5 * l) / n.size,
        ry: (0.5 * l) / n.size,
      }),
    ],
  });
};
const avatarDecorationStatusVRMask = (e: string, t: AvatarSize) => {
  const n = getAvatarSpecs(t),
    i = +n.status,
    a = 1.5 * i,
    s = a + 2 * n.stroke,
    l = i + 2 * n.stroke,
    o = scaleIntoDecoration((n.size - a - n.stroke - n.offset) / n.size),
    c = scaleIntoDecoration((n.size - i - n.stroke - n.offset) / n.size),
    u = s / n.size / 1.2,
    _ = l / n.size / 1.2;
  return jsxs('mask', {
    id: e,
    maskContentUnits: 'objectBoundingBox',
    viewBox: '0 0 1 1',
    children: [
      jsx('rect', { fill: 'white', x: 0, y: 0, width: '100%', height: '100%' }),
      jsx('rect', {
        fill: 'black',
        x: o,
        y: c,
        width: u,
        height: _,
        rx: (0.5 * l) / n.size,
        ry: (0.5 * l) / n.size,
      }),
    ],
  });
};
const contentImageMask = (e: string, t: number, n: number, i: number) => {
  return jsxs('mask', {
    id: e,
    maskContentUnits: 'objectBoundingBox',
    viewBox: '0 0 1 1',
    children: [
      jsx('rect', { fill: 'white', x: 0, y: 0, width: '100%', height: '100%' }),
      jsx('circle', { fill: 'black', cx: (t - n / 2 + 4) / t, cy: (t - n / 2 + 4) / t, r: (n / 2 + i) / t }),
    ],
  });
};
/** Clips its children to one of the library's masks. */
export const Mask = ({
  mask,
  width = 24,
  height = 24,
  rightOverhang = 0,
  bottomOverhang = 0,
  children,
  className,
  style,
  'aria-label': ariaLabel,
  ...props
}: MaskProps) => {
  useRegisterMask(mask);
  return (
    <svg
      width={width + rightOverhang}
      height={height + bottomOverhang}
      className={clsx(styles.svg, className)}
      viewBox={`0 0 ${width + rightOverhang} ${height + bottomOverhang}`}
      style={style}
      aria-label={ariaLabel}
      {...props}
    >
      <foreignObject
        x={0}
        y={0}
        width={width}
        height={height}
        overflow="visible"
        mask={mask != null ? `url(#${mask})` : undefined}
      >
        {children}
      </foreignObject>
    </svg>
  );
};

Mask.displayName = 'Mask';
Mask.Masks = MaskIDs;

// Masks used often enough to always render.
registerMasks([
  'svg-mask-avatar-default',
  'svg-mask-squircle',
  'svg-mask-vertical-fade',
  'svg-mask-status-online',
  'svg-mask-status-online-mobile',
  'svg-mask-status-online-vr',
  'svg-mask-status-idle',
  'svg-mask-status-dnd',
  'svg-mask-status-offline',
  'svg-mask-status-streaming',
  'svg-mask-status-typing',
  'svg-mask-status-screenshare',
  'svg-mask-avatar-status-round-16',
  'svg-mask-avatar-status-round-20',
  'svg-mask-avatar-status-round-24',
  'svg-mask-avatar-status-round-32',
  'svg-mask-avatar-status-round-40',
  'svg-mask-avatar-status-round-48',
]);

// Renders the definitions of every mask a component has asked for; the client mounts it once at its root.
export const MaskLibrary = memo(() => {
  let e: string;
  let t: string;
  const n = useRegisteredMaskIds(),
    i = useMemo(() => new Set(n), [n]);
  return jsxs('svg', {
    viewBox: '0 0 1 1',
    style: { position: 'absolute', pointerEvents: 'none', top: -1, left: -1, width: 1, height: 1 },
    'aria-hidden': true,
    children: [
      i.has('svg-mask-squircle') &&
        jsx('mask', {
          id: 'svg-mask-squircle',
          maskContentUnits: 'objectBoundingBox',
          viewBox: '0 0 1 1',
          children: jsx('path', { fill: 'white', d: SQUIRCLE_PATH }),
        }),
      i.has('svg-mask-notched-squircle-16') && notchedSquircleMask('svg-mask-notched-squircle-16', 16),
      i.has('svg-mask-notched-squircle-20') && notchedSquircleMask('svg-mask-notched-squircle-20', 20),
      i.has('svg-mask-notched-squircle-24') && notchedSquircleMask('svg-mask-notched-squircle-24', 24),
      i.has('svg-mask-header-bar-badge-top') && headerBarBadgeMask('svg-mask-header-bar-badge-top', 0.25),
      i.has('svg-mask-header-bar-badge-bottom') && headerBarBadgeMask('svg-mask-header-bar-badge-bottom', 0.75),
      i.has('svg-mask-voice-user-summary-item') &&
        jsxs('mask', {
          id: 'svg-mask-voice-user-summary-item',
          maskContentUnits: 'objectBoundingBox',
          viewBox: '0 0 1 1',
          children: [
            jsx('rect', { fill: 'white', width: 1, height: 1 }),
            jsx('circle', { fill: 'black', cx: 58 / 48, cy: 0.5, r: 26 / 48 }),
          ],
        }),
      i.has('svg-mask-vertical-fade') &&
        ((e = 'svg-mask-vertical-fade'),
        (t = `${e}-gradient`),
        jsxs('mask', {
          id: e,
          maskContentUnits: 'objectBoundingBox',
          viewBox: '0 0 1 1',
          children: [
            jsxs('linearGradient', {
              id: t,
              gradientTransform: 'rotate(90)',
              x1: 0,
              x2: 1,
              y1: 0,
              y2: 0,
              children: [
                jsx('stop', { offset: '0%', stopColor: 'white' }),
                jsx('stop', { offset: '100%', stopColor: 'black' }),
              ],
            }),
            jsx('rect', { fill: `url(#${t})`, x: 0, y: 0, width: 1, height: 1 }),
          ],
        })),
      i.has('svg-mask-panel-button') &&
        jsxs('mask', {
          id: 'svg-mask-panel-button',
          maskContentUnits: 'objectBoundingBox',
          viewBox: '0 0 1 1',
          children: [
            jsx('rect', { fill: 'white', x: 0, y: 0, width: 1, height: 1 }),
            jsx('circle', { fill: 'black', cx: 0.75, cy: 0.75, r: 0.25 }),
          ],
        }),
      i.has('svg-mask-channel-call-control-button') &&
        jsxs('mask', {
          id: 'svg-mask-channel-call-control-button',
          maskContentUnits: 'objectBoundingBox',
          viewBox: '0 0 1 1',
          children: [
            jsx('circle', { fill: 'white', cx: 0.5, cy: 0.5, r: 0.5 }),
            jsx('circle', { fill: 'black', cx: 46 / 56, cy: 46 / 56, r: 0.25 }),
          ],
        }),
      i.has('svg-mask-channel-call-control-button-badge-16') &&
        callControlBadgeMask('svg-mask-channel-call-control-button-badge-16', 16),
      i.has('svg-mask-channel-call-control-button-badge-22') &&
        callControlBadgeMask('svg-mask-channel-call-control-button-badge-22', 22),
      i.has('svg-mask-channel-call-control-button-badge-29') &&
        callControlBadgeMask('svg-mask-channel-call-control-button-badge-29', 29),
      i.has('svg-mask-avatar-default') && circleMask('svg-mask-avatar-default'),
      i.has('svg-mask-avatar-status-round-16') &&
        avatarStatusRoundMask('svg-mask-avatar-status-round-16', AvatarSizes.SIZE_16),
      i.has('svg-mask-avatar-decoration-status-round-16') &&
        avatarDecorationStatusRoundMask('svg-mask-avatar-decoration-status-round-16', AvatarSizes.SIZE_16),
      i.has('svg-mask-avatar-status-mobile-16') &&
        avatarStatusMobileMask('svg-mask-avatar-status-mobile-16', AvatarSizes.SIZE_16),
      i.has('svg-mask-avatar-decoration-status-mobile-16') &&
        avatarDecorationStatusMobileMask('svg-mask-avatar-decoration-status-mobile-16', AvatarSizes.SIZE_16),
      i.has('svg-mask-avatar-status-typing-16') &&
        avatarStatusTypingMask('svg-mask-avatar-status-typing-16', AvatarSizes.SIZE_16),
      i.has('svg-mask-avatar-decoration-status-typing-16') &&
        avatarDecorationStatusTypingMask('svg-mask-avatar-decoration-status-typing-16', AvatarSizes.SIZE_16),
      i.has('svg-mask-avatar-status-round-20') &&
        avatarStatusRoundMask('svg-mask-avatar-status-round-20', AvatarSizes.SIZE_20),
      i.has('svg-mask-avatar-decoration-status-round-20') &&
        avatarDecorationStatusRoundMask('svg-mask-avatar-decoration-status-round-20', AvatarSizes.SIZE_20),
      i.has('svg-mask-avatar-status-mobile-20') &&
        avatarStatusMobileMask('svg-mask-avatar-status-mobile-20', AvatarSizes.SIZE_20),
      i.has('svg-mask-avatar-decoration-status-mobile-20') &&
        avatarDecorationStatusMobileMask('svg-mask-avatar-decoration-status-mobile-20', AvatarSizes.SIZE_20),
      i.has('svg-mask-avatar-status-typing-20') &&
        avatarStatusTypingMask('svg-mask-avatar-status-typing-20', AvatarSizes.SIZE_20),
      i.has('svg-mask-avatar-decoration-status-typing-20') &&
        avatarDecorationStatusTypingMask('svg-mask-avatar-decoration-status-typing-20', AvatarSizes.SIZE_20),
      i.has('svg-mask-avatar-status-round-24') &&
        avatarStatusRoundMask('svg-mask-avatar-status-round-24', AvatarSizes.SIZE_24),
      i.has('svg-mask-avatar-decoration-status-round-24') &&
        avatarDecorationStatusRoundMask('svg-mask-avatar-decoration-status-round-24', AvatarSizes.SIZE_24),
      i.has('svg-mask-avatar-status-mobile-24') &&
        avatarStatusMobileMask('svg-mask-avatar-status-mobile-24', AvatarSizes.SIZE_24),
      i.has('svg-mask-avatar-decoration-status-mobile-24') &&
        avatarDecorationStatusMobileMask('svg-mask-avatar-decoration-status-mobile-24', AvatarSizes.SIZE_24),
      i.has('svg-mask-avatar-status-typing-24') &&
        avatarStatusTypingMask('svg-mask-avatar-status-typing-24', AvatarSizes.SIZE_24),
      i.has('svg-mask-avatar-decoration-status-typing-24') &&
        avatarDecorationStatusTypingMask('svg-mask-avatar-decoration-status-typing-24', AvatarSizes.SIZE_24),
      i.has('svg-mask-avatar-status-round-32') &&
        avatarStatusRoundMask('svg-mask-avatar-status-round-32', AvatarSizes.SIZE_32),
      i.has('svg-mask-avatar-decoration-status-round-32') &&
        avatarDecorationStatusRoundMask('svg-mask-avatar-decoration-status-round-32', AvatarSizes.SIZE_32),
      i.has('svg-mask-avatar-status-mobile-32') &&
        avatarStatusMobileMask('svg-mask-avatar-status-mobile-32', AvatarSizes.SIZE_32),
      i.has('svg-mask-avatar-decoration-status-mobile-32') &&
        avatarDecorationStatusMobileMask('svg-mask-avatar-decoration-status-mobile-32', AvatarSizes.SIZE_32),
      i.has('svg-mask-avatar-status-typing-32') &&
        avatarStatusTypingMask('svg-mask-avatar-status-typing-32', AvatarSizes.SIZE_32),
      i.has('svg-mask-avatar-decoration-status-typing-32') &&
        avatarDecorationStatusTypingMask('svg-mask-avatar-decoration-status-typing-32', AvatarSizes.SIZE_32),
      i.has('svg-mask-avatar-status-round-40') &&
        avatarStatusRoundMask('svg-mask-avatar-status-round-40', AvatarSizes.SIZE_40),
      i.has('svg-mask-avatar-decoration-status-round-40') &&
        avatarDecorationStatusRoundMask('svg-mask-avatar-decoration-status-round-40', AvatarSizes.SIZE_40),
      i.has('svg-mask-avatar-status-mobile-40') &&
        avatarStatusMobileMask('svg-mask-avatar-status-mobile-40', AvatarSizes.SIZE_40),
      i.has('svg-mask-avatar-decoration-status-mobile-40') &&
        avatarDecorationStatusMobileMask('svg-mask-avatar-decoration-status-mobile-40', AvatarSizes.SIZE_40),
      i.has('svg-mask-avatar-status-typing-40') &&
        avatarStatusTypingMask('svg-mask-avatar-status-typing-40', AvatarSizes.SIZE_40),
      i.has('svg-mask-avatar-decoration-status-typing-40') &&
        avatarDecorationStatusTypingMask('svg-mask-avatar-decoration-status-typing-40', AvatarSizes.SIZE_40),
      i.has('svg-mask-avatar-status-round-44') &&
        avatarStatusRoundMask('svg-mask-avatar-status-round-44', AvatarSizes.SIZE_44),
      i.has('svg-mask-avatar-decoration-status-round-44') &&
        avatarDecorationStatusRoundMask('svg-mask-avatar-decoration-status-round-44', AvatarSizes.SIZE_44),
      i.has('svg-mask-avatar-status-mobile-44') &&
        avatarStatusMobileMask('svg-mask-avatar-status-mobile-44', AvatarSizes.SIZE_44),
      i.has('svg-mask-avatar-decoration-status-mobile-44') &&
        avatarDecorationStatusMobileMask('svg-mask-avatar-decoration-status-mobile-44', AvatarSizes.SIZE_44),
      i.has('svg-mask-avatar-status-typing-44') &&
        avatarStatusTypingMask('svg-mask-avatar-status-typing-44', AvatarSizes.SIZE_44),
      i.has('svg-mask-avatar-decoration-status-typing-44') &&
        avatarDecorationStatusTypingMask('svg-mask-avatar-decoration-status-typing-44', AvatarSizes.SIZE_44),
      i.has('svg-mask-avatar-status-round-48') &&
        avatarStatusRoundMask('svg-mask-avatar-status-round-48', AvatarSizes.SIZE_48),
      i.has('svg-mask-avatar-decoration-status-round-48') &&
        avatarDecorationStatusRoundMask('svg-mask-avatar-decoration-status-round-48', AvatarSizes.SIZE_48),
      i.has('svg-mask-avatar-status-mobile-48') &&
        avatarStatusMobileMask('svg-mask-avatar-status-mobile-48', AvatarSizes.SIZE_48),
      i.has('svg-mask-avatar-decoration-status-mobile-48') &&
        avatarDecorationStatusMobileMask('svg-mask-avatar-decoration-status-mobile-48', AvatarSizes.SIZE_48),
      i.has('svg-mask-avatar-status-typing-48') &&
        avatarStatusTypingMask('svg-mask-avatar-status-typing-48', AvatarSizes.SIZE_48),
      i.has('svg-mask-avatar-decoration-status-typing-48') &&
        avatarDecorationStatusTypingMask('svg-mask-avatar-decoration-status-typing-48', AvatarSizes.SIZE_48),
      i.has('svg-mask-avatar-status-round-56') &&
        avatarStatusRoundMask('svg-mask-avatar-status-round-56', AvatarSizes.SIZE_56),
      i.has('svg-mask-avatar-decoration-status-round-56') &&
        avatarDecorationStatusRoundMask('svg-mask-avatar-decoration-status-round-56', AvatarSizes.SIZE_56),
      i.has('svg-mask-avatar-status-mobile-56') &&
        avatarStatusMobileMask('svg-mask-avatar-status-mobile-56', AvatarSizes.SIZE_56),
      i.has('svg-mask-avatar-decoration-status-mobile-56') &&
        avatarDecorationStatusMobileMask('svg-mask-avatar-decoration-status-mobile-56', AvatarSizes.SIZE_56),
      i.has('svg-mask-avatar-status-typing-56') &&
        avatarStatusTypingMask('svg-mask-avatar-status-typing-56', AvatarSizes.SIZE_56),
      i.has('svg-mask-avatar-decoration-status-typing-56') &&
        avatarDecorationStatusTypingMask('svg-mask-avatar-decoration-status-typing-56', AvatarSizes.SIZE_56),
      i.has('svg-mask-avatar-status-round-72') &&
        avatarStatusRoundMask('svg-mask-avatar-status-round-72', AvatarSizes.SIZE_72),
      i.has('svg-mask-avatar-decoration-status-round-72') &&
        avatarDecorationStatusRoundMask('svg-mask-avatar-decoration-status-round-72', AvatarSizes.SIZE_72),
      i.has('svg-mask-avatar-status-mobile-72') &&
        avatarStatusMobileMask('svg-mask-avatar-status-mobile-72', AvatarSizes.SIZE_72),
      i.has('svg-mask-avatar-decoration-status-mobile-72') &&
        avatarDecorationStatusMobileMask('svg-mask-avatar-decoration-status-mobile-72', AvatarSizes.SIZE_72),
      i.has('svg-mask-avatar-status-typing-72') &&
        avatarStatusTypingMask('svg-mask-avatar-status-typing-72', AvatarSizes.SIZE_72),
      i.has('svg-mask-avatar-decoration-status-typing-72') &&
        avatarDecorationStatusTypingMask('svg-mask-avatar-decoration-status-typing-72', AvatarSizes.SIZE_72),
      i.has('svg-mask-avatar-status-round-80') &&
        avatarStatusRoundMask('svg-mask-avatar-status-round-80', AvatarSizes.SIZE_80),
      i.has('svg-mask-avatar-decoration-status-round-80') &&
        avatarDecorationStatusRoundMask('svg-mask-avatar-decoration-status-round-80', AvatarSizes.SIZE_80),
      i.has('svg-mask-avatar-status-mobile-80') &&
        avatarStatusMobileMask('svg-mask-avatar-status-mobile-80', AvatarSizes.SIZE_80),
      i.has('svg-mask-avatar-decoration-status-mobile-80') &&
        avatarDecorationStatusMobileMask('svg-mask-avatar-decoration-status-mobile-80', AvatarSizes.SIZE_80),
      i.has('svg-mask-avatar-status-typing-80') &&
        avatarStatusTypingMask('svg-mask-avatar-status-typing-80', AvatarSizes.SIZE_80),
      i.has('svg-mask-avatar-decoration-status-typing-80') &&
        avatarDecorationStatusTypingMask('svg-mask-avatar-decoration-status-typing-80', AvatarSizes.SIZE_80),
      i.has('svg-mask-avatar-status-round-96') &&
        avatarStatusRoundMask('svg-mask-avatar-status-round-96', AvatarSizes.SIZE_96),
      i.has('svg-mask-avatar-decoration-status-round-96') &&
        avatarDecorationStatusRoundMask('svg-mask-avatar-decoration-status-round-96', AvatarSizes.SIZE_96),
      i.has('svg-mask-avatar-status-mobile-96') &&
        avatarStatusMobileMask('svg-mask-avatar-status-mobile-96', AvatarSizes.SIZE_96),
      i.has('svg-mask-avatar-decoration-status-mobile-96') &&
        avatarDecorationStatusMobileMask('svg-mask-avatar-decoration-status-mobile-96', AvatarSizes.SIZE_96),
      i.has('svg-mask-avatar-status-typing-96') &&
        avatarStatusTypingMask('svg-mask-avatar-status-typing-96', AvatarSizes.SIZE_96),
      i.has('svg-mask-avatar-decoration-status-typing-96') &&
        avatarDecorationStatusTypingMask('svg-mask-avatar-decoration-status-typing-96', AvatarSizes.SIZE_96),
      i.has('svg-mask-avatar-status-round-120') &&
        avatarStatusRoundMask('svg-mask-avatar-status-round-120', AvatarSizes.SIZE_120),
      i.has('svg-mask-avatar-decoration-status-round-120') &&
        avatarDecorationStatusRoundMask('svg-mask-avatar-decoration-status-round-120', AvatarSizes.SIZE_120),
      i.has('svg-mask-avatar-status-mobile-120') &&
        avatarStatusMobileMask('svg-mask-avatar-status-mobile-120', AvatarSizes.SIZE_120),
      i.has('svg-mask-avatar-decoration-status-mobile-120') &&
        avatarDecorationStatusMobileMask('svg-mask-avatar-decoration-status-mobile-120', AvatarSizes.SIZE_120),
      i.has('svg-mask-avatar-status-typing-120') &&
        avatarStatusTypingMask('svg-mask-avatar-status-typing-120', AvatarSizes.SIZE_120),
      i.has('svg-mask-avatar-decoration-status-typing-120') &&
        avatarDecorationStatusTypingMask('svg-mask-avatar-decoration-status-typing-120', AvatarSizes.SIZE_120),
      i.has('svg-mask-avatar-status-vr-16') && avatarStatusVRMask('svg-mask-avatar-status-vr-16', AvatarSizes.SIZE_16),
      i.has('svg-mask-avatar-decoration-status-vr-16') &&
        avatarDecorationStatusVRMask('svg-mask-avatar-decoration-status-vr-16', AvatarSizes.SIZE_16),
      i.has('svg-mask-avatar-status-vr-20') && avatarStatusVRMask('svg-mask-avatar-status-vr-20', AvatarSizes.SIZE_20),
      i.has('svg-mask-avatar-decoration-status-vr-20') &&
        avatarDecorationStatusVRMask('svg-mask-avatar-decoration-status-vr-20', AvatarSizes.SIZE_20),
      i.has('svg-mask-avatar-status-vr-24') && avatarStatusVRMask('svg-mask-avatar-status-vr-24', AvatarSizes.SIZE_24),
      i.has('svg-mask-avatar-decoration-status-vr-24') &&
        avatarDecorationStatusVRMask('svg-mask-avatar-decoration-status-vr-24', AvatarSizes.SIZE_24),
      i.has('svg-mask-avatar-status-vr-32') && avatarStatusVRMask('svg-mask-avatar-status-vr-32', AvatarSizes.SIZE_32),
      i.has('svg-mask-avatar-decoration-status-vr-32') &&
        avatarDecorationStatusVRMask('svg-mask-avatar-decoration-status-vr-32', AvatarSizes.SIZE_32),
      i.has('svg-mask-avatar-status-vr-40') && avatarStatusVRMask('svg-mask-avatar-status-vr-40', AvatarSizes.SIZE_40),
      i.has('svg-mask-avatar-decoration-status-vr-40') &&
        avatarDecorationStatusVRMask('svg-mask-avatar-decoration-status-vr-40', AvatarSizes.SIZE_40),
      i.has('svg-mask-avatar-status-vr-44') && avatarStatusVRMask('svg-mask-avatar-status-vr-44', AvatarSizes.SIZE_44),
      i.has('svg-mask-avatar-decoration-status-vr-44') &&
        avatarDecorationStatusVRMask('svg-mask-avatar-decoration-status-vr-44', AvatarSizes.SIZE_44),
      i.has('svg-mask-avatar-status-vr-48') && avatarStatusVRMask('svg-mask-avatar-status-vr-48', AvatarSizes.SIZE_48),
      i.has('svg-mask-avatar-decoration-status-vr-48') &&
        avatarDecorationStatusVRMask('svg-mask-avatar-decoration-status-vr-48', AvatarSizes.SIZE_48),
      i.has('svg-mask-avatar-status-vr-56') && avatarStatusVRMask('svg-mask-avatar-status-vr-56', AvatarSizes.SIZE_56),
      i.has('svg-mask-avatar-decoration-status-vr-56') &&
        avatarDecorationStatusVRMask('svg-mask-avatar-decoration-status-vr-56', AvatarSizes.SIZE_56),
      i.has('svg-mask-avatar-status-vr-72') && avatarStatusVRMask('svg-mask-avatar-status-vr-72', AvatarSizes.SIZE_72),
      i.has('svg-mask-avatar-decoration-status-vr-72') &&
        avatarDecorationStatusVRMask('svg-mask-avatar-decoration-status-vr-72', AvatarSizes.SIZE_72),
      i.has('svg-mask-avatar-status-vr-80') && avatarStatusVRMask('svg-mask-avatar-status-vr-80', AvatarSizes.SIZE_80),
      i.has('svg-mask-avatar-decoration-status-vr-80') &&
        avatarDecorationStatusVRMask('svg-mask-avatar-decoration-status-vr-80', AvatarSizes.SIZE_80),
      i.has('svg-mask-avatar-status-vr-96') && avatarStatusVRMask('svg-mask-avatar-status-vr-96', AvatarSizes.SIZE_96),
      i.has('svg-mask-avatar-decoration-status-vr-96') &&
        avatarDecorationStatusVRMask('svg-mask-avatar-decoration-status-vr-96', AvatarSizes.SIZE_96),
      i.has('svg-mask-avatar-status-vr-120') &&
        avatarStatusVRMask('svg-mask-avatar-status-vr-120', AvatarSizes.SIZE_120),
      i.has('svg-mask-avatar-decoration-status-vr-120') &&
        avatarDecorationStatusVRMask('svg-mask-avatar-decoration-status-vr-120', AvatarSizes.SIZE_120),
      i.has('svg-mask-diagonal-facepile-16') && facepileMask('svg-mask-diagonal-facepile-16', AvatarSizes.SIZE_16),
      i.has('svg-mask-diagonal-facepile-back-16') &&
        facepileBackMask('svg-mask-diagonal-facepile-back-16', AvatarSizes.SIZE_16),
      i.has('svg-mask-diagonal-facepile-status-16') &&
        facepileStatusMask('svg-mask-diagonal-facepile-status-16', AvatarSizes.SIZE_16),
      i.has('svg-mask-diagonal-facepile-typing-16') &&
        facepileTypingMask('svg-mask-diagonal-facepile-typing-16', AvatarSizes.SIZE_16),
      i.has('svg-mask-diagonal-facepile-20') && facepileMask('svg-mask-diagonal-facepile-20', AvatarSizes.SIZE_20),
      i.has('svg-mask-diagonal-facepile-back-20') &&
        facepileBackMask('svg-mask-diagonal-facepile-back-20', AvatarSizes.SIZE_20),
      i.has('svg-mask-diagonal-facepile-status-20') &&
        facepileStatusMask('svg-mask-diagonal-facepile-status-20', AvatarSizes.SIZE_20),
      i.has('svg-mask-diagonal-facepile-typing-20') &&
        facepileTypingMask('svg-mask-diagonal-facepile-typing-20', AvatarSizes.SIZE_20),
      i.has('svg-mask-diagonal-facepile-24') && facepileMask('svg-mask-diagonal-facepile-24', AvatarSizes.SIZE_24),
      i.has('svg-mask-diagonal-facepile-back-24') &&
        facepileBackMask('svg-mask-diagonal-facepile-back-24', AvatarSizes.SIZE_24),
      i.has('svg-mask-diagonal-facepile-status-24') &&
        facepileStatusMask('svg-mask-diagonal-facepile-status-24', AvatarSizes.SIZE_24),
      i.has('svg-mask-diagonal-facepile-typing-24') &&
        facepileTypingMask('svg-mask-diagonal-facepile-typing-24', AvatarSizes.SIZE_24),
      i.has('svg-mask-diagonal-facepile-32') && facepileMask('svg-mask-diagonal-facepile-32', AvatarSizes.SIZE_32),
      i.has('svg-mask-diagonal-facepile-back-32') &&
        facepileBackMask('svg-mask-diagonal-facepile-back-32', AvatarSizes.SIZE_32),
      i.has('svg-mask-diagonal-facepile-status-32') &&
        facepileStatusMask('svg-mask-diagonal-facepile-status-32', AvatarSizes.SIZE_32),
      i.has('svg-mask-diagonal-facepile-typing-32') &&
        facepileTypingMask('svg-mask-diagonal-facepile-typing-32', AvatarSizes.SIZE_32),
      i.has('svg-mask-diagonal-facepile-40') && facepileMask('svg-mask-diagonal-facepile-40', AvatarSizes.SIZE_40),
      i.has('svg-mask-diagonal-facepile-back-40') &&
        facepileBackMask('svg-mask-diagonal-facepile-back-40', AvatarSizes.SIZE_40),
      i.has('svg-mask-diagonal-facepile-status-40') &&
        facepileStatusMask('svg-mask-diagonal-facepile-status-40', AvatarSizes.SIZE_40),
      i.has('svg-mask-diagonal-facepile-typing-40') &&
        facepileTypingMask('svg-mask-diagonal-facepile-typing-40', AvatarSizes.SIZE_40),
      i.has('svg-mask-diagonal-facepile-48') && facepileMask('svg-mask-diagonal-facepile-48', AvatarSizes.SIZE_48),
      i.has('svg-mask-diagonal-facepile-back-48') &&
        facepileBackMask('svg-mask-diagonal-facepile-back-48', AvatarSizes.SIZE_48),
      i.has('svg-mask-diagonal-facepile-status-48') &&
        facepileStatusMask('svg-mask-diagonal-facepile-status-48', AvatarSizes.SIZE_48),
      i.has('svg-mask-diagonal-facepile-typing-48') &&
        facepileTypingMask('svg-mask-diagonal-facepile-typing-48', AvatarSizes.SIZE_48),
      i.has('svg-mask-diagonal-facepile-56') && facepileMask('svg-mask-diagonal-facepile-56', AvatarSizes.SIZE_56),
      i.has('svg-mask-diagonal-facepile-back-56') &&
        facepileBackMask('svg-mask-diagonal-facepile-back-56', AvatarSizes.SIZE_56),
      i.has('svg-mask-diagonal-facepile-status-56') &&
        facepileStatusMask('svg-mask-diagonal-facepile-status-56', AvatarSizes.SIZE_56),
      i.has('svg-mask-diagonal-facepile-typing-56') &&
        facepileTypingMask('svg-mask-diagonal-facepile-typing-56', AvatarSizes.SIZE_56),
      i.has('svg-mask-diagonal-facepile-72') && facepileMask('svg-mask-diagonal-facepile-72', AvatarSizes.SIZE_72),
      i.has('svg-mask-diagonal-facepile-back-72') &&
        facepileBackMask('svg-mask-diagonal-facepile-back-72', AvatarSizes.SIZE_72),
      i.has('svg-mask-diagonal-facepile-status-72') &&
        facepileStatusMask('svg-mask-diagonal-facepile-status-72', AvatarSizes.SIZE_72),
      i.has('svg-mask-diagonal-facepile-typing-72') &&
        facepileTypingMask('svg-mask-diagonal-facepile-typing-72', AvatarSizes.SIZE_72),
      i.has('svg-mask-diagonal-facepile-80') && facepileMask('svg-mask-diagonal-facepile-80', AvatarSizes.SIZE_80),
      i.has('svg-mask-diagonal-facepile-back-80') &&
        facepileBackMask('svg-mask-diagonal-facepile-back-80', AvatarSizes.SIZE_80),
      i.has('svg-mask-diagonal-facepile-status-80') &&
        facepileStatusMask('svg-mask-diagonal-facepile-status-80', AvatarSizes.SIZE_80),
      i.has('svg-mask-diagonal-facepile-typing-80') &&
        facepileTypingMask('svg-mask-diagonal-facepile-typing-80', AvatarSizes.SIZE_80),
      i.has('svg-mask-diagonal-facepile-96') && facepileMask('svg-mask-diagonal-facepile-96', AvatarSizes.SIZE_96),
      i.has('svg-mask-diagonal-facepile-back-96') &&
        facepileBackMask('svg-mask-diagonal-facepile-back-96', AvatarSizes.SIZE_96),
      i.has('svg-mask-diagonal-facepile-status-96') &&
        facepileStatusMask('svg-mask-diagonal-facepile-status-96', AvatarSizes.SIZE_96),
      i.has('svg-mask-diagonal-facepile-typing-96') &&
        facepileTypingMask('svg-mask-diagonal-facepile-typing-96', AvatarSizes.SIZE_96),
      i.has('svg-mask-diagonal-facepile-120') && facepileMask('svg-mask-diagonal-facepile-120', AvatarSizes.SIZE_120),
      i.has('svg-mask-diagonal-facepile-back-120') &&
        facepileBackMask('svg-mask-diagonal-facepile-back-120', AvatarSizes.SIZE_120),
      i.has('svg-mask-diagonal-facepile-status-120') &&
        facepileStatusMask('svg-mask-diagonal-facepile-status-120', AvatarSizes.SIZE_120),
      i.has('svg-mask-diagonal-facepile-typing-120') &&
        facepileTypingMask('svg-mask-diagonal-facepile-typing-120', AvatarSizes.SIZE_120),
      i.has('svg-mask-status-online-mobile') &&
        jsxs('mask', {
          id: 'svg-mask-status-online-mobile',
          maskContentUnits: 'objectBoundingBox',
          viewBox: '0 0 1 1',
          children: [
            jsx('rect', { fill: 'white', x: 0, y: 0, width: 1, height: 1, rx: 0.1875, ry: 0.125 }),
            jsx('rect', { fill: 'black', x: 1 / 8, y: 2 / 12, width: 0.75, height: 0.5 }),
            jsx('ellipse', { fill: 'black', cx: 0.5, cy: 10 / 12, rx: 1 / 8, ry: 1 / 12 }),
          ],
        }),
      i.has('svg-mask-status-online-vr') &&
        jsx('mask', {
          id: 'svg-mask-status-online-vr',
          maskContentUnits: 'objectBoundingBox',
          viewBox: '0 0 1 1',
          children: jsxs('svg', {
            viewBox: '0 4 24 16',
            width: '1',
            height: '1',
            preserveAspectRatio: 'none',
            children: [
              jsx('path', {
                fill: 'white',
                d: 'M8.46 8.64a1 1 0 0 1 1 1c0 .44-.3.8-.72.92l-.11.07c-.08.06-.2.19-.2.41a.99.99 0 0 1-.98.86h-.06a1 1 0 0 1-.94-1.05l.02-.32c.05-1.06.92-1.9 1.99-1.9Z',
              }),
              jsx('path', {
                fill: 'white',
                fillRule: 'evenodd',
                clipRule: 'evenodd',
                d: 'M15.55 5a5.5 5.5 0 0 1 5.15 3.67h.3a2 2 0 0 1 2 2v3.18a2 2 0 0 1-2 1.99h-.2A4.54 4.54 0 0 1 16.55 19a4.45 4.45 0 0 1-3.6-1.83 1.2 1.2 0 0 0-1.9 0 4.44 4.44 0 0 1-3.9 1.82 4.54 4.54 0 0 1-3.94-3.15H3a2 2 0 0 1-2-2v-3.18c0-1.1.9-1.99 2-1.99h.3A5.5 5.5 0 0 1 8.46 5h7.09Zm-7.1 2C6.6 7 5.06 8.5 4.97 10.41l-.02.66v3.18c0 1.43 1.05 2.66 2.34 2.74.85.06 1.63-.32 2.14-1.01a3.2 3.2 0 0 1 2.57-1.3c1 0 1.97.48 2.57 1.3.5.69 1.3 1.08 2.14 1.01 1.3-.08 2.34-1.31 2.34-2.74l-.02-3.84a3.54 3.54 0 0 0-3.49-3.43H8.45Z',
              }),
            ],
          }),
        }),
      i.has('svg-mask-status-online') && circleMask('svg-mask-status-online'),
      i.has('svg-mask-status-idle') &&
        jsxs('mask', {
          id: 'svg-mask-status-idle',
          maskContentUnits: 'objectBoundingBox',
          viewBox: '0 0 1 1',
          children: [
            jsx('circle', { fill: 'white', cx: 0.5, cy: 0.5, r: 0.5 }),
            jsx('circle', { fill: 'black', cx: 0.25, cy: 0.25, r: 3 / 8 }),
          ],
        }),
      i.has('svg-mask-status-dnd') &&
        jsxs('mask', {
          id: 'svg-mask-status-dnd',
          maskContentUnits: 'objectBoundingBox',
          viewBox: '0 0 1 1',
          children: [
            jsx('circle', { fill: 'white', cx: 0.5, cy: 0.5, r: 0.5 }),
            jsx('rect', {
              fill: 'black',
              x: 1 / 8,
              y: 3 / 8,
              width: 0.75,
              height: 0.25,
              rx: 1 / 8,
              ry: 1 / 8,
            }),
          ],
        }),
      i.has('svg-mask-status-offline') &&
        jsxs('mask', {
          id: 'svg-mask-status-offline',
          maskContentUnits: 'objectBoundingBox',
          viewBox: '0 0 1 1',
          children: [
            jsx('circle', { fill: 'white', cx: 0.5, cy: 0.5, r: 0.5 }),
            jsx('circle', { fill: 'black', cx: 0.5, cy: 0.5, r: 0.25 }),
          ],
        }),
      i.has('svg-mask-status-streaming') &&
        jsxs('mask', {
          id: 'svg-mask-status-streaming',
          maskContentUnits: 'objectBoundingBox',
          viewBox: '0 0 1 1',
          children: [
            jsx('circle', { fill: 'white', cx: 0.5, cy: 0.5, r: 0.5 }),
            jsx('polygon', { fill: 'black', points: '0.35,0.25 0.78301275,0.5 0.35,0.75' }),
          ],
        }),
      i.has('svg-mask-status-typing') &&
        jsx('mask', {
          id: 'svg-mask-status-typing',
          maskContentUnits: 'objectBoundingBox',
          viewBox: '0 0 1 1',
          children: jsx('rect', { fill: 'white', cx: 0, cy: 0, width: 1, height: 1, ry: 0.5, rx: 0.2 }),
        }),
      i.has('svg-mask-status-screenshare') &&
        jsxs('mask', {
          id: 'svg-mask-status-screenshare',
          maskContentUnits: 'objectBoundingBox',
          viewBox: '0 0 1 1',
          children: [
            jsx('rect', { width: '1', height: '1', fill: 'white' }),
            jsx('path', {
              d: 'M0.5 0.71875C0.5 0.649716 0.555966 0.59375 0.625 0.59375H1.0V1.0H0.5V0.71875Z',
              fill: 'black',
            }),
          ],
        }),
      Object.entries(AvatarCallMasks).map((e) => {
        const [t, n] = e as [AvatarSize, string];
        return i.has(n) && avatarCallMask(n, t);
      }),
      Object.entries(AvatarCallStatusMasks).map((e) => {
        const [t, n] = e as [AvatarSize, string];
        return i.has(n) && avatarCallMask(n, t, { withBottomRightStatus: true });
      }),
      Object.entries(AvatarCallIconMasks).map((e) => {
        const [t, n] = e as [AvatarSize, string];
        return i.has(n) && avatarCallMask(n, t, { withTopRightStatus: true });
      }),
      Object.entries(AvatarCallIconStatusMasks).map((e) => {
        const [t, n] = e as [AvatarSize, string];
        return i.has(n) && avatarCallMask(n, t, { withBottomRightStatus: true, withTopRightStatus: true });
      }),
      Object.entries(AvatarDecorationVoiceCallMasks).map((e) => {
        const [t, n] = e as [AvatarSize, string];
        return i.has(n) && avatarDecorationCallMask(n, t);
      }),
      Object.entries(AvatarDecorationCallStatusMasks).map((e) => {
        const [t, n] = e as [AvatarSize, string];
        return i.has(n) && avatarDecorationCallMask(n, t, { withBottomRightStatus: true });
      }),
      Object.entries(AvatarDecorationCallIconMasks).map((e) => {
        const [t, n] = e as [AvatarSize, string];
        return i.has(n) && avatarDecorationCallMask(n, t, { withTopRightStatus: true });
      }),
      Object.entries(AvatarDecorationCallIconStatusMasks).map((e) => {
        const [t, n] = e as [AvatarSize, string];
        return i.has(n) && avatarDecorationCallMask(n, t, { withBottomRightStatus: true, withTopRightStatus: true });
      }),
      i.has('svg-mask-sticker-rounded-rect') &&
        jsx('mask', {
          id: 'svg-mask-sticker-rounded-rect',
          maskContentUnits: 'objectBoundingBox',
          viewBox: '0 0 1 1',
          children: jsx('path', {
            d: 'M0 0.26087C0 0.137894 0 0.0764069 0.0382035 0.0382035C0.0764069 0 0.137894 0 0.26087 0H0.73913C0.862106 0 0.923593 0 0.961797 0.0382035C1 0.0764069 1 0.137894 1 0.26087V0.73913C1 0.862106 1 0.923593 0.961797 0.961797C0.923593 1 0.862106 1 0.73913 1H0.26087C0.137894 1 0.0764069 1 0.0382035 0.961797C0 0.923593 0 0.862106 0 0.73913V0.26087Z',
            fill: 'white',
          }),
        }),
      i.has('svg-mask-chat-input-button-notification') &&
        jsxs('mask', {
          id: 'svg-mask-chat-input-button-notification',
          maskContentUnits: 'objectBoundingBox',
          viewBox: '0 0 1 1',
          children: [
            jsx('rect', { width: '1', height: '1', fill: 'white' }),
            jsx('circle', { cx: '0.85', cy: '0.85', r: '0.25', fill: 'black' }),
          ],
        }),
      i.has('svg-mask-sticker-shop-notification') &&
        jsxs('mask', {
          id: 'svg-mask-sticker-shop-notification',
          maskContentUnits: 'objectBoundingBox',
          viewBox: '0 0 1 1',
          children: [
            jsx('rect', { width: '1', height: '1', fill: 'white' }),
            jsx('circle', { cx: '0.9', cy: '0.9', r: '0.5', fill: 'black' }),
          ],
        }),
      i.has('svg-mask-autocomplete-emoji-upsell-emoji') &&
        jsxs('mask', {
          id: 'svg-mask-autocomplete-emoji-upsell-emoji',
          maskContentUnits: 'objectBoundingBox',
          viewBox: '0 0 1 1',
          children: [
            jsx('rect', { fill: 'white', width: 1, height: 1 }),
            jsx('circle', { fill: 'black', cx: 1.33, cy: 0.5, r: 14 / 24 }),
          ],
        }),
      i.has('svg-mask-event-ticket') &&
        jsx('mask', {
          id: 'svg-mask-event-ticket',
          maskContentUnits: 'objectBoundingBox',
          viewBox: '0 0 1 1',
          children: jsx('path', {
            d: 'M0 0.12C0 0.0779961 0 0.0569941 0.00408726 0.0409507C0.00768251 0.0268386 0.0134193 0.015365 0.0204754 0.00817451C0.028497 0 0.038998 0 0.06 0H0.94C0.961002 0 0.971503 0 0.979525 0.00817451C0.986581 0.015365 0.992318 0.0268386 0.995913 0.0409507C1 0.0569941 1 0.0779961 1 0.12V0.45C0.986193 0.45 0.975 0.472386 0.975 0.5C0.975 0.527614 0.986193 0.55 1 0.55V0.88C1 0.922004 1 0.943006 0.995913 0.959049C0.992318 0.973161 0.986581 0.984635 0.979525 0.991826C0.971503 1 0.961002 1 0.94 1H0.0600001C0.0389981 1 0.028497 1 0.0204754 0.991826C0.0134193 0.984635 0.00768251 0.973161 0.00408726 0.959049C0 0.943006 0 0.922004 0 0.88V0.55C0.0138071 0.55 0.025 0.527614 0.025 0.5C0.025 0.472386 0.0138071 0.45 0 0.45V0.12Z',
            fill: 'white',
          }),
        }),
      i.has('svg-mask-guild-icon-with-channel-type') &&
        jsxs('mask', {
          id: 'svg-mask-guild-icon-with-channel-type',
          maskContentUnits: 'objectBoundingBox',
          viewBox: '0 0 1 1',
          children: [
            jsx('path', {
              fill: 'white',
              d: 'M0 0.464C0 0.301585 0 0.220377 0.0316081 0.158343C0.0594114 0.103776 0.103776 0.0594114 0.158343 0.0316081C0.220377 0 0.301585 0 0.464 0H0.536C0.698415 0 0.779623 0 0.841657 0.0316081C0.896224 0.0594114 0.940589 0.103776 0.968392 0.158343C1 0.220377 1 0.301585 1 0.464V0.536C1 0.698415 1 0.779623 0.968392 0.841657C0.940589 0.896224 0.896224 0.940589 0.841657 0.968392C0.779623 1 0.698415 1 0.536 1H0.464C0.301585 1 0.220377 1 0.158343 0.968392C0.103776 0.940589 0.0594114 0.896224 0.0316081 0.841657C0 0.779623 0 0.698415 0 0.536V0.464Z',
            }),
            jsx('circle', { cx: '0.9', cy: '0.9', r: '0.5', fill: 'black' }),
          ],
        }),
      i.has('svg-mask-channel-icon-with-guild-icon') &&
        jsxs('mask', {
          id: 'svg-mask-channel-icon-with-guild-icon',
          maskContentUnits: 'objectBoundingBox',
          viewBox: '0 0 1 1',
          children: [
            jsx('path', {
              fill: 'white',
              d: 'M0 0.464C0 0.301585 0 0.220377 0.0316081 0.158343C0.0594114 0.103776 0.103776 0.0594114 0.158343 0.0316081C0.220377 0 0.301585 0 0.464 0H0.536C0.698415 0 0.779623 0 0.841657 0.0316081C0.896224 0.0594114 0.940589 0.103776 0.968392 0.158343C1 0.220377 1 0.301585 1 0.464V0.536C1 0.698415 1 0.779623 0.968392 0.841657C0.940589 0.896224 0.896224 0.940589 0.841657 0.968392C0.779623 1 0.698415 1 0.536 1H0.464C0.301585 1 0.220377 1 0.158343 0.968392C0.103776 0.940589 0.0594114 0.896224 0.0316081 0.841657C0 0.779623 0 0.698415 0 0.536V0.464Z',
            }),
            jsx('path', {
              fill: 'black',
              d: 'M0 0.464C0 0.301585 0 0.220377 0.0316081 0.158343C0.0594114 0.103776 0.103776 0.0594114 0.158343 0.0316081C0.220377 0 0.301585 0 0.464 0H0.536C0.698415 0 0.779623 0 0.841657 0.0316081C0.896224 0.0594114 0.940589 0.103776 0.968392 0.158343C1 0.220377 1 0.301585 1 0.464V0.536C1 0.698415 1 0.779623 0.968392 0.841657C0.940589 0.896224 0.896224 0.940589 0.841657 0.968392C0.779623 1 0.698415 1 0.536 1H0.464C0.301585 1 0.220377 1 0.158343 0.968392C0.103776 0.940589 0.0594114 0.896224 0.0316081 0.841657C0 0.779623 0 0.698415 0 0.536V0.464Z',
              transform: 'translate(0.45 0.45)',
            }),
          ],
        }),
      i.has('svg-mask-content-inventory-card-face-pile-avatar') &&
        jsxs('mask', {
          id: 'svg-mask-content-inventory-card-face-pile-avatar',
          maskContentUnits: 'objectBoundingBox',
          viewBox: '0 0 1 1',
          children: [
            jsx('rect', { fill: 'white', width: 1, height: 1 }),
            jsx('circle', { fill: 'black', cx: 1.33, cy: 0.5, r: 0.65 }),
          ],
        }),
      i.has('svg-mask-guild-popout-activity-icon') &&
        jsxs('mask', {
          id: 'svg-mask-guild-popout-activity-icon',
          maskContentUnits: 'objectBoundingBox',
          viewBox: '0 0 1 1',
          children: [
            jsx('rect', { fill: 'white', x: 0, y: 0, width: '100%', height: '100%' }),
            jsx('circle', { fill: 'black', cx: 1.33, cy: 0.5, r: 0.6 }),
          ],
        }),
      i.has('svg-mask-clan-icon') &&
        jsx('mask', {
          id: 'svg-mask-clan-icon',
          maskContentUnits: 'objectBoundingBox',
          viewBox: '0 0 1 1',
          children: jsx('rect', { fill: 'white', rx: 0.3, ry: 0.3, width: 1, height: 1 }),
        }),
      i.has('svg-mask-badged-guild-icon') &&
        jsxs('mask', {
          id: 'svg-mask-badged-guild-icon',
          maskContentUnits: 'objectBoundingBox',
          viewBox: '0 0 1 1',
          children: [
            jsx('rect', { x: 0, y: 0, width: 1, height: 1, fill: 'white' }),
            jsx('circle', { cx: 0.85, cy: 0.15, r: 0.25, fill: 'black' }),
          ],
        }),
      i.has('svg-mask-forward-attachment-pile-overflow') &&
        jsx('mask', {
          id: 'svg-mask-forward-attachment-pile-overflow',
          maskContentUnits: 'objectBoundingBox',
          viewBox: '0 0 1 1',
          children: jsx('path', {
            d: 'M0.142857 0C0.0639593 0 0 0.0639593 0 0.142857V0.857143C0 0.936041 0.0639593 1 0.142857 1H0.554564C0.520632 0.962089 0.5 0.912025 0.5 0.857143V0.714286C0.5 0.595939 0.595939 0.5 0.714286 0.5H0.857143C0.912025 0.5 0.962089 0.520632 1 0.554564V0.142857C1 0.0639593 0.936041 0 0.857143 0H0.142857Z',
            fill: 'white',
          }),
        }),
      i.has('svg-mask-content-image-60') && contentImageMask('svg-mask-content-image-60', 60, 24, 2),
      i.has('svg-mask-content-image-72') && contentImageMask('svg-mask-content-image-72', 72, 32, 4),
      i.has('svg-mask-content-image-100') && contentImageMask('svg-mask-content-image-100', 100, 32, 4),
      i.has('svg-mask-user-avatar-with-game-icon') &&
        jsx('mask', {
          id: 'svg-mask-user-avatar-with-game-icon',
          maskContentUnits: 'objectBoundingBox',
          viewBox: '0 0 1 1',
          children: jsx('rect', { fill: 'white', rx: 0.3, ry: 0.3, width: 1, height: 1 }),
        }),
    ],
  });
});

MaskLibrary.displayName = 'MaskLibrary';

export const NotchedSquircleMasks = {
  16: 'svg-mask-notched-squircle-16',
  20: 'svg-mask-notched-squircle-20',
  24: 'svg-mask-notched-squircle-24',
} as const;
