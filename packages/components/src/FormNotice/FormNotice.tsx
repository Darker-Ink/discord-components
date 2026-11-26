import type { CSSProperties, ImgHTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';
// Discord's stylesheet for this loads before FormTitle's, so the title's h5 margin wins over formNoticeTitle's.
import styles from './FormNotice.module.css';
import { Card, CardTypes, type CardType } from '../Card';
import { Flex, FlexAlign, FlexDirection, type FlexAlignClass } from '../Flex';
import { FormText } from '../FormText';
import { FormTitle } from '../FormTitle';

export interface FormNoticeImageData extends ImgHTMLAttributes<HTMLImageElement> {
  position?: 'left' | 'right';
}

export interface FormNoticeProps {
  type?: CardType;
  imageData?: FormNoticeImageData;
  button?: ReactNode;
  className?: string;
  iconClassName?: string;
  title?: ReactNode;
  body?: ReactNode;
  style?: CSSProperties;
  align?: FlexAlignClass;
}

export const FormNotice = ({
  type = CardTypes.DANGER,
  imageData,
  button,
  className,
  iconClassName,
  title,
  body,
  style,
  align = FlexAlign.START,
}: FormNoticeProps) => {
  let direction: (typeof FlexDirection)[keyof typeof FlexDirection] = FlexDirection.HORIZONTAL;
  let image: ReactNode;
  let action: ReactNode;
  if (imageData != null) {
    const { position, ...imageProps } = imageData;
    image = (
      <Flex.Child grow={0} shrink={0}>
        <img alt="" className={clsx(styles.icon, iconClassName)} {...imageProps} />
      </Flex.Child>
    );
    if (position === 'right') direction = FlexDirection.HORIZONTAL_REVERSE;
  } else if (button != null) {
    action = button;
  }
  // Only the primary card keeps the theme's text color; the colored ones inherit the card's.
  const whiteText = type !== CardTypes.PRIMARY;
  return (
    <Card className={clsx(styles.formNotice, className)} type={type} style={style}>
      <Flex direction={direction} align={align}>
        {image}
        <Flex.Child>
          {title != null && title !== '' ? (
            <FormTitle
              data-migration-pending
              className={clsx(styles.formNoticeTitle, { [styles.whiteText]: whiteText })}
            >
              {title}
            </FormTitle>
          ) : null}
          <FormText data-migration-pending className={clsx(styles.formNoticeBody, { [styles.whiteText]: whiteText })}>
            {body}
          </FormText>
          {action}
        </Flex.Child>
      </Flex>
    </Card>
  );
};

FormNotice.displayName = 'FormNotice';
FormNotice.Types = CardTypes;
