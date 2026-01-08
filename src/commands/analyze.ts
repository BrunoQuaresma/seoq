import { Command } from "commander";
import ora, { type Ora } from "ora";
import chalk from "chalk";
import { analyzeSitemap, type SitemapResult } from "../lib/sitemap.js";
import { analyzePages } from "../lib/seo-analyzer.js";
import { urlSchema, limitSchema } from "../lib/schemas.js";

export const analyzeCommand = new Command("analyze")
  .description("Analyze a website page or sitemap for SEO issues")
  .argument("<url>", "Website URL to analyze")
  .option(
    "-s, --sitemap [path]",
    "Enable sitemap analysis (defaults to /sitemap.xml if no path provided)"
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
  .alias("a")
  .action(
    async (
      url: string,
      options: {
        sitemap?: string | boolean;
        limit: string;
        concurrency: string;
      }
    ) => {
      let sitemapSpinner: Ora | null = null;
      let analysisSpinner: Ora | null = null;

      try {
        // Validate URL
        urlSchema.parse(url);

        // Check if sitemap flag is present
        const useSitemap =
          options.sitemap !== undefined && options.sitemap !== false;

        // If not using sitemap, check for limit/concurrency and show warning
        if (!useSitemap) {
          // Check if --limit or --concurrency were explicitly provided in command line
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

          // Analyze single page
          analysisSpinner = ora({
            text: chalk.cyan(`Analyzing page ${chalk.bold(url)}...`),
            spinner: "dots",
          }).start();

          const analysisResults = await analyzePages([url], {
            onProgress: () => {
              // No progress updates needed for single page
            },
            onComplete: () => {
              // No completion updates needed for single page
            },
          });

          analysisSpinner.succeed(
            chalk.green(`Analysis complete for ${chalk.bold(url)}.`)
          );
          analysisSpinner = null;

          // Display results
          console.log(); // Empty line before results
          for (const result of analysisResults) {
            // Skip pages with no issues
            if (result.issues.length === 0) {
              continue;
            }

            // Display URL
            console.log(chalk.bold.underline(result.url));
            console.log();

            // Display each issue
            for (const issue of result.issues) {
              const severityColor =
                issue.severity === "High"
                  ? chalk.red
                  : issue.severity === "Medium"
                    ? chalk.yellow
                    : chalk.blue;
              console.log(
                `${severityColor(chalk.bold(issue.severity))} ${chalk.white(issue.issue)}`
              );
              console.log(chalk.gray(issue.howToFix));
              console.log();
            }

            // Empty line between different URLs
            console.log();
          }
          return;
        }

        // Sitemap mode: validate and parse limit
        const limit = parseInt(options.limit, 10);
        limitSchema.parse(limit);

        // Validate and parse concurrency
        const concurrency = parseInt(options.concurrency, 10);
        if (concurrency < 1) {
          throw new Error("Concurrency must be at least 1");
        }

        // Fetch sitemap with spinner
        const sitemapPath =
          typeof options.sitemap === "string"
            ? options.sitemap
            : "/sitemap.xml";
        const sitemapUrl = new URL(sitemapPath, url).toString();
        sitemapSpinner = ora({
          text: chalk.cyan(`Fetching sitemap from ${sitemapUrl}...`),
          spinner: "dots",
        }).start();

        // Analyze sitemap
        const sitemapResults = await analyzeSitemap(
          url,
          typeof options.sitemap === "string" ? options.sitemap : undefined,
          limit
        );

        // Extract URLs from sitemap results
        const urls = sitemapResults.map((result: SitemapResult) => result.url);

        sitemapSpinner.succeed(
          chalk.green(
            `Found ${chalk.bold(urls.length)} page${urls.length !== 1 ? "s" : ""} to analyze`
          )
        );
        sitemapSpinner = null;

        // Analyze pages for SEO issues with spinner
        let completedCount = 0;
        const total = urls.length;

        analysisSpinner = ora({
          text: chalk.cyan(
            `Starting analysis of ${chalk.bold(total)} page${total !== 1 ? "s" : ""}...`
          ),
          spinner: "dots",
        }).start();

        const analysisResults = await analyzePages(urls, {
          concurrency,
          onProgress: (current: number, total: number, pageUrl: string) => {
            if (analysisSpinner) {
              analysisSpinner.text = chalk.cyan(
                `Analyzing page ${chalk.bold(current)} of ${chalk.bold(total)}: ${chalk.gray(pageUrl)}`
              );
            }
          },
          onComplete: (pageUrl: string, issueCount: number) => {
            completedCount++;
            const issueText =
              issueCount === 0
                ? chalk.green("no issues")
                : issueCount === 1
                  ? chalk.yellow(`${issueCount} issue`)
                  : chalk.yellow(`${issueCount} issues`);
            if (analysisSpinner) {
              analysisSpinner.text = chalk.cyan(
                `Completed ${chalk.bold(completedCount)}/${chalk.bold(total)}: ${chalk.gray(pageUrl)} (${issueText})`
              );
            }
          },
        });

        analysisSpinner.succeed(
          chalk.green(
            `Analysis complete. Processed ${chalk.bold(analysisResults.length)} page${analysisResults.length !== 1 ? "s" : ""}.`
          )
        );
        analysisSpinner = null;

        // Display results in the specified format
        console.log(); // Empty line before results
        for (const result of analysisResults) {
          // Skip pages with no issues
          if (result.issues.length === 0) {
            continue;
          }

          // Display URL
          console.log(chalk.bold.underline(result.url));
          console.log();

          // Display each issue
          for (const issue of result.issues) {
            const severityColor =
              issue.severity === "High"
                ? chalk.red
                : issue.severity === "Medium"
                  ? chalk.yellow
                  : chalk.blue;
            console.log(
              `${severityColor(chalk.bold(issue.severity))} ${chalk.white(issue.issue)}`
            );
            console.log(chalk.gray(issue.howToFix));
            console.log();
          }

          // Empty line between different URLs
          console.log();
        }
      } catch (error) {
        // Stop any running spinners
        if (sitemapSpinner) {
          sitemapSpinner.stop();
        }
        if (analysisSpinner) {
          analysisSpinner.stop();
        }

        if (error instanceof Error) {
          console.error(chalk.red(`\nError: ${error.message}`));
          process.exit(1);
        } else {
          console.error(chalk.red("\nAn unknown error occurred"));
          process.exit(1);
        }
      }
    }
  );
