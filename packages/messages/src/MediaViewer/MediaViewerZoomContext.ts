import { createContext, useContext } from 'react';
import { SpringValue } from '@react-spring/web';

export interface MediaViewerZoomContextValue {
  scale: SpringValue<number>;
  x: SpringValue<number>;
  y: SpringValue<number>;
  setScale: (scale: number, options?: { immediate?: boolean }) => void;
  setOffset: (x: number, y: number, options?: { immediate?: boolean }) => void;
  zoomed: boolean;
  setZoomed: (zoomed: boolean) => void;
}

/** The media viewer's zoom state: whether the media is zoomed in, its scale and pan offset. */
export const MediaViewerZoomContext = createContext<MediaViewerZoomContextValue>({
  scale: new SpringValue(1),
  x: new SpringValue(0),
  y: new SpringValue(0),
  setScale() {},
  setOffset() {},
  zoomed: false,
  setZoomed() {},
});

MediaViewerZoomContext.displayName = 'MediaViewerZoomContext';

export const useMediaViewerZoom = () => useContext(MediaViewerZoomContext);
