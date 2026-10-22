import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LocalDemoNotice } from "./LocalDemoNotice.js";

describe("LocalDemoNotice", () => {
  it("announces that local demo progress is not saved", () => {
    const markup = renderToStaticMarkup(<LocalDemoNotice />);
    expect(markup).toContain('role="status"');
    expect(markup).toContain('aria-label="데모 모드 안내"');
    expect(markup).toContain("로컬 데모 · 저장 안 됨");
  });
});
