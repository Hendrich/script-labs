#!/usr/bin/env node

const { spawn } = require("child_process");
const TelegramTestNotifier = require("./TelegramTestNotifier");

console.log(" Simple Jest Test Runner...");

// Run Jest with just JSON output, no coverage
const jest = spawn("npx", ["jest", "--json", "--passWithNoTests"], {
  stdio: ["pipe", "pipe", "pipe"],
  shell: true,
});

let jsonOutput = "";

jest.stdout.on("data", (data) => {
  jsonOutput += data.toString();
});

jest.stderr.on("data", (data) => {
  console.error("Jest stderr:", data.toString());
});

jest.on("close", async (code) => {
  console.log(`Jest exited with code: ${code}`);

  try {
    // Extract JSON from output
    console.log("Raw output length:", jsonOutput.length);
    console.log("First 200 chars:", jsonOutput.substring(0, 200));
    console.log(
      "Last 200 chars:",
      jsonOutput.substring(jsonOutput.length - 200)
    );

    // Find the JSON part
    const lines = jsonOutput.split("\n");
    let jsonLine = "";

    for (const line of lines) {
      if (line.trim().startsWith("{") && line.includes("numFailedTests")) {
        jsonLine = line.trim();
        break;
      }
    }

    if (!jsonLine) {
      console.error("âŒ No JSON line found");
      return;
    }

    console.log("Found JSON line:", jsonLine.substring(0, 100) + "...");

    const testResults = JSON.parse(jsonLine);

    console.log("… Test results:");
    console.log(
      "- Total tests:",
      testResults.numPassedTests + testResults.numFailedTests
    );
    console.log("- Passed tests:", testResults.numPassedTests);
    console.log("- Failed tests:", testResults.numFailedTests);

    // Transform to expected format
    const transformedResults = {
      numTotalTests: testResults.numPassedTests + testResults.numFailedTests,
      numPassedTests: testResults.numPassedTests,
      numFailedTests: testResults.numFailedTests,
      numPendingTests: testResults.numPendingTests || 0,
      testExecError: testResults.numFailedTests > 0,
    };

    console.log(" Sending to Telegram:", transformedResults);

    const notifier = new TelegramTestNotifier();
    await notifier.sendTestResults(transformedResults);
  } catch (error) {
    console.error("🛑 Error:", error.message);
    console.log("Full output:", jsonOutput);
  }
});
