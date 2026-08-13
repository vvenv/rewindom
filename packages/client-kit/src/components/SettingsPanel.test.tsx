import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Wallet } from "lucide-react";

import { SettingsPanel, SettingsStack, SettingsToggleRow } from "./SettingsPanel.js";

describe("SettingsPanel", () => {
  it("renders title, description, action and footer", () => {
    render(
      <SettingsPanel
        icon={Wallet}
        title="收款"
        description="钱进谁的账号"
        action={<button type="button">配置</button>}
        footer={<button type="button">保存</button>}
      >
        <p>已配置</p>
      </SettingsPanel>,
    );

    expect(screen.getByText("收款")).toBeInTheDocument();
    expect(screen.getByText("钱进谁的账号")).toBeInTheDocument();
    expect(screen.getByText("已配置")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "配置" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "保存" })).toBeInTheDocument();
  });
});

describe("SettingsStack", () => {
  it("is a column of panels", () => {
    const { container } = render(
      <SettingsStack>
        <SettingsPanel title="A">one</SettingsPanel>
      </SettingsStack>,
    );
    expect(container.firstChild).toHaveClass("max-w-2xl");
  });
});

describe("SettingsToggleRow", () => {
  it("labels the switch", () => {
    render(
      <SettingsToggleRow
        id="reg"
        label="开放注册"
        description="关闭后不能自助加入"
        checked={false}
        onCheckedChange={() => undefined}
      />,
    );
    expect(screen.getByLabelText("开放注册")).toBeInTheDocument();
  });
});
