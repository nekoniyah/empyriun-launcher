import { createHash } from "node:crypto";
import { GameError } from "../core/game-error";
import type { ContentImage } from "../../../shared/content-image";

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

const MAX_BYTES = 8 * 1024 * 1024;
const MAX_DIMENSION = 8000;
const MAX_CACHE = 64;

interface ImageDetails {
  readonly mime: "image/png" | "image/webp";
  readonly width: number;
  readonly height: number;
}

function imageDetails(bytes: Uint8Array): ImageDetails {
  if (
    bytes.byteLength >= 24 &&
    PNG_SIGNATURE.every((value, index) => bytes[index] === value)
  ) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return {
      mime: "image/png",
      width: view.getUint32(16),
      height: view.getUint32(20),
    };
  }
  if (
    bytes.byteLength >= 30 &&
    new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" &&
    new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP"
  ) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const chunk = new TextDecoder().decode(bytes.slice(12, 16));
    if (chunk === "VP8X")
      return {
        mime: "image/webp",
        width: 1 + bytes[24]! + (bytes[25]! << 8) + (bytes[26]! << 16),
        height: 1 + bytes[27]! + (bytes[28]! << 8) + (bytes[29]! << 16),
      };
    if (chunk === "VP8 ") {
      if (bytes[23] !== 0x9d || bytes[24] !== 0x01 || bytes[25] !== 0x2a)
        throw new Error("Unsupported WebP frame");
      return {
        mime: "image/webp",
        width: view.getUint16(26, true) & 0x3fff,
        height: view.getUint16(28, true) & 0x3fff,
      };
    }
    if (chunk === "VP8L") {
      if (bytes[20] !== 0x2f)
        throw new Error("Unsupported WebP lossless frame");
      const bits = view.getUint32(21, true);
      return {
        mime: "image/webp",
        width: (bits & 0x3fff) + 1,
        height: ((bits >> 14) & 0x3fff) + 1,
      };
    }
  }
  throw new Error("Unsupported image type");
}

export class ContentMediaService {
  private readonly cache = new Map<string, ContentImage>();

  constructor(
    private readonly known: (url: string) => boolean,
    private readonly allowedHosts: ReadonlySet<string>,
    private readonly userAgent: string,
  ) {}

  async load(url: string): Promise<ContentImage> {
    const cached = this.cache.get(url);
    if (cached) {
      this.cache.delete(url);
      this.cache.set(url, cached);
      return cached;
    }
    if (!this.known(url))
      throw new GameError(
        "download_failed",
        "Image is not declared by trusted metadata",
      );
    let target: URL;
    try {
      target = new URL(url);
    } catch (cause) {
      throw new GameError("download_failed", "Image URL is invalid", { cause });
    }
    if (target.protocol !== "https:" || !this.allowedHosts.has(target.hostname))
      throw new GameError("download_failed", "Image host is not allowed");
    let response: Response;
    try {
      response = await fetch(target, {
        headers: {
          "User-Agent": this.userAgent,
          Accept: "image/png,image/webp",
        },
        redirect: "error",
        signal: AbortSignal.timeout(15000),
      });
    } catch (cause) {
      throw new GameError("download_failed", "Image download failed", {
        cause,
      });
    }
    if (!response.ok)
      throw new GameError(
        "download_failed",
        `Image server returned HTTP ${response.status}`,
      );
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength < 1 || bytes.byteLength > MAX_BYTES)
      throw new GameError("download_failed", "Image size is not allowed");
    let details: ImageDetails;
    try {
      details = imageDetails(bytes);
    } catch (cause) {
      throw new GameError("download_failed", "Image type is not allowed", {
        cause,
      });
    }
    if (
      details.width < 1 ||
      details.height < 1 ||
      details.width > MAX_DIMENSION ||
      details.height > MAX_DIMENSION
    )
      throw new GameError(
        "download_failed",
        "Image dimensions are not allowed",
      );
    const responseType = response.headers
      .get("content-type")
      ?.split(";")[0]
      ?.trim()
      .toLowerCase();
    if (responseType && responseType !== details.mime)
      throw new GameError(
        "download_failed",
        "Image content type does not match file data",
      );
    const image: ContentImage = {
      url,
      dataUri: `data:${details.mime};base64,${Buffer.from(bytes).toString("base64")}`,
      width: details.width,
      height: details.height,
    };
    this.cache.set(url, image);
    while (this.cache.size > MAX_CACHE) {
      const oldest = this.cache.keys().next().value;
      if (oldest) this.cache.delete(oldest);
      else break;
    }
    return image;
  }

  digest(url: string): string {
    return createHash("sha256").update(url).digest("hex");
  }
}
