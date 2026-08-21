/**
 * 列表记录 → EventListItem，并把归位批量挂上。
 *
 * mapper 保持同步纯函数；这一层才碰库。Rising + Now 合成一批再调，
 * 不要每张卡各查一次。
 */
import { toEventListItem } from "./event.mapper.js";
import { getEventPlacementsForList } from "./placement.service.js";

import type {
  EventListItem,
  EventPlacementFact,
} from "../../shared/index.js";
import type {
  EventRecordForList,
  FollowMarker,
} from "./event.mapper.js";

export async function mapEventRecordsToListItems(params: {
  tenant_id: string;
  records: EventRecordForList[];
  follows?: ReadonlyMap<string, FollowMarker>;
  sourceIcons?: ReadonlyMap<string, string>;
  now?: Date;
  /** RSS 不需要归位，跳过那两轮查询 */
  withPlacement?: boolean;
}): Promise<EventListItem[]> {
  const { records } = params;
  const placements =
    params.withPlacement === false || records.length === 0
      ? new Map<string, EventPlacementFact[]>()
      : await getEventPlacementsForList({
          tenant_id: params.tenant_id,
          events: records,
          now: params.now,
        });

  return records.map((record) =>
    toEventListItem(
      record,
      params.follows?.get(record.id) ?? null,
      params.sourceIcons,
      placements.get(record.id) ?? [],
    ),
  );
}
