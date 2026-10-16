import React from 'react';

export interface CoinIconProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;
  className?: string;
}

export const CoinIcon: React.FC<CoinIconProps> = ({
  size = 'sm',
  className = '',
  alt = 'Xu Vàng',
  style,
  ...rest
}) => {
  let sizeClass = 'w-3.5 h-3.5';
  let inlineStyle: React.CSSProperties = { ...style };

  if (typeof size === 'number') {
    inlineStyle = { ...inlineStyle, width: `${size}px`, height: `${size}px` };
  } else {
    switch (size) {
      case 'xs':
        sizeClass = 'w-3 h-3';
        break;
      case 'sm':
        sizeClass = 'w-3.5 h-3.5';
        break;
      case 'md':
        sizeClass = 'w-4 h-4';
        break;
      case 'lg':
        sizeClass = 'w-5 h-5';
        break;
      case 'xl':
        sizeClass = 'w-6 h-6';
        break;
    }
  }

  return (
    <img
      src="/images/icon/xu-vang.webp"
      alt={alt}
      className={`object-contain inline-block shrink-0 align-middle ${sizeClass} ${className}`}
      draggable={false}
      style={inlineStyle}
      {...rest}
    />
  );
};

export default CoinIcon;
