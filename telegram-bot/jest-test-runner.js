#!/usr/bin/env node

/**
 * Jest Test Runner with Telegram Notification
 * Runs Jest tests and captures results for Telegram notification
 */

const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const TelegramTestNotifier = require("./TelegramTestNotifier");

async function runTestsWithNotification() {
  console.log("ðŸš€ Running Jest tests with Telegram notification...");

  const notifier = new TelegramTestNotifier();
  console.log(
    `🟢Telegram notifications: ${notifier.enabled ? "enabled" : "disabled"}`
  );

  let testData = {
    numTotalTests: 0,
    numPassedTests: 0,
    numFailedTests: 0,
    numPendingTests: 0,
    testExecError: false,
  };

  let coverageData = null;

  try {
    // Run Jest with JSON output
    console.log("âš¡ Starting Jest process...");
    const jestProcess = spawn(
      "npx",
      ["jest", "--coverage", "--ci", "--passWithNoTests", "--json"],
      {
        stdio: ["inherit", "pipe", "pipe"],
        shell: true,
      }
    );

    let stdout = "";
    let stderr = "";

    jestProcess.stdout.on("data", (data) => {
      stdout += data.toString();
      // Show some progress
      process.stdout.write(".");
    });

    jestProcess.stderr.on("data", (data) => {
      stderr += data.toString();
      // Also output to console for visibility
      process.stderr.write(data);
    });

    jestProcess.on("close", async (code) => {
      console.log(`\n🟢 Jest process completed with exit code: ${code}`);
      console.log(`🟢 stdout length: ${stdout.length} chars`);
      console.log(`🟢 stderr length: ${stderr.length} chars`);

      try {
        // Parse Jest JSON output
        if (stdout.trim()) {
          console.log("🟢 Parsing Jest JSON output...");
          const jestResults = JSON.parse(stdout);
          testData = {
            numTotalTests: jestResults.numTotalTests || 0,
            numPassedTests: jestResults.numPassedTests || 0,
            numFailedTests: jestResults.numFailedTests || 0,
            numPendingTests: jestResults.numPendingTests || 0,
            testExecError: code !== 0,
          };
          console.log(
            `🟢 Test Results: ${testData.numTotalTests} total, ${testData.numPassedTests} passed, ${testData.numFailedTests} failed`
          );
        } else {
          console.log("🟡 No JSON output from Jest");
        }

        // Read coverage data
        const coveragePath = path.join(
          process.cwd(),
          "coverage",
          "coverage-summary.json"
        );
        if (fs.existsSync(coveragePath)) {
          const rawCoverage = fs.readFileSync(coveragePath, "utf8");
          const coverage = JSON.parse(rawCoverage);
          coverageData = coverage.total;
          console.log("🟢 Coverage data loaded successfully");
        }

        // Send notification
        if (notifier.enabled) {
          const options = {
            projectName: "Script Labs App",
            branch:
              process.env.GIT_BRANCH || process.env.GITHUB_REF_NAME || "main",
            author:
              process.env.GIT_AUTHOR || process.env.GITHUB_ACTOR || "Automated",
            timestamp: new Date(),
            githubContext: {
              repository: process.env.GITHUB_REPOSITORY,
              runId: process.env.GITHUB_RUN_ID,
              serverUrl: process.env.GITHUB_SERVER_URL,
              commit: process.env.GIT_COMMIT || process.env.GITHUB_SHA,
              workflow: process.env.GITHUB_WORKFLOW || "CI/CD",
            },
          };

          await notifier.sendNotification(testData, coverageData, options);
          console.log("… Telegram notification sent successfully!");
        } else {
          console.log("Telegram notifications disabled (missing credentials)");
        }

        // Exit with same code as Jest
        process.exit(code);
      } catch (error) {
        console.error("🛑 Failed to process test results:", error.message);

        // Still try to send notification with basic info
        if (notifier.enabled) {
          try {
            const options = {
              projectName: "Script Labs App",
              branch: process.env.GIT_BRANCH || "main",
              author: process.env.GIT_AUTHOR || "Automated",
              timestamp: new Date(),
              error: error.message,
            };

            await notifier.sendNotification(testData, coverageData, options);
          } catch (notifError) {
            console.error(
              "🛑 Failed to send error notification:",
              notifError.message
            );
          }
        }

        process.exit(code || 1);
      }
    });
  } catch (error) {
    console.error("âŒ Failed to run tests:", error.message);
    process.exit(1);
  }
}

// Only run if called directly
if (require.main === module) {
  runTestsWithNotification();
}

module.exports = runTestsWithNotification;
