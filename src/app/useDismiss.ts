import { useEffect, type RefObject } from 'react';

/**
 * Calls `onDismiss` on Escape and, when `ref` is given, on a pointer-down outside that element.
 * Pass `active: false` to keep the listeners off while the element is closed.
 */
export function useDismiss(onDismiss: () => void, options: { active: boolean; ref?: RefObject<HTMLElement | null> }) {
  const { active, ref } = options;
  useEffect(() => {
    if (!active) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onDismiss();
    };
    const onPointerDown = (event: MouseEvent) => {
      if (ref && ref.current && !ref.current.contains(event.target as Node)) onDismiss();
    };
    document.addEventListener('keydown', onKeyDown);
    if (ref) document.addEventListener('mousedown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      if (ref) document.removeEventListener('mousedown', onPointerDown);
    };
  }, [active, onDismiss, ref]);
}
