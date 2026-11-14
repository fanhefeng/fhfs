import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import {
  inspectMedia,
  posterDimensions,
  sendMedia,
  type UploadPhase,
} from "@/lib/client/mediaUpload";

const id = "c185fd3d-452d-4a67-9af7-bd501ef036b1";
const batch = "a9d9b104-77b6-423c-ad70-c5f80ad564df";
const src = `https://media.example/moments/uploads/${id}.mp4`;
const file = () => new File(["video"], "clip.mp4", { type: "video/mp4" });
const permit = () => Response.json({ src, type: "video/mp4", token: "local-test-permit" });

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("video cover dimensions", () => {
  it("bounds landscape and portrait covers without enlarging small inputs", () => {
    expect(posterDimensions(3840, 2160)).toEqual({ width: 1280, height: 720 });
    expect(posterDimensions(2160, 3840)).toEqual({ width: 720, height: 1280 });
    expect(posterDimensions(640, 360)).toEqual({ width: 640, height: 360 });
    expect(posterDimensions(10000, 1)).toEqual({ width: 1280, height: 1 });
    for (const width of [0, -1, NaN, Infinity])
      expect(() => posterDimensions(width, 1080)).toThrow();
  });

  it("draws a scaled cover while retaining the original video metadata", async () => {
    class Video {
      duration = 12.34;
      videoWidth = 3840;
      videoHeight = 2160;
      onloadeddata: (() => void) | null = null;
      onerror: (() => void) | null = null;
      load() {
        this.onloadeddata?.();
      }
      removeAttribute = vi.fn();
    }
    const video = new Video();
    const drawImage = vi.fn();
    const canvas = {
      width: 0,
      height: 0,
      getContext: () => ({ drawImage }),
      toBlob: (done: (blob: Blob | null) => void) =>
        done(new Blob(["cover"], { type: "image/jpeg" })),
    };
    vi.stubGlobal("HTMLVideoElement", Video);
    vi.stubGlobal("document", {
      createElement: (tag: string) => (tag === "canvas" ? canvas : video),
    });
    const measured = await inspectMedia(file(), "blob:local-test");
    expect(drawImage).toHaveBeenCalledWith(video, 0, 0, 1280, 720);
    expect(measured).toMatchObject({ kind: "video", width: 3840, height: 2160, duration: 12.3 });
    expect(measured.posterFile?.type).toBe("image/jpeg");
    expect(canvas).toMatchObject({ width: 0, height: 0 });
    expect(video.removeAttribute).toHaveBeenCalledWith("src");
  });

  it("cancels metadata inspection and releases the player and timeout", async () => {
    vi.useFakeTimers();
    class Video {
      onloadeddata: (() => void) | null = null;
      onerror: (() => void) | null = null;
      load = vi.fn();
      removeAttribute = vi.fn();
    }
    const video = new Video();
    vi.stubGlobal("HTMLVideoElement", Video);
    vi.stubGlobal("document", { createElement: () => video });
    const controller = new AbortController();
    const inspection = inspectMedia(file(), "blob:local-test", controller.signal);
    const rejected = expect(inspection).rejects.toMatchObject({ name: "AbortError" });
    controller.abort();
    await rejected;
    expect(video.onloadeddata).toBeNull();
    expect(video.onerror).toBeNull();
    expect(video.removeAttribute).toHaveBeenCalledWith("src");
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe("upload protocol feedback", () => {
  it("reports phases at the actual permit, transfer and availability boundaries", async () => {
    const phases: UploadPhase[] = [];
    const operations: string[] = [];
    const request = vi.fn(async (_url: string, init: RequestInit) => {
      if (init.method === "PUT") {
        operations.push(`put:${phases.at(-1)}`);
        return new Response(null, { status: 200 });
      }
      const body = JSON.parse(init.body as string) as { action: string };
      operations.push(`${body.action}:${phases.at(-1)}`);
      return body.action === "start" ? permit() : new Response(null, { status: 200 });
    });
    vi.stubGlobal("fetch", request);
    await expect(
      sendMedia(file(), id, batch, new AbortController().signal, (phase) => phases.push(phase)),
    ).resolves.toBe(src);
    expect(phases).toEqual(["preparing", "uploading", "confirming"]);
    expect(operations).toEqual(["start:preparing", "put:uploading", "finish:confirming"]);
    expect(request.mock.calls[1]?.[0]).toContain("/_uploads/moments/uploads/");
  });

  it("does not announce availability confirmation after a failed transfer", async () => {
    const phases: UploadPhase[] = [];
    const request = vi
      .fn()
      .mockResolvedValueOnce(permit())
      .mockResolvedValueOnce(new Response(null, { status: 503 }));
    vi.stubGlobal("fetch", request);
    await expect(
      sendMedia(file(), id, batch, new AbortController().signal, (phase) => phases.push(phase)),
    ).rejects.toThrow("上传未完成");
    expect(phases).toEqual(["preparing", "uploading"]);
    expect(request).toHaveBeenCalledTimes(2);
  });

  it("cancels a pending availability retry without another request or phase", async () => {
    vi.useFakeTimers();
    const request = vi
      .fn()
      .mockResolvedValueOnce(permit())
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(Response.json({ error: "still syncing" }, { status: 425 }));
    vi.stubGlobal("fetch", request);
    const phases: UploadPhase[] = [];
    const controller = new AbortController();
    const upload = sendMedia(file(), id, batch, controller.signal, (phase) => phases.push(phase));
    const rejected = expect(upload).rejects.toMatchObject({ name: "AbortError" });
    await vi.advanceTimersByTimeAsync(0);
    expect(request).toHaveBeenCalledTimes(3);
    expect(vi.getTimerCount()).toBe(1);
    controller.abort();
    await rejected;
    await vi.advanceTimersByTimeAsync(5000);
    expect(request).toHaveBeenCalledTimes(3);
    expect(phases).toEqual(["preparing", "uploading", "confirming"]);
    expect(vi.getTimerCount()).toBe(0);
  });
});
