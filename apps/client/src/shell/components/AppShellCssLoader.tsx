import { useEffect } from "react";

import { Outlet } from "react-router";

import { ensureAppShellCss } from "@/load-shell-css";

/** 从官网公开页客户端导航进应用区时，补载工作台 `index.css`。 */
export function AppShellCssLoader() {
  useEffect(() => {
    void ensureAppShellCss();
  }, []);
  return <Outlet />;
}
