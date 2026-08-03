import { createFileRoute } from "@tanstack/react-router";

/**
 * Google OAuth client IDs are public identifiers (they are shipped inside every
 * iOS binary and every web page that starts a Google sign-in). Exposing them
 * here lets the native build pipeline read the iOS client id at build time so
 * the Info.plist URL scheme can be generated without duplicating the value in
 * a CI environment variable.
 */
export const Route = createFileRoute("/api/public/google-config")({
  server: {
    handlers: {
      GET: () => {
        const iosClientId = process.env["GOOGLE_IOS_CLIENT_ID"] ?? "";
        const webClientId =
          process.env["GOOGLE_WEB_CLIENT_ID"] ?? process.env["GOOGLE_OAUTH_CLIENT_ID"] ?? "";
        return new Response(JSON.stringify({ iosClientId, webClientId }), {
          headers: {
            "content-type": "application/json",
            "cache-control": "no-store",
          },
        });
      },
    },
  },
});
