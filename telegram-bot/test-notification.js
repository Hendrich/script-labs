#!/usr/bin/env node

/**
 * Test Telegram Bot Connection and Send Sample Notification
 * This script tests the bot connection and sends a sample test notification
 */

require("dotenv").config();
const TelegramTestNotifier = require("./TelegramTestNotifier");

async function testTelegramNotification() {
  console.log("ðŸ§ª Testing Telegram bot connection and notification...");

  const notifier = new TelegramTestNotifier();

  if (!notifier.enabled) {
    console.log("âŒ Telegram bot not enabled - missing credentials");
    console.log(
      "ðŸ’¡ Make sure TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID are set in .env file"
    );
    return;
  }

  try {
    // Test 1: Bot connection
    console.log("ðŸ”— Testing bot connection...");
    const connectionResult = await notifier.testConnection();

    if (!connectionResult) {
      console.log("âŒ Bot connection failed");
      return;
    }

    // Test 2: Sample test notification
    console.log("🟢 Sending sample test notification...");

    const sampleTestData = {
      total: 337,
      passed: 335,
      failed: 2,
      skipped: 0,
      duration: 4521,
      hasErrors: true,
    };

    const sampleCoverageData = {
      statements: { pct: 82.27, covered: 376, total: 457 },
      branches: { pct: 72.52, covered: 161, total: 222 },
      functions: { pct: 78.84, covered: 41, total: 52 },
      lines: { pct: 82.3, covered: 372, total: 452 },
    };

    const options = {
      projectName: "Script Labs App",
      branch: process.env.GIT_BRANCH || "main",
      author: process.env.GIT_AUTHOR || "Test User",
      timestamp: new Date(),
    };

    // Send clean format notification
    await notifier.sendNotification(
      sampleTestData,
      sampleCoverageData,
      options
    );
    console.log("✅ Sample test notification sent successfully!");

    // Test 3: Send detailed format for comparison
    console.log("🔍 Sending detailed format notification...");
    await notifier.sendDetailedNotification(
      sampleTestData,
      sampleCoverageData,
      options
    );
    console.log("✅ Detailed notification sent successfully!");

    console.log(
      "\n🔔 All tests passed! Check your Telegram chat for the notifications."
    );
  } catch (error) {
    console.error("🔕 Error during testing:", error.message);

    if (error.response?.body?.error_code === 401) {
      console.log("🔕 Solution: Check your TELEGRAM_BOT_TOKEN in .env file");
    } else if (error.response?.body?.error_code === 400) {
      console.log("🔕 Solution: Check your TELEGRAM_CHAT_ID in .env file");
      console.log("   Make sure you sent /start to the bot first");
    } else {
      console.log("🔕 Check your internet connection and bot credentials");
    }

    process.exit(1);
  }
}

// Only run if called directly
if (require.main === module) {
  testTelegramNotification();
}

module.exports = testTelegramNotification;
