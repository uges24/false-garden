import { useEffect, useRef } from 'react';

const bindings: Record<string, string> = {
  KeyW: 'forward',
  ArrowUp: 'forward',
  KeyS: 'back',
  ArrowDown: 'back',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
  ShiftLeft: 'run',
  ShiftRight: 'run',
};

export function useMovementInput() {
  const pressed = useRef(new Set<string>());

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const action = bindings[event.code];
      if (action) pressed.current.add(action);
    };
    const onKeyUp = (event: KeyboardEvent) => {
      const action = bindings[event.code];
      if (action) pressed.current.delete(action);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  return pressed;
}
