#!/usr/bin/env node

/**
 * Test CI/CD Telegram Integration Locally
 * This script simulates GitHub Actions environment for testing
 */

require("dotenv").config();

// Simulate GitHub Actions environment variables
process.env.GITHUB_REPOSITORY = "Hendrich/script-labs";
process.env.GITHUB_RUN_ID = "123456789";
process.env.GITHUB_SERVER_URL = "https://github.com";
process.env.GITHUB_ACTOR = "hendrich";
process.env.GITHUB_REF_NAME = "main";
process.env.GITHUB_SHA = "abc1234567890def1234567890abc1234567890ab";
process.env.GITHUB_WORKFLOW = "CI-CD Pipeline";

console.log("ðŸ§ª Testing CI/CD Telegram Integration");
console.log("ðŸ“ Simulating GitHub Actions environment...");
console.log(`Repository: ${process.env.GITHUB_REPOSITORY}`);
console.log(`Run ID: ${process.env.GITHUB_RUN_ID}`);
console.log(`Actor: ${process.env.GITHUB_ACTOR}`);
console.log(`Branch: ${process.env.GITHUB_REF_NAME}`);
console.log(`Commit: ${process.env.GITHUB_SHA?.substring(0, 7)}`);

// Import and run the notification script
const sendNotification = require("./send-notification");

async function testCiIntegration() {
  try {
    console.log("\nðŸ“¤ Sending CI/CD test notification...");
    await sendNotification();
    console.log("âœ… CI/CD integration test completed successfully!");
  } catch (error) {
    console.error("âŒ CI/CD integration test failed:", error.message);
    process.exit(1);
  }
}

testCiIntegration();


