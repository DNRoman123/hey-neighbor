import type { CapacitorConfig } from "@capacitor/cli";

// Hey Neighbor is a server-rendered app (TanStack Start), so the native shell
// loads the deployed site and adds native capabilities (location, camera,
// push) on top of it. Point CAP_SERVER_URL at a different deployment to test.
const serverUrl = process.env["CAP_SERVER_URL"] ?? "https://hey-neighbor-io.lovable.app";

const config: CapacitorConfig = {
  appId: "app.lovable.heyneigh",
  appName: "Hey Neighbor",
  webDir: "dist/client",
  ios: {
    contentInset: "always",
    scheme: "Hey Neighbor",
    limitsNavigationsToAppBoundDomains: false,
  },
  server: {
    url: serverUrl,
    cleartext: false,
    androidScheme: "https",
    allowNavigation: [
      "hey-neighbor-io.lovable.app",
      "*.lovable.app",
      "oauth.lovable.app",
      "accounts.google.com",
      "*.google.com",
      "*.googleusercontent.com",
      "*.stripe.com",
      "*.supabase.co",
    ],
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: "#ffffff",
      showSpinner: false,
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
