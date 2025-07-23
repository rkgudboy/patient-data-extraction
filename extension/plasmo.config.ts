import { defineConfig } from "plasmo"

export default defineConfig({
  srcDir: "src",
  assetsDir: "assets",
  buildDir: "build",
  distDir: "dist",
  manifestPath: "manifest.json",
  browser: "chrome",
  target: "chrome-extension",
  minify: false,
  sourcemap: true
})