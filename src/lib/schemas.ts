import * as z from "zod";

export const urlSchema = z.string().url();

export const sitemapUrlEntrySchema = z.object({
  loc: z.string().url(),
  priority: z.number().min(0).max(1).optional(),
  changefreq: z.string().optional(),
  lastmod: z.string().optional(),
});

export const sitemapSchema = z.object({
  urlset: z.object({
    url: z.union([sitemapUrlEntrySchema, z.array(sitemapUrlEntrySchema)]),
  }),
});

export const sitemapIndexEntrySchema = z.object({
  loc: z.string().url(),
  lastmod: z.string().optional(),
});

export const sitemapIndexSchema = z.object({
  sitemapindex: z.object({
    sitemap: z.union([
      sitemapIndexEntrySchema,
      z.array(sitemapIndexEntrySchema),
    ]),
  }),
});

export const limitSchema = z.number().int().min(1).max(100);
