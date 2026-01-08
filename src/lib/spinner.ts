import ora, { type Ora } from "ora";
import chalk from "chalk";

/**
 * Create a spinner with cyan text
 */
export function createSpinner(text: string): Ora {
  return ora({
    text: chalk.cyan(text),
    spinner: "dots",
  }).start();
}

/**
 * Update spinner text if spinner exists
 */
export function updateSpinner(spinner: Ora | null, text: string): void {
  if (spinner) {
    spinner.text = chalk.cyan(text);
  }
}

/**
 * Stop multiple spinners
 */
export function stopSpinners(...spinners: (Ora | null)[]): void {
  for (const spinner of spinners) {
    if (spinner) {
      spinner.stop();
    }
  }
}
