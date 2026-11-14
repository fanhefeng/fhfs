import { describe, expect, it } from "vite-plus/test";
import { selectPopupPlacement } from "@/lib/viewport";

describe("selectPopupPlacement", () => {
  it("opens down when the full menu fits and up near the visible bottom", () => {
    const viewport = { top: 0, height: 800 };
    expect(selectPopupPlacement({ top: 100, bottom: 144 }, viewport, 288)).toEqual({
      upward: false,
      maxHeight: 288,
    });
    expect(selectPopupPlacement({ top: 700, bottom: 744 }, viewport, 288)).toEqual({
      upward: true,
      maxHeight: 288,
    });
  });

  it("uses the visible keyboard/zoom bounds and constrains a short viewport", () => {
    expect(selectPopupPlacement({ top: 210, bottom: 254 }, { top: 100, height: 200 }, 288)).toEqual(
      { upward: true, maxHeight: 104 },
    );
    expect(selectPopupPlacement({ top: 10, bottom: 54 }, { top: 0, height: 80 }, 288)).toEqual({
      upward: false,
      maxHeight: 20,
    });
  });

  it("never returns negative space for an anchor outside the visible viewport", () => {
    expect(selectPopupPlacement({ top: -50, bottom: -6 }, { top: 0, height: 100 }, 288)).toEqual({
      upward: false,
      maxHeight: 100,
    });
  });
});
