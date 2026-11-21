import type { APIRoute } from "astro";
import { matchesSecret } from "../../../server/subscriptions/settings";
import { deliverPublications } from "../../../server/subscriptions/worker";

let running = false;

export const POST: APIRoute = async ({ request }) => {
  const headers = { "cache-control": "no-store" };
  if (
    !matchesSecret(
      request.headers.get("x-subscriptions-worker-token"),
      process.env.SUBSCRIPTIONS_WORKER_TOKEN,
    )
  ) {
    return new Response(null, { status: 404, headers });
  }
  if (running) return new Response(null, { status: 204, headers });
  running = true;
  try {
    await deliverPublications();
    return new Response(null, { status: 204, headers });
  } finally {
    running = false;
  }
};
