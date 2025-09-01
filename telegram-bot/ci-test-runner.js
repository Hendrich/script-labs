// #!/usr/bin/env node

/**
 * CI/CD Test Runner for GitHub Actions
 * This script runs Jest tests and sends results to Telegram
 */

const { spawn } = require("child_process");
const TelegramTestNotifier = require("./TelegramTestNotifier");

async function runCITests() {
  console.log(" CI/CD Test Runner Starting...");

  // Check environment
  console.log(" Environment Check:");
  console.log(
    "- TELEGRAM_BOT_TOKEN:",
    process.env.TELEGRAM_BOT_TOKEN ? " Available" : "âŒ Missing"
  );
  console.log(
    "- TELEGRAM_CHAT_ID:",
    process.env.TELEGRAM_CHAT_ID ? " Available" : "âŒ Missing"
  );
  console.log("- Node version:", process.version);

  const notifier = new TelegramTestNotifier();

  try {
    // Run Jest with coverage and JSON output
    console.log(" Running Jest tests...");

    const jestResult = await new Promise((resolve, reject) => {
      const jest = spawn(
        "npx",
        ["jest", "--coverage", "--ci", "--passWithNoTests", "--json"],
        {
          stdio: ["inherit", "pipe", "pipe"],
          shell: true,
        }
      );

      let jsonOutput = "";
      let errorOutput = "";

      jest.stdout.on("data", (data) => {
        jsonOutput += data.toString();
      });

      jest.stderr.on("data", (data) => {
        errorOutput += data.toString();
        // Also show stderr for visibility
        process.stderr.write(data);
      });

      jest.on("close", (code) => {
        console.log(`\n Jest finished with exit code: ${code}`);
        resolve({ code, jsonOutput, errorOutput });
      });

      jest.on("error", (error) => {
        console.error("âŒ Jest process error:", error);
        reject(error);
      });
    });

    // Parse Jest JSON output to get real test results
    let testData = {
      numTotalTests: 0,
      numPassedTests: 0,
      numFailedTests: 0,
      numPendingTests: 0,
      testExecError: jestResult.code !== 0,
    };

    try {
      if (jestResult.jsonOutput.trim()) {
        console.log(" Parsing Jest JSON output...");
        console.log(" Output length:", jestResult.jsonOutput.length);

        // Try to parse the entire output as JSON first
        try {
          const jestResults = JSON.parse(jestResult.jsonOutput);
          testData = {
            numTotalTests: jestResults.numTotalTests || 0,
            numPassedTests: jestResults.numPassedTests || 0,
            numFailedTests: jestResults.numFailedTests || 0,
            numPendingTests: jestResults.numPendingTests || 0,
            testExecError: jestResult.code !== 0,
          };

          console.log(
            ` Real Test Results: ${testData.numTotalTests} total, ${testData.numPassedTests} passed, ${testData.numFailedTests} failed`
          );
        } catch (directParseError) {
          console.log("âš ï¸ Direct JSON parse failed, trying line-by-line...");

          // Find the JSON part in the output
          const lines = jestResult.jsonOutput.split("\n");
          let jsonLine = "";

          for (const line of lines) {
            if (line.trim().startsWith("{") && line.includes("numTotalTests")) {
              jsonLine = line.trim();
              break;
            }
          }

          if (jsonLine) {
            const jestResults = JSON.parse(jsonLine);
            testData = {
              numTotalTests: jestResults.numTotalTests || 0,
              numPassedTests: jestResults.numPassedTests || 0,
              numFailedTests: jestResults.numFailedTests || 0,
              numPendingTests: jestResults.numPendingTests || 0,
              testExecError: jestResult.code !== 0,
            };

            console.log(
              ` Real Test Results: ${testData.numTotalTests} total, ${testData.numPassedTests} passed, ${testData.numFailedTests} failed`
            );
          } else {
            console.log("âš ï¸ No JSON line found in Jest output");
            console.log(
              " First 300 chars of output:",
              jestResult.jsonOutput.substring(0, 300)
            );
          }
        }
      } else {
        console.log("âš ï¸ No JSON output from Jest");
      }
    } catch (parseError) {
      console.error("âŒ Failed to parse Jest JSON:", parseError.message);
      console.log(
        " Raw output (first 500 chars):",
        jestResult.jsonOutput.substring(0, 500)
      );
    }

    // Try to read coverage data
    let coverageData = null;
    try {
      const fs = require("fs");
      const path = require("path");
      const coveragePath = path.join(
        process.cwd(),
        "coverage",
        "coverage-summary.json"
      );
      if (fs.existsSync(coveragePath)) {
        const rawCoverage = fs.readFileSync(coveragePath, "utf8");
        const coverage = JSON.parse(rawCoverage);
        coverageData = coverage.total;
        console.log(" Coverage data loaded successfully");
      } else {
        console.log("âš ï¸ Coverage summary not found at:", coveragePath);
      }
    } catch (error) {
      console.log("âš ï¸ Failed to load coverage data:", error.message);
    }

    // Prepare options with GitHub context
    const options = {
      projectName: "Script Labs",
      branch: process.env.GIT_BRANCH || process.env.GITHUB_REF_NAME || "main",
      author: process.env.GIT_AUTHOR || process.env.GITHUB_ACTOR || "Automated",
      timestamp: new Date(),
      githubContext: {
        repository: process.env.GITHUB_REPOSITORY,
        runId: process.env.GITHUB_RUN_ID,
        serverUrl: process.env.GITHUB_SERVER_URL,
        commit: process.env.GIT_COMMIT || process.env.GITHUB_SHA,
        workflow: process.env.GITHUB_WORKFLOW || "CI/CD",
      },
    };

    console.log("\n Sending results to Telegram...");
    console.log("Test data:", testData);
    console.log("Coverage available:", !!coverageData);
    console.log("GitHub context:", options.githubContext);

    if (notifier.enabled) {
      await notifier.sendNotification(testData, coverageData, options);
      console.log(" Telegram notification sent!");
    } else {
      console.log("âš ï¸ Telegram disabled - notification skipped");
    }

    // Exit with Jest's exit code
    process.exit(jestResult.code);
  } catch (error) {
    console.error("âŒ CI Test Runner failed:", error);

    // Send failure notification
    const failureData = {
      numTotalTests: 0,
      numPassedTests: 0,
      numFailedTests: 0,
      numPendingTests: 0,
      testExecError: true,
    };

    const failureOptions = {
      projectName: "Script Labs",
      branch: process.env.GIT_BRANCH || process.env.GITHUB_REF_NAME || "main",
      author: process.env.GIT_AUTHOR || process.env.GITHUB_ACTOR || "Automated",
      timestamp: new Date(),
      error: error.message,
      githubContext: {
        repository: process.env.GITHUB_REPOSITORY,
        runId: process.env.GITHUB_RUN_ID,
        serverUrl: process.env.GITHUB_SERVER_URL,
        commit: process.env.GIT_COMMIT || process.env.GITHUB_SHA,
        workflow: process.env.GITHUB_WORKFLOW || "CI/CD",
      },
    };

    if (notifier.enabled) {
      try {
        await notifier.sendNotification(failureData, null, failureOptions);
      } catch (telegramError) {
        console.error("âŒ Failed to send failure notification:", telegramError);
      }
    }

    process.exit(1);
  }
}

runCITests();
