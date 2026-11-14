import { uploadFile } from "../mediaUploads";

export type UploadedMedia = {
  kind: "image" | "audio" | "video";
  src: string;
  width?: number;
  height?: number;
  duration?: number;
  poster?: string;
};

export type UploadPhase = "preparing" | "uploading" | "confirming";

/** Bound cover rendering work without changing the source video's dimensions. */
export function posterDimensions(width: number, height: number, maxEdge = 1280) {
  if (![width, height, maxEdge].every((value) => Number.isFinite(value) && value > 0))
    throw new Error("读不出视频画面，请换一个文件。");
  const scale = Math.min(1, Math.floor(maxEdge) / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

async function abortable<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return promise;
  signal.throwIfAborted();
  return new Promise<T>((resolve, reject) => {
    const abort = () => reject(signal.reason);
    signal.addEventListener("abort", abort, { once: true });
    void promise.then(resolve, reject).finally(() => signal.removeEventListener("abort", abort));
  });
}

function retryDelay(signal: AbortSignal): Promise<void> {
  signal.throwIfAborted();
  return new Promise<void>((resolve, reject) => {
    const finish = () => {
      signal.removeEventListener("abort", abort);
      resolve();
    };
    const timer = setTimeout(finish, 3000);
    const abort = () => {
      clearTimeout(timer);
      reject(signal.reason);
    };
    signal.addEventListener("abort", abort, { once: true });
  });
}

/** Measure local files before sending bytes; failed uploads keep their previews. */
export async function inspectMedia(
  file: File,
  url: string,
  signal?: AbortSignal,
): Promise<Omit<UploadedMedia, "src"> & { posterFile?: File }> {
  signal?.throwIfAborted();
  const format = uploadFile(file.name, file.size);
  if (!format.ok) throw new Error(format.error);
  if (format.kind === "image") {
    const image = new Image();
    image.src = url;
    try {
      await abortable(image.decode(), signal);
      signal?.throwIfAborted();
      return { kind: "image", width: image.naturalWidth, height: image.naturalHeight };
    } finally {
      image.removeAttribute("src");
    }
  }
  const player = document.createElement(format.kind === "video" ? "video" : "audio");
  player.preload = "auto";
  player.muted = true;
  player.src = url;
  try {
    await new Promise<void>((resolve, reject) => {
      const clear = () => {
        clearTimeout(timer);
        player.onloadeddata = null;
        player.onerror = null;
        signal?.removeEventListener("abort", abort);
      };
      const abort = () => {
        clear();
        reject(signal?.reason);
      };
      const timer = setTimeout(() => {
        clear();
        reject(new Error("读不出文件信息，请换成浏览器支持的音视频格式。"));
      }, 15000);
      player.onloadeddata = () => {
        clear();
        resolve();
      };
      player.onerror = () => {
        clear();
        reject(new Error("浏览器无法读取这个音视频，请换成 MP4 或 M4A / MP3。"));
      };
      signal?.addEventListener("abort", abort, { once: true });
      player.load();
    });
    signal?.throwIfAborted();
    const duration = Math.round(player.duration * 10) / 10;
    if (!Number.isFinite(duration) || duration <= 0)
      throw new Error("读不出文件时长，请换一个文件。");
    if (player instanceof HTMLVideoElement) {
      const canvas = document.createElement("canvas");
      const size = posterDimensions(player.videoWidth, player.videoHeight);
      canvas.width = size.width;
      canvas.height = size.height;
      const context = canvas.getContext("2d");
      if (!context || !canvas.width || !canvas.height)
        throw new Error("读不出视频画面，请换一个文件。");
      try {
        context.drawImage(player, 0, 0, size.width, size.height);
        const poster = await abortable(
          new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85)),
          signal,
        );
        signal?.throwIfAborted();
        if (!poster) throw new Error("未能生成视频封面，请重试。");
        return {
          kind: "video",
          width: player.videoWidth,
          height: player.videoHeight,
          duration,
          posterFile: new File([poster], "poster.jpg", { type: "image/jpeg" }),
        };
      } finally {
        canvas.width = 0;
        canvas.height = 0;
      }
    }
    return { kind: "audio", duration };
  } finally {
    player.removeAttribute("src");
    player.load();
  }
}

type UploadResponse = { error?: string; token?: string; src?: string; type?: string };
export async function uploadOperation(
  input: object,
  signal?: AbortSignal,
  keepalive = false,
): Promise<UploadResponse> {
  const response = await fetch("/admin/media/uploads", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
    signal,
    keepalive,
  });
  const result = (await response.json()) as UploadResponse;
  if (!response.ok) throw new Error(result.error ?? "上传或清理未完成，请重试。");
  return result;
}

export async function sendMedia(
  file: File,
  id: string,
  batch: string,
  signal: AbortSignal,
  onPhase?: (phase: UploadPhase) => void,
): Promise<string> {
  signal.throwIfAborted();
  onPhase?.("preparing");
  const permit = await uploadOperation(
    { action: "start", id, batch, name: file.name, size: file.size },
    signal,
  );
  if (!permit.src || !permit.type || !permit.token) throw new Error("未能开始上传，请重试。");
  signal.throwIfAborted();
  onPhase?.("uploading");
  const response = await fetch(
    permit.src.replace("/moments/uploads/", "/_uploads/moments/uploads/"),
    {
      method: "PUT",
      headers: { Authorization: `Bearer ${permit.token}`, "content-type": permit.type },
      body: file,
      signal,
    },
  );
  if (!response.ok) throw new Error("上传未完成，请重试；也可能已达到免费存储额度。");
  signal.throwIfAborted();
  onPhase?.("confirming");
  // Do not reference a KV upload until the site has read back its expected length.
  for (let attempt = 0; ; attempt++) {
    const ready = await fetch("/admin/media/uploads", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "finish", id, batch }),
      signal,
    });
    signal.throwIfAborted();
    if (ready.ok) return permit.src;
    const result = (await ready.json()) as UploadResponse;
    if (ready.status !== 425 || attempt >= 19)
      throw new Error(result.error ?? "文件仍在同步，请重试。");
    await retryDelay(signal);
  }
}
