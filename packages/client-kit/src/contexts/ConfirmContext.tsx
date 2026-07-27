import {
  createContext,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";

interface UseConfirmOptions {
  title: ReactNode;
  description?: ReactNode;
  confirmText?: ReactNode;
  cancelText?: ReactNode;
  destructive?: boolean;
}

export interface ConfirmContextValue {
  confirm: (options: UseConfirmOptions) => Promise<boolean>;
  isOpen: boolean;
  options: UseConfirmOptions | null;
  handleConfirm: () => void;
  handleCancel: () => void;
}

export const ConfirmContext = createContext<ConfirmContextValue | undefined>(
  undefined,
);

interface ConfirmProviderProps {
  children: ReactNode;
  defaultOptions?: Partial<UseConfirmOptions>;
}

export function ConfirmProvider({
  children,
  defaultOptions,
}: ConfirmProviderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<UseConfirmOptions | null>(null);
  const resolveRef = useRef<((confirmed: boolean) => void) | null>(null);

  const confirm = useCallback(
    (opts: UseConfirmOptions) => {
      return new Promise<boolean>((resolve) => {
        setOptions({ ...defaultOptions, ...opts });
        setIsOpen(true);
        resolveRef.current = resolve;
      });
    },
    [defaultOptions],
  );

  const handleConfirm = useCallback(() => {
    setIsOpen(false);
    resolveRef.current?.(true);
    resolveRef.current = null;
  }, []);

  const handleCancel = useCallback(() => {
    setIsOpen(false);
    resolveRef.current?.(false);
    resolveRef.current = null;
  }, []);

  return (
    <ConfirmContext.Provider
      value={{
        confirm,
        isOpen,
        options,
        handleConfirm,
        handleCancel,
      }}
    >
      {children}
    </ConfirmContext.Provider>
  );
}
