import {
  PageFilterBar,
  type PageFilterBarProps,
} from "./PageFilterBar";

/** 筛选栏：桌面端单行排列全部控件。 */
export function FilterBar(props: Omit<PageFilterBarProps, "layout">) {
  return <PageFilterBar layout="inline" {...props} />;
}
