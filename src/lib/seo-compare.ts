import { ChatOpenAI } from "@langchain/openai";
import { createAgent, providerStrategy } from "langchain";
import { type Browser } from "playwright";
import * as z from "zod";
import { fetchPageContent, launchBrowser } from "./page-fetcher.js";
import { cleanHtmlForSEO } from "./seo-html-cleaner.js";

export const SEOInsightSchema = z.object({
  title: z
    .string()
    .describe(
      "A very short title with just a few words summarizing the SEO improvement opportunity"
    ),
  explanation: z
    .string()
    .describe(
      "A short explanation describing the SEO improvement opportunity for the main site"
    ),
  relevance: z
    .number()
    .min(0.1)
    .max(1.0)
    .describe(
      "The SEO relevance score of this insight (0.1 to 1.0, where 1.0 is most important)"
    ),
});

export const ComparisonResultSchema = z.object({
  insights: z
    .array(SEOInsightSchema)
    .max(5)
    .describe("Array of SEO improvement insights (max 5)"),
});

export type SEOInsight = z.infer<typeof SEOInsightSchema>;

export interface ComparisonResult {
  insights: SEOInsight[];
}

async function compareSitesAnalysis(
  mainHtml: string,
  secondaryHtml: string,
  mainUrl: string,
  secondaryUrl: string,
  keywords?: string[]
): Promise<SEOInsight[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY environment variable is required. Please set it before running the analysis."
    );
  }

  try {
    const keywordsContext = keywords
      ? `\n\nFocus the analysis on these specific keywords: ${keywords.join(", ")}`
      : "";

    const prompt = `You are an SEO expert comparing two websites to help the main site improve and catch up with the secondary site (competitor).

Main Site URL: ${mainUrl}
Secondary Site URL: ${secondaryUrl}

Main Site HTML:
${mainHtml}

Secondary Site HTML:
${secondaryHtml}

Analyze and compare both sites across key SEO dimensions:
- Meta tags (title, description, Open Graph)
- Heading structure (H1, H2, etc.)
- Content quality and keyword optimization
- Image alt text
- URL structure
- Internal linking
- Page load performance indicators (if detectable)
- Structured data
- Mobile optimization signals
- Content depth and comprehensiveness
${keywordsContext}

Generate actionable insights that help the main site catch up with the secondary site. Focus on:
1. What the secondary site does better than the main site
2. Specific, actionable improvements the main site should make
3. SEO opportunities the main site is missing

IMPORTANT REQUIREMENTS:
- Return AT MOST 5 insights, prioritized by SEO impact (most important first)
- Each insight must have:
  - A "title": Very short (2-5 words max) summarizing the improvement
  - An "explanation": A short, actionable sentence describing what the main site should do
- Relevance scores should reflect SEO importance: 1.0 = critical for SEO, 0.7+ = high impact, 0.5-0.7 = moderate, 0.1-0.5 = nice to have
- Insights should be specific and actionable (not vague)
- Sort insights by relevance (highest first)
- Focus on differences where the secondary site performs better
- All insights must be in English

If no meaningful insights can be generated, return an empty insights array.`;

    const responseFormat = providerStrategy(ComparisonResultSchema);

    const agent = createAgent({
      model: new ChatOpenAI({ model: "gpt-5.2" }),
      tools: [],
      responseFormat,
    });

    const result = await agent.invoke({
      messages: [{ role: "user", content: prompt }],
    });

    // Sort by relevance (descending) and limit to top 5
    const sortedInsights = result.structuredResponse.insights
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 5);

    return sortedInsights;
  } catch (error) {
    if (error instanceof Error) {
      // Handle rate limit errors
      if (
        error.message.includes("rate limit") ||
        error.message.includes("429")
      ) {
        throw new Error(
          `OpenAI API rate limit exceeded. Please wait a moment and try again. Original error: ${error.message}`
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
        throw new Error(`Failed to validate AI response: ${error.message}`);
      }

      throw new Error(`Failed to compare sites: ${error.message}`);
    }
    throw new Error("Failed to compare sites: Unknown error");
  }
}

/**
 * Compares two websites and generates SEO improvement insights for the main site.
 *
 * @param mainUrl - The URL of the main website (the one to improve)
 * @param secondaryUrl - The URL of the secondary website (competitor to learn from)
 * @param keywords - Optional array of keywords to focus the analysis on
 * @param browser - Optional browser instance to reuse. If not provided, a new browser will be launched and closed automatically.
 * @returns Promise resolving to the comparison result with SEO insights
 * @throws Error if page fetch or comparison analysis fails
 */
export async function compareSites(
  mainUrl: string,
  secondaryUrl: string,
  keywords?: string[],
  browser?: Browser
): Promise<ComparisonResult> {
  let shouldCloseBrowser = false;
  let pageBrowser = browser;

  try {
    // Launch browser if not provided
    if (!pageBrowser) {
      pageBrowser = await launchBrowser();
      shouldCloseBrowser = true;
    }

    // Fetch content from both sites
    const [mainHtml, secondaryHtml] = await Promise.all([
      fetchPageContent(mainUrl, pageBrowser),
      fetchPageContent(secondaryUrl, pageBrowser),
    ]);

    // Clean HTML for SEO analysis
    const cleanedMainHtml = cleanHtmlForSEO(mainHtml);
    const cleanedSecondaryHtml = cleanHtmlForSEO(secondaryHtml);

    // Perform comparison analysis
    const insights = await compareSitesAnalysis(
      cleanedMainHtml,
      cleanedSecondaryHtml,
      mainUrl,
      secondaryUrl,
      keywords
    );

    return { insights };
  } catch (error) {
    if (error instanceof Error) {
      // Handle browser launch errors
      if (
        error.message.includes("browser") ||
        error.message.includes("playwright")
      ) {
        throw new Error(
          `Failed to launch browser: ${error.message}. Ensure Playwright browsers are installed with 'npx playwright install chromium'.`
        );
      }
      throw error;
    }
    throw error;
  } finally {
    // Close browser if we created it
    if (shouldCloseBrowser && pageBrowser) {
      await pageBrowser.close().catch(() => {
        // Ignore errors when closing browser
      });
    }
  }
}
