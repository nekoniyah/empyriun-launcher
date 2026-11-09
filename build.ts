import { existsSync, rmSync } from "node:fs";
import {
  cp,
  mkdir,
  readFile,
  rename,
  rm,
  writeFile,
  readdir,
} from "node:fs/promises";
import { dirname, join, relative, sep } from "node:path";
import config from "./app.config";

interface Assets {
  readonly script: string;
  readonly style: string;
}

const ROOT = import.meta.dir;

const PATHS = {
  dist: join(ROOT, "dist"),
  entry: join(ROOT, "src", "mainview", "main.ts"),
  styles: join(ROOT, "src", "mainview", "index.css"),
} as const;

// rmSync(PATHS.dist, { recursive: true });
// rmSync(`./build`, { recursive: true });

class BrandEmbedder {
  async write(): Promise<string> {
    const [ico, png] = await Promise.all([
      readFile(join(ROOT, "assets", "icon.ico")),
      readFile(join(ROOT, "assets", "icon.png")),
    ]);
    const target = join(ROOT, "src", "bun", "generated", "brand.ts");
    await mkdir(dirname(target), { recursive: true });
    await writeFile(
      target,
      `export const ICON_ICO_BASE64 = '${ico.toString("base64")}'\nexport const ICON_PNG_BASE64 = '${png.toString("base64")}'\n`,
    );
    return `data:image/png;base64,${png.toString("base64")}`;
  }
}

class ExecutableIconPatcher {
  async patch(): Promise<void> {
    if (process.platform !== "win32") return;
    const distribution = join(
      ROOT,
      "node_modules",
      "electrobun",
      "dist-win-x64",
    );
    const binaries = join(ROOT, "node_modules", "rcedit", "bin");
    if (!existsSync(distribution) || !existsSync(binaries)) return;
    const names = (await readdir(binaries))
      .filter((name) => /^rcedit.*\.exe$/i.test(name))
      .sort(
        (left, right) =>
          Number(right.includes("x64")) - Number(left.includes("x64")),
      );
    const tool = names[0];
    if (!tool) return;
    const icon = join(ROOT, "assets", "icon.ico");
    const stamp = join(distribution, ".icon-patched");
    const hash = new Bun.CryptoHasher("sha256")
      .update(await readFile(icon))
      .digest("hex");
    if (existsSync(stamp) && (await readFile(stamp, "utf8")) === hash) return;
    for (const name of ["launcher.exe", "launcher", "bun.exe"]) {
      const target = join(distribution, name);
      if (!existsSync(target)) continue;
      const child = Bun.spawn(
        [join(binaries, tool), target, "--set-icon", icon],
        { stdout: "inherit", stderr: "inherit" },
      );
      if ((await child.exited) !== 0)
        console.error(`Icon patch failed for ${name}`);
    }
    await writeFile(stamp, hash);
  }
}

const BOOT_CSS = [
  "#boot{position:fixed;inset:0;z-index:100;display:flex;align-items:center;justify-content:center;background:#09090b;color:#fafafa;font-family:system-ui,sans-serif;transition:opacity .5s ease,visibility .5s}",
  "#boot.out{opacity:0;visibility:hidden}",
  ".boot-core{display:flex;flex-direction:column;align-items:center}",
  ".boot-logo{width:76px;height:76px;animation:boot-in 1s cubic-bezier(.2,.8,.2,1) both;transition:transform .5s ease}",
  "#boot.out .boot-logo{transform:scale(1.08)}",
  ".boot-name{margin-top:22px;font-size:12px;font-weight:600;letter-spacing:.42em;text-transform:uppercase;animation:boot-in .9s .2s cubic-bezier(.2,.8,.2,1) both}",
  ".boot-bar{margin-top:26px;width:148px;height:2px;overflow:hidden;background:#27272a}",
  ".boot-bar i{display:block;width:38%;height:100%;background:#fafafa;animation:boot-slide 1.3s ease-in-out infinite}",
  ".boot-status{margin-top:14px;min-height:16px;font-size:12px;color:#a1a1aa}",
  "#app{opacity:0;transform:translateY(8px);transition:opacity .5s ease .1s,transform .5s ease .1s}",
  "body.ready #app{opacity:1;transform:none}",
  "@keyframes boot-in{from{opacity:0;transform:translateY(8px) scale(.94)}to{opacity:1;transform:none}}",
  "@keyframes boot-slide{0%{transform:translateX(-100%)}100%{transform:translateX(280%)}}",
  "@media (prefers-reduced-motion:reduce){.boot-logo,.boot-name,.boot-bar i{animation:none}#boot,#app{transition:none}}",
].join("");

function cspHash(content: string): string {
  return new Bun.CryptoHasher("sha256").update(content).digest("base64");
}

class WebBuilder {
  constructor(
    private readonly dev: boolean,
    private readonly logo: string,
  ) {}

  async build(): Promise<void> {
    const started = performance.now();
    await rm(PATHS.dist, { recursive: true, force: true });
    await mkdir(join(PATHS.dist, "assets"), { recursive: true });
    const script = await this.bundleScript();
    const style = await this.bundleStyles();
    await cp(
      join(ROOT, "src", "mainview", "assets"),
      join(PATHS.dist, "assets"),
      { recursive: true },
    ).catch(() => undefined);
    await writeFile(
      join(PATHS.dist, "index.html"),
      this.renderDocument({ script, style }),
    );
    console.log(`Built in ${Math.round(performance.now() - started)}ms`);
  }

  private async bundleScript(): Promise<string> {
    const result = await Bun.build({
      entrypoints: [PATHS.entry],
      outdir: PATHS.dist,
      target: "browser",
      format: "esm",
      splitting: false,
      minify: !this.dev,
      sourcemap: this.dev ? "linked" : "none",
      naming: {
        entry: "assets/[name]-[hash].[ext]",
        asset: "assets/[name]-[hash].[ext]",
      },
    });
    for (const log of result.logs) console.error(log);
    const entry = result.outputs.find(
      (output) => output.kind === "entry-point",
    );
    if (!result.success || !entry) throw new Error("Script bundle failed");
    return `./${relative(PATHS.dist, entry.path).split(sep).join("/")}`;
  }

  private async bundleStyles(): Promise<string> {
    const temporary = join(PATHS.dist, "assets", "styles.css");
    const flags = this.dev ? [] : ["--minify"];
    const child = Bun.spawn(
      [
        process.execPath,
        "x",
        "@tailwindcss/cli",
        "-i",
        PATHS.styles,
        "-o",
        temporary,
        ...flags,
      ],
      {
        cwd: ROOT,
        stdout: "inherit",
        stderr: "inherit",
      },
    );
    if ((await child.exited) !== 0) throw new Error("Style build failed");
    const content = await readFile(temporary);
    const hash = new Bun.CryptoHasher("sha256")
      .update(content)
      .digest("hex")
      .slice(0, 10);
    const name = `styles-${hash}.css`;
    await rename(temporary, join(PATHS.dist, "assets", name));
    return `./assets/${name}`;
  }

  private renderDocument({ script, style }: Assets): string {
    const bootHash = cspHash(BOOT_CSS);
    const csp = [
      "default-src 'none'",
      `style-src 'self' 'sha256-${bootHash}'`,
      "script-src 'self'",
      "img-src 'self' data:",
      "font-src 'self'",
      "connect-src 'self' ws://127.1.0.0:* ws://localhost:* http://127.1.0.0:* http://localhost:*",
      "media-src 'none'",
      "object-src 'none'",
      "base-uri 'none'",
      "form-action 'none'",
      "frame-ancestors 'none'",
      "frame-src 'none'",
      "worker-src 'none'",
    ].join("; ");
    return [
      "<!doctype html>",
      '<html lang="en">',
      "<head>",
      '<meta charset="utf-8">',
      '<meta name="viewport" content="width=device-width,initial-scale=1">',
      `<title>${config.title}</title>`,
      '<meta name="color-scheme" content="dark light">',
      `<meta http-equiv="Content-Security-Policy" content="${csp}">`,
      `<style>${BOOT_CSS}</style>`,
      `<link rel="stylesheet" href="${style}">`,
      `<script type="module" src="${script}"></script>`,
      "</head>",
      "<body>",
      `<div id="boot" role="status"><div class="boot-core"><img id="boot-logo" class="boot-logo" src="${this.logo}" alt="" draggable="false"><div class="boot-name">${config.title}</div><div class="boot-bar"><i></i></div><div id="boot-status" class="boot-status"></div></div></div>`,
      '<div id="app"></div>',
      "</body>",
      "</html>",
    ].join("");
  }
}

if (!existsSync(PATHS.entry)) throw new Error("Missing src/mainview/main.ts");

await new ExecutableIconPatcher().patch();
const logo = await new BrandEmbedder().write();
await new WebBuilder(Bun.argv.slice(2).includes("--dev"), logo).build();
