export type LoaderType = 'vanilla' | 'fabric' | 'quilt' | 'neoforge' | 'forge'

export interface NewsItem {
  readonly id: string
  readonly title: string
  readonly slug: string
  readonly excerpt: string
  readonly markdown: string
  readonly coverImage: string | null
  readonly publishedAt: string
  readonly featured: boolean
  readonly url: string | null
}

export interface LinkItem {
  readonly id: string
  readonly label: string
  readonly url: string
}

export interface ShopPrice {
  readonly amount: number
  readonly currency: string
  readonly display: string
}

export interface ShopItem {
  readonly id: string
  readonly title: string
  readonly slug: string
  readonly descriptionMarkdown: string
  readonly price: ShopPrice
  readonly compareAtPrice: ShopPrice | null
  readonly images: readonly string[]
  readonly category: string | null
  readonly tags: readonly string[]
  readonly available: boolean
  readonly featured: boolean
  readonly url: string
}

export interface PackSummary {
  readonly id: string
  readonly name: string
  readonly version: string
  readonly releaseDate: string
  readonly minecraft: string
  readonly loader: LoaderType
  readonly loaderVersion: string
  readonly fileCount: number
}

export interface MetadataSummary {
  readonly contentVersion: 2
  readonly news: readonly NewsItem[]
  readonly links: readonly LinkItem[]
  readonly shop: readonly ShopItem[]
  readonly pack: PackSummary
  readonly fromCache: boolean
  readonly signatureVerified: boolean
  readonly issuedAt: string
  readonly expiresAt: string
}