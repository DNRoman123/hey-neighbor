import { createServerFn } from "@tanstack/react-start";

/**
 * Google OAuth client IDs are public values that the native SDK needs at
 * runtime. They are stored as backend secrets, so the app reads them from the
 * server instead of requiring build-time VITE_ variables.
 */
export const getGoogleClientIds = createServerFn({ method: "GET" }).handler(async () => {
  const iosClientId = process.env["GOOGLE_IOS_CLIENT_ID"] ?? "";
  const webClientId =
    process.env["GOOGLE_WEB_CLIENT_ID"] ?? process.env["GOOGLE_OAUTH_CLIENT_ID"] ?? "";
  return { iosClientId, webClientId };
});
