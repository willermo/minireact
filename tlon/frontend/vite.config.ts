import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

import os from "os";
import fs from "fs";

export default defineConfig({
  resolve: {
    alias: {
      "@": __dirname + "/src",
      "@components": __dirname + "/src/components",
      "@pages": __dirname + "/src/pages",
      "@minireact": __dirname + "/src/lib/minireact/minireact.ts",
      "@utils": __dirname + "/src/utils",
      "@lib": __dirname + "/src/lib",
      "@types": __dirname + "/src/types",
    },
  },
  server: {
    watch: {
      usePolling: true,
      interval: 100,
    },
    port: 5173,
    open: false,
    host: "0.0.0.0",
    https: {
      key: fs.readFileSync("./certs/frontend.key"),
      cert: fs.readFileSync("./certs/frontend.crt"),
    },
    hmr: {
      host: "localhost",
      protocol: "wss",
      port: 5173,
    },
    proxy: {
      "/api": {
        target: "https://backend:3000",
        changeOrigin: true,
        secure: false,
        ssl: {
          rejectUnauthorized: false,
        },
        cookieDomainRewrite: "",
      },
    },
  },
  base: "./",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    // Ensure public directory is copied to dist
    copyPublicDir: true,
    assetsDir: "assets",
    rollupOptions: {
      output: {
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
    // Copy public assets to dist
    assetsInlineLimit: 0, // Force files to be copied instead of inlined
  },
  plugins: [
    {
      name: "lan-ip-logger",
      configureServer(server) {
        server.httpServer?.once("listening", () => {
          const ifaces = os.networkInterfaces();
          let lanIp = "unknown";
          for (const name of Object.keys(ifaces)) {
            for (const iface of ifaces[name]!) {
              if (iface.family === "IPv4" && !iface.internal) {
                lanIp = iface.address;
              }
            }
          }
          console.log(
            `\nFrontend dev server listening at http://localhost:5173 (LAN: http://${lanIp}:5173)\n`
          );
        });
      },
    },
    tailwindcss(),
  ],
});
