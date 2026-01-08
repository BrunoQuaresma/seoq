import { ChatOpenAI } from "@langchain/openai";
import * as cheerio from "cheerio";
import { createAgent, providerStrategy } from "langchain";
import pLimit from "p-limit";
import * as z from "zod";

export const SEOIssueSchema = z.object({
  issue: z.string().describe("A clear description of the SEO issue"),
  severity: z
    .enum(["High", "Medium", "Low"])
    .describe("The severity level of the issue"),
  howToFix: z
    .string()
    .describe("Specific, actionable advice on how to fix the issue"),
});

export const SEOAnalysisResultSchema = z.object({
  issues: z
    .array(SEOIssueSchema)
    .describe("Array of SEO issues found on the page"),
});

export type SEOIssue = z.infer<typeof SEOIssueSchema>;

export interface PageAnalysisResult {
  url: string;
  issues: SEOIssue[];
}

/**
 * Normalize a string to a single short sentence:
 * - Trim whitespace
 * - Collapse multiple spaces/newlines into single spaces
 * - Extract only the first sentence (up to first period, question mark, or exclamation)
 */
function normalizeSentence(text: string): string {
  // Trim and collapse whitespace
  const normalized = text.trim().replace(/\s+/g, " ");

  // Extract first sentence (stop at . ? !)
  const match = normalized.match(/^[^.!?]+[.!?]?/);
  if (match) {
    return match[0].trim();
  }

  // If no sentence-ending punctuation found, return the whole normalized text
  return normalized;
}

async function fetchPageContent(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; SEOQ/1.0; +https://github.com/seoq)",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch page: ${response.status} ${response.statusText}`
      );
    }

    let html = await response.text();

    // Remove HTML comments first (before parsing with cheerio)
    html = html.replace(/<!--[\s\S]*?-->/g, "");

    const $ = cheerio.load(html);

    // Remove non-SEO relevant tags and content
    // Keep application/ld+json scripts as they contain structured data important for SEO
    $("script").each((_, element) => {
      const type = $(element).attr("type");
      // Remove script if it doesn't have type="application/ld+json" (case-insensitive)
      if (!type || type.toLowerCase() !== "application/ld+json") {
        $(element).remove();
      }
    });
    $("style").remove();
    $("noscript").remove();

    // Return cleaned HTML
    return $.html();
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to fetch page content: ${error.message}`);
    }
    throw new Error("Failed to fetch page content: Unknown error");
  }
}

async function analyzeSEOIssues(
  url: string,
  html: string,
  maxIssues: number = 3
): Promise<SEOIssue[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY environment variable is required. Please set it before running the analysis."
    );
  }

  try {
    const prompt = `You are an SEO expert analyzing a webpage. Analyze the following HTML and identify SEO issues.

Page URL: ${url}

HTML:
${html}

Analyze this page for common SEO issues including:
- Missing or poor meta descriptions
- Missing or duplicate title tags
- Missing or improper heading structure (H1, H2, etc.)
- Missing alt text on images
- Content quality issues
- Missing Open Graph tags
- Missing canonical URLs
- Other SEO best practices

IMPORTANT REQUIREMENTS:
- All responses must be in English, regardless of the language of the analyzed page content
- Return AT MOST ${maxIssues} issues, prioritized by impact (most important first)
- Each "issue" must be just a few words describing the problem clearly
- Each "howToFix" must be a very compact and small sentence with specific, actionable advice
- Use simple, direct language without bullets, prefixes, or multiple sentences
- "severity": "High", "Medium", or "Low"

If no issues are found, return an empty issues array.`;

    const responseFormat = providerStrategy(SEOAnalysisResultSchema);

    const agent = createAgent({
      model: new ChatOpenAI({ model: "gpt-5.2" }),
      tools: [],
      responseFormat,
    });

    const result = await agent.invoke({
      messages: [{ role: "user", content: prompt }],
    });

    const structuredUnknown =
      typeof result === "object" &&
      result !== null &&
      "structuredResponse" in result
        ? (result as { structuredResponse?: unknown }).structuredResponse
        : undefined;
    const validated = SEOAnalysisResultSchema.parse(structuredUnknown);

    // Post-process: cap at maxIssues and normalize to single sentences
    const normalizedIssues = validated.issues
      .slice(0, maxIssues)
      .map((issue) => ({
        issue: normalizeSentence(issue.issue),
        severity: issue.severity,
        howToFix: normalizeSentence(issue.howToFix),
      }));

    return normalizedIssues;
  } catch (error) {
    if (error instanceof Error) {
      // Handle rate limit errors
      if (
        error.message.includes("rate limit") ||
        error.message.includes("429")
      ) {
        throw new Error(
          `OpenAI API rate limit exceeded. Please wait a moment and try again, or reduce concurrency. Original error: ${error.message}`
        );
      }

      // Handle authentication errors
      if (
        error.message.includes("401") ||
        error.message.includes("authentication") ||
        error.message.includes("Invalid API key")
      ) {
        throw new Error(
          `Invalid OpenAI API key. Please check your OPENAI_API_KEY environment variable.`
        );
      }

      // Handle structured output validation errors
      if (
        error.message.includes("validation") ||
        error.message.includes("schema") ||
        error.message.includes("parse")
      ) {
        throw new Error(
          `Failed to validate AI response for ${url}: ${error.message}`
        );
      }

      throw new Error(`Failed to analyze SEO issues: ${error.message}`);
    }
    throw new Error("Failed to analyze SEO issues: Unknown error");
  }
}

export async function analyzePages(
  urls: string[],
  options: {
    concurrency?: number;
    maxIssues?: number;
    onProgress?: (current: number, total: number, url: string) => void;
    onComplete?: (url: string, issueCount: number) => void;
  } = {}
): Promise<PageAnalysisResult[]> {
  const concurrency = options.concurrency ?? 1;
  const maxIssues = options.maxIssues ?? 3;
  const limit = pLimit(concurrency);
  const total = urls.length;

  const results: PageAnalysisResult[] = [];

  const analyzePage = async (url: string, index: number): Promise<void> => {
    try {
      // Report progress when starting
      if (options.onProgress) {
        options.onProgress(index + 1, total, url);
      }

      const html = await fetchPageContent(url);
      const issues = await analyzeSEOIssues(url, html, maxIssues);
      results.push({ url, issues });

      // Report completion
      if (options.onComplete) {
        options.onComplete(url, issues.length);
      }
    } catch (error) {
      // If page fetch or analysis fails, still add result with error issue
      if (error instanceof Error) {
        // Check if it's a critical error that should stop processing
        if (
          error.message.includes("OPENAI_API_KEY") ||
          error.message.includes("Invalid OpenAI API key")
        ) {
          // Re-throw critical errors so they can be handled at the command level
          throw error;
        }

        results.push({
          url,
          issues: [
            {
              issue: `Failed to analyze page: ${error.message}`,
              severity: "High",
              howToFix: error.message.includes("rate limit")
                ? "Wait a moment and try again, or reduce concurrency with --concurrency option."
                : "Check if the URL is accessible and try again.",
            },
          ],
        });

        // Report completion even for failed pages
        if (options.onComplete) {
          options.onComplete(url, 1); // 1 issue for the error
        }
      } else {
        results.push({
          url,
          issues: [
            {
              issue: "Failed to analyze page: Unknown error",
              severity: "High",
              howToFix: "Check if the URL is accessible and try again.",
            },
          ],
        });

        // Report completion even for failed pages
        if (options.onComplete) {
          options.onComplete(url, 1); // 1 issue for the error
        }
      }
    }
  };

  // Process all URLs with concurrency limit
  await Promise.all(
    urls.map((url, index) => limit(() => analyzePage(url, index)))
  );

  return results;
}
