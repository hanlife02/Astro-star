export async function readSubscriptionBody(request: Request, limit: number) {
  const reader = request.body?.getReader();
  if (!reader) return;
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) return Buffer.concat(chunks).toString("utf8");
    bytes += value.byteLength;
    if (bytes > limit) {
      await reader.cancel();
      return;
    }
    chunks.push(value);
  }
}
