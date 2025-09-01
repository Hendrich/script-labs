#!/usr/bin/env node

/**
 * Comprehensive Telegram Bot Diagnostic Tool
 * Checks all components and configurations
 */

require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const fs = require("fs");
const path = require("path");

console.log("ðŸ” TELEGRAM BOT DIAGNOSTIC TOOL");
console.log("================================\n");

async function runDiagnostics() {
  // 1. Environment Variables Check
  console.log("1ï¸âƒ£ ENVIRONMENT VARIABLES CHECK:");
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  console.log(
    `   â”œâ”€ TELEGRAM_BOT_TOKEN: ${botToken ? "… Found" : "âŒ Missing"}`
  );
  console.log(
    `   â”œâ”€ TELEGRAM_CHAT_ID: ${chatId ? "… Found" : "âŒ Missing"}`
  );
  console.log(
    `   â”œâ”€ GIT_BRANCH: ${
      process.env.GIT_BRANCH || "Not set (default: main)"
    }`
  );
  console.log(
    `   â””â”€ GIT_AUTHOR: ${
      process.env.GIT_AUTHOR || "Not set (default: Automated Testing)"
    }\n`
  );

  if (!botToken || !chatId) {
    console.error("âŒ CRITICAL: Missing Telegram credentials in .env file");
    console.log("\nðŸ’¡ SOLUTION:");
    console.log("   1. Create a bot with @BotFather in Telegram");
    console.log("   2. Get your chat ID by sending a message to the bot");
    console.log("   3. Add credentials to .env file:");
    console.log("      TELEGRAM_BOT_TOKEN=your_bot_token");
    console.log("      TELEGRAM_CHAT_ID=your_chat_id");
    process.exit(1);
  }

  // 2. File System Check
  console.log("2ï¸âƒ£ FILE SYSTEM CHECK:");
  const coverageDir = path.join(process.cwd(), "coverage");
  const coverageFile = path.join(coverageDir, "coverage-summary.json");
  const testDir = path.join(process.cwd(), "tests");

  console.log(
    `   â”œâ”€ Coverage directory: ${
      fs.existsSync(coverageDir) ? "… Found" : "âŒ Missing"
    }`
  );
  console.log(
    `   â”œâ”€ Coverage summary: ${
      fs.existsSync(coverageFile) ? "… Found" : "âŒ Missing"
    }`
  );
  console.log(
    `   â””â”€ Tests directory: ${
      fs.existsSync(testDir) ? "… Found" : "âŒ Missing"
    }`
  );

  if (!fs.existsSync(coverageFile)) {
    console.log("\nðŸ’¡ SOLUTION: Run tests with coverage first:");
    console.log("   npm run test:coverage");
  }
  console.log("");

  // 3. Test Count Analysis
  console.log("3ï¸âƒ£ TEST COUNT ANALYSIS:");
  try {
    const getRealTestCount = require("./count-tests");
    const testCounts = getRealTestCount();
    console.log(`   â”œâ”€ Test files found: ${testCounts.testFiles}`);
    console.log(`   â””â”€ Estimated tests: ${testCounts.estimatedTests}\n`);
  } catch (error) {
    console.log(`   â””â”€ Test analysis: âŒ Error - ${error.message}\n`);
  }

  // 4. Bot Connection Test
  console.log("4ï¸âƒ£ BOT CONNECTION TEST:");

  try {
    const bot = new TelegramBot(botToken, { polling: false });

    // Test bot info
    const botInfo = await bot.getMe();
    console.log(`   â”œâ”€ Bot username: … @${botInfo.username}`);
    console.log(`   â”œâ”€ Bot name: ${botInfo.first_name}`);

    // Test message send
    const testMessage = `ðŸ”§ Diagnostic Test\n\n… Bot connection successful!\nâ° ${new Date().toLocaleString()}`;

    await bot.sendMessage(chatId, testMessage);
    console.log(`   â””â”€ Test message: … Sent successfully\n`);

    // 5. Full Notification Test
    console.log("5ï¸âƒ£ FULL NOTIFICATION TEST:");

    const TelegramTestNotifier = require("./TelegramTestNotifier");
    const notifier = new TelegramTestNotifier();

    const testData = {
      total: 337,
      passed: 335,
      failed: 2,
      skipped: 0,
      duration: 4521,
      hasErrors: true,
    };

    const coverageData = fs.existsSync(coverageFile)
      ? JSON.parse(fs.readFileSync(coverageFile, "utf8")).total
      : {
          statements: { pct: 82.27 },
          branches: { pct: 72.52 },
          functions: { pct: 78.84 },
          lines: { pct: 82.3 },
        };

    const options = {
      projectName: "Script Labs App (Diagnostic)",
      branch: process.env.GIT_BRANCH || "main",
      author: process.env.GIT_AUTHOR || "Diagnostic Test",
      timestamp: new Date(),
    };

    // Test clean format
    await notifier.sendNotification(testData, coverageData, options);
    console.log("   â”œâ”€ Clean format: … Sent successfully");

    // Test detailed format
    await notifier.sendDetailedNotification(testData, coverageData, options);
    console.log("   â””â”€ Detailed format: … Sent successfully\n");

    console.log("🟢 ALL DIAGNOSTICS PASSED!");
    console.log("… Telegram bot is configured correctly and ready to use.");
    console.log("\n🟢 Check your Telegram chat for test messages.");
    console.log("\n🟡 Available commands:");
    console.log("   npm run test:coverage       # Run tests with notification");
    console.log("   npm run telegram:test       # Test bot connection");
    console.log("   npm run telegram:clean      # Test clean format");
    console.log("   npm run telegram:send       # Send manual notification");
  } catch (error) {
    console.log(`   └── Connection test: 🚫 Failed\n`);
    console.error("🚫 ERROR:", error.message);

    if (error.response?.body?.error_code === 401) {
      console.log("\n🛑 SOLUTION: Invalid bot token");
      console.log("   1. Check TELEGRAM_BOT_TOKEN in .env file");
      console.log("   2. Create a new bot with @BotFather if needed");
    } else if (error.response?.body?.error_code === 400) {
      console.log("\n🛑 SOLUTION: Invalid chat ID");
      console.log("   1. Check TELEGRAM_CHAT_ID in .env file");
      console.log("   2. Make sure you sent /start to the bot");
      console.log("   3. For group chats, add the bot to the group first");
    } else {
      console.log("\nðŸ’¡ SOLUTION: Network or configuration issue");
      console.log("   1. Check your internet connection");
      console.log("   2. Verify bot credentials are correct");
    }
  }
}

runDiagnostics();
