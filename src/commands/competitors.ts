import { Command } from "commander";
import chalk from "chalk";
import Table from "cli-table3";
import {
  analyzeCompetitors,
  type CompetitorAnalysisResult,
} from "../lib/seo-competitors.js";
import { createSpinner } from "../lib/spinner.js";
import {
  baseUrlSchema,
  getRelevanceColor,
  handleCommandError,
} from "../lib/command-utils.js";

// Zod schema for competitors options
const competitorsOptionsSchema = baseUrlSchema;

// Display function
function displayResults(result: CompetitorAnalysisResult): void {
  console.log(); // Empty line before results

  // If no competitors found, show a message
  if (result.competitors.length === 0) {
    console.log(chalk.yellow("No competitors found."));
    return;
  }

  // Create table with headers
  const table = new Table({
    head: [
      chalk.gray("Competitor"),
      chalk.gray("Website"),
      chalk.gray("Relevance"),
    ],
    wordWrap: true,
    colWidths: [25, 40, 12],
  });

  // Add rows for each competitor
  for (const competitor of result.competitors) {
    const relevanceFormatted = competitor.relevance.toFixed(1);
    const coloredRelevance = getRelevanceColor(competitor.relevance)(
      relevanceFormatted
    );
    table.push([competitor.name, competitor.website, coloredRelevance]);
  }

  // Display table
  console.log(table.toString());
  console.log(); // Empty line after results
}

export const competitorsCommand = new Command("competitors")
  .description("Find the top 5 most relevant competitors for a website")
  .argument("<url>", "Website URL to analyze")
  .action(async (url: string) => {
    try {
      // Validate URL using Zod schema
      const validatedOptions = competitorsOptionsSchema.parse({
        url,
      });

      // Analyze competitors
      const spinner = createSpinner(
        `Finding competitors for ${chalk.bold(url)}...`
      );

      try {
        const result = await analyzeCompetitors(validatedOptions.url);

        spinner.succeed(
          chalk.green(`Competitor analysis complete for ${chalk.bold(url)}.`)
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
