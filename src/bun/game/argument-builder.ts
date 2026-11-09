import appConfig from "../../../app.config";
import type { GameSettings } from "../../../shared/game";
import type { JvmArgument, FlagSource } from "../../../shared/jvm-flags";
import type { VerifiedSession } from "../auth/verified-session";
import { GameError } from "../core/game-error";
import type { Platform } from "../core/platform";
import type { PreparedGame } from "./game-installer";
import type { RuleEvaluator } from "./rules";
import type { ArgumentEntry } from "./version-profile";

export interface LaunchContext {
  readonly session: VerifiedSession;
  readonly prepared: PreparedGame;
  readonly settings: GameSettings;
}

export interface LaunchArguments {
  readonly jvm: readonly string[];
  readonly game: readonly string[];
}

export interface ResolvedJvmArguments {
  readonly command: readonly string[];
  readonly annotated: readonly JvmArgument[];
}

interface Variables {
  readonly auth_player_name: string;
  readonly auth_uuid: string;
  readonly auth_access_token: string;
  readonly auth_xuid: string;
  readonly clientid: string;
  readonly user_type: string;
  readonly version_name: string;
  readonly version_type: string;
  readonly game_directory: string;
  readonly assets_root: string;
  readonly assets_index_name: string;
  readonly natives_directory: string;
  readonly library_directory: string;
  readonly main_jar_path: string;
  readonly launcher_name: string;
  readonly launcher_version: string;
  readonly classpath: string;
  readonly classpath_separator: string;
}

const PLACEHOLDER = /\$\{([A-Za-z0-9_]+)\}/g;
const HEAP_FLAG = /^-Xm[sx]/;
const MAX_INITIAL_HEAP_MB = 2048;

export class ArgumentBuilder {
  constructor(
    private readonly rules: RuleEvaluator,
    private readonly platform: Platform,
  ) {}

  build(context: LaunchContext): LaunchArguments {
    const variables = this.variables(context.prepared, context.session);
    const resolved = this.resolveJvm(
      context.prepared,
      context.settings,
      variables,
    );
    return {
      jvm: resolved.command,
      game: ArgumentBuilder.dropEmpty(
        this.expand(context.prepared.profile.gameArguments, variables),
      ),
    };
  }

  preview(
    prepared: PreparedGame,
    settings: GameSettings,
  ): readonly JvmArgument[] {
    const variables = this.variables(prepared, null);
    return this.resolveJvm(prepared, settings, variables).annotated;
  }

  private resolveJvm(
    prepared: PreparedGame,
    settings: GameSettings,
    variables: Variables,
  ): ResolvedJvmArguments {
    const heap: readonly JvmArgument[] = [
      {
        value: `-Xms${Math.min(MAX_INITIAL_HEAP_MB, settings.memoryMb)}M`,
        source: "launcher",
      },
      {
        value: `-Xmx${settings.memoryMb}M`,
        source: "launcher",
      },
    ];
    const defaults = this.expandTagged(
      prepared.profile.defaultJvmArguments,
      variables,
      "minecraft",
    ).filter((argument) => !HEAP_FLAG.test(argument.value));
    const vanilla = this.expandTagged(
      prepared.profile.vanillaJvmArguments,
      variables,
      "minecraft",
    );
    const loader = this.expandTagged(
      prepared.profile.loaderJvmArguments,
      variables,
      "loader",
    );
    const pack = prepared.pack.jvmArgs.map((value) => ({
      value,
      source: "pack" as const,
    }));
    const annotated = [...heap, ...defaults, ...vanilla, ...loader, ...pack];
    return { annotated, command: annotated.map((argument) => argument.value) };
  }

  private variables(
    prepared: PreparedGame,
    session: VerifiedSession | null,
  ): Variables {
    return {
      auth_player_name: session?.username ?? "Player",
      auth_uuid: session?.uuid ?? "00000000000000000000000000000000",
      auth_access_token: session ? session.accessToken : "<no-active-session>",
      auth_xuid: "",
      clientid: "",
      user_type: "msa",
      version_name: prepared.profile.id,
      version_type: prepared.profile.versionType,
      game_directory: prepared.instanceDir,
      assets_root: prepared.assetsRoot,
      assets_index_name: prepared.profile.assetIndex.id,
      natives_directory: prepared.nativesDir,
      library_directory: prepared.librariesRoot,
      main_jar_path: prepared.clientJar,
      launcher_name: appConfig.name,
      launcher_version: appConfig.version,
      classpath: prepared.classpath.join(this.platform.classpathSeparator),
      classpath_separator: this.platform.classpathSeparator,
    };
  }

  private expandTagged(
    entries: readonly ArgumentEntry[],
    variables: Variables,
    source: FlagSource,
  ): JvmArgument[] {
    return this.expand(entries, variables).map((value) => ({ value, source }));
  }

  private expand(
    entries: readonly ArgumentEntry[],
    variables: Variables,
  ): string[] {
    const expanded: string[] = [];
    for (const entry of entries) {
      if (typeof entry === "string") {
        expanded.push(this.substitute(entry, variables));
        continue;
      }
      if (!this.rules.allows(entry.rules)) continue;
      const values =
        typeof entry.value === "string" ? [entry.value] : entry.value;
      for (const value of values)
        expanded.push(this.substitute(value, variables));
    }
    return expanded;
  }

  private substitute(value: string, variables: Variables): string {
    return value.replace(PLACEHOLDER, (_match, name: string) => {
      const replacement = variables[name as keyof Variables];
      if (replacement === undefined)
        throw new GameError(
          "launch_failed",
          `Unknown launch placeholder: ${name}`,
        );
      return replacement;
    });
  }

  private static dropEmpty(tokens: readonly string[]): string[] {
    const kept: string[] = [];
    for (let index = 0; index < tokens.length; index += 1) {
      const token = tokens[index] ?? "";
      if (token === "") continue;
      if (token.startsWith("--") && tokens[index + 1] === "") {
        index += 1;
        continue;
      }
      kept.push(token);
    }
    return kept;
  }
}
