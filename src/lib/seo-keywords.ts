import { ChatOpenAI } from "@langchain/openai";
import { createAgent, providerStrategy } from "langchain";
import { type Browser } from "playwright";
import * as z from "zod";
import { fetchPageContent } from "./page-fetcher.js";
import { cleanHtmlForSEO } from "./seo-html-cleaner.js";

export const KeywordSchema = z.object({
  keyword: z.string().describe("The keyword extracted from the page"),
  relevance: z
    .number()
    .min(0.1)
    .max(1.0)
    .describe("The relevance score of the keyword (0.1 to 1.0)"),
});

export const KeywordAnalysisResultSchema = z.object({
  keywords: z
    .array(KeywordSchema)
    .describe("Array of keywords with relevance scores"),
});

export type Keyword = z.infer<typeof KeywordSchema>;

export interface KeywordAnalysisResult {
  url: string;
  keywords: Keyword[];
}

async function extractKeywords(url: string, html: string): Promise<Keyword[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY environment variable is required. Please set it before running the analysis."
    );
  }

  try {
    const prompt = `You are an SEO expert analyzing a webpage to extract the most relevant keywords.

Page URL: ${url}

HTML:
${html}

Extract the most relevant keywords from this page. Consider:
- Content relevance and prominence
- SEO importance
- Keyword frequency and distribution
- Semantic relevance to the page topic
- Heading tags, meta tags, and structured data

IMPORTANT REQUIREMENTS:
- Extract keywords in the same language as the page content (infer the language from the page content)
- Maintain the natural language of the original content
- Return AT MOST 10 keywords, prioritized by relevance (most relevant first)
- Each keyword should be a single word or short phrase (1-3 words)
- Assign relevance scores from 0.1 to 1.0, where 1.0 is the most relevant keyword
- Keywords should be sorted by relevance (highest first)
- Relevance scores should be realistic and distributed (not all 1.0)

If no keywords can be extracted, return an empty keywords array.`;

    const responseFormat = providerStrategy(KeywordAnalysisResultSchema);

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
    const validated = KeywordAnalysisResultSchema.parse(structuredUnknown);

    // Sort by relevance (descending) and limit to top 10
    const sortedKeywords = validated.keywords
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 10);

    return sortedKeywords;
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
        throw new Error(
          `Failed to validate AI response for ${url}: ${error.message}`
        );
      }

      throw new Error(`Failed to extract keywords: ${error.message}`);
    }
    throw new Error("Failed to extract keywords: Unknown error");
  }
}

/**
 * Analyzes a single page to extract keywords with relevance scores.
 *
 * @param url - The URL of the page to analyze
 * @param browser - Optional browser instance to reuse. If not provided, a new browser will be launched and closed automatically.
 * @returns Promise resolving to the keyword analysis result for the page
 * @throws Error if page fetch or keyword extraction fails
 */
export async function analyzeKeywords(
  url: string,
  browser?: Browser
): Promise<KeywordAnalysisResult> {
  const rawHtml = await fetchPageContent(url, browser);
  const html = cleanHtmlForSEO(rawHtml);
  const keywords = await extractKeywords(url, html);
  return { url, keywords };
}
