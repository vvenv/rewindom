/**
 * 公开站的文档搜索落地（无 React）。
 *
 * 搜索的**唯一入口是页头**那个 `<form action="/docs">`：它把词带到文档索引上的
 * `?q=`。这里负责接住——按词过滤列表，并在列表上方画一枚可清除的筛选标签。
 *
 * 曾经是另一套：`doc-list` 段自带一个搜索框，本模块把 `?q=` 填进去再过滤。结果是
 * 页头和列表上各有一个一模一样的框。现在段只负责列，输入只发生在页头。
 *
 * 过滤读每条 `<li>` 上的 `data-doc-search`（SSR 用 `docSearchHaystack` 写入），
 * 不去 DOM 里现拼标题摘要——现拼的口径会与写入端悄悄分叉。
 */

/** 页头搜索入口与本模块约定的查询参数。 */
export const DOC_SEARCH_PARAM = "q";

interface DocList {
  root: Element;
  items: HTMLElement[];
  groups: HTMLElement[];
}

function messages(): { filtered: string; clear: string; noResults: string } {
  const locale =
    document
      .querySelector(".marketing-site-root")
      ?.getAttribute("data-page-locale") ?? document.documentElement.lang;
  return locale === "en"
    ? { filtered: "Filtered by", clear: "Clear", noResults: "No matching docs" }
    : { filtered: "筛选：", clear: "清除", noResults: "没有匹配的文档" };
}

function collect(root: Element): DocList {
  return {
    root,
    items: [...root.querySelectorAll<HTMLElement>("[data-doc-search]")],
    groups: [...root.querySelectorAll<HTMLElement>(".doc-list-group")],
  };
}

/** @returns 命中条数 */
function applyFilter(list: DocList, needle: string): number {
  let hits = 0;
  for (const item of list.items) {
    const match = needle === "" || (item.dataset.docSearch ?? "").includes(needle);
    item.hidden = !match;
    if (match) hits += 1;
  }
  // 整组都被过滤掉时连分类抬头一起收起来，否则会剩一排空标题
  for (const group of list.groups) {
    group.hidden = ![
      ...group.querySelectorAll<HTMLElement>("[data-doc-search]"),
    ].some((item) => !item.hidden);
  }
  return hits;
}

/**
 * 列表上方那枚「筛选：xxx ✕」。
 *
 * 由脚本建而不是 SSR 先吐一个隐藏的：两端渲染有结构守卫在比
 *（`section-structure.test.tsx`），SSR 多一个 React 那边没有的元素就会误报；
 * 而这枚标签只在带 `?q=` 时出现，本来也不属于首屏的默认形态。
 */
function renderChip(
  list: DocList,
  query: string,
  hits: number,
  onClear: () => void,
): void {
  const text = messages();
  const chip = document.createElement("div");
  chip.className = "doc-list-filter";

  const label = document.createElement("span");
  label.className = "doc-list-filter-term";
  label.textContent = `${text.filtered}${query}`;
  chip.append(label);

  const clear = document.createElement("button");
  clear.type = "button";
  clear.className = "doc-list-filter-clear";
  clear.setAttribute("aria-label", text.clear);
  clear.title = text.clear;
  clear.textContent = "✕";
  clear.addEventListener("click", onClear);
  chip.append(clear);

  if (hits === 0) {
    const empty = document.createElement("p");
    empty.className = "doc-list-empty";
    empty.textContent = text.noResults;
    list.root.append(empty);
  }

  list.root.prepend(chip);
}

function clearAll(lists: DocList[]): void {
  for (const list of lists) {
    applyFilter(list, "");
    list.root.querySelector(".doc-list-filter")?.remove();
    list.root.querySelector(".doc-list-empty")?.remove();
  }
  const url = new URL(window.location.href);
  url.searchParams.delete(DOC_SEARCH_PARAM);
  // replace 而不是 push：清除筛选不该往历史里塞一条，返回键应该退回上一页
  window.history.replaceState(null, "", url.toString());
}

export function enhanceDocSearch(): void {
  const query = (
    new URLSearchParams(window.location.search).get(DOC_SEARCH_PARAM) ?? ""
  ).trim();
  if (!query) return;

  const lists = [...document.querySelectorAll(".doc-list")].map(collect);
  if (lists.length === 0) return;

  const needle = query.toLowerCase();
  for (const list of lists) {
    const hits = applyFilter(list, needle);
    renderChip(list, query, hits, () => clearAll(lists));
  }
}
