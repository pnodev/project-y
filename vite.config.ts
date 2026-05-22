import { defineConfig } from "vite";
import { devtools } from "@tanstack/devtools-vite";
import netlify from "@netlify/vite-plugin-tanstack-start";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  // postgres uses Node's Buffer; keep it out of the browser pre-bundle in dev.
  optimizeDeps: {
    exclude: ["postgres"],
  },
  server: {
    port: 3001,
    // Listen on IPv4 too; default [::1] breaks smee/curl to 127.0.0.1
    host: true,
  },
  plugins: [
    devtools(),
    tailwindcss(),
    tanstackStart(),
    netlify(),
    viteReact(),
  ],
});
