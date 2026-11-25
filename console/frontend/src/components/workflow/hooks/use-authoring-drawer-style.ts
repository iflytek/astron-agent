import { useLayoutEffect, useState } from 'react';
import type { CSSProperties } from 'react';

/** Keep authoring drawers below the actual toolbar, including wrapped layouts. */
export function useAuthoringDrawerStyle(): CSSProperties {
  const [style, setStyle] = useState<CSSProperties>({
    top: 80,
    right: 0,
    height: 'calc(100dvh - 80px)',
  });
  useLayoutEffect(() => {
    const header = document.querySelector('.workflow-header-shell');
    const update = (): void => {
      const top =
        window.innerWidth <= 600
          ? 0
          : (header?.getBoundingClientRect().bottom ?? 80);
      setStyle({
        top,
        right: 0,
        height: Math.max(0, window.innerHeight - top),
      });
    };
    const observer = new ResizeObserver(update);
    if (header) observer.observe(header);
    window.addEventListener('resize', update);
    update();
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', update);
    };
  }, []);
  return style;
}
