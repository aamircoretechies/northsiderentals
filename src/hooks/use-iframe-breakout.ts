import { useEffect } from 'react';

/**
 * A hook that detects if the current page is being loaded inside an iframe.
 * If it is, it forces the top window to redirect to the current URL,
 * effectively breaking out of the iframe.
 */
export function useIframeBreakout() {
  useEffect(() => {
    try {
      if (window.self !== window.top) {
        if (window.top) {
          window.top.location.href = window.location.href;
        }
      }
    } catch (e) {
      // In case of cross-origin security errors, we still try to redirect
      // but some browsers might block window.top access.
      // Usually, if we are on the same origin after a redirect, it should work.
      console.error('Iframe breakout failed:', e);
      // Fallback: try a different method if possible
      if (parent && parent !== window) {
        try {
           parent.location.href = window.location.href;
        } catch (err) {
           // Ignore
        }
      }
    }
  }, []);
}
