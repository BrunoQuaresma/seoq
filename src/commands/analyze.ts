import { Command } from "commander";
import { analyzeSitemap } from "../lib/sitemap";
import { analyzePages } from "../lib/seo-analyzer";
import { urlSchema, limitSchema } from "../lib/schemas";

export const analyzeCommand = new Command("analyze")
  .description("Analyze a website's sitemap.xml for SEO issues")
  .argument("<url>", "Website URL to analyze")
  .option(
    "-s, --sitemap <path>",
    "Custom sitemap path (defaults to /sitemap.xml)"
  )
  .option(
    "-l, --limit <number>",
    "Maximum number of links to analyze (default: 25, min: 1, max: 100)",
    "25"
  )
  .option(
    "-c, --concurrency <number>",
    "Number of pages to analyze concurrently (default: 1)",
    "1"
  )
  .alias("a")
  .action(
    async (
      url: string,
      options: { sitemap?: string; limit: string; concurrency: string }
    ) => {
      try {
        // Validate URL
        urlSchema.parse(url);

        // Validate and parse limit
        const limit = parseInt(options.limit, 10);
        limitSchema.parse(limit);

        // Validate and parse concurrency
        const concurrency = parseInt(options.concurrency, 10);
        if (concurrency < 1) {
          throw new Error("Concurrency must be at least 1");
        }

        // Log sitemap fetching
        const sitemapPath = options.sitemap || "/sitemap.xml";
        const sitemapUrl = new URL(sitemapPath, url).toString();
        console.log(`Fetching sitemap from ${sitemapUrl}...`);

        // Analyze sitemap (defaults to /sitemap.xml if not provided)
        const sitemapResults = await analyzeSitemap(
          url,
          options.sitemap,
          limit
        );

        // Extract URLs from sitemap results
        const urls = sitemapResults.map((result) => result.url);

        // Log sitemap found
        console.log(`Found ${urls.length} pages to analyze\n`);

        // Analyze pages for SEO issues with progress logging
        const analysisResults = await analyzePages(urls, {
          concurrency,
          onProgress: (current, total, pageUrl) => {
            console.log(`Analyzing page ${current} of ${total}: ${pageUrl}`);
          },
          onComplete: (pageUrl, issueCount) => {
            console.log(
              `✓ Completed: ${pageUrl} (${issueCount} issue${issueCount !== 1 ? "s" : ""} found)`
            );
          },
        });

        // Log final summary
        console.log(
          `\nAnalysis complete. Processed ${analysisResults.length} pages.`
        );

        // Display results in the specified format
        console.log(); // Empty line before results
        for (const result of analysisResults) {
          // Skip pages with no issues
          if (result.issues.length === 0) {
            continue;
          }

          // Display URL
          console.log(result.url);

          // Display each issue
          for (const issue of result.issues) {
            console.log(`- Issue: ${issue.issue}`);
            console.log(`- Severity: ${issue.severity}`);
            console.log(`- How to fix: ${issue.howToFix}`);
          }

          // Empty line between different URLs
          console.log();
        }
      } catch (error) {
        if (error instanceof Error) {
          console.error(`Error: ${error.message}`);
          process.exit(1);
        } else {
          console.error("An unknown error occurred");
          process.exit(1);
        }
      }
    }
  );
