import { Button } from "@rewindom/ui/button";
import { Check, Copy } from "lucide-react";

import { useClipboard } from "../hooks/useClipboard";

export function CopyButton({
  text,
  variant = "ghost",
  size = "icon-xs",
  className,
}: React.ComponentProps<typeof Button> & { text: string }) {
  const { copy, copied } = useClipboard();

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={() => copy(text)}
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
    </Button>
  );
}
