import type { ReactNode } from "react";

import {
  siteMemberEntrySlot,
  siteMemberGateSlot,
  siteMemberGatedPageSlot,
} from "../../../marketing/client/shell/site-member-slots.js";
import { SiteMemberEntry } from "../components/SiteMemberEntry.js";
import { SiteMemberGate } from "../components/SiteMemberGate.js";
import { SiteMemberGatedPage } from "../components/SiteMemberGatedPage.js";
import { SiteMemberAuthProvider } from "../contexts/SiteMemberAuthContext.js";


/**
 * 公开路由树（官网 / 租户站点前台）的会员上下文。
 *
 * 方向是 site-member → marketing：slot 定义在消费方（marketing）里，
 * marketing 自己不知道 site-member 的存在。
 */
export function SiteMemberPublicProviders({
  children,
}: {
  children: ReactNode;
}): ReactNode {
  return (
    <SiteMemberAuthProvider>
      <siteMemberEntrySlot.Provider component={SiteMemberEntry}>
        <siteMemberGateSlot.Provider component={SiteMemberGate}>
          <siteMemberGatedPageSlot.Provider component={SiteMemberGatedPage}>
            {children}
          </siteMemberGatedPageSlot.Provider>
        </siteMemberGateSlot.Provider>
      </siteMemberEntrySlot.Provider>
    </SiteMemberAuthProvider>
  );
}
