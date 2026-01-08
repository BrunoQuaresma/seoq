import { Command } from "commander";
import chalk from "chalk";
import Table from "cli-table3";
import * as z from "zod";
import { compareSites, type ComparisonResult } from "../lib/seo-compare.js";
import { createSpinner } from "../lib/spinner.js";
import { getRelevanceColor, handleCommandError } from "../lib/command-utils.js";

// Zod schema for compare options
const compareOptionsSchema = z.object({
  mainUrl: z.string().url(),
  secondaryUrl: z.string().url(),
  keywords: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return undefined;
      return val
        .split(",")
        .map((k) => k.trim())
        .filter((k) => k.length > 0);
    }),
});

// Display function
function displayResults(result: ComparisonResult): void {
  console.log(); // Empty line before results

  // If no insights found, show a message
  if (result.insights.length === 0) {
    console.log(chalk.yellow("No insights found."));
    return;
  }

  // Create table with headers
  const table = new Table({
    head: [chalk.gray("Insight"), chalk.gray("Relevance")],
    wordWrap: true,
    colWidths: [70, 12],
  });

  // Add rows for each insight
  for (const insight of result.insights) {
    const relevanceFormatted = insight.relevance.toFixed(1);
    const coloredRelevance = getRelevanceColor(insight.relevance)(
      relevanceFormatted
    );
    const insightWithExplanation = `${chalk.bold(insight.title)}\n${chalk.gray(insight.explanation)}`;
    table.push([insightWithExplanation, coloredRelevance]);
  }

  // Display table
  console.log(table.toString());
  console.log(); // Empty line after results
}

export const compareCommand = new Command("compare")
  .description("Compare two websites and get SEO insights for improvement")
  .argument("<main-site>", "Main website URL (the site to improve)")
  .argument(
    "<secondary-site>",
    "Secondary website URL (competitor to learn from)"
  )
  .option(
    "-k, --keywords <keywords>",
    "Comma-separated list of keywords to focus the analysis on"
  )
  .action(async (mainSite: string, secondarySite: string, options) => {
    try {
      // Validate options using Zod schema
      const validatedOptions = compareOptionsSchema.parse({
        mainUrl: mainSite,
        secondaryUrl: secondarySite,
        keywords: options.keywords,
      });

      // Compare sites
      const spinner = createSpinner(
        `Comparing ${chalk.bold(mainSite)} with ${chalk.bold(secondarySite)}...`
      );

      try {
        const result = await compareSites(
          validatedOptions.mainUrl,
          validatedOptions.secondaryUrl,
          validatedOptions.keywords
        );

        spinner.succeed(
          chalk.green(
            `Comparison complete. Found ${chalk.bold(result.insights.length)} insight${result.insights.length !== 1 ? "s" : ""}.`
          )
        );

        // Display results
        displayResults(result);
      } catch (error) {
        spinner.stop();
        throw error;
      }
    } catch (error) {
      handleCommandError(error);
    }
  });
