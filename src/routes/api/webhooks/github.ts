import { createFileRoute } from "@tanstack/react-router";
import {
  processGitHubWebhook,
  verifyGitHubWebhookSignature,
} from "~/lib/git/github/webhooks";

export const Route = createFileRoute("/api/webhooks/github")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const deliveryId = request.headers.get("X-GitHub-Delivery");
        const eventType = request.headers.get("X-GitHub-Event");
        const signature = request.headers.get("X-Hub-Signature-256");

        if (!deliveryId || !eventType) {
          return new Response("Missing GitHub headers", { status: 400 });
        }

        const payload = await request.text();
        if (!verifyGitHubWebhookSignature(payload, signature)) {
          return new Response("Invalid signature", { status: 401 });
        }

        try {
          const json = JSON.parse(payload) as Record<string, unknown>;
          await processGitHubWebhook(eventType, deliveryId, json);
          return new Response("OK", { status: 200 });
        } catch (error) {
          const detail =
            error instanceof Error ? error.message : "Unknown error";
          console.error(
            `GitHub webhook processing failed (${eventType}, ${deliveryId}):`,
            error
          );
          return new Response(
            `Webhook handler error: ${detail}`,
            { status: 500 }
          );
        }
      },
    },
  },
});
