import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import type { PackManifest } from "../content/metadata-types";
import { GameError } from "../core/game-error";
import type { AppPaths } from "../core/paths";
import type { AssetManager } from "./asset-manager";
import type { Downloader, VerifyMode } from "./downloader";
import type { JavaRuntime, JavaRuntimeManager } from "./java-runtime";
import type { LibraryPlanner } from "./library-planner";
import type { LoaderInstaller } from "./loader-installer";
import type { PackSynchronizer } from "./pack-synchronizer";
import type { ProgressReporter } from "./progress-reporter";
import type { VersionRepository } from "./version-repository";
import { ProfileResolver, type ResolvedProfile } from "./version-profile";
import type { IntegrityReport } from "../../../shared/integrity";
import appConfig from "../../../app.config";
import AdmZip from "adm-zip";
import { existsSync } from "node:fs";

export interface PreparedGame {
  readonly pack: PackManifest;
  readonly profile: ResolvedProfile;
  readonly runtime: JavaRuntime;
  readonly instanceDir: string;
  readonly classpath: readonly string[];
  readonly nativesDir: string;
  readonly assetsRoot: string;
  readonly librariesRoot: string;
  readonly clientJar: string;
}

export class GameInstaller {
  constructor(
    private readonly paths: AppPaths,
    private readonly downloader: Downloader,
    private readonly versions: VersionRepository,
    private readonly runtimes: JavaRuntimeManager,
    private readonly loaders: LoaderInstaller,
    private readonly planner: LibraryPlanner,
    private readonly assets: AssetManager,
    private readonly packs: PackSynchronizer,
  ) {}

  async install(
    pack: PackManifest,
    mode: VerifyMode,
    reporter: ProgressReporter,
  ): Promise<PreparedGame> {
    reporter.begin("minecraft", `Minecraft ${pack.minecraft}`, 2);
    const vanilla = await this.versions.ensure(pack.minecraft, mode);
    reporter.advance();
    const client = vanilla.downloads?.client;
    if (!client || !vanilla.javaVersion)
      throw new GameError(
        "unsupported_version",
        `Minecraft ${vanilla.id} is not supported by this launcher.`,
      );
    const clientJar = join(
      this.paths.versionsDir,
      vanilla.id,
      `${vanilla.id}.jar`,
    );
    await this.downloader.ensure(
      {
        url: client.url,
        destination: clientJar,
        size: client.size,
        sha1: client.sha1,
      },
      mode,
    );
    reporter.advance();
    const runtime = await this.runtimes.ensure(
      vanilla.javaVersion.component,
      mode,
      reporter,
    );
    reporter.begin("loader", `Mod loader ${pack.loader.type}`, 1);
    const loader = await this.loaders.ensure(pack, runtime, mode);
    reporter.advance();
    const profile = ProfileResolver.merge(vanilla, loader);
    const plan = await this.planner.plan(profile.libraries);
    reporter.begin(
      "libraries",
      "Libraries",
      Math.max(1, plan.downloads.length),
    );
    await this.downloader.ensureAll(plan.downloads, mode, () =>
      reporter.advance(),
    );
    if (plan.downloads.length === 0) reporter.advance();
    for (const file of plan.provided)
      if (!(await Bun.file(file).exists()))
        throw new GameError(
          "loader_failed",
          "A library that the loader installer should provide is missing.",
        );
    await this.assets.ensure(profile.assetIndex, mode, reporter);
    const instanceDir = this.paths.instanceDir(pack.id);
    await this.packs.sync(pack, instanceDir, reporter);
    const nativesDir = this.paths.nativesDir(profile.id);
    await mkdir(nativesDir, { recursive: true });

    // Download and decompress options.txt and config/ from /cdn/defaults.zip

    try {
      const zipRes = await fetch(`https://cdn.empyrium.quest/cdn/defaults.zip`);

      const buffer = await zipRes.arrayBuffer();

      const zip = new AdmZip(Buffer.from(buffer));

      const files = zip.getEntries();

      const existingOptionsTxt =
        this.paths.instanceDir(pack.id) + "/options.txt";

      let skipOptionsTxt = false;

      if (existsSync(existingOptionsTxt)) skipOptionsTxt = true;

      for (const file of files) {
        if (file.name.includes("options.txt") && skipOptionsTxt) continue;
        zip.extractEntryTo(file, this.paths.instanceDir(pack.id), true, true);
      }
    } catch {}

    reporter.finish();
    const supplyClientJar =
      pack.loader.type !== "neoforge" && pack.loader.type !== "forge";
    return {
      pack,
      profile,
      runtime,
      instanceDir,
      classpath: [
        ...new Set(
          supplyClientJar ? [...plan.classpath, clientJar] : plan.classpath,
        ),
      ],
      nativesDir,
      assetsRoot: this.paths.assetsDir,
      librariesRoot: this.paths.librariesDir,
      clientJar,
    };
  }

  audit(pack: PackManifest): Promise<IntegrityReport | null> {
    return this.packs.audit(pack, this.paths.instanceDir(pack.id));
  }
}
