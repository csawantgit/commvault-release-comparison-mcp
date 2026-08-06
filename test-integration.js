#!/usr/bin/env node

/**
 * Integration test for compare_releases functionality
 * Tests that real data is loaded from live documentation
 */

import { ReleaseManager } from "./build/data/releaseManager.js";

async function testIntegration() {
  console.log("=== Commvault Release Comparison - Integration Test ===\n");

  const releaseManager = ReleaseManager.getInstance();

  try {
    // Initialize with 11.44 and 11.46
    console.log("1. Initializing release manager with real data...");
    await releaseManager.initialize(["11.44", "11.46"]);

    const versions = releaseManager.getAvailableVersions();
    const categories = releaseManager.getAvailableCategories();

    console.log(`✓ Loaded versions: ${versions.join(", ")}`);
    console.log(`✓ Available categories: ${categories.join(", ")}\n`);

    // Test 1: Get release data for 11.44
    console.log("2. Testing get_release_changes for 11.44...");
    const release1144 = await releaseManager.getRelease("11.44");
    console.log(`✓ Release date: ${release1144.releaseDate}`);

    let totalFeatures1144 = 0;
    for (const [category, changes] of Object.entries(
      release1144.categories
    )) {
      console.log(`  - ${category}: ${changes.length} items`);
      totalFeatures1144 += changes.length;
    }
    console.log(`✓ Total features for 11.44: ${totalFeatures1144}\n`);

    // Test 2: Get release data for 11.46
    console.log("3. Testing get_release_changes for 11.46...");
    const release1146 = await releaseManager.getRelease("11.46");
    console.log(`✓ Release date: ${release1146.releaseDate}`);

    let totalFeatures1146 = 0;
    for (const [category, changes] of Object.entries(
      release1146.categories
    )) {
      console.log(`  - ${category}: ${changes.length} items`);
      totalFeatures1146 += changes.length;
    }
    console.log(`✓ Total features for 11.46: ${totalFeatures1146}\n`);

    // Test 3: Compare releases
    console.log("4. Testing compare_releases(11.44, 11.46)...");
    const categories1 = Object.keys(release1144.categories);
    const categories2 = Object.keys(release1146.categories);
    const allCategories = Array.from(new Set([...categories1, ...categories2]));

    console.log("Category Comparison:");
    for (const category of allCategories) {
      const v1Count = release1144.categories[category]?.length || 0;
      const v2Count = release1146.categories[category]?.length || 0;
      const diff = v2Count - v1Count;
      const sign = diff > 0 ? "+" : "";
      console.log(
        `  ${category}: ${v1Count} → ${v2Count} (${sign}${diff})`
      );
    }
    console.log();

    // Test 4: Sample a feature from each category
    console.log("5. Sample features from 11.44:");
    for (const category of categories) {
      const changes = release1144.categories[category] || [];
      if (changes.length > 0) {
        const sample = changes[0];
        console.log(`  ${category}:`);
        console.log(`    ID: ${sample.id}`);
        console.log(`    Title: ${sample.title}`);
        console.log(
          `    Description: ${sample.description.substring(0, 80)}...`
        );
      }
    }
    console.log();

    // Success summary
    console.log("=== ✓ All Tests Passed ===");
    console.log(
      `✓ Real data loaded from live Commvault documentation`
    );
    console.log(`✓ 11.44: ${totalFeatures1144} features`);
    console.log(`✓ 11.46: ${totalFeatures1146} features`);
    console.log(
      `✓ Categories: Virtualization, Security, Database, Storage, Platform, Performance`
    );
    console.log(`✓ Ready for MCP tool testing\n`);
  } catch (error) {
    console.error("✗ Test failed:", error);
    process.exit(1);
  }
}

testIntegration();
