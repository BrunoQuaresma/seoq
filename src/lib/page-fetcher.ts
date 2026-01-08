import { chromium, type Browser } from "playwright";

/**
 * Launches a Chromium browser instance.
 *
 * @returns Promise resolving to a Browser instance
 * @throws Error if browser launch fails
 */
export async function launchBrowser(): Promise<Browser> {
  return await chromium.launch();
}

/**
 * Fetches the HTML content of a webpage using Playwright.
 *
 * @param url - The URL of the page to fetch
 * @param browser - Optional browser instance to reuse. If not provided, a new browser will be launched and closed automatically.
 * @returns Promise resolving to the raw HTML content of the page
 * @throws Error if page fetch fails (timeout, network error, etc.)
 */
export async function fetchPageContent(
  url: string,
  browser?: Browser
): Promise<string> {
  let shouldCloseBrowser = false;
  let pageBrowser = browser;

  try {
    // Launch browser if not provided
    if (!pageBrowser) {
      pageBrowser = await launchBrowser();
      shouldCloseBrowser = true;
    }

    // Create a new page
    const page = await pageBrowser.newPage();

    try {
      // Navigate to the URL with networkidle wait condition
      await page.goto(url, {
        waitUntil: "networkidle",
        timeout: 30000, // 30 second timeout
      });

      // Get the rendered HTML content
      const html = await page.content();

      // Close the page
      await page.close();

      // Return raw HTML content
      return html;
    } catch (pageError) {
      // Ensure page is closed even on error
      await page.close().catch(() => {
        // Ignore errors when closing page on error
      });
      throw pageError;
    } finally {
      // Close browser if we created it
      if (shouldCloseBrowser && pageBrowser) {
        await pageBrowser.close().catch(() => {
          // Ignore errors when closing browser
        });
      }
    }
  } catch (error) {
    // Ensure browser is closed on error if we created it
    if (shouldCloseBrowser && pageBrowser) {
      await pageBrowser.close().catch(() => {
        // Ignore errors when closing browser on error
      });
    }

    if (error instanceof Error) {
      // Handle navigation timeout
      if (
        error.message.includes("timeout") ||
        error.message.includes("Timeout")
      ) {
        throw new Error(
          `Failed to fetch page content: Navigation timeout after 30s. The page may be loading slowly or unresponsive.`
        );
      }
      // Handle network errors
      if (
        error.message.includes("net::ERR") ||
        error.message.includes("Navigation failed")
      ) {
        throw new Error(
          `Failed to fetch page content: Network error. ${error.message}`
        );
      }
      throw new Error(`Failed to fetch page content: ${error.message}`);
    }
    throw new Error("Failed to fetch page content: Unknown error");
  }
}

// Export Browser type for reuse
export type { Browser };
