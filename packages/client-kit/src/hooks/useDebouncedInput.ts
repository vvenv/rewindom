import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type CompositionEvent,
  type KeyboardEvent,
} from "react";

export const DEFAULT_DEBOUNCE_MS = 300;

export interface UseDebouncedInputOptions {
  /** Committed value from URL or parent state */
  value: string | undefined;
  onCommit: (value: string) => void;
  debounceMs?: number;
}

export interface DebouncedInputProps {
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onCompositionStart: () => void;
  onCompositionEnd: (event: CompositionEvent<HTMLInputElement>) => void;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
}

export interface UseDebouncedInputResult {
  inputValue: string;
  setInputValue: (value: string) => void;
  clear: () => void;
  inputProps: DebouncedInputProps;
}

export function useDebouncedInput({
  value,
  onCommit,
  debounceMs = DEFAULT_DEBOUNCE_MS,
}: UseDebouncedInputOptions): UseDebouncedInputResult {
  const [inputValue, setInputValue] = useState(value ?? "");
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isComposingRef = useRef(false);
  const onCommitRef = useRef(onCommit);

  useEffect(() => {
    onCommitRef.current = onCommit;
  }, [onCommit]);

  useEffect(() => {
    if (isComposingRef.current) return;
    setInputValue(value ?? "");
  }, [value]);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  const commitNow = useCallback((nextValue: string) => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    onCommitRef.current(nextValue);
  }, []);

  const scheduleCommit = useCallback(
    (nextValue: string) => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        onCommitRef.current(nextValue);
      }, debounceMs);
    },
    [debounceMs],
  );

  const handleChange = useCallback(
    (nextValue: string) => {
      setInputValue(nextValue);
      if (isComposingRef.current) return;
      scheduleCommit(nextValue);
    },
    [scheduleCommit],
  );

  const clear = useCallback(() => {
    setInputValue("");
    commitNow("");
  }, [commitNow]);

  const inputProps: DebouncedInputProps = {
    value: inputValue,
    onChange: (event) => handleChange(event.target.value),
    onCompositionStart: () => {
      isComposingRef.current = true;
    },
    onCompositionEnd: (event) => {
      isComposingRef.current = false;
      const nextValue = event.currentTarget.value;
      setInputValue(nextValue);
      scheduleCommit(nextValue);
    },
    onKeyDown: (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        commitNow(event.currentTarget.value);
      }
    },
  };

  return { inputValue, setInputValue, clear, inputProps };
}
