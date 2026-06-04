import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Hook utilitario para evitar fugas de memoria al intentar actualizar el estado
 * de un componente que ya ha sido desmontado.
 */
export function useSafeState<T>(initialValue: T): [T, (val: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState(initialValue);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const safeSetState = useCallback((val: T | ((prev: T) => T)) => {
    if (isMounted.current) {
      setState(val);
    }
  }, []);

  return [state, safeSetState];
}
