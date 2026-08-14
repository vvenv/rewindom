import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { createSection } from "../../../shared/section-schema.js";

import { htmlChromeBlockView, htmlSectionView } from "./html-section-view.js";

describe("htmlSectionView", () => {
  it("预览灌的就是渲染器产出的 HTML", () => {
    const View = htmlSectionView(
      (section) => `<p class="probe">${section.type}</p>`,
    );
    const { container } = render(
      <View
        section={createSection("hero")}
        pages={[]}
        currentPath="/"
        renderChildren={() => null}
      />,
    );
    expect(container.querySelector(".probe")?.textContent).toBe("hero");
  });

  it("渲染器没产出时不占节点", () => {
    const View = htmlSectionView(() => "");
    const { container } = render(
      <View
        section={createSection("hero")}
        pages={[]}
        currentPath="/"
        renderChildren={() => null}
      />,
    );
    expect(container.innerHTML).toBe("");
  });
});

describe("htmlChromeBlockView", () => {
  it("把 contributed 交给同一份 chrome 渲染器", () => {
    const View = htmlChromeBlockView((block, input) => {
      const shop = input.contributed?.shop as { n?: number } | undefined;
      return `<span class="probe">${block.type}:${shop?.n ?? 0}</span>`;
    });
    const { container } = render(
      <View
        block={{ id: "b1", type: "shop.cart-link", settings: {} }}
        contributed={{ shop: { n: 3 } }}
      />,
    );
    expect(container.querySelector(".probe")?.textContent).toBe(
      "shop.cart-link:3",
    );
  });
});
