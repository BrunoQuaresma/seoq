import { Command } from "commander";
import ora, { type Ora } from "ora";
import chalk from "chalk";
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
      let sitemapSpinner: Ora | null = null;
      let analysisSpinner: Ora | null = null;

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

        // Fetch sitemap with spinner
        const sitemapPath = options.sitemap || "/sitemap.xml";
        const sitemapUrl = new URL(sitemapPath, url).toString();
        sitemapSpinner = ora({
          text: chalk.cyan(`Fetching sitemap from ${sitemapUrl}...`),
          spinner: "dots",
        }).start();

        // Analyze sitemap (defaults to /sitemap.xml if not provided)
        const sitemapResults = await analyzeSitemap(
          url,
          options.sitemap,
          limit
        );

        // Extract URLs from sitemap results
        const urls = sitemapResults.map((result) => result.url);

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
          onProgress: (current, total, pageUrl) => {
            if (analysisSpinner) {
              analysisSpinner.text = chalk.cyan(
                `Analyzing page ${chalk.bold(current)} of ${chalk.bold(total)}: ${chalk.gray(pageUrl)}`
              );
            }
          },
          onComplete: (pageUrl, issueCount) => {
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

          // Display each issue
          for (const issue of result.issues) {
            const severityColor =
              issue.severity === "High"
                ? chalk.red
                : issue.severity === "Medium"
                  ? chalk.yellow
                  : chalk.blue;
            console.log(
              chalk.gray("-") +
                ` ${chalk.bold("Issue:")} ${chalk.white(issue.issue)}`
            );
            console.log(
              chalk.gray("-") +
                ` ${chalk.bold("Severity:")} ${severityColor(issue.severity)}`
            );
            console.log(
              chalk.gray("-") +
                ` ${chalk.bold("How to fix:")} ${chalk.white(issue.howToFix)}`
            );
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
