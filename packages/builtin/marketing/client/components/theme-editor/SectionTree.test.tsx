import { act, createEvent, fireEvent, render } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";

import {
  createSection,
  type SiteSection,
} from "../../../shared/section-schema.js";
import { addBlock, addSectionToColumn } from "../../lib/section-schema.js";

import { SectionTree } from "./SectionTree.js";

/** 行高 20 的假布局：落点按指针在行的上半 / 下半算，jsdom 自己量出来全是 0。 */
beforeAll(() => {
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(
    new DOMRect(0, 0, 200, 20),
  );
});

function dataTransfer(): DataTransfer {
  return {
    setData: vi.fn(),
    effectAllowed: "",
    dropEffect: "",
  } as unknown as DataTransfer;
}

/**
 * 一页：hero（带 block）/ 分栏（左列有一段 page-menu、右列空着）/ band。
 * 右列空着是关键——新建的分栏就是这样，「拖进分栏」最常见的一下落在那儿。
 */
function buildPage() {
  const band = createSection("band");

  const heroBase = createSection("hero");
  const hero = addBlock(
    addBlock([heroBase], heroBase.id, "stat"),
    heroBase.id,
    "stat",
  )[0]!;

  const groupBase = createSection("group");
  const { sections: withMenu, created: menu } = addSectionToColumn(
    [groupBase],
    groupBase.blocks[0]!.id,
    "page-menu",
  );
  const group = withMenu[0]!;

  return {
    hero,
    group,
    menu,
    band,
    leftColumnId: group.blocks[0]!.id,
    emptyColumnId: group.blocks[1]!.id,
    blocks: hero.blocks.slice(-2),
  };
}

function setup(
  sections: SiteSection[],
  selected: string | null,
  area: { header?: SiteSection[]; footer?: SiteSection[] } = {},
) {
  const onMoveSectionTo = vi.fn();
  const onReorderBlock = vi.fn();
  const { container } = render(
    <SectionTree
      sections={sections}
      header={area.header ?? []}
      footer={area.footer ?? []}
      selectedSectionId={selected}
      selectedBlockId={null}
      metaSelected={false}
      canWrite
      onSelect={vi.fn()}
      onSelectMeta={vi.fn()}
      onAddSection={vi.fn()}
      onRemoveSection={vi.fn()}
      onMoveSection={vi.fn()}
      onMoveSectionTo={onMoveSectionTo}
      onAddBlock={vi.fn()}
      onRemoveBlock={vi.fn()}
      onMoveBlock={vi.fn()}
      onReorderBlock={onReorderBlock}
    />,
  );
  const row = (id: string): HTMLElement => {
    const found = container.querySelector<HTMLElement>(`[data-row-id="${id}"]`);
    expect(found, `找不到 ${id} 这一行`).not.toBeNull();
    return found!;
  };
  return { container, row, onMoveSectionTo, onReorderBlock };
}

/**
 * 拖放事件；`clientY` 得事后挂上去——jsdom 没有 `DragEvent`，退回的 `Event`
 * 构造器不认指针坐标，而落点前后正是按坐标算的。
 */
function fireDrag(
  type: "dragOver" | "drop",
  target: HTMLElement,
  clientY: number,
): void {
  const event = createEvent[type](target, { dataTransfer: dataTransfer() });
  Object.defineProperty(event, "clientY", { value: clientY });
  fireEvent(target, event);
}

/** 拖拽状态推迟一帧才落（见 `beginDrag`），所以得把这一帧走完。 */
async function startDrag(from: HTMLElement): Promise<void> {
  fireEvent.dragStart(from, { dataTransfer: dataTransfer() });
  await act(
    async () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve());
      }),
  );
}

/** 一整趟拖放；`clientY` 决定落在目标行之前还是之后。 */
async function dragTo(
  from: HTMLElement,
  to: HTMLElement,
  clientY: number,
): Promise<void> {
  await startDrag(from);
  fireDrag("dragOver", to, clientY);
  fireDrag("drop", to, clientY);
  fireEvent.dragEnd(from);
}

describe("SectionTree 拖放", () => {
  it("拖到目标行下半 → 落在它之后", async () => {
    const { hero, band } = buildPage();
    const { row, onMoveSectionTo } = setup([hero, band], null);
    await dragTo(row(hero.id), row(band.id), 15);
    expect(onMoveSectionTo).toHaveBeenCalledWith(hero.id, {
      kind: "section",
      targetId: band.id,
      place: "after",
    });
  });

  it("拖到目标行上半 → 落在它之前", async () => {
    const { hero, band } = buildPage();
    const { row, onMoveSectionTo } = setup([hero, band], null);
    await dragTo(row(band.id), row(hero.id), 5);
    expect(onMoveSectionTo).toHaveBeenCalledWith(band.id, {
      kind: "section",
      targetId: hero.id,
      place: "before",
    });
  });

  it("拖到自己身上不触发搬移", async () => {
    const { hero, band } = buildPage();
    const { row, onMoveSectionTo } = setup([hero, band], null);
    await dragTo(row(hero.id), row(hero.id), 15);
    expect(onMoveSectionTo).not.toHaveBeenCalled();
  });

  it("block 在所属 section 内换位", async () => {
    const { hero, blocks } = buildPage();
    const { row, onReorderBlock } = setup([hero], hero.id);
    await dragTo(row(blocks[0]!.id), row(blocks[1]!.id), 15);
    expect(onReorderBlock).toHaveBeenCalledWith(
      hero.id,
      blocks[0]!.id,
      blocks[1]!.id,
      "after",
    );
  });

  it("section 与 block 互相落不下去", async () => {
    const { hero, band, blocks } = buildPage();
    const { row, onMoveSectionTo, onReorderBlock } = setup(
      [hero, band],
      hero.id,
    );
    await dragTo(row(band.id), row(blocks[0]!.id), 15);
    await dragTo(row(blocks[0]!.id), row(band.id), 15);
    expect(onMoveSectionTo).not.toHaveBeenCalled();
    expect(onReorderBlock).not.toHaveBeenCalled();
  });
});

describe("SectionTree 拖进分栏", () => {
  it("拖到列里某一段旁边 → 搬进那一列", async () => {
    const { hero, group, menu } = buildPage();
    const { row, onMoveSectionTo } = setup([hero, group], group.id);
    await dragTo(row(hero.id), row(menu.id), 5);
    expect(onMoveSectionTo).toHaveBeenCalledWith(hero.id, {
      kind: "section",
      targetId: menu.id,
      place: "before",
    });
  });

  // 空列一行都没有，没有专门的放置区就整个接不住
  it("空列有放置区，落上去挂到列末尾", async () => {
    const { hero, group, emptyColumnId } = buildPage();
    const { container, row, onMoveSectionTo } = setup([hero, group], group.id);

    // 没在拖时不占地方
    expect(container.querySelector("[data-column-drop]")).toBeNull();

    await startDrag(row(hero.id));
    const zone = container.querySelector<HTMLElement>(
      `[data-column-drop="${emptyColumnId}"]`,
    );
    expect(zone).not.toBeNull();
    fireEvent.dragOver(zone!, { dataTransfer: dataTransfer() });
    fireEvent.drop(zone!, { dataTransfer: dataTransfer() });

    expect(onMoveSectionTo).toHaveBeenCalledWith(hero.id, {
      kind: "column",
      columnBlockId: emptyColumnId,
    });
  });

  // 分栏没展开的话，拖到一半手是松不开的，没法先去点开它
  it("拖起一段时把分栏摊开", async () => {
    const { hero, group, menu } = buildPage();
    const { container, row } = setup([hero, group], null);
    expect(container.querySelector(`[data-row-id="${menu.id}"]`)).toBeNull();

    await startDrag(row(hero.id));
    expect(
      container.querySelector(`[data-row-id="${menu.id}"]`),
    ).not.toBeNull();
  });

  /*
   * 真机上就栽在这儿：`dragstart` 里同步改 DOM，Chrome / WebKit 会中止这次拖拽，
   * 于是「有分栏的页面整个拖不动」。摊开分栏必须等这一帧过去。
   */
  it("dragstart 当场不动 DOM", async () => {
    const { hero, group, menu, emptyColumnId } = buildPage();
    const { container, row } = setup([hero, group], null);
    const before = container.innerHTML;

    fireEvent.dragStart(row(hero.id), { dataTransfer: dataTransfer() });
    expect(container.innerHTML).toBe(before);

    // 下一帧才摊开分栏、才长出空列的放置区
    await act(
      async () =>
        new Promise<void>((resolve) => {
          requestAnimationFrame(() => resolve());
        }),
    );
    expect(
      container.querySelector(`[data-row-id="${menu.id}"]`),
    ).not.toBeNull();
    expect(
      container.querySelector(`[data-column-drop="${emptyColumnId}"]`),
    ).not.toBeNull();
  });

  /*
   * 页面 / 页头 / 页脚是三棵独立的树，搬移只在**同一棵**里做。
   *
   * 分栏段放行页脚之后，页脚里也会有空列的放置区——但页面上的一段落进去接不住：
   * 搬移是先摘后插，摘的是页面那棵树、插的是页脚那棵，插不进去那一段就没了。
   * 所以 UI 这一层就不给落（光标显禁止），别让它掉进 `moveSectionTo` 的兜底里。
   */
  it("页面上的一段拖不进页脚分栏的列", async () => {
    const { hero, group: footerGroup, menu, emptyColumnId } = buildPage();
    const { container, row, onMoveSectionTo } = setup([hero], null, {
      footer: [createSection("footer"), footerGroup],
    });

    await startDrag(row(hero.id));
    // 页脚那个分栏照常摊开，但它的空列不给落
    expect(container.querySelector(`[data-row-id="${menu.id}"]`)).not.toBeNull();
    expect(
      container.querySelector(`[data-column-drop="${emptyColumnId}"]`),
    ).toBeNull();

    // 落到页脚列里那一段旁边同样不接
    fireDrag("dragOver", row(menu.id), 5);
    fireDrag("drop", row(menu.id), 5);
    expect(onMoveSectionTo).not.toHaveBeenCalled();
  });

  // 页脚自己那棵树里照常搬——拦的是跨树，不是「页脚不能拖」
  it("页脚里的段能搬进页脚分栏的空列", async () => {
    const { group: footerGroup, emptyColumnId } = buildPage();
    const notice = createSection("prose");
    const { container, row, onMoveSectionTo } = setup([], null, {
      footer: [createSection("footer"), notice, footerGroup],
    });

    await startDrag(row(notice.id));
    const zone = container.querySelector<HTMLElement>(
      `[data-column-drop="${emptyColumnId}"]`,
    );
    expect(zone).not.toBeNull();
    fireEvent.dragOver(zone!, { dataTransfer: dataTransfer() });
    fireEvent.drop(zone!, { dataTransfer: dataTransfer() });

    expect(onMoveSectionTo).toHaveBeenCalledWith(notice.id, {
      kind: "column",
      columnBlockId: emptyColumnId,
    });
  });

  // 嵌套只允许一层：容器段进不了列，服务端会拒收整棵树
  it("分栏段拖不进另一个分栏的列", async () => {
    const outer = createSection("group");
    const { group, menu, emptyColumnId } = buildPage();
    const { container, row, onMoveSectionTo } = setup([outer, group], group.id);

    await dragTo(row(outer.id), row(menu.id), 5);
    expect(onMoveSectionTo).not.toHaveBeenCalled();

    // 空列的放置区对容器段根本不出现
    await startDrag(row(outer.id));
    expect(
      container.querySelector(`[data-column-drop="${emptyColumnId}"]`),
    ).toBeNull();
  });
});
