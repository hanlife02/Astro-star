import { Agent, request } from "node:https";
import { json } from "node:stream/consumers";

export async function callTelegram(token, method, payload) {
  const proxy = process.env.SUBSCRIPTIONS_TELEGRAM_PROXY_URL;
  const agent = proxy
    ? new Agent({ proxyEnv: { HTTPS_PROXY: proxy } })
    : undefined;
  try {
    const response = await new Promise((resolve, reject) => {
      const req = request(
        `https://api.telegram.org/bot${token}/${method}`,
        {
          method: "POST",
          agent,
          headers: { "content-type": "application/json" },
          signal: AbortSignal.timeout(15_000),
        },
        resolve,
      );
      req.on("error", reject);
      req.end(JSON.stringify(payload));
    });
    const result = await json(response);
    if (response.statusCode !== 200 || !result.ok) {
      throw new Error(
        result.description || `Telegram returned HTTP ${response.statusCode}`,
      );
    }
    return result.result;
  } finally {
    agent?.destroy();
  }
}
