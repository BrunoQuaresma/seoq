# SEOQ

A powerful command-line tool for SEO analysis, comparison, and optimization. SEOQ helps you analyze websites, compare them with competitors, extract keywords, and identify SEO improvement opportunities using AI-powered analysis.

## Usage

SEOQ runs directly via `npx` - no installation required! Just make sure you have `npx` available (comes with Node.js).

### Setup

Before using SEOQ, you need to set your OpenAI API key:

```bash
export OPENAI_API_KEY="your-api-key-here"
```

Or on Windows:

```cmd
set OPENAI_API_KEY=your-api-key-here
```

### Running Commands

Get help for any command:

```bash
npx seoq --help
npx seoq <command> --help
```

## Commands

### `analyze` (alias: `a`)

Analyze a website page or sitemap for SEO issues. This command can analyze a single page or multiple pages from a sitemap.

#### Syntax

```bash
npx seoq analyze <url> [options]
npx seoq a <url> [options]
```

#### Options

| Option                   | Short | Description                                                                                                           | Default | Constraints      |
| ------------------------ | ----- | --------------------------------------------------------------------------------------------------------------------- | ------- | ---------------- |
| `--sitemap [path]`       | `-s`  | Enable sitemap analysis. If no path is provided, defaults to `/sitemap.xml`. Only used when analyzing multiple pages. | -       | -                |
| `--limit <number>`       | `-l`  | Maximum number of links to analyze when using `--sitemap`                                                             | `25`    | Min: 1, Max: 100 |
| `--concurrency <number>` | `-c`  | Number of pages to analyze concurrently when using `--sitemap`                                                        | `1`     | Min: 1           |
| `--max-issues <number>`  | `-m`  | Maximum number of issues to return per page                                                                           | `3`     | Min: 1, Max: 50  |

#### Single Page Analysis

Analyze a single page for SEO issues:

```bash
npx seoq analyze https://example.com
```

**Example Output:**

```
✔ Analysis complete for https://example.com.

https://example.com

┌─────────┬────────────────────────────────────────────────────────────────────────────────┐
│ High    │ Missing meta description                                                       │
│         │ Add a unique meta description tag between 120-160 characters that summarizes  │
│         │ the page content.                                                              │
├─────────┼────────────────────────────────────────────────────────────────────────────────┤
│ Medium  │ Missing H1 tag                                                                  │
│         │ Add a single H1 tag that clearly describes the main topic of the page.         │
├─────────┼────────────────────────────────────────────────────────────────────────────────┤
│ Low     │ Missing alt text on images                                                      │
│         │ Add descriptive alt attributes to all images for better accessibility and SEO. │
└─────────┴────────────────────────────────────────────────────────────────────────────────┘
```

#### Sitemap Analysis

Analyze multiple pages from a sitemap:

```bash
npx seoq analyze https://example.com --sitemap
```

Or specify a custom sitemap path:

```bash
npx seoq analyze https://example.com --sitemap /custom-sitemap.xml
```

Analyze with custom options:

```bash
npx seoq analyze https://example.com --sitemap --limit 50 --concurrency 3 --max-issues 5
```

**Example Output:**

```
✔ Found 25 pages to analyze
✔ Starting analysis of 25 pages...
✔ Completed 1/25: https://example.com/about (2 issues)
✔ Completed 2/25: https://example.com/products (no issues)
✔ Completed 3/25: https://example.com/contact (1 issue)
...
✔ Analysis complete. Processed 25 pages.

https://example.com/about

┌─────────┬────────────────────────────────────────────────────────────────────────────────┐
│ High    │ Duplicate title tag                                                            │
│         │ Ensure each page has a unique title tag that accurately describes its content. │
├─────────┼────────────────────────────────────────────────────────────────────────────────┤
│ Medium  │ Missing Open Graph tags                                                        │
│         │ Add Open Graph meta tags (og:title, og:description, og:image) for better       │
│         │ social media sharing.                                                          │
└─────────┴────────────────────────────────────────────────────────────────────────────────┘

https://example.com/contact

┌─────────┬────────────────────────────────────────────────────────────────────────────────┐
│ Low     │ Thin content                                                                   │
│         │ Add more substantial content (at least 300 words) to improve SEO value.        │
└─────────┴────────────────────────────────────────────────────────────────────────────────┘
```

**Note:** Pages with no issues are automatically skipped in the output.

### `compare`

Compare two websites and get SEO insights for improvement. This command analyzes both sites and provides actionable recommendations based on what the competitor does better.

#### Syntax

```bash
npx seoq compare <main-site> <secondary-site> [options]
```

#### Options

| Option                  | Short | Description                                               |
| ----------------------- | ----- | --------------------------------------------------------- |
| `--keywords <keywords>` | `-k`  | Comma-separated list of keywords to focus the analysis on |

#### Basic Comparison

Compare your site with a competitor:

```bash
npx seoq compare https://mysite.com https://competitor.com
```

**Example Output:**

```
✔ Comparison complete. Found 5 insights.

┌──────────────────────────────────────────────────────────────────────┬────────────┐
│ Insight                                                              │ Relevance  │
├──────────────────────────────────────────────────────────────────────┼────────────┤
│ Better meta descriptions - The competitor uses more compelling and   │ 0.9        │
│ keyword-rich meta descriptions that improve click-through rates.     │            │
├──────────────────────────────────────────────────────────────────────┼────────────┤
│ Improved heading structure - The competitor has a clearer H1-H6      │ 0.8        │
│ hierarchy that better organizes content and improves readability.    │            │
├──────────────────────────────────────────────────────────────────────┼────────────┤
│ Enhanced image optimization - All images on the competitor site have │ 0.7        │
│ descriptive alt text and optimized file names.                       │            │
├──────────────────────────────────────────────────────────────────────┼────────────┤
│ Better internal linking - The competitor uses more strategic         │ 0.6        │
│ internal links that improve site navigation and SEO value.           │            │
├──────────────────────────────────────────────────────────────────────┼────────────┤
│ Structured data implementation - The competitor implements JSON-LD   │ 0.5        │
│ structured data for better search engine understanding.              │            │
└──────────────────────────────────────────────────────────────────────┴────────────┘
```

#### Keyword-Focused Comparison

Focus the comparison on specific keywords:

```bash
npx seoq compare https://mysite.com https://competitor.com --keywords "SEO tools,keyword research,rank tracking"
```

**Example Output:**

```
✔ Comparison complete. Found 4 insights.

┌──────────────────────────────────────────────────────────────────────┬────────────┐
│ Insight                                                              │ Relevance  │
├──────────────────────────────────────────────────────────────────────┼────────────┤
│ Better keyword optimization - The competitor more effectively        │ 0.9        │
│ integrates target keywords into headings, content, and meta tags.    │            │
├──────────────────────────────────────────────────────────────────────┼────────────┤
│ Improved content depth - The competitor provides more comprehensive  │ 0.8        │
│ content covering the target keywords in greater detail.              │            │
└──────────────────────────────────────────────────────────────────────┴────────────┘
```

### `competitors`

Find the top 5 most relevant competitors for a website. This command analyzes the website and uses web search to identify competitors in the same industry or market.

#### Syntax

```bash
npx seoq competitors <url>
```

#### Options

This command has no options.

#### Example

```bash
npx seoq competitors https://example.com
```

**Example Output:**

```
✔ Competitor analysis complete for https://example.com.

┌─────────────────────────┬──────────────────────────────────────────┬────────────┐
│ Competitor              │ Website                                  │ Relevance  │
├─────────────────────────┼──────────────────────────────────────────┼────────────┤
│ CompetitorCorp          │ https://competitorcorp.com               │ 0.9        │
│ RivalInc                │ https://rivalinc.com                     │ 0.8        │
│ MarketLeader            │ https://marketleader.io                  │ 0.7        │
│ AlternativeSolutions    │ https://alternativesolutions.com         │ 0.6        │
│ SimilarService          │ https://similarservice.net               │ 0.5        │
└─────────────────────────┴──────────────────────────────────────────┴────────────┘
```

**Note:** Competitors are sorted by relevance score (highest first), with scores ranging from 0.1 to 1.0.

### `keywords`

Extract the most relevant keywords from a webpage. This command analyzes the page content, headings, meta tags, and structure to identify the most important keywords.

#### Syntax

```bash
npx seoq keywords <url>
```

#### Options

This command has no options.

#### Example

```bash
npx seoq keywords https://example.com/blog/seo-tips
```

**Example Output:**

```
✔ Keyword extraction complete for https://example.com/blog/seo-tips.

┌────────────┬──────────────────────────────────────────────────────────────────────────────┐
│ Relevance  │ Keyword                                                                      │
├────────────┼──────────────────────────────────────────────────────────────────────────────┤
│ 0.9        │ SEO tips                                                                     │
│ 0.8        │ search engine optimization                                                   │
│ 0.7        │ keyword research                                                             │
│ 0.6        │ on-page SEO                                                                  │
│ 0.5        │ meta tags                                                                    │
│ 0.4        │ content optimization                                                         │
│ 0.3        │ Google ranking                                                               │
│ 0.2        │ website traffic                                                              │
└────────────┴──────────────────────────────────────────────────────────────────────────────┘
```

**Note:** Keywords are extracted in the same language as the page content and are sorted by relevance score (highest first). Up to 10 keywords are returned.

## Common Use Cases

### Analyze Your Homepage

Quickly check your homepage for common SEO issues:

```bash
npx seoq analyze https://yoursite.com
```

### Audit Your Entire Site

Analyze all pages from your sitemap:

```bash
npx seoq analyze https://yoursite.com --sitemap --limit 100 --concurrency 5
```

### Compare with Top Competitor

Find your competitors and compare with the top one:

```bash
# First, find competitors
npx seoq competitors https://yoursite.com

# Then compare with the top competitor
npx seoq compare https://yoursite.com https://topcompetitor.com
```

### Extract Keywords for Content Planning

Extract keywords from a high-performing page:

```bash
npx seoq keywords https://competitor.com/best-page
```

### Focused Competitive Analysis

Compare your site with a competitor focusing on specific keywords:

```bash
npx seoq compare https://yoursite.com https://competitor.com --keywords "product features,pricing,reviews"
```

## Requirements

- **npx**: Available via Node.js (comes pre-installed with Node.js)
- **OpenAI API Key**: Required for all AI-powered analysis. Set via `OPENAI_API_KEY` environment variable.

**Note:** Playwright browsers are automatically installed on first use - no manual setup required!

## Troubleshooting

### OpenAI API Errors

**Rate Limit Exceeded:**

- Wait a moment and try again
- Reduce concurrency when analyzing sitemaps: `--concurrency 1`

**Invalid API Key:**

- Verify your `OPENAI_API_KEY` environment variable is set correctly
- Ensure the API key is valid and has sufficient credits

### Validation Errors

If you see validation errors:

- Ensure URLs are properly formatted (include `https://` or `http://`)
- Check that numeric options are within the specified ranges
- Verify that required arguments are provided

### Sitemap Not Found

If sitemap analysis fails:

- Verify the sitemap URL is accessible
- Try specifying a custom sitemap path: `--sitemap /custom-sitemap.xml`
- Check that the sitemap is in valid XML format

## Development

For contributors who want to develop or modify SEOQ:

### Build

```bash
npm run build
```

### Development Mode

```bash
npm run dev
```

### Format Code

```bash
npm run format
```

### Lint

```bash
npm run lint
npm run lint:fix
```

## License

MIT
