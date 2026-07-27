import type { ComponentType, ReactNode } from "react";

export function ShellSlotList<T>({
  components,
  render,
}: {
  components: Array<ComponentType<T>>;
  render: (Component: ComponentType<T>, index: number) => ReactNode;
}): ReactNode {
  if (components.length === 0) {
    return null;
  }

  return (
    <>
      {components.map((Component, index) => render(Component, index))}
    </>
  );
}
