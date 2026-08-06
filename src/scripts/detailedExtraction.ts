import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface ExtractionReport {
  version: string;
  url: string;
  analysisTime: string;
  cssSelectors: {
    mainContent: string;
    sectionHeading: string;
    features: string;
  };
  sections: Array<{
    heading: string;
    rawHTMLSnippet: string;
    extractedItems: Array<{
      raw: string;
      cleaned: string;
      problems: string[];
    }>;
    extractionNotes: string;
  }>;
  overallProblems: string[];
  parserRecommendations: string[];
}

async function detailedExtraction(
  version: string,
  url: string
): Promise<ExtractionReport> {
  console.log(`\n[${version}] Fetching for detailed extraction...`);

  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const html = await response.text();

  // Extract article content
  const articleMatch = html.match(
    /<article[^>]*>([\s\S]*?)<\/article>/i
  );
  const articleContent = articleMatch ? articleMatch[1] : html;

  const sections: ExtractionReport["sections"] = [];
  const overallProblems: Set<string> = new Set();

  // Find all H2 sections
  const h2Regex = /<h2[^>]*>([^<]+)<\/h2>([\s\S]*?)(?=<h2|<\/article|$)/gi;
  let h2Match;
  let sectionCount = 0;

  while ((h2Match = h2Regex.exec(articleContent)) !== null) {
    const heading = h2Match[1]
      .replace(/<[^>]+>/g, "")
      .trim();
    const sectionContent = h2Match[2];

    // Get raw HTML snippet
    const rawSnippet = h2Match[0].substring(0, 500);

    // Extract list items
    const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
    const extractedItems: Array<{
      raw: string;
      cleaned: string;
      problems: string[];
    }> = [];

    let liMatch;
    let itemCount = 0;
    while ((liMatch = liRegex.exec(sectionContent)) !== null && itemCount < 5) {
      const raw = liMatch[1];
      const problems: string[] = [];

      // Analyze problems
      if (raw.includes("<ul>") || raw.includes("<ol>")) {
        problems.push("Contains nested list");
      }
      if (raw.includes("<a href")) {
        problems.push("Contains links");
      }
      if (raw.includes("<strong>") || raw.includes("<b>")) {
        problems.push("Contains formatting tags");
      }
      if (raw.match(/\n\n\n/)) {
        problems.push("Multiple newlines");
      }
      if (raw.length > 500) {
        problems.push("Excessive length");
      }

      const cleaned = raw
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 200);

      extractedItems.push({
        raw: raw.slice(0, 300),
        cleaned,
        problems,
      });

      itemCount++;
    }

    // Determine extraction notes
    let extractionNotes = "";
    if (extractedItems.length === 0) {
      extractionNotes = "No list items found - section may be empty or use different structure";
      overallProblems.add("Empty sections found");
    } else if (extractedItems.length < 3) {
      extractionNotes = `Only ${extractedItems.length} item(s) extracted - may be incomplete`;
    } else {
      extractionNotes = `Successfully extracted ${extractedItems.length} items`;
    }

    sections.push({
      heading,
      rawHTMLSnippet: rawSnippet,
      extractedItems,
      extractionNotes,
    });

    sectionCount++;
    if (sectionCount >= 6) break; // Limit to first 6 sections
  }

  // Collect overall problems
  const totalItems = sections.reduce((sum, s) => sum + s.extractedItems.length, 0);

  if (totalItems === 0) {
    overallProblems.add("No features extracted from entire page");
  }

  if (sections.some((s) => s.extractedItems.some((i) => i.problems.includes("Contains nested list")))) {
    overallProblems.add("Nested lists causing merged content");
  }

  if (sections.some((s) => s.extractedItems.some((i) => i.cleaned.includes("Page contents")))) {
    overallProblems.add("Navigation/TOC content mixed with features");
  }

  // Parser recommendations
  const recommendations: string[] = [];

  if (sections.length > 0) {
    recommendations.push(`✓ Main structure identified: ${sections.length} H2 sections`);
  }

  const problemSummary = overallProblems.size > 0
    ? `❌ ${overallProblems.size} overall problems detected`
    : "✓ No major structural problems";
  recommendations.push(problemSummary);

  recommendations.push(`📊 Total items extracted: ${totalItems} from ${sections.length} sections`);

  if (totalItems < 10) {
    recommendations.push(
      `⚠ Very few items (${totalItems}) - consider adjusting extraction depth`
    );
  }

  // Specific improvements
  if (overallProblems.has("Nested lists causing merged content")) {
    recommendations.push(
      "💡 IMPROVEMENT: Split nested lists on newlines and filter out sub-items"
    );
  }

  if (overallProblems.has("Navigation/TOC content mixed with features")) {
    recommendations.push(
      "💡 IMPROVEMENT: Filter content containing 'Page contents', 'TOC', 'Related topics'"
    );
  }

  if (sections.length > 0 && sections[0].extractedItems.length > 0) {
    const avgLength = sections.reduce(
      (sum, s) =>
        sum +
        s.extractedItems.reduce(
          (itemSum, item) => itemSum + item.cleaned.length,
          0
        ),
      0
    ) / totalItems;

    if (avgLength < 50) {
      recommendations.push(
        "⚠ Average extracted text is very short - may indicate incomplete parsing"
      );
    } else if (avgLength > 300) {
      recommendations.push(
        "⚠ Average extracted text is very long - may include multiple features per item"
      );
    }
  }

  return {
    version,
    url,
    analysisTime: new Date().toISOString(),
    cssSelectors: {
      mainContent: "article",
      sectionHeading: "h2",
      features: "ul > li",
    },
    sections,
    overallProblems: Array.from(overallProblems),
    parserRecommendations: recommendations,
  };
}

async function main() {
  console.log("=".repeat(90));
  console.log("Detailed HTML Extraction Analysis");
  console.log("=".repeat(90));

  const versions = [
    {
      version: "11.44",
      url: "https://documentation.commvault.com/11.44/software/changes_in_long_term_support_release_11_44.html",
    },
    {
      version: "11.46",
      url: "https://documentation.commvault.com/11.46/software/changes_in_innovation_release_11_46.html",
    },
  ];

  const outputDir = path.join(__dirname, "../../analysis");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  for (const { version, url } of versions) {
    try {
      const report = await detailedExtraction(version, url);

      // Save report
      const reportPath = path.join(outputDir, `${version}-extraction.json`);
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      console.log(`\n[${version}] Report saved to: ${reportPath}`);

      // Print detailed summary
      console.log(`\n${"=".repeat(90)}`);
      console.log(`${version} - Detailed Extraction Report`);
      console.log("=".repeat(90));

      console.log(`\n🎯 CSS Selectors Used:`);
      console.log(`  Main Content: <${report.cssSelectors.mainContent}>`);
      console.log(`  Section Headings: <${report.cssSelectors.sectionHeading}>`);
      console.log(`  Features: <${report.cssSelectors.features}>`);

      report.sections.forEach((section, idx) => {
        console.log(`\n${"─".repeat(90)}`);
        console.log(`Section ${idx + 1}: "${section.heading}"`);
        console.log(`Status: ${section.extractionNotes}`);

        if (section.extractedItems.length > 0) {
          console.log(`\nRaw Extracted Items (showing first 5):`);
          section.extractedItems.forEach((item, itemIdx) => {
            console.log(
              `\n  Item ${itemIdx + 1}:`
            );
            console.log(
              `    Raw HTML: ${item.raw.replace(/\n/g, " ").slice(0, 100)}...`
            );
            console.log(`    Cleaned: "${item.cleaned}"`);
            if (item.problems.length > 0) {
              console.log(`    Problems: ${item.problems.join(", ")}`);
            }
          });
        }
      });

      console.log(`\n${"=".repeat(90)}`);
      console.log(`Overall Analysis:`);
      console.log(`  Total Sections: ${report.sections.length}`);
      console.log(
        `  Total Items Extracted: ${report.sections.reduce((sum, s) => sum + s.extractedItems.length, 0)}`
      );

      if (report.overallProblems.length > 0) {
        console.log(`\n❌ Problems Found:`);
        report.overallProblems.forEach((p) => console.log(`  - ${p}`));
      }

      console.log(`\n💡 Recommendations:`);
      report.parserRecommendations.forEach((r) => console.log(`  ${r}`));
    } catch (error) {
      console.error(`[${version}] Error:`, error);
    }
  }

  console.log(`\n${"=".repeat(90)}`);
  console.log(`Reports saved to analysis/ directory`);
}

main().catch(console.error);
