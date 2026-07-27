import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CompositionEvent,
} from "react";

import { DEFAULT_DEBOUNCE_MS } from "./useDebouncedInput";

export interface CompositionInputProps {
  onCompositionStart: () => void;
  onCompositionEnd: (event: CompositionEvent<HTMLInputElement>) => void;
}

export function useDebouncedValue(
  value: string,
  debounceMs: number = DEFAULT_DEBOUNCE_MS,
): {
  debouncedValue: string;
  compositionInputProps: CompositionInputProps;
  flushDebounced: (nextValue: string) => void;
} {
  const [debouncedValue, setDebouncedValue] = useState(value);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isComposingRef = useRef(false);

  const flushDebounced = useCallback((nextValue: string) => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    setDebouncedValue(nextValue);
  }, []);

  useEffect(() => {
    if (isComposingRef.current) return;
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedValue(value);
    }, debounceMs);
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [value, debounceMs]);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  const compositionInputProps: CompositionInputProps = {
    onCompositionStart: () => {
      isComposingRef.current = true;
    },
    onCompositionEnd: (event) => {
      isComposingRef.current = false;
      flushDebounced(event.currentTarget.value);
    },
  };

  return { debouncedValue, compositionInputProps, flushDebounced };
}
