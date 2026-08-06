import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Section to category mapping rules
const SECTION_CATEGORY_MAP = {
    // Virtualization
    "Backup and Restore Agents": { category: "Platform", confidence: 90 },
    Virtualization: { category: "Virtualization", confidence: 100 },
    Kubernetes: { category: "Virtualization", confidence: 95 },
    // Security
    Security: { category: "Security", confidence: 100 },
    // Database
    Databases: { category: "Database", confidence: 100 },
    "SQL Server": { category: "Database", confidence: 100 },
    // Storage
    Storage: { category: "Storage", confidence: 100 },
    // Platform (general/misc)
    "CommCell Management": { category: "Platform", confidence: 100 },
    "Commvault Store": { category: "Platform", confidence: 95 },
    "Install and Deployment": { category: "Platform", confidence: 100 },
    Reports: { category: "Platform", confidence: 90 },
};
// Content-based category refinement (for borderline cases)
const CONTENT_KEYWORDS = {
    Virtualization: [
        "vm",
        "vmware",
        "hyperv",
        "kubernetes",
        "container",
        "docker",
        "openstack",
        "proxmox",
        "snapshot",
    ],
    Security: [
        "encryption",
        "authentication",
        "authorization",
        "threat",
        "ransomware",
        "mfa",
        "certificate",
        "audit",
        "compliance",
    ],
    Database: [
        "oracle",
        "sql server",
        "mysql",
        "postgresql",
        "mongodb",
        "documentdb",
        "rds",
        "redshift",
    ],
    Storage: [
        "storage",
        "s3",
        "azure",
        "cloud storage",
        "deduplication",
        "tape",
        "archive",
        "tiering",
    ],
    Performance: [
        "performance",
        "optimization",
        "throughput",
        "latency",
        "speed",
        "efficiency",
    ],
};
function refineCategory(feature, initialCategory, initialConfidence) {
    const text = `${feature.product} ${feature.change}`.toLowerCase();
    // Check if content strongly suggests a different category
    for (const [category, keywords] of Object.entries(CONTENT_KEYWORDS)) {
        const matches = keywords.filter((kw) => text.includes(kw)).length;
        if (matches >= 2 && category !== initialCategory) {
            // Strong content signal overrides section mapping
            if (matches >= 3) {
                return { category, confidence: 95 };
            }
            // Mild content signal: increase confidence if aligned
            if (category === initialCategory) {
                return { category, confidence: Math.min(100, initialConfidence + 5) };
            }
        }
    }
    return { category: initialCategory, confidence: initialConfidence };
}
async function categorizeFeatures(version) {
    const dataDir = path.join(__dirname, "../../data");
    const inputPath = path.join(dataDir, `${version}.table-parsed.json`);
    console.log(`\n[${version}] Reading parsed features from: ${inputPath}`);
    if (!fs.existsSync(inputPath)) {
        throw new Error(`File not found: ${inputPath}`);
    }
    const rawData = JSON.parse(fs.readFileSync(inputPath, "utf-8"));
    const features = rawData.features;
    console.log(`[${version}] ✓ Loaded ${features.length} features`);
    // Categorize features
    const categorizedFeatures = [];
    const unmapped = [];
    features.forEach((feature) => {
        const mapping = SECTION_CATEGORY_MAP[feature.section];
        if (!mapping) {
            console.log(`[${version}] ⚠️  No mapping for section: "${feature.section}"`);
            unmapped.push({
                ...feature,
                category: "Unmapped",
                mapping_confidence: 0,
            });
            return;
        }
        // Refine category based on content
        const refined = refineCategory(feature, mapping.category, mapping.confidence);
        categorizedFeatures.push({
            ...feature,
            category: refined.category,
            mapping_confidence: refined.confidence,
        });
    });
    // Sort by category and confidence
    categorizedFeatures.sort((a, b) => a.category.localeCompare(b.category) ||
        b.mapping_confidence - a.mapping_confidence);
    // Group by category
    const categorizedMap = {};
    const categories = [
        "Virtualization",
        "Security",
        "Database",
        "Storage",
        "Platform",
        "Performance",
    ];
    for (const cat of categories) {
        categorizedMap[cat] = categorizedFeatures.filter((f) => f.category === cat);
    }
    // Build mapping rules summary
    const mappingRules = {};
    for (const [section, mapping] of Object.entries(SECTION_CATEGORY_MAP)) {
        if (!mappingRules[mapping.category]) {
            mappingRules[mapping.category] = [];
        }
        mappingRules[mapping.category].push(section);
    }
    // Statistics
    const featuresByCategory = {};
    for (const cat of categories) {
        featuresByCategory[cat] = categorizedMap[cat].length;
    }
    const totalMapped = categorizedFeatures.length;
    const mappingCoverage = totalMapped > 0
        ? `${Math.round((totalMapped / (totalMapped + unmapped.length)) * 100)}%`
        : "0%";
    return {
        version,
        categorized_at: new Date().toISOString(),
        mapping_rules: mappingRules,
        categories: categorizedMap,
        statistics: {
            total_features: features.length,
            features_by_category: featuresByCategory,
            unmapped_features: unmapped.length,
            mapping_coverage: mappingCoverage,
        },
        unmapped,
    };
}
async function main() {
    console.log("=".repeat(90));
    console.log("Feature Category Mapper");
    console.log("=".repeat(90));
    try {
        const result = await categorizeFeatures("11.44");
        // Save categorized data
        const dataDir = path.join(__dirname, "../../data");
        const outputPath = path.join(dataDir, "11.44.categorized.json");
        // Only save categories with features, keep unmapped separate
        const outputData = {
            version: result.version,
            categorized_at: result.categorized_at,
            mapping_rules: result.mapping_rules,
            categories: result.categories,
            statistics: result.statistics,
        };
        fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2));
        console.log(`\n✓ Categorized features saved to: ${outputPath}`);
        // Print summary
        console.log(`\n${"=".repeat(90)}`);
        console.log("Categorization Summary");
        console.log("=".repeat(90));
        console.log(`\n📊 Statistics:`);
        console.log(`  Total Features: ${result.statistics.total_features}`);
        console.log(`  Mapped: ${result.statistics.total_features - result.statistics.unmapped_features}`);
        console.log(`  Unmapped: ${result.statistics.unmapped_features}`);
        console.log(`  Coverage: ${result.statistics.mapping_coverage}`);
        console.log(`\n📂 Features by Category:`);
        const categories = Object.keys(result.statistics.features_by_category).sort();
        for (const category of categories) {
            const count = result.statistics.features_by_category[category];
            const bar = "█".repeat(count);
            console.log(`  ${category.padEnd(18)}: ${bar} (${count})`);
        }
        // Show mapping rules
        console.log(`\n🔗 Mapping Rules:`);
        for (const [category, sections] of Object.entries(result.mapping_rules)) {
            console.log(`  ${category}:`);
            sections.forEach((section) => {
                console.log(`    - ${section}`);
            });
        }
        // Show examples from each category
        console.log(`\n${"=".repeat(90)}`);
        console.log("Sample Features by Category");
        console.log("=".repeat(90));
        for (const category of categories) {
            const features = result.categories[category];
            if (features.length === 0)
                continue;
            console.log(`\n${category} (${features.length} features):`);
            // Show top 2 features
            features.slice(0, 2).forEach((feature, idx) => {
                console.log(`\n  Feature ${idx + 1}:`);
                console.log(`    ID: ${feature.id}`);
                console.log(`    Product: ${feature.product}`);
                console.log(`    Change: ${feature.change.substring(0, 90)}...`);
                console.log(`    Confidence: ${feature.mapping_confidence}% | Quality: ${feature.quality_score}/100`);
            });
            if (features.length > 2) {
                console.log(`  ... and ${features.length - 2} more features in ${category}`);
            }
        }
        // Show unmapped if any
        if (result.unmapped.length > 0) {
            console.log(`\n${"=".repeat(90)}`);
            console.log(`⚠️  Unmapped Features (${result.unmapped.length})`);
            console.log("=".repeat(90));
            result.unmapped.forEach((feature) => {
                console.log(`\n  Section: ${feature.section}`);
                console.log(`  Product: ${feature.product}`);
                console.log(`  Change: ${feature.change.substring(0, 60)}...`);
            });
        }
        console.log(`\n${"=".repeat(90)}`);
        console.log("✅ Categorization Complete");
        console.log("=".repeat(90));
    }
    catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
}
main();
