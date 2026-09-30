import { defineConfig } from "vite";

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        phaser: new URL("./index.html", import.meta.url).pathname,
        playcanvas: new URL("./playcanvas.html", import.meta.url).pathname,
      },
    },
  },
});
