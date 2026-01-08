import { Command } from "commander";
import chalk from "chalk";
import Table from "cli-table3";
import { type Ora } from "ora";
import * as z from "zod";
import { analyzeSitemap, type SitemapResult } from "../lib/sitemap.js";
import { analyzePages, type PageAnalysisResult } from "../lib/seo-analyzer.js";
import { createSpinner, updateSpinner, stopSpinners } from "../lib/spinner.js";

// Single unified Zod schema for analyze options
const analyzeOptionsSchema = z.object({
  url: z.string().url(),
  sitemap: z.string().optional(),
  limit: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().min(1).max(100)),
  concurrency: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().min(1)),
  maxIssues: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().min(1).max(50)),
});

// Infer options type from schema
type AnalyzeOptions = z.infer<typeof analyzeOptionsSchema>;

// Display functions
function displayResults(results: PageAnalysisResult[]): void {
  console.log(); // Empty line before results
  for (const result of results) {
    // Skip pages with no issues
    if (result.issues.length === 0) {
      continue;
    }

    // Display URL
    console.log(chalk.bold.underline(result.url));
    console.log();

    // Create table without headers
    const table = new Table({
      wordWrap: true,
      colWidths: [8, 80],
    });

    // Add rows for each issue
    for (const issue of result.issues) {
      const severityColor =
        issue.severity === "High"
          ? chalk.red
          : issue.severity === "Medium"
            ? chalk.yellow
            : chalk.blue;
      const issueWithFix = `${issue.issue}\n${chalk.gray(issue.howToFix)}`;
      table.push([severityColor(issue.severity), issueWithFix]);
    }

    // Display table
    console.log(table.toString());

    // Empty line between different URLs
    console.log();
  }
}

// Analysis functions
async function analyzeSinglePage(
  url: string,
  maxIssues: number
): Promise<PageAnalysisResult[]> {
  const spinner = createSpinner(`Analyzing page ${chalk.bold(url)}...`);

  try {
    const analysisResults = await analyzePages([url], {
      maxIssues,
      onProgress: () => {
        // No progress updates needed for single page
      },
      onComplete: () => {
        // No completion updates needed for single page
      },
    });

    spinner.succeed(chalk.green(`Analysis complete for ${chalk.bold(url)}.`));
    return analysisResults;
  } catch (error) {
    spinner.stop();
    throw error;
  }
}

async function analyzeSitemapMode(
  url: string,
  options: AnalyzeOptions
): Promise<PageAnalysisResult[]> {
  const sitemapPath = options.sitemap ?? "/sitemap.xml";
  const sitemapUrl = new URL(sitemapPath, url).toString();
  const sitemapSpinner = createSpinner(
    `Fetching sitemap from ${sitemapUrl}...`
  );

  let analysisSpinner: Ora | null = null;

  try {
    // Analyze sitemap
    const sitemapResults = await analyzeSitemap(sitemapUrl, options.limit);

    // Extract URLs from sitemap results
    const urls = sitemapResults.map((result: SitemapResult) => result.url);

    sitemapSpinner.succeed(
      chalk.green(
        `Found ${chalk.bold(urls.length)} page${urls.length !== 1 ? "s" : ""} to analyze`
      )
    );

    // Analyze pages for SEO issues with spinner
    let completedCount = 0;
    const total = urls.length;

    analysisSpinner = createSpinner(
      `Starting analysis of ${chalk.bold(total)} page${total !== 1 ? "s" : ""}...`
    );

    const analysisResults = await analyzePages(urls, {
      concurrency: options.concurrency,
      maxIssues: options.maxIssues,
      onProgress: (current: number, total: number, pageUrl: string) => {
        updateSpinner(
          analysisSpinner,
          `Analyzing page ${chalk.bold(current)} of ${chalk.bold(total)}: ${chalk.gray(pageUrl)}`
        );
      },
      onComplete: (pageUrl: string, issueCount: number) => {
        completedCount++;
        const issueText =
          issueCount === 0
            ? chalk.green("no issues")
            : issueCount === 1
              ? chalk.yellow(`${issueCount} issue`)
              : chalk.yellow(`${issueCount} issues`);
        updateSpinner(
          analysisSpinner,
          `Completed ${chalk.bold(completedCount)}/${chalk.bold(total)}: ${chalk.gray(pageUrl)} (${issueText})`
        );
      },
    });

    analysisSpinner.succeed(
      chalk.green(
        `Analysis complete. Processed ${chalk.bold(analysisResults.length)} page${analysisResults.length !== 1 ? "s" : ""}.`
      )
    );

    return analysisResults;
  } catch (error) {
    stopSpinners(sitemapSpinner, analysisSpinner);
    throw error;
  }
}

export const analyzeCommand = new Command("analyze")
  .description("Analyze a website page or sitemap for SEO issues")
  .argument("<url>", "Website URL to analyze")
  .option(
    "-s, --sitemap [path]",
    "Enable sitemap analysis (defaults to /sitemap.xml if no path provided)",
    "/sitemap.xml"
  )
  .option(
    "-l, --limit <number>",
    "Maximum number of links to analyze when using --sitemap (default: 25, min: 1, max: 100)",
    "25"
  )
  .option(
    "-c, --concurrency <number>",
    "Number of pages to analyze concurrently when using --sitemap (default: 1)",
    "1"
  )
  .option(
    "-m, --max-issues <number>",
    "Maximum number of issues to return per page (default: 3, min: 1, max: 50)",
    "3"
  )
  .alias("a")
  .action(async (url: string, options) => {
    try {
      // Validate options using Zod schema
      const validatedOptions = analyzeOptionsSchema.parse({
        url,
        ...options,
      });

      // Check for invalid flags in single page mode
      if (!validatedOptions.sitemap) {
        const args = process.argv;
        const hasLimitFlag = args.some(
          (arg) =>
            arg === "--limit" ||
            arg === "-l" ||
            arg.startsWith("--limit=") ||
            arg.startsWith("-l=")
        );
        const hasConcurrencyFlag = args.some(
          (arg) =>
            arg === "--concurrency" ||
            arg === "-c" ||
            arg.startsWith("--concurrency=") ||
            arg.startsWith("-c=")
        );

        if (hasLimitFlag || hasConcurrencyFlag) {
          console.log(
            chalk.yellow(
              "Warning: --limit and --concurrency options are only used with --sitemap flag. Ignoring these options for single page analysis."
            )
          );
        }
      }

      // Route to appropriate analysis mode
      const analysisResults = validatedOptions.sitemap
        ? await analyzeSitemapMode(url, validatedOptions)
        : await analyzeSinglePage(url, validatedOptions.maxIssues);

      // Display results
      displayResults(analysisResults);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.errors
          .map((err) => {
            const path = err.path.join(".");
            return path ? `${path}: ${err.message}` : err.message;
          })
          .join(", ");
        console.error(chalk.red(`\nValidation Error: ${errorMessages}`));
        process.exit(1);
      } else if (error instanceof Error) {
        console.error(chalk.red(`\nError: ${error.message}`));
        process.exit(1);
      } else {
        console.error(chalk.red("\nAn unknown error occurred"));
        process.exit(1);
      }
    }
  });
