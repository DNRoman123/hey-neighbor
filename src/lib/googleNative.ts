import { supabase } from "@/integrations/supabase/client";
import { getGoogleClientIds } from "@/lib/googleConfig.functions";

/**
 * Native Google Sign-In for the iOS shell.
 *
 * Google rejects OAuth started inside an embedded app webview (invalid_request),
 * so the native app must use Google's own iOS SDK, then exchange the returned
 * id_token with the backend via signInWithIdToken.
 *
 * Client IDs come from backend secrets at runtime (GOOGLE_IOS_CLIENT_ID /
 * GOOGLE_OAUTH_CLIENT_ID and optionally GOOGLE_WEB_CLIENT_ID), with build-time
 * VITE_ variables as a fallback. The client ID that signs the id_token must also
 * be registered as an authorized client ID for the backend Google provider.
 */
const ENV_IOS_CLIENT_ID = (import.meta.env["VITE_GOOGLE_IOS_CLIENT_ID"] ?? "") as string;
const ENV_WEB_CLIENT_ID = (import.meta.env["VITE_GOOGLE_WEB_CLIENT_ID"] ?? "") as string;

let cached: { iosClientId: string; webClientId: string } | null = null;

export async function loadGoogleClientIds() {
  if (cached) return cached;
  if (ENV_IOS_CLIENT_ID) {
    cached = {
      iosClientId: ENV_IOS_CLIENT_ID,
      webClientId: ENV_WEB_CLIENT_ID || ENV_IOS_CLIENT_ID,
    };
    return cached;
  }
  try {
    const ids = await getGoogleClientIds();
    cached = {
      iosClientId: ids.iosClientId,
      webClientId: ids.webClientId || ids.iosClientId,
    };
  } catch (error) {
    console.error("Unable to load native Google client configuration", error);
    cached = { iosClientId: "", webClientId: "" };
  }
  return cached;
}

export async function isNativeGoogleConfigured() {
  const ids = await loadGoogleClientIds();
  return Boolean(ids.iosClientId);
}

let initialized = false;

function createOidcNonce() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function signInWithNativeGoogle() {
  const { SocialLogin } = await import("@capgo/capacitor-social-login");
  const ids = await loadGoogleClientIds();
  if (!ids.iosClientId || !ids.webClientId) {
    throw new Error("Google sign-in configuration could not be loaded. Please try again.");
  }

  if (!initialized) {
    await SocialLogin.initialize({
      google: {
        iOSClientId: ids.iosClientId,
        iOSServerClientId: ids.webClientId,
        webClientId: ids.webClientId,
        mode: "online",
      },
    });
    initialized = true;
  }

  const nonce = createOidcNonce();
  const res = await SocialLogin.login({
    provider: "google",
    options: { scopes: ["email", "profile"], forcePrompt: true, nonce },
  });
  const result = res.result;
  if (result.responseType !== "online") {
    throw new Error("Google returned an unsupported sign-in response");
  }
  const idToken = result.idToken;
  if (!idToken) throw new Error("Google did not return an identity token");

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: "google",
    token: idToken,
    nonce,
  });
  if (error) throw error;
  return data;
}
