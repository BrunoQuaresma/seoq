import { ChatOpenAI, tools } from "@langchain/openai";
import { createAgent, providerStrategy } from "langchain";
import { type Browser } from "playwright";
import * as z from "zod";
import { fetchPageContent } from "./page-fetcher.js";
import { cleanHtmlForSEO } from "./seo-html-cleaner.js";

export const CompetitorSchema = z.object({
  name: z
    .string()
    .describe(
      "The competitor's company name only (no URLs, no extra text, just the company/competitor name)"
    ),
  website: z
    .string()
    .describe("The competitor's website URL (must be a valid URL)"),
  relevance: z
    .number()
    .min(0.1)
    .max(1.0)
    .describe("The relevance score of the competitor (0.1 to 1.0)"),
});

export const CompetitorAnalysisResultSchema = z.object({
  competitors: z
    .array(CompetitorSchema)
    .max(5)
    .describe("Array of competitors with relevance scores (max 5)"),
});

export type Competitor = z.infer<typeof CompetitorSchema>;

export interface CompetitorAnalysisResult {
  competitors: Competitor[];
}

async function findCompetitors(html: string): Promise<Competitor[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY environment variable is required. Please set it before running the analysis."
    );
  }

  try {
    const prompt = `You are an SEO expert analyzing a website to find its top competitors.

HTML Content:
${html}

Analyze this website to understand:
1. The primary language of the website
2. The products and services offered
3. The business context and industry

Based on this analysis, use the web search tool to find the top 5 most relevant competitors. Look for companies that:
- Offer similar products or services
- Operate in the same industry or market
- Target similar audiences
- Are direct or indirect competitors

IMPORTANT REQUIREMENTS:
- Use the web search tool to find competitors based on the analysis
- Return AT MOST 5 competitors, prioritized by relevance (most relevant first)
- Assign relevance scores from 0.1 to 1.0, where 1.0 is the most relevant competitor
- Competitors should be sorted by relevance (highest first)
- Relevance scores should be realistic and distributed (not all 1.0)
- Each competitor must have a valid website URL
- Competitor name MUST be strictly just the company/competitor name (e.g., "Google", "Microsoft", "Acme Corp")
  - DO NOT include URLs, domains, or any additional text in the name field
  - DO NOT include descriptions or explanations
  - The name should be a clean, simple company/competitor name only

If no competitors can be found, return an empty competitors array.`;

    const responseFormat = providerStrategy(CompetitorAnalysisResultSchema);

    const model = new ChatOpenAI({ model: "gpt-5.2" });

    const agent = createAgent({
      model,
      tools: [tools.webSearch()],
      responseFormat,
    });

    const result = await agent.invoke({
      messages: [{ role: "user", content: prompt }],
    });

    // Clean up competitor names to ensure they only contain the company name
    const cleanedCompetitors = result.structuredResponse.competitors.map(
      (competitor) => {
        // Remove any URLs, domains, or extra text from the name
        let cleanedName = competitor.name.trim();

        // Remove URLs if present
        cleanedName = cleanedName.replace(/https?:\/\/[^\s]+/gi, "").trim();

        // Remove domain-like patterns (e.g., "example.com" or "www.example.com")
        cleanedName = cleanedName.replace(/www\.\S+/gi, "").trim();
        cleanedName = cleanedName
          .replace(/\S+\.(com|org|net|io|co|ai|dev)\S*/gi, "")
          .trim();

        // Remove common prefixes/suffixes that shouldn't be in the name
        cleanedName = cleanedName
          .replace(/^(visit|go to|see|check|homepage|website)\s*/i, "")
          .trim();
        cleanedName = cleanedName
          .replace(/\s*-\s*(website|homepage|official|site)$/i, "")
          .trim();

        // If name is empty after cleaning, fall back to extracting from URL domain
        if (!cleanedName && competitor.website) {
          try {
            const url = new URL(competitor.website);
            cleanedName = url.hostname.replace(/^www\./, "").split(".")[0];
            // Capitalize first letter
            cleanedName =
              cleanedName.charAt(0).toUpperCase() + cleanedName.slice(1);
          } catch {
            // If URL parsing fails, use original name
            cleanedName = competitor.name.trim();
          }
        }

        return {
          ...competitor,
          name: cleanedName || competitor.name.trim(),
        };
      }
    );

    // Sort by relevance (descending) and limit to top 5
    const sortedCompetitors = cleanedCompetitors
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 5);

    return sortedCompetitors;
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

      throw new Error(`Failed to find competitors: ${error.message}`);
    }
    throw new Error("Failed to find competitors: Unknown error");
  }
}

/**
 * Analyzes a website to find its top competitors using web search.
 *
 * @param url - The URL of the website to analyze
 * @param browser - Optional browser instance to reuse. If not provided, a new browser will be launched and closed automatically.
 * @returns Promise resolving to the competitor analysis result
 * @throws Error if page fetch or competitor analysis fails
 */
export async function analyzeCompetitors(
  url: string,
  browser?: Browser
): Promise<CompetitorAnalysisResult> {
  const rawHtml = await fetchPageContent(url, browser);
  const html = cleanHtmlForSEO(rawHtml);
  const competitors = await findCompetitors(html);
  return { competitors };
}
