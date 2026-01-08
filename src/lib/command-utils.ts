import chalk from "chalk";
import * as z from "zod";

/**
 * Base URL validation schema for commands.
 */
export const baseUrlSchema = z.object({
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
export function getRelevanceColor(relevance: number): (text: string) => string {
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

/**
 * Handles command errors with consistent error messages and exit codes.
 * Supports ZodError, Error, and unknown error cases.
 *
 * @param error - The error to handle
 */
export function handleCommandError(error: unknown): void {
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
