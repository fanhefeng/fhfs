/** Bound the uptime caller's wait for headers and body.
 * Sends abort but cannot force noncooperative I/O or server-side work to terminate.
 */
export function withinDeadline<T>(
  run: (signal: AbortSignal) => Promise<T>,
  deadline: number,
  parent?: AbortSignal,
): Promise<T> {
  const controller = new AbortController();
  const signal = parent ? AbortSignal.any([parent, controller.signal]) : controller.signal;
  const timeout = () =>
    controller.abort(new DOMException("Read deadline exceeded", "TimeoutError"));
  return new Promise<T>((resolve, reject) => {
    let settled = false;
    const finish = (error: boolean, value: unknown) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal.removeEventListener("abort", abort);
      if (error) reject(value);
      else resolve(value as T);
    };
    const abort = () => finish(true, signal.reason);
    const timer = setTimeout(timeout, Math.max(0, deadline - performance.now()));
    signal.addEventListener("abort", abort, { once: true });
    if (deadline <= performance.now()) timeout();
    if (signal.aborted) abort();
    // Both handlers remain attached when abort wins, so late failures are consumed.
    if (!settled)
      Promise.resolve()
        .then(() => {
          signal.throwIfAborted();
          return run(signal);
        })
        .then(
          (value) => finish(false, value),
          (error) => finish(true, error),
        );
  });
}

/** Ask the response reader to cancel as well; this does not guarantee server-side cancellation. */
export async function readResponseBytes(
  response: Response,
  signal?: AbortSignal,
  limit = Infinity,
): Promise<Uint8Array<ArrayBuffer>> {
  signal?.throwIfAborted();
  const reader = response.body?.getReader();
  if (!reader) return new Uint8Array();
  const cancel = () => {
    void reader.cancel().catch(() => {});
  };
  signal?.addEventListener("abort", cancel, { once: true });
  const parts: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      signal?.throwIfAborted();
      if (done) break;
      size += value.byteLength;
      if (size > limit) throw new Error("Response too large");
      parts.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const part of parts) {
      bytes.set(part, offset);
      offset += part.byteLength;
    }
    return bytes;
  } finally {
    signal?.removeEventListener("abort", cancel);
    cancel();
    reader.releaseLock();
  }
}
