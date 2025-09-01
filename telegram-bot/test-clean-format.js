#!/usr/bin/env node

/**
 * Demo clean format notification like the image
 */

require("dotenv").config();
const TelegramTestNotifier = require("./TelegramTestNotifier");

async function testCleanFormat() {
  console.log("🟢 Testing clean format notification like the image...");

  const notifier = new TelegramTestNotifier();

  if (!notifier.enabled) {
    console.log("🔕 Telegram bot not enabled");
    return;
  }

  // Sample test data like in the image
  const testData = {
    total: 179,
    passed: 66,
    failed: 49,
    skipped: 61,
    duration: 650494,
    hasErrors: true,
  };

  // Sample coverage data
  const coverageData = {
    statements: { pct: 82.27, covered: 376, total: 457 },
    branches: { pct: 72.52, covered: 161, total: 222 },
    functions: { pct: 78.84, covered: 41, total: 52 },
    lines: { pct: 82.3, covered: 372, total: 452 },
  };

  const options = {
    projectName: "Script Labs App",
    branch: "main",
    author: "Admin Script Labs",
    timestamp: new Date(),
  };

  try {
    // Send clean format notification
    await notifier.sendNotification(testData, coverageData, options);
    console.log("✅ Clean format notification sent!");

    // Also send detailed format for comparison
    console.log("\n🔍 Sending detailed format for comparison...");
    await notifier.sendDetailedNotification(testData, coverageData, options);
    console.log("✅ Detailed format notification sent!");
  } catch (error) {
    console.error("🔕 Error:", error.message);
  }
}

testCleanFormat();
