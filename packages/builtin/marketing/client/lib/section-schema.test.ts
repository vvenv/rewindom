import { describe, expect, it } from "vitest";

import {
  addBlock,
  addSection,
  addSectionToColumn,
  findSection,
  findSectionPath,
  moveSection,
  moveSectionTo,
  removeSection,
  reorderBlock,
  updateSectionSettings,
  type DropPlace,
} from "./section-schema.js";
import {
  createSection,
  type SiteSection,
} from "../../shared/section-schema.js";

/** 一个两列容器段，左列已经放了一段 page-menu。 */
function groupWithMenu(): { group: SiteSection; menuId: string } {
  const group = createSection("group");
  const { sections, created } = addSectionToColumn(
    [group],
    group.blocks[0]!.id,
    "page-menu",
  );
  return { group: sections[0]!, menuId: created.id };
}

describe("section-schema helpers", () => {
  it("moves sections", () => {
    const a = createSection("hero");
    const b = createSection("band");
    expect(moveSection([a, b], a.id, 1).map((s) => s.id)).toEqual([b.id, a.id]);
  });

  it("adds removes and updates", () => {
    const a = createSection("hero");
    const withBand = addSection([a], "band");
    expect(withBand).toHaveLength(2);
    const updated = updateSectionSettings(withBand, a.id, {
      headline: "New",
    });
    expect(updated.find((s) => s.id === a.id)?.settings).toEqual({
      headline: "New",
    });
    expect(removeSection(withBand, a.id)).toHaveLength(1);
  });
});

describe("拖放排序", () => {
  /** 三段页面，方便看清「摘掉源项后落点要重算」这件事。 */
  function page(): SiteSection[] {
    return [
      createSection("hero"),
      createSection("cards"),
      createSection("faq"),
    ];
  }

  /** 落到某一段旁边。 */
  function beside(
    sections: SiteSection[],
    sourceId: string,
    targetId: string,
    place: DropPlace,
  ): string[] {
    return moveSectionTo(sections, sourceId, {
      kind: "section",
      targetId,
      place,
    }).map((s) => s.id);
  }

  it("往后拖：落在目标之后", () => {
    const [a, b, c] = page() as [SiteSection, SiteSection, SiteSection];
    expect(beside([a, b, c], a.id, c.id, "after")).toEqual([b.id, c.id, a.id]);
  });

  it("往前拖：落在目标之前", () => {
    const [a, b, c] = page() as [SiteSection, SiteSection, SiteSection];
    expect(beside([a, b, c], c.id, a.id, "before")).toEqual([c.id, a.id, b.id]);
  });

  // 源在目标之前时，摘掉源项后目标的下标会往前挪一格，落点必须按摘完的数组重算
  it("往后拖到相邻行，落点不越过目标", () => {
    const [a, b, c] = page() as [SiteSection, SiteSection, SiteSection];
    expect(beside([a, b, c], a.id, b.id, "after")).toEqual([b.id, a.id, c.id]);
    expect(beside([a, b, c], a.id, b.id, "before")).toEqual([a.id, b.id, c.id]);
  });

  it("拖到自己身上是空操作", () => {
    const [a, b, c] = page() as [SiteSection, SiteSection, SiteSection];
    expect(beside([a, b, c], b.id, b.id, "after")).toEqual([a.id, b.id, c.id]);
  });

  it("列里的子段能在自己那一列内换位", () => {
    const { group, menuId } = groupWithMenu();
    const { sections, created } = addSectionToColumn(
      [group],
      group.blocks[0]!.id,
      "faq",
    );
    const moved = moveSectionTo(sections, created.id, {
      kind: "section",
      targetId: menuId,
      place: "before",
    });
    expect(moved[0]!.blocks[0]!.sections?.map((s) => s.id)).toEqual([
      created.id,
      menuId,
    ]);
  });

  it("把页面顶层的一段搬进某一列", () => {
    const { group, menuId } = groupWithMenu();
    const hero = createSection("hero");
    const columnId = group.blocks[1]!.id;

    const moved = moveSectionTo([hero, group], hero.id, {
      kind: "column",
      columnBlockId: columnId,
    });

    // 顶层只剩分栏段，hero 挂到了第二列里
    expect(moved.map((s) => s.id)).toEqual([group.id]);
    expect(moved[0]!.blocks[1]!.sections?.map((s) => s.id)).toEqual([hero.id]);
    // settings 原样带过去：列内收窄是渲染期的事，不落库
    expect(findSection(moved, hero.id)?.settings).toEqual(hero.settings);
    // 另一列不受影响
    expect(moved[0]!.blocks[0]!.sections?.map((s) => s.id)).toEqual([menuId]);
  });

  it("落到列里某一段旁边，也算搬进那一列", () => {
    const { group, menuId } = groupWithMenu();
    const hero = createSection("hero");
    const moved = moveSectionTo([hero, group], hero.id, {
      kind: "section",
      targetId: menuId,
      place: "before",
    });
    expect(moved.map((s) => s.id)).toEqual([group.id]);
    expect(moved[0]!.blocks[0]!.sections?.map((s) => s.id)).toEqual([
      hero.id,
      menuId,
    ]);
  });

  // 嵌套只允许一层，否则服务端 `site.sections_invalid` 直接拒收整棵树
  it("容器段进不了列", () => {
    const { group } = groupWithMenu();
    const outer = createSection("group");
    const tree = [outer, group];
    expect(
      moveSectionTo(tree, outer.id, {
        kind: "column",
        columnBlockId: group.blocks[0]!.id,
      }),
    ).toEqual(tree);
  });

  // 落点在自己的子树里：搬完自己就没地方挂了
  it("不能拖进自己里面", () => {
    const { group, menuId } = groupWithMenu();
    const tree = [group];
    expect(
      moveSectionTo(tree, group.id, {
        kind: "section",
        targetId: menuId,
        place: "after",
      }),
    ).toEqual(tree);
  });

  it("block 在所属 section 内换位", () => {
    const cards = createSection("cards");
    const withBlocks = addBlock(
      addBlock([cards], cards.id, "card"),
      cards.id,
      "card",
    );
    const blocks = withBlocks[0]!.blocks;
    const first = blocks[blocks.length - 2]!.id;
    const last = blocks[blocks.length - 1]!.id;
    const moved = reorderBlock(withBlocks, cards.id, first, last, "after");
    const ids = moved[0]!.blocks.map((block) => block.id);
    expect(ids.indexOf(last)).toBeLessThan(ids.indexOf(first));
  });
});

describe("容器段的列", () => {
  it("新建的容器段预置两列，列自带空的 sections", () => {
    const group = createSection("group");
    expect(group.blocks).toHaveLength(2);
    expect(group.blocks.every((block) => block.sections?.length === 0)).toBe(
      true,
    );
  });

  it("往某一列加段，另一列不受影响", () => {
    const { group, menuId } = groupWithMenu();
    expect(group.blocks[0]!.sections?.map((s) => s.id)).toEqual([menuId]);
    expect(group.blocks[1]!.sections).toEqual([]);
  });

  it("按 id 在整棵树上定位子段", () => {
    const { group, menuId } = groupWithMenu();
    expect(findSection([group], menuId)?.type).toBe("page-menu");
    expect(findSectionPath([group], menuId)).toEqual([group.id, menuId]);
    expect(findSectionPath([group], "nope")).toEqual([]);
  });

  it("改设置 / 删除都能穿透到列里", () => {
    const { group, menuId } = groupWithMenu();
    const updated = updateSectionSettings([group], menuId, {
      source: "siblings",
    });
    expect(findSection(updated, menuId)?.settings).toEqual({
      source: "siblings",
    });
    expect(findSection(removeSection([group], menuId), menuId)).toBeNull();
  });

  it("加 block 认的是子段自己，不是外面的容器段", () => {
    const { group, menuId } = groupWithMenu();
    const withCards = addSectionToColumn([group], group.blocks[1]!.id, "cards");
    const cardsId = withCards.created.id;
    const before = findSection(withCards.sections, cardsId)!.blocks.length;
    const next = addBlock(withCards.sections, cardsId, "card");
    expect(findSection(next, cardsId)?.blocks).toHaveLength(before + 1);
    // 同一棵树上的另一段没被波及
    expect(findSection(next, menuId)?.blocks).toHaveLength(0);
  });

  // 下标是「同一层内」的概念：列里的第一段不该被外层的邻居抢走位置
  it("移动只在自己所属的兄弟集合内发生", () => {
    const { group, menuId } = groupWithMenu();
    const hero = createSection("hero");
    const page = [hero, group];

    // 列里只有一段，上移是空操作，也不该动到页面顶层的顺序
    const moved = moveSection(page, menuId, -1);
    expect(moved.map((s) => s.id)).toEqual([hero.id, group.id]);
    expect(findSection(moved, menuId)).not.toBeNull();

    // 顶层的容器段照常能上移
    expect(moveSection(page, group.id, -1).map((s) => s.id)).toEqual([
      group.id,
      hero.id,
    ]);
  });
});
