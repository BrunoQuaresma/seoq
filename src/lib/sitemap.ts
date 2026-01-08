import { XMLParser } from "fast-xml-parser";
import * as z from "zod";

const sitemapUrlEntrySchema = z.object({
  loc: z.string().url(),
  priority: z.number().min(0).max(1).optional(),
  changefreq: z.string().optional(),
  lastmod: z.string().optional(),
});

const sitemapSchema = z.object({
  urlset: z.object({
    url: z.union([sitemapUrlEntrySchema, z.array(sitemapUrlEntrySchema)]),
  }),
});

const sitemapIndexEntrySchema = z.object({
  loc: z.string().url(),
  lastmod: z.string().optional(),
});

const sitemapIndexSchema = z.object({
  sitemapindex: z.object({
    sitemap: z.union([
      sitemapIndexEntrySchema,
      z.array(sitemapIndexEntrySchema),
    ]),
  }),
});

export interface SitemapResult {
  url: string;
  priority?: number;
}

const DEFAULT_SITEMAP_PATH = "/sitemap.xml";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  textNodeName: "#text",
  parseTagValue: true,
});

async function fetchSitemap(
  url: string,
  sitemapPath?: string
): Promise<string> {
  const sitemapUrl = sitemapPath
    ? new URL(sitemapPath, url).toString()
    : new URL(DEFAULT_SITEMAP_PATH, url).toString();

  const response = await fetch(sitemapUrl);

  if (!response.ok) {
    throw new Error(
      `Failed to fetch sitemap: ${response.status} ${response.statusText}`
    );
  }

  return response.text();
}

function parseSitemap(xml: string): unknown {
  try {
    return parser.parse(xml);
  } catch (error) {
    throw new Error(
      `Failed to parse XML: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

function isSitemapIndex(sitemap: unknown): boolean {
  try {
    sitemapIndexSchema.parse(sitemap);
    return true;
  } catch {
    return false;
  }
}

async function analyzeSitemap(
  baseUrl: string,
  sitemapPath: string = DEFAULT_SITEMAP_PATH,
  limit: number = 25
): Promise<SitemapResult[]> {
  const results: SitemapResult[] = [];
  const visitedUrls = new Set<string>();

  async function processSitemap(url: string, path?: string): Promise<void> {
    // Check limit before processing
    if (results.length >= limit) {
      return;
    }

    const sitemapUrl = path
      ? new URL(path, url).toString()
      : new URL(DEFAULT_SITEMAP_PATH, url).toString();

    if (visitedUrls.has(sitemapUrl)) {
      return;
    }
    visitedUrls.add(sitemapUrl);

    const xml = await fetchSitemap(url, path);
    const parsed = parseSitemap(xml);

    if (isSitemapIndex(parsed)) {
      const index = sitemapIndexSchema.parse(parsed);
      const sitemaps = Array.isArray(index.sitemapindex.sitemap)
        ? index.sitemapindex.sitemap
        : [index.sitemapindex.sitemap];

      for (const sitemapEntry of sitemaps) {
        // Check limit before processing each sitemap index entry
        if (results.length >= limit) {
          return;
        }
        const sitemapUrlObj = new URL(sitemapEntry.loc);
        await processSitemap(sitemapUrlObj.origin, sitemapUrlObj.pathname);
      }
    } else {
      const sitemap = sitemapSchema.parse(parsed);
      const urls = Array.isArray(sitemap.urlset.url)
        ? sitemap.urlset.url
        : [sitemap.urlset.url];

      for (const urlEntry of urls) {
        // Check limit before processing each URL entry
        if (results.length >= limit) {
          return;
        }
        results.push({
          url: urlEntry.loc,
          priority: urlEntry.priority,
        });
      }
    }
  }

  await processSitemap(baseUrl, sitemapPath);
  return results;
}

export { analyzeSitemap };
