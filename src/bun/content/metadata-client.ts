import { mkdir, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { GameError } from "../core/game-error";
import { HttpClient } from "../core/http";
import { verifySignedMetadata } from "../security/metadata-signature";
import type { MetadataParser } from "./metadata-parser";
import type { LauncherMetadata } from "./metadata-types";

export interface LoadedMetadata {
  readonly metadata: LauncherMetadata;
  readonly fromCache: boolean;
  readonly issuedAt: string;
  readonly expiresAt: string;
}

export class MetadataClient {
  private readonly http: HttpClient;

  constructor(
    private readonly url: string,
    private readonly cacheFile: string,
    private readonly parser: MetadataParser,
    userAgent: string,
  ) {
    const target = new URL(url);
    if (target.protocol !== "https:")
      throw new GameError(
        "metadata_invalid",
        "content.metadataUrl in app.config.ts must use HTTPS.",
      );
    this.http = new HttpClient(new Set([target.hostname]), userAgent);
  }

  async load(): Promise<LoadedMetadata> {
    try {
      const response = await this.http.send<unknown>(this.url, {
        headers: { "Cache-Control": "no-cache" },
      });
      if (!response.ok || response.data === null)
        throw new GameError(
          "metadata_unavailable",
          `The metadata endpoint answered HTTP ${response.status}.`,
        );
      const verified = verifySignedMetadata(response.data);
      const metadata = this.parser.parse(verified.payload);
      await this.store(response.data);
      return {
        metadata,
        fromCache: false,
        issuedAt: verified.issuedAt,
        expiresAt: verified.expiresAt,
      };
    } catch (error) {
      console.error(
        "Metadata fetch or verification failed, trying verified cache",
        error,
      );
      const cached = await this.readCache();
      if (cached) {
        return {
          metadata: cached.metadata,
          fromCache: true,
          issuedAt: cached.issuedAt,
          expiresAt: cached.expiresAt,
        };
      }
      throw new GameError(
        "metadata_unavailable",
        "The metadata endpoint is unavailable or its signature could not be verified.",
        { cause: error },
      );
    }
  }

  private async store(raw: unknown): Promise<void> {
    await mkdir(dirname(this.cacheFile), { recursive: true });
    const temporary = `${this.cacheFile}.tmp`;
    await writeFile(temporary, JSON.stringify(raw));
    await rename(temporary, this.cacheFile);
  }

  private async readCache(): Promise<LoadedMetadata | null> {
    try {
      const verified = verifySignedMetadata(
        JSON.parse(await Bun.file(this.cacheFile).text()),
      );
      return {
        metadata: this.parser.parse(verified.payload),
        fromCache: true,
        issuedAt: verified.issuedAt,
        expiresAt: verified.expiresAt,
      };
    } catch {
      return null;
    }
  }
}
