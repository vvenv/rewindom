import { useEffect, type ReactElement } from "react";

import { Navigate } from "react-router";

/** 绝对 URL 用 location 跳；相对路径走 React Router。 */
export function ExternalOrNavigate({
  to,
  replace = false,
}: {
  to: string;
  replace?: boolean;
}): ReactElement | null {
  const external = /^https?:\/\//iu.test(to);

  useEffect(() => {
    if (!external) return;
    if (replace) {
      window.location.replace(to);
    } else {
      window.location.assign(to);
    }
  }, [external, replace, to]);

  if (external) {
    return null;
  }

  return <Navigate to={to} replace={replace} />;
}
