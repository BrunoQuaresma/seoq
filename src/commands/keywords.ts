import { Command } from "commander";
import chalk from "chalk";
import Table from "cli-table3";
import * as z from "zod";
import {
  analyzeKeywords,
  type KeywordAnalysisResult,
} from "../lib/seo-keywords.js";
import { createSpinner } from "../lib/spinner.js";

// Zod schema for keywords options
const keywordsOptionsSchema = z.object({
  url: z.string().url(),
});

/**
 * Maps a relevance score (0.1 to 1.0) to a color gradient with three segments:
 * - Gray (128, 128, 128) from 0.1 to 0.5
 * - Blue (59, 130, 246) from 0.5 to 0.7
 * - Green (34, 197, 94) from 0.7 to 1.0
 *
 * @param relevance - The relevance score between 0.1 and 1.0
 * @returns A chalk function that colors text with the interpolated color
 */
function getRelevanceColor(relevance: number): (text: string) => string {
  // Clamp relevance to valid range
  const clampedRelevance = Math.max(0.1, Math.min(1.0, relevance));

  // Color definitions
  // Gray RGB values for low relevance (0.1 to 0.5)
  const grayR = 128;
  const grayG = 128;
  const grayB = 128;

  // Blue RGB values for middle relevance (0.5 to 0.7)
  const blueR = 59;
  const blueG = 130;
  const blueB = 246;

  // Green RGB values for high relevance (0.7 to 1.0)
  const greenR = 34;
  const greenG = 197;
  const greenB = 94;

  let r: number;
  let g: number;
  let b: number;

  if (clampedRelevance >= 0.7) {
    // Segment 3: Pure green (0.7 to 1.0) - already green at 0.7 from segment 2
    r = greenR;
    g = greenG;
    b = greenB;
  } else if (clampedRelevance >= 0.5) {
    // Segment 2: Interpolate between blue and green (0.5 to 0.7)
    const normalizedRelevance = (clampedRelevance - 0.5) / (0.7 - 0.5);
    r = Math.round(blueR + (greenR - blueR) * normalizedRelevance);
    g = Math.round(blueG + (greenG - blueG) * normalizedRelevance);
    b = Math.round(blueB + (greenB - blueB) * normalizedRelevance);
  } else {
    // Segment 1: Interpolate from gray at 0.1 to blue at 0.5 (0.1 to 0.5)
    const normalizedRelevance = (clampedRelevance - 0.1) / (0.5 - 0.1);
    r = Math.round(grayR + (blueR - grayR) * normalizedRelevance);
    g = Math.round(grayG + (blueG - grayG) * normalizedRelevance);
    b = Math.round(grayB + (blueB - grayB) * normalizedRelevance);
  }

  return chalk.rgb(r, g, b);
}

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
