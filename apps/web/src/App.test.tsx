import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { App } from "./App.js";

describe("App", () => {
  it("starts at the expedition menu with an accessible new-run action", () => {
    const markup = renderToStaticMarkup(<App />);
    expect(markup).toContain("잿빛 원정");
    expect(markup).toContain("새 원정 시작");
  });
});
