// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { loadEnv } from "vite";
import path from "path";

export default defineConfig({
  vite: {
    resolve: {
      alias: {
        // Pin React Email's entities resolution to the hoisted v4.5.0 copy.
        // v7+ removed ./lib/decode.js and breaks SSR rendering.
        "entities/lib/decode.js": path.resolve(
          __dirname,
          "node_modules/entities/lib/decode.js"
        ),
        "entities/lib/encode.js": path.resolve(
          __dirname,
          "node_modules/entities/lib/encode.js"
        ),
        entities: path.resolve(__dirname, "node_modules/entities"),
      },
    },
    plugins: [
      {
        name: "lovable-server-env-loader",
        config(_, { mode }) {
          const serverEnv = loadEnv(mode, process.cwd(), "");
          Object.assign(process.env, serverEnv);
          return null;
        },
      },
    ],
  },
});
