import { useEffect, useState } from 'react';

export type Route =
  | { name: 'home' }
  | { name: 'group'; id: string }
  | { name: 'join'; code: string };

function parse(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  if (parts[0] === 'g' && parts[1]) return { name: 'group', id: decodeURIComponent(parts[1]) };
  if (parts[0] === 'join' && parts[1]) {
    return { name: 'join', code: decodeURIComponent(parts[1]).toUpperCase() };
  }
  return { name: 'home' };
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parse(window.location.hash));
  useEffect(() => {
    const onChange = () => {
      setRoute(parse(window.location.hash));
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}

export function navigate(path: string, replace = false): void {
  const hash = `#${path}`;
  if (replace) {
    window.history.replaceState(null, '', hash);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else {
    window.location.hash = path;
  }
}

export function inviteLink(code: string): string {
  return `${window.location.origin}${window.location.pathname}#/join/${code}`;
}
