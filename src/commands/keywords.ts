import { Command } from "commander";
import chalk from "chalk";
import Table from "cli-table3";
import {
  analyzeKeywords,
  type KeywordAnalysisResult,
} from "../lib/seo-keywords.js";
import { createSpinner } from "../lib/spinner.js";
import {
  baseUrlSchema,
  getRelevanceColor,
  handleCommandError,
} from "../lib/command-utils.js";

// Zod schema for keywords options
const keywordsOptionsSchema = baseUrlSchema;

// Display function
function displayResults(result: KeywordAnalysisResult): void {
  console.log(); // Empty line before results

  // If no keywords found, show a message
  if (result.keywords.length === 0) {
    console.log(chalk.yellow("No keywords found."));
    return;
  }

  // Create table with headers
  const table = new Table({
    head: [chalk.gray("Relevance"), chalk.gray("Keyword")],
    wordWrap: true,
    colWidths: [12, 80],
  });

  // Add rows for each keyword
  for (const keyword of result.keywords) {
    const relevanceFormatted = keyword.relevance.toFixed(1);
    const coloredRelevance = getRelevanceColor(keyword.relevance)(
      relevanceFormatted
    );
    table.push([coloredRelevance, keyword.keyword]);
  }

  // Display table
  console.log(table.toString());
  console.log(); // Empty line after results
}

export const keywordsCommand = new Command("keywords")
  .description("Extract the most relevant keywords from a webpage")
  .argument("<url>", "Website URL to analyze")
  .action(async (url: string) => {
    try {
      // Validate URL using Zod schema
      const validatedOptions = keywordsOptionsSchema.parse({
        url,
      });

      // Analyze keywords
      const spinner = createSpinner(
        `Extracting keywords from ${chalk.bold(url)}...`
      );

      try {
        const result = await analyzeKeywords(validatedOptions.url);

        spinner.succeed(
          chalk.green(`Keyword extraction complete for ${chalk.bold(url)}.`)
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
