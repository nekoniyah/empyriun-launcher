import type { ElectrobunConfig } from "electrobun/bun";
import config from "./app.config";

export default {
  app: {
    name: config.name,
    identifier: config.identifier,
    description: config.description,
    version: config.version,
  },
  build: {
    useAsar: true,
    bun: { entrypoint: "src/bun/index.ts", external: [] },
    views: {},
    copy: {
      "dist/index.html": "views/mainview/index.html",
      "dist/assets": "views/mainview/assets",
    },
    watchIgnore: ["dist/**"],
    mac: {
      icons: "assets/icon.icns",
      codesign: false,
      notarize: false,
      bundleCEF: false,
      entitlements: {},
    },
    win: { icon: "assets/icon.ico", bundleCEF: false },
    linux: { icon: "assets/icon.png", bundleCEF: false },
  },
  release: { baseUrl: config.baseUrl },
} satisfies ElectrobunConfig;
