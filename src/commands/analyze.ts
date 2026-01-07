import { Command } from "commander";
import { analyzeSitemap } from "../lib/sitemap";
import { urlSchema, limitSchema } from "../lib/schemas";

export const analyzeCommand = new Command("analyze")
  .description("Analyze a website's sitemap.xml")
  .argument("<url>", "Website URL to analyze")
  .option(
    "-s, --sitemap <path>",
    "Custom sitemap path (defaults to /sitemap.xml)"
  )
  .option(
    "-l, --limit <number>",
    "Maximum number of links to display (default: 25, min: 1, max: 100)",
    "25"
  )
  .alias("a")
  .action(async (url: string, options: { sitemap?: string; limit: string }) => {
    try {
      // Validate URL
      urlSchema.parse(url);

      // Validate and parse limit
      const limit = parseInt(options.limit, 10);
      limitSchema.parse(limit);

      // Analyze sitemap (defaults to /sitemap.xml if not provided)
      const results = await analyzeSitemap(url, options.sitemap, limit);

      // Display results
      for (const result of results) {
        if (result.priority !== undefined) {
          console.log(`- ${result.url} ${result.priority}`);
        } else {
          console.log(`- ${result.url}`);
        }
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
  });
