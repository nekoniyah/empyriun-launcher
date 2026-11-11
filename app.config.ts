export interface WindowConfig {
  readonly width: number;
  readonly height: number;
  readonly transparent: boolean;
}

export interface TrayMenuItem {
  readonly type: "normal" | "divider";
  readonly label?: string;
  readonly action?: string;
}

export interface TrayConfig {
  readonly enabled: boolean;
  readonly tooltip: string;
  readonly menu: readonly TrayMenuItem[];
}

export interface AuthConfig {
  readonly clientId: string;
}

export interface ContentConfig {
  readonly metadataUrl: string;
  readonly downloadHosts: readonly string[];
}

export interface GameConfig {
  readonly runtimeIndexUrl: string;
}

export interface SecurityConfig {
  readonly lockdown: boolean;
}

export interface PublicConfig {
  readonly websiteUrl: string;
  readonly shopUrl: string;
  readonly adminUrl: string;
  readonly allowedLinkHosts: readonly string[];
}

export interface AppIdentity {
  readonly name: string;
  readonly identifier: string;
  readonly title: string;
  readonly description: string;
  readonly version: string;
  readonly baseUrl: string;
  readonly singleInstance: boolean;
  readonly window: WindowConfig;
  readonly tray: TrayConfig;
  readonly auth: AuthConfig;
  readonly content: ContentConfig;
  readonly game: GameConfig;
  readonly security: SecurityConfig;
  readonly public: PublicConfig;
}

export default {
  name: "empyrium-launcher",
  identifier: "com.nolly.apps.empyrium-launcher",
  title: "Empyrium Launcher",
  description: "Empyrium Launcher v1.0.0",
  version: "1.0.0",
  baseUrl: "https://cdn.empyrium.quest/cdn/releases/stable",
  singleInstance: true,
  window: {
    width: 1280,
    height: 800,
    transparent: false,
  },
  tray: {
    enabled: false,
    tooltip: "",
    menu: [],
  },
  auth: {
    clientId: "293c9758-a5d2-4b6e-90e6-23bcb892b544",
  },
  content: {
    metadataUrl: "https://cdn.empyrium.quest/cdn/metadata.json",
    downloadHosts: [
      "cdn.thenolle.com",
      "cdn.modrinth.com",
      "edge.forgecdn.net",
      "mediafilecdn.curseforge.com",
      "buy.stripe.com",
    ],
  },
  game: {
    runtimeIndexUrl:
      "https://launchermeta.mojang.com/v1/products/java-runtime/2ec0cc96c44e5a76b9c8b7c39df7210883d12871/all.json",
  },
  security: {
    lockdown: false,
  },
  public: {
    websiteUrl: "https://mc.empyrium.quest/",
    shopUrl: "https://shop.empyrium.quest/",
    adminUrl: "https://admin.empyrium.quest/",
    allowedLinkHosts: [
      "cdn.empyrium.quest",
      "shop.empyrium.quest",
      "buy.stripe.com",
    ],
  },
} satisfies AppIdentity;
