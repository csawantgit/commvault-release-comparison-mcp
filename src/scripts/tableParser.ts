import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface ExtractedFeature {
  id: string;
  section: string;
  introduced_in: string;
  product: string;
  change: string;
  learn_more_links: Array<{
    text: string;
    href: string;
  }>;
  raw_change_html: string;
  quality_score: number;
}

interface ParserOutput {
  version: string;
  url: string;
  parsedAt: string;
  sections: Array<{
    heading: string;
    table_found: boolean;
    rows_count: number;
    features_extracted: number;
  }>;
  features: ExtractedFeature[];
  statistics: {
    total_sections: number;
    sections_with_tables: number;
    total_rows_parsed: number;
    total_features_extracted: number;
    avg_quality_score: number;
    extraction_rate: string;
  };
  quality_issues: string[];
}

async function parseTableFormat(version: string, url: string): Promise<ParserOutput> {
  console.log(`\n[${version}] Fetching HTML...`);

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
  console.log(`[${version}] ✓ Downloaded ${html.length} bytes`);

  // Extract article content
  const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
  const articleContent = articleMatch ? articleMatch[1] : html;

  const allFeatures: ExtractedFeature[] = [];
  const sectionsInfo: ParserOutput["sections"] = [];
  const qualityIssues: string[] = [];
  let featureId = 0;

  // Find all H2 sections
  const h2Regex = /<h2[^>]*id="([^"]*)"[^>]*>([^<]+)<\/h2>([\s\S]*?)(?=<h2|<\/article|$)/gi;
  let h2Match;
  let totalRowsParsed = 0;

  while ((h2Match = h2Regex.exec(articleContent)) !== null) {
    const sectionId = h2Match[1];
    const sectionHeading = h2Match[2]
      .replace(/<[^>]+>/g, "")
      .trim();
    const sectionContent = h2Match[3];

    console.log(`[${version}] Processing section: "${sectionHeading}"`);

    // Look for tables in this section
    const tableRegex =
      /<table[^>]*>([\s\S]*?)<\/table>/gi;
    let tableMatch;
    let tablesFound = 0;
    let featuresInSection = 0;

    while ((tableMatch = tableRegex.exec(sectionContent)) !== null) {
      tablesFound++;
      const tableHtml = tableMatch[1];

      // Extract table rows
      const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
      let rowMatch;
      let rowCount = 0;

      while ((rowMatch = rowRegex.exec(tableHtml)) !== null) {
        rowCount++;
        const rowHtml = rowMatch[1];

        // Extract cells
        const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
        const cells: string[] = [];
        let cellMatch;

        while ((cellMatch = cellRegex.exec(rowHtml)) !== null) {
          const cellContent = cellMatch[1];
          cells.push(cellContent);
        }

        // Skip header rows (usually 4 cells with minimal content)
        if (cells.length < 3) {
          continue;
        }

        // Table format: [Introduced in, Product, Change, Learn more]
        if (cells.length >= 3) {
          const introducedIn = cells[0]
            .replace(/<[^>]+>/g, "")
            .trim()
            .slice(0, 50);
          const product = cells[1]
            .replace(/<[^>]+>/g, "")
            .trim();
          const changeHtml = cells[2];
          const changeText = changeHtml
            .replace(/<[^>]+>/g, "")
            .replace(/\s+/g, " ")
            .trim();

          // Skip header-like rows and empty rows
          if (
            changeText.length < 10 ||
            changeText.includes("Introduced in") ||
            changeText.includes("Change")
          ) {
            continue;
          }

          // Extract "Learn More" links from 4th cell if present
          const linksCell = cells[3] || "";
          const linkMatches = Array.from(
            linksCell.matchAll(
              /<a[^>]*(?:href="([^"]*)")?[^>]*>([^<]+)<\/a>/gi
            )
          );
          const learnMoreLinks = linkMatches.map((match) => ({
            text: match[2].trim(),
            href: match[1] || "",
          }));

          // Quality scoring
          let qualityScore = 100;

          // Check for issues
          if (changeText.length > 500) {
            qualityScore -= 20;
            qualityIssues.push(
              `Long change text in ${sectionHeading} (${changeText.length} chars)`
            );
          }
          if (changeText.match(/^(https?:\/\/|<)/)) {
            qualityScore -= 30;
            qualityIssues.push(
              `Possible URL/HTML in change text: ${sectionHeading}`
            );
          }
          if (learnMoreLinks.length === 0 && product.length === 0) {
            qualityScore -= 15;
          }

          const feature: ExtractedFeature = {
            id: `11.44-${sectionId}-${++featureId}`,
            section: sectionHeading,
            introduced_in: introducedIn,
            product,
            change: changeText.slice(0, 300),
            learn_more_links: learnMoreLinks,
            raw_change_html: changeHtml.slice(0, 200),
            quality_score: Math.max(0, qualityScore),
          };

          allFeatures.push(feature);
          featuresInSection++;
          totalRowsParsed++;
        }
      }

      console.log(
        `[${version}] Table in "${sectionHeading}": ${rowCount} rows → ${featuresInSection} features`
      );
    }

    sectionsInfo.push({
      heading: sectionHeading,
      table_found: tablesFound > 0,
      rows_count: totalRowsParsed,
      features_extracted: featuresInSection,
    });
  }

  // Calculate statistics
  const avgQualityScore =
    allFeatures.length > 0
      ? allFeatures.reduce((sum, f) => sum + f.quality_score, 0) /
        allFeatures.length
      : 0;

  const sectionsWithTables = sectionsInfo.filter((s) => s.table_found).length;

  return {
    version,
    url,
    parsedAt: new Date().toISOString(),
    sections: sectionsInfo,
    features: allFeatures,
    statistics: {
      total_sections: sectionsInfo.length,
      sections_with_tables: sectionsWithTables,
      total_rows_parsed: totalRowsParsed,
      total_features_extracted: allFeatures.length,
      avg_quality_score: Math.round(avgQualityScore),
      extraction_rate: `${allFeatures.length} features from ${totalRowsParsed} rows (${Math.round((allFeatures.length / Math.max(1, totalRowsParsed)) * 100)}%)`,
    },
    quality_issues: Array.from(new Set(qualityIssues)),
  };
}

async function main() {
  console.log("=".repeat(90));
  console.log("Commvault 11.44 Table Parser - Production Quality");
  console.log("=".repeat(90));

  const url =
    "https://documentation.commvault.com/11.44/software/changes_in_long_term_support_release_11_44.html";

  try {
    const result = await parseTableFormat("11.44", url);

    // Save detailed results
    const outputDir = path.join(__dirname, "../../data");
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputPath = path.join(outputDir, "11.44.table-parsed.json");
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
    console.log(`\n✓ Detailed results saved to: ${outputPath}`);

    // Print summary
    console.log(`\n${"=".repeat(90)}`);
    console.log("Parsing Results");
    console.log("=".repeat(90));

    console.log(`\n📊 Statistics:`);
    console.log(`  Total sections: ${result.statistics.total_sections}`);
    console.log(`  Sections with tables: ${result.statistics.sections_with_tables}`);
    console.log(`  Total rows parsed: ${result.statistics.total_rows_parsed}`);
    console.log(`  Total features extracted: ${result.statistics.total_features_extracted}`);
    console.log(`  Average quality score: ${result.statistics.avg_quality_score}/100`);
    console.log(`  Extraction rate: ${result.statistics.extraction_rate}`);

    console.log(`\n📑 Sections Processed:`);
    result.sections.forEach((section, idx) => {
      const indicator = section.table_found ? "✓" : "✗";
      console.log(`  ${idx + 1}. ${indicator} ${section.heading}`);
      if (section.features_extracted > 0) {
        console.log(
          `     ${section.rows_count} rows → ${section.features_extracted} features`
        );
      }
    });

    console.log(`\n📋 Sample Features (first 5):`);
    result.features.slice(0, 5).forEach((feature, idx) => {
      console.log(`\n  Feature ${idx + 1}:`);
      console.log(`    ID: ${feature.id}`);
      console.log(`    Section: ${feature.section}`);
      console.log(`    Introduced: ${feature.introduced_in}`);
      console.log(`    Product: ${feature.product}`);
      console.log(`    Change: "${feature.change.substring(0, 100)}..."`);
      console.log(`    Links: ${feature.learn_more_links.length}`);
      console.log(`    Quality: ${feature.quality_score}/100`);
    });

    if (result.quality_issues.length > 0) {
      console.log(`\n⚠️  Quality Issues Found (${result.quality_issues.length}):`);
      result.quality_issues.slice(0, 5).forEach((issue) => {
        console.log(`  - ${issue}`);
      });
    }

    console.log(`\n${"=".repeat(90)}`);
    if (result.statistics.total_features_extracted >= 15) {
      console.log("✅ SUCCESS: Extracted 15+ clean features");
    } else {
      console.log(
        `⚠️  WARNING: Only ${result.statistics.total_features_extracted} features extracted (target: 15+)`
      );
    }
    console.log("=".repeat(90));
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main();
