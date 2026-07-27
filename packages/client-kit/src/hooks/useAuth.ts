import { useContext } from "react";

import { AuthContext } from "../contexts/AuthContext.js";

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth必须在AuthProvider中使用");
  }
  return context;
}
