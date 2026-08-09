import {
  createQueryWrapper,
  createTestQueryClient,
} from "@be-water/client-test";
import {
  act,
  createEvent,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { MAIN_MENU_KEY, type SiteMenu } from "../../../shared/site-menu.js";

import {
  SiteMenusProvider,
  type SiteMenusContextValue,
} from "./site-menus-context.js";
import { SiteMenuField } from "./SiteMenuField.js";

const wrapper = createQueryWrapper(createTestQueryClient());

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

function mainMenu(): SiteMenu {
  return {
    key: MAIN_MENU_KEY,
    title: "",
    items: [
      {
        id: "pricing",
        source: "link",
        label: "定价",
        href: "/pricing",
        category: "",
        expand: "children",
        children: [],
      },
      {
        id: "pages",
        source: "pages",
        label: "",
        href: "",
        category: "",
        expand: "flat",
        children: [],
      },
    ],
  };
}

function renderField(
  overrides: Partial<SiteMenusContextValue> = {},
  value = MAIN_MENU_KEY,
) {
  const setMenus = vi.fn();
  const onChange = vi.fn();
  const { container } = render(
    <SiteMenusProvider
      value={{
        menus: [mainMenu()],
        setMenus,
        usage: {},
        preview: {
          navPages: [
            { path: "/about", title: "关于" },
            { path: "/blog", title: "博客" },
          ],
          docs: [],
        },
        ...overrides,
      }}
    >
      <SiteMenuField
        id="menu"
        value={value}
        locale="zh-CN"
        defaultLocale="zh-CN"
        onChange={onChange}
      />
    </SiteMenusProvider>,
    { wrapper },
  );
  const row = (id: string): HTMLElement => {
    const found = container.querySelector<HTMLElement>(`[data-row-id="${id}"]`);
    expect(found, `找不到 ${id} 这一行`).not.toBeNull();
    return found!;
  };
  return { setMenus, onChange, row };
}

/** Radix 的菜单认 pointer 事件，`click` 打不开它。 */
function openMenu(trigger: HTMLElement): void {
  fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false });
  fireEvent.pointerUp(trigger, { button: 0 });
}

/** 展开某一条（折叠行本身就是展开按钮）。 */
function expandRow(name: RegExp): void {
  fireEvent.click(screen.getByRole("button", { expanded: false, name }));
}

function fireDrag(
  type: "dragOver" | "drop",
  target: HTMLElement,
  clientY: number,
): void {
  const event = createEvent[type](target, { dataTransfer: dataTransfer() });
  Object.defineProperty(event, "clientY", { value: clientY });
  fireEvent(target, event);
}

async function startDrag(from: HTMLElement): Promise<void> {
  fireEvent.dragStart(from, { dataTransfer: dataTransfer() });
  await act(
    async () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve());
      }),
  );
}

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

/** 一个页头页脚都指着的菜单，用来验「共享的删不得」。 */
function shared(): SiteMenu {
  return { ...mainMenu(), key: "links", title: "通用链接" };
}

function deleteMenuItem(): HTMLElement {
  openMenu(screen.getByRole("button", { name: "换一份导航" }));
  return screen.getByRole("menuitem", { name: "删除这份导航" });
}

describe("SiteMenuField", () => {
  it("就地列出当前菜单的条目", () => {
    renderField();
    expect(screen.getByText("定价")).toBeTruthy();
    expect(screen.getByText("/pricing")).toBeTruthy();
  });

  it("没起名字的主导航显示「主导航」，不把 key 摊给租户看", () => {
    renderField();
    expect(screen.getByText("主导航")).toBeTruthy();
    expect(screen.queryByText(MAIN_MENU_KEY)).toBeNull();
  });

  it("动态项显示它现在会展开成几条", () => {
    renderField();
    expect(screen.getByText("自动 · 2 条")).toBeTruthy();
  });

  it("展开动态项能看到具体条目", () => {
    renderField();
    expandRow(/全部一级页面/u);
    expect(screen.getByText(/关于 · 博客/u)).toBeTruthy();
  });

  it("展开不出内容时说明这一条不会出现在导航里", () => {
    renderField({ preview: { navPages: [], docs: [] } });
    expandRow(/全部一级页面/u);
    expect(screen.getByText(/这一条不会出现在导航里/u)).toBeTruthy();
  });

  it("菜单被别处也引用时才提示", () => {
    renderField({ usage: { [MAIN_MENU_KEY]: ["页头", "页脚 · 菜单列 1"] } });
    expect(screen.getByText(/页脚 · 菜单列 1/u)).toBeTruthy();
  });

  it("只被一处引用时不提示", () => {
    renderField({ usage: { [MAIN_MENU_KEY]: ["页头"] } });
    expect(screen.queryByText(/同一份导航/u)).toBeNull();
  });

  it("添加条目写回整表", () => {
    const { setMenus } = renderField();
    fireEvent.click(screen.getByRole("button", { name: "添加条目" }));
    expect(setMenus).toHaveBeenCalledTimes(1);
    expect(setMenus.mock.calls[0]?.[0][0].items).toHaveLength(3);
  });

  it("行内上移把新顺序写回", () => {
    const { setMenus } = renderField();
    fireEvent.click(screen.getAllByRole("button", { name: "上移" })[1]!);
    expect(
      setMenus.mock.calls[0]?.[0][0].items.map(
        (item: { id: string }) => item.id,
      ),
    ).toEqual(["pages", "pricing"]);
  });

  it("拖到目标行下半 → 落在它之后", async () => {
    const { setMenus, row } = renderField();
    await dragTo(row("pricing"), row("pages"), 15);
    expect(
      setMenus.mock.calls[0]?.[0][0].items.map(
        (item: { id: string }) => item.id,
      ),
    ).toEqual(["pages", "pricing"]);
  });

  it("菜单不存在时明说它被删了", () => {
    renderField({ menus: [] });
    expect(screen.getByText(/已被删除/u)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "添加条目" })).toBeNull();
  });

  it("主导航不给删", () => {
    renderField();
    openMenu(screen.getByRole("button", { name: "换一份导航" }));
    expect(
      screen.getByRole("menuitem", { name: "删除这份导航" }),
    ).toHaveAttribute("data-disabled");
  });

  it("被两处引用的菜单不给删", () => {
    renderField(
      { menus: [shared()], usage: { links: ["页头", "页脚 · 菜单列 1"] } },
      "links",
    );
    expect(deleteMenuItem()).toHaveAttribute("data-disabled");
  });

  it("只被一处引用的菜单可以删", () => {
    renderField({ menus: [shared()], usage: { links: ["页头"] } }, "links");
    expect(deleteMenuItem()).not.toHaveAttribute("data-disabled");
  });
});
