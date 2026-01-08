import * as cheerio from "cheerio";

/**
 * Cleans HTML content for SEO analysis by removing non-SEO relevant tags and content.
 * - Removes HTML comments
 * - Removes script tags except those with type="application/ld+json"
 * - Removes style tags
 * - Removes noscript tags
 *
 * @param html - Raw HTML content to clean
 * @returns Cleaned HTML content suitable for SEO analysis
 */
export function cleanHtmlForSEO(html: string): string {
  // Remove HTML comments first (before parsing with cheerio)
  const cleanedHtml = html.replace(/<!--[\s\S]*?-->/g, "");

  const $ = cheerio.load(cleanedHtml);

  // Remove non-SEO relevant tags and content
  // Keep application/ld+json scripts as they contain structured data important for SEO
  $("script").each((_, element) => {
    const type = $(element).attr("type");
    // Remove script if it doesn't have type="application/ld+json" (case-insensitive)
    if (!type || type.toLowerCase() !== "application/ld+json") {
      $(element).remove();
    }
  });
  $("style").remove();
  $("noscript").remove();

  // Return cleaned HTML
  return $.html();
}
