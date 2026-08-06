/**
 * Test Data Loading Service
 * Demonstrates different ways to load and use release data
 *
 * Usage: node examples/test-data-loading.mjs
 */

import { ReleaseManager } from "../build/data/releaseManager.js";
import { MockDataSource } from "../build/services/mockDataSource.js";

console.log("=".repeat(60));
console.log("Commvault Release Data Loading - Test Suite");
console.log("=".repeat(60));

async function testBasicLoading() {
  console.log("\n1. BASIC LOADING");
  console.log("-".repeat(60));

  const manager = ReleaseManager.getInstance();
  await manager.initialize(["11.44", "11.46"]);

  console.log("✓ Initialized with versions:", manager.getAvailableVersions());
  console.log("✓ Available categories:", manager.getAvailableCategories());
}

async function testSingleRelease() {
  console.log("\n2. LOADING SINGLE RELEASE");
  console.log("-".repeat(60));

  const manager = ReleaseManager.getInstance();
  const release = await manager.getRelease("11.44");

  console.log(`✓ Version: ${release.version}`);
  console.log(`✓ Release Date: ${release.releaseDate}`);
  console.log(`✓ Categories:`);

  for (const [category, changes] of Object.entries(release.categories)) {
    console.log(`  - ${category}: ${changes.length} changes`);
  }
}

async function testComparison() {
  console.log("\n3. COMPARING TWO RELEASES");
  console.log("-".repeat(60));

  const manager = ReleaseManager.getInstance();

  const v1 = await manager.getRelease("11.44");
  const v2 = await manager.getRelease("11.46");

  const categories = manager.getAvailableCategories();

  console.log(`\nComparing ${v1.version} (${v1.releaseDate}) vs ${v2.version} (${v2.releaseDate})`);
  console.log("-".repeat(60));

  for (const category of categories) {
    const changes1 = v1.categories[category] || [];
    const changes2 = v2.categories[category] || [];
    const ids1 = new Set(changes1.map((c) => c.id));
    const newInV2 = changes2.filter((c) => !ids1.has(c.id));

    if (changes1.length > 0 || changes2.length > 0) {
      console.log(
        `\n${category}:`
      );
      console.log(
        `  ${v1.version}: ${changes1.length} | ${v2.version}: ${changes2.length} | New: ${newInV2.length}`
      );

      if (newInV2.length > 0) {
        newInV2.slice(0, 2).forEach((change) => {
          console.log(`    + ${change.title}`);
        });
        if (newInV2.length > 2) {
          console.log(`    + ... and ${newInV2.length - 2} more`);
        }
      }
    }
  }
}

async function testCaching() {
  console.log("\n4. CACHING BEHAVIOR");
  console.log("-".repeat(60));

  const manager = ReleaseManager.getInstance();

  console.log("First access (loads from source):");
  const start1 = performance.now();
  await manager.getRelease("11.44");
  const time1 = performance.now() - start1;
  console.log(`  Time: ${time1.toFixed(2)}ms`);

  console.log("\nSecond access (from cache):");
  const start2 = performance.now();
  await manager.getRelease("11.44");
  const time2 = performance.now() - start2;
  console.log(`  Time: ${time2.toFixed(2)}ms`);

  console.log(
    `✓ Cache is ${time1 > time2 ? "working" : "not working"} (${(time1 / time2).toFixed(1)}x faster)`
  );
}

async function testDiagnostics() {
  console.log("\n5. DIAGNOSTICS");
  console.log("-".repeat(60));

  const manager = ReleaseManager.getInstance();
  const diag = manager.getDiagnostics();

  console.log(`Initialized: ${diag.initialized}`);
  console.log(`Loaded versions: ${diag.loadedVersions.join(", ")}`);
  console.log(`Cache size: ${diag.cacheSize} entries`);
  console.log(`Data sources: ${diag.dataSources.join(", ")}`);
  console.log(`\nCache statistics:`);
  console.log(`  Size: ${diag.cacheStats.size} keys`);
  console.log(`  Keys: ${diag.cacheStats.keys.join(", ")}`);
}

async function testCategoryQuery() {
  console.log("\n6. QUERYING BY CATEGORY");
  console.log("-".repeat(60));

  const manager = ReleaseManager.getInstance();
  const categories = manager.getAvailableCategories();

  for (const category of categories) {
    const releases = manager.getReleases();
    let totalChanges = 0;

    for (const release of Object.values(releases)) {
      totalChanges += (release.categories[category] || []).length;
    }

    console.log(`\n${category}:`);
    for (const release of Object.values(releases)) {
      const changes = release.categories[category] || [];
      console.log(`  ${release.version}: ${changes.length} changes`);

      if (changes.length > 0) {
        changes.slice(0, 1).forEach((change) => {
          console.log(`    • ${change.title}`);
        });
      }
    }
  }
}

async function testInvalidation() {
  console.log("\n7. CACHE INVALIDATION");
  console.log("-".repeat(60));

  const manager = ReleaseManager.getInstance();

  console.log("Before invalidation:");
  console.log(`  Loaded versions: ${manager.getAvailableVersions().join(", ")}`);

  manager.invalidate("11.44");
  console.log("\nAfter invalidating 11.44:");
  console.log(`  Loaded versions: ${manager.getAvailableVersions().join(", ")}`);

  console.log("\nReloading...");
  await manager.getRelease("11.44");
  console.log(
    `  Loaded versions: ${manager.getAvailableVersions().join(", ")}`
  );
}

async function testDataSourceFallback() {
  console.log("\n8. DATA SOURCE FALLBACK");
  console.log("-".repeat(60));

  const mockSource = new MockDataSource();
  console.log(`✓ Mock source name: ${mockSource.name}`);
  console.log(`✓ Mock source description: ${mockSource.description}`);
  console.log(`✓ Available versions:`, mockSource.getAvailableVersions());

  const data = await mockSource.fetch("11.44");
  console.log(`\n✓ Fetched version ${data.version}`);
  console.log(`✓ Categories: ${Object.keys(data.categories).join(", ")}`);
  console.log(`✓ Total changes:`, Object.values(data.categories).reduce((a, b) => a + b.length, 0));
}

// Main test runner
async function runTests() {
  try {
    await testBasicLoading();
    await testSingleRelease();
    await testComparison();
    await testCaching();
    await testDiagnostics();
    await testCategoryQuery();
    await testInvalidation();
    await testDataSourceFallback();

    console.log("\n" + "=".repeat(60));
    console.log("✓ All tests completed successfully!");
    console.log("=".repeat(60));
  } catch (error) {
    console.error("\n✗ Test failed:");
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

runTests();
