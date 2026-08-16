export const SHOP_COLLECTION_STATUSES = ["draft", "published"] as const;
export type ShopCollectionStatus = (typeof SHOP_COLLECTION_STATUSES)[number];

export function isShopCollectionStatus(
  value: unknown,
): value is ShopCollectionStatus {
  return (SHOP_COLLECTION_STATUSES as readonly unknown[]).includes(value);
}

export interface ShopCollection {
  id: string;
  tenant_id: string;
  slug: string;
  status: ShopCollectionStatus;
  title: Record<string, string>;
  description: Record<string, string> | null;
  seo_title: Record<string, string> | null;
  seo_description: Record<string, string> | null;
  image_url: string | null;
  parent_id: string | null;
  sort_order: number;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  product_ids: string[];
}

export interface ShopCollectionListItem {
  id: string;
  slug: string;
  status: ShopCollectionStatus;
  title: string;
  parent_id: string | null;
  parent_slug: string | null;
  parent_title: string;
  sort_order: number;
  product_count: number;
  updated_at: string;
}

export interface CreateShopCollectionBody {
  slug: string;
  status?: ShopCollectionStatus;
  title: Record<string, string> | string;
  description?: Record<string, string> | string | null;
  seo_title?: Record<string, string> | string | null;
  seo_description?: Record<string, string> | string | null;
  image_url?: string | null;
  parent_id?: string | null;
  sort_order?: number;
  product_ids?: string[];
}

export interface UpdateShopCollectionBody {
  slug?: string;
  status?: ShopCollectionStatus;
  title?: Record<string, string> | string;
  description?: Record<string, string> | string | null;
  seo_title?: Record<string, string> | string | null;
  seo_description?: Record<string, string> | string | null;
  image_url?: string | null;
  parent_id?: string | null;
  sort_order?: number;
  product_ids?: string[];
}

/** 店面分类树用的扁平行（已按站点语言压成 title）。 */
export interface ShopCollectionCardView {
  slug: string;
  parent_slug: string | null;
  href: string;
  title: string;
  product_count: number;
  sort_order: number;
}

export interface ShopCollectionTreeNode {
  slug: string;
  href: string;
  title: string;
  product_count: number;
  children: ShopCollectionTreeNode[];
}

export const COLLECTION_TREE_MIN_DEPTH = 1;
export const COLLECTION_TREE_MAX_DEPTH = 8;
/** 根分类下拉里「从顶层展开」的哨兵；Radix Select 不能用空字符串当 value。 */
export const ROOT_COLLECTION_ALL = "__all__";

export function clampCollectionTreeDepth(value: number): number {
  if (!Number.isFinite(value)) return 3;
  return Math.min(
    COLLECTION_TREE_MAX_DEPTH,
    Math.max(COLLECTION_TREE_MIN_DEPTH, Math.trunc(value)),
  );
}

function compareCollectionSiblings(
  a: ShopCollectionCardView,
  b: ShopCollectionCardView,
): number {
  if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
  return a.slug.localeCompare(b.slug);
}

function pruneEmptyCollectionNodes(
  nodes: ShopCollectionTreeNode[],
): ShopCollectionTreeNode[] {
  return nodes
    .map((node) => ({
      ...node,
      children: pruneEmptyCollectionNodes(node.children),
    }))
    .filter((node) => node.product_count > 0 || node.children.length > 0);
}

/**
 * 从扁平分类切一棵可见树。未出现在列表里的父节点（草稿 / 已删）视为断裂，
 * 子节点升到顶层，避免「父未发布就把整枝藏掉」。
 */
export function sliceCollectionTree(
  collections: readonly ShopCollectionCardView[],
  options: {
    root_slug?: string;
    depth: number;
    include_root: boolean;
    show_empty: boolean;
  },
): ShopCollectionTreeNode[] {
  const depth = clampCollectionTreeDepth(options.depth);
  const bySlug = new Map<string, ShopCollectionCardView>();
  for (const item of collections) bySlug.set(item.slug, item);

  const children = new Map<string, ShopCollectionCardView[]>();
  const roots: ShopCollectionCardView[] = [];
  for (const item of [...collections].sort(compareCollectionSiblings)) {
    const parent = item.parent_slug ? bySlug.get(item.parent_slug) : undefined;
    if (!parent) {
      roots.push(item);
      continue;
    }
    const siblings = children.get(parent.slug) ?? [];
    siblings.push(item);
    children.set(parent.slug, siblings);
  }

  const walk = (
    item: ShopCollectionCardView,
    remaining: number,
  ): ShopCollectionTreeNode => ({
    slug: item.slug,
    href: item.href,
    title: item.title,
    product_count: item.product_count,
    children:
      remaining <= 1
        ? []
        : (children.get(item.slug) ?? []).map((child) =>
            walk(child, remaining - 1),
          ),
  });

  const rootSlug = options.root_slug?.trim() ?? "";
  const fromTop = !rootSlug || rootSlug === ROOT_COLLECTION_ALL;
  let nodes: ShopCollectionTreeNode[];
  if (fromTop) {
    nodes = roots.map((item) => walk(item, depth));
  } else {
    const root = bySlug.get(rootSlug);
    if (!root) return [];
    if (options.include_root) {
      nodes = [walk(root, depth)];
    } else {
      nodes = (children.get(root.slug) ?? []).map((item) => walk(item, depth));
    }
  }

  return options.show_empty ? nodes : pruneEmptyCollectionNodes(nodes);
}

/** 把 parent_id 改成 nextParentId 会不会成环（含指向自己）。 */
export function wouldCreateCollectionCycle(
  nodes: readonly { id: string; parent_id: string | null }[],
  collectionId: string,
  nextParentId: string | null,
): boolean {
  if (!nextParentId) return false;
  if (nextParentId === collectionId) return true;
  const parentOf = new Map(nodes.map((node) => [node.id, node.parent_id]));
  let current: string | null = nextParentId;
  const seen = new Set<string>();
  while (current) {
    if (current === collectionId) return true;
    if (seen.has(current)) return true;
    seen.add(current);
    current = parentOf.get(current) ?? null;
  }
  return false;
}

/** 某节点的全体子孙 id，用来在父分类下拉里排除自己和下级。 */
export function collectionDescendantIds(
  nodes: readonly { id: string; parent_id: string | null }[],
  rootId: string,
): Set<string> {
  const children = new Map<string, string[]>();
  for (const node of nodes) {
    if (!node.parent_id) continue;
    const list = children.get(node.parent_id) ?? [];
    list.push(node.id);
    children.set(node.parent_id, list);
  }
  const out = new Set<string>();
  const stack = [...(children.get(rootId) ?? [])];
  while (stack.length > 0) {
    const id = stack.pop()!;
    if (out.has(id)) continue;
    out.add(id);
    stack.push(...(children.get(id) ?? []));
  }
  return out;
}

/** 编辑器根分类下拉：按树序摊平，下级用前导破折号表示层级。 */
export function collectionSelectOptions(
  collections: readonly ShopCollectionCardView[],
): Array<{ value: string; label: string }> {
  const tree = sliceCollectionTree(collections, {
    depth: COLLECTION_TREE_MAX_DEPTH,
    include_root: true,
    show_empty: true,
  });
  const out: Array<{ value: string; label: string }> = [];
  const walk = (nodes: ShopCollectionTreeNode[], depth: number): void => {
    for (const node of nodes) {
      out.push({
        value: node.slug,
        label: `${"— ".repeat(depth)}${node.title}`,
      });
      walk(node.children, depth + 1);
    }
  };
  walk(tree, 0);
  return out;
}

export function filterProductsByCollectionSlug<
  T extends { collection_slugs: string[] },
>(products: T[], collection_slug: string | undefined): T[] {
  const slug = collection_slug?.trim();
  if (!slug) return products;
  return products.filter((product) => product.collection_slugs.includes(slug));
}
