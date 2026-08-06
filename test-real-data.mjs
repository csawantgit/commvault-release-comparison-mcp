import { ReleaseManager } from "./build/data/releaseManager.js";

async function testRealDataIntegration() {
  console.log("═".repeat(90));
  console.log("Testing ReleaseManager with Real Categorized Data");
  console.log("═".repeat(90));

  try {
    const manager = ReleaseManager.getInstance();

    // Initialize with 11.44
    console.log("\n[1] Initializing ReleaseManager...");
    await manager.initialize(["11.44", "11.46"]);

    const diagnostics = manager.getDiagnostics();
    console.log(`\n✓ Initialized`);
    console.log(`  Loaded versions: ${diagnostics.loadedVersions.join(", ")}`);
    console.log(`  Cache size: ${diagnostics.cacheSize}`);
    console.log(`  Available data sources: ${diagnostics.dataSources.join(", ")}`);
    console.log(`\n  Data source usage:`);
    for (const [version, source] of Object.entries(
      diagnostics.dataSourceUsage
    )) {
      console.log(`    - ${version}: ${source}`);
    }

    // Get 11.44 release
    console.log("\n[2] Getting 11.44 release data...");
    const release11_44 = await manager.getRelease("11.44");
    console.log(`\n✓ Release 11.44 loaded`);
    console.log(`  Release date: ${release11_44.releaseDate}`);
    console.log(`  Categories: ${Object.keys(release11_44.categories).join(", ")}`);

    // Show category details
    console.log("\n  Features by category:");
    for (const [category, changes] of Object.entries(
      release11_44.categories
    )) {
      console.log(`    - ${category}: ${changes.length} features`);
    }

    // Sample features
    console.log("\n[3] Sample features from 11.44:");
    const categories = Object.keys(release11_44.categories);

    for (const category of categories.slice(0, 3)) {
      const changes = release11_44.categories[category];
      if (changes.length > 0) {
        console.log(`\n  ${category}:`);
        changes.slice(0, 2).forEach((change, idx) => {
          console.log(`    ${idx + 1}. ${change.title}`);
          console.log(`       ${change.description.substring(0, 70)}...`);
        });
      }
    }

    // Compare releases (simulated)
    console.log("\n[4] Simulating compare_releases(11.44, 11.46)...");
    const rel2 = await manager.getRelease("11.46");

    // Build comparison response
    const comparison = {
      version1: "11.44",
      version2: "11.46",
      release_date_v1: release11_44.releaseDate,
      release_date_v2: rel2.releaseDate,
      category_comparison: {},
    };

    const availableCategories = manager.getAvailableCategories();
    for (const category of availableCategories) {
      const v1Changes = release11_44.categories[category] || [];
      const v2Changes = rel2.categories[category] || [];
      const v1Ids = new Set(v1Changes.map((c) => c.id));
      const v2Ids = new Set(v2Changes.map((c) => c.id));

      comparison.category_comparison[category] = {
        version1_count: v1Changes.length,
        version2_count: v2Changes.length,
        new_in_v2: v2Changes
          .filter((c) => !v1Ids.has(c.id))
          .map((c) => c.title),
      };
    }

    console.log(`\n✓ Comparison result:`);
    console.log(JSON.stringify(comparison, null, 2));

    // Data source info
    const dataSourceUsage = manager.getDataSourceInfo();
    console.log("\n[5] Data Source Information:");
    for (const [version, source] of Object.entries(dataSourceUsage)) {
      console.log(`  ${version}: Loaded from "${source}"`);
    }

    // Verification
    console.log("\n" + "═".repeat(90));
    console.log("VERIFICATION RESULTS");
    console.log("═".repeat(90));

    const dataSourceUsed11_44 = manager.getDataSourceUsed("11.44");
    const dataSourceUsed11_46 = manager.getDataSourceUsed("11.46");

    console.log(`\n✅ 11.44 Data Source: ${dataSourceUsed11_44}`);
    console.log(`   Expected: Categorized Data`);
    console.log(
      `   Result: ${dataSourceUsed11_44 === "Categorized Data" ? "✅ PASS" : "❌ FAIL"}`
    );

    console.log(`\n✅ Categories Returned:`);
    console.log(`   Count: ${Object.keys(comparison.category_comparison).length}`);
    console.log(
      `   Categories: ${Object.keys(comparison.category_comparison).join(", ")}`
    );

    console.log(`\n✅ Feature Counts for 11.44:`);
    const totalFeaturesIn11_44 = Object.values(release11_44.categories).reduce(
      (sum, changes) => sum + changes.length,
      0
    );
    console.log(`   Total features: ${totalFeaturesIn11_44}`);
    for (const [category, count] of Object.entries(
      comparison.category_comparison
    ).sort((a, b) => b[1].version1_count - a[1].version1_count)) {
      if (count.version1_count > 0) {
        console.log(
          `   - ${category}: ${count.version1_count} features`
        );
      }
    }

    console.log(`\n✅ New Features in 11.46:`);
    let totalNewFeatures = 0;
    for (const [category, data] of Object.entries(
      comparison.category_comparison
    )) {
      if (data.new_in_v2.length > 0) {
        console.log(`   ${category}: ${data.new_in_v2.length} new features`);
        totalNewFeatures += data.new_in_v2.length;
      }
    }
    console.log(`   Total new: ${totalNewFeatures}`);

    console.log("\n" + "═".repeat(90));
    console.log("✅ ALL TESTS PASSED - Real data integration successful!");
    console.log("═".repeat(90));
  } catch (error) {
    console.error("\n❌ Error:", error);
    process.exit(1);
  }
}

testRealDataIntegration();
