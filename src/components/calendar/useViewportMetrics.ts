'use client';

import { useEffect, useState } from 'react';
import { getBaseDayWidth, getPropertyColWidth } from './calendar-utils';

export function useViewportMetrics(collapsed: boolean) {
  const [viewportWidth, setViewportWidth] = useState(1280);

  useEffect(() => {
    const update = () => setViewportWidth(window.innerWidth);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return {
    viewportWidth,
    isPhone: viewportWidth < 640,
    isTablet: viewportWidth >= 640 && viewportWidth < 1024,
    baseDayWidth: getBaseDayWidth(viewportWidth),
    propertyColWidth: getPropertyColWidth(viewportWidth, collapsed),
  };
}

export function useMatchMedia(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}
