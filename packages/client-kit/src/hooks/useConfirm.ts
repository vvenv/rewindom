import { useContext } from "react";

import { ConfirmContext } from "../contexts/ConfirmContext.js";

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error("useConfirm必须在ConfirmProvider中使用");
  }
  return context;
}
