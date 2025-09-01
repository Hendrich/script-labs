const TelegramBot = require("node-telegram-bot-api");
const fs = require("fs");
const path = require("path");

class TelegramTestNotifier {
  constructor() {
    this.token = process.env.TELEGRAM_BOT_TOKEN;
    this.chatId = process.env.TELEGRAM_CHAT_ID;

    if (!this.token || !this.chatId) {
      console.warn(
        "Telegram bot credentials not found. Notifications disabled."
      );
      this.enabled = false;
      return;
    }

    this.bot = new TelegramBot(this.token, { polling: false });
    this.enabled = true;

    console.log("🟢 Telegram Test Notifier initialized");
  }

  /**
   * Parse Jest coverage report from JSON file or coverage summary
   * @param {Object|string} coverageData - Coverage data object or file path
   * @returns {Object} Parsed coverage data
   */
  parseCoverageData(coverageData) {
    let coverage;

    if (typeof coverageData === "string") {
      // Read from file path
      try {
        const filePath = path.resolve(coverageData);
        const rawData = fs.readFileSync(filePath, "utf8");
        coverage = JSON.parse(rawData);
      } catch (error) {
        console.error("Failed to read coverage file:", error.message);
        return null;
      }
    } else {
      // Direct coverage object
      coverage = coverageData;
    }

    // Extract summary data
    const summary = coverage.total || coverage;

    return {
      statements: {
        covered: summary.statements?.covered || 0,
        total: summary.statements?.total || 0,
        pct: summary.statements?.pct || 0,
      },
      branches: {
        covered: summary.branches?.covered || 0,
        total: summary.branches?.total || 0,
        pct: summary.branches?.pct || 0,
      },
      functions: {
        covered: summary.functions?.covered || 0,
        total: summary.functions?.total || 0,
        pct: summary.functions?.pct || 0,
      },
      lines: {
        covered: summary.lines?.covered || 0,
        total: summary.lines?.total || 0,
        pct: summary.lines?.pct || 0,
      },
    };
  }

  /**
   * Parse Jest test results
   * @param {Object} testResults - Jest test results object
   * @returns {Object} Parsed test data
   */
  parseTestResults(testResults) {
    // Handle different data formats
    let numTotalTests,
      numPassedTests,
      numFailedTests,
      numPendingTests,
      testExecError;

    if (testResults.numTotalTests !== undefined) {
      // Jest results format
      numTotalTests = testResults.numTotalTests;
      numPassedTests = testResults.numPassedTests;
      numFailedTests = testResults.numFailedTests;
      numPendingTests = testResults.numPendingTests;
      testExecError = testResults.testExecError;
    } else {
      // Manual format from send-notification.js
      numTotalTests = testResults.numTotalTests || testResults.total;
      numPassedTests = testResults.numPassedTests || testResults.passed;
      numFailedTests = testResults.numFailedTests || testResults.failed;
      numPendingTests = testResults.numPendingTests || testResults.skipped;
      testExecError =
        testResults.testExecError || testResults.hasErrors || false;
    }

    const duration =
      testResults.testResults?.reduce((total, result) => {
        return total + (result.perfStats?.end - result.perfStats?.start || 0);
      }, 0) ||
      testResults.duration ||
      0;

    return {
      total: numTotalTests,
      passed: numPassedTests,
      failed: numFailedTests,
      skipped: numPendingTests,
      duration: Math.round(duration),
      hasErrors: testExecError || numFailedTests > 0,
    };
  }

  /**
   * Get status emoji based on test results
   * @param {Object} testData - Parsed test data
   * @param {Object} coverageData - Parsed coverage data
   * @returns {string} Status emoji
   */
  getStatusEmoji(testData, coverageData) {
    if (testData.hasErrors || testData.failed > 0) {
      return "🚫"; // Failed
    }

    if (coverageData) {
      const avgCoverage =
        (coverageData.statements.pct +
          coverageData.branches.pct +
          coverageData.functions.pct +
          coverageData.lines.pct) /
        4;

      if (avgCoverage >= 90) return "🟢"; // Excellent
      if (avgCoverage >= 80) return "🟡"; // Good
      if (avgCoverage >= 70) return "🟠"; // Fair
      return "🔴"; // Poor
    }

    return "🟢"; // Success without coverage
  }

  /**
   * Format message like the example image (clean format)
   * @param {Object} testData - Parsed test data
   * @param {Object} coverageData - Parsed coverage data
   * @param {Object} options - Additional options
   * @returns {string} Formatted message like the image
   */
  formatCleanMessage(testData, coverageData, options = {}) {
    const {
      projectName = "Script Labs",
      branch = "main",
      author = "Automated Testing",
      timestamp = new Date(),
    } = options;

    // Validate and sanitize test data
    const safeTestData = {
      total: testData.total || testData.numTotalTests || 0,
      passed: testData.passed || testData.numPassedTests || 0,
      failed: testData.failed || testData.numFailedTests || 0,
      skipped: testData.skipped || testData.numPendingTests || 0,
      duration: testData.duration || 0,
      hasErrors:
        testData.hasErrors || testData.testExecError || testData.failed > 0,
    };

    // Get time in format like "6:26AM"
    const timeString = timestamp.toLocaleTimeString("en-US", {
      hour12: true,
      hour: "numeric",
      minute: "2-digit",
    });

    // Calculate pass percentage
    const passPercentage =
      safeTestData.total > 0
        ? ((safeTestData.passed / safeTestData.total) * 100).toFixed(2)
        : "0.00";

    // Determine status emoji and project status
    let statusIcon = "🟢";
    let statusText = "SUCCESS";

    if (safeTestData.failed > 0 || safeTestData.hasErrors) {
      statusIcon = "🚫";
      statusText = "FAILED";
    } else if (safeTestData.total === 0) {
      statusIcon = "🟡";
      statusText = "NO TESTS";
    }

    // Build message in clean format like the image
    let message = `${statusIcon} **${projectName}** | ${timeString}\n\n`;

    // Project identifier line
    message += `**${projectName.replace(/\s+/g, "")}**\n`;
    message += `${author} | Test Coverage Report\n\n`;

    // Test metrics (simple bullet format like image)
    message += `- Tests = ${safeTestData.total}\n`;
    message += `- Passes = ${safeTestData.passed}\n`;
    message += `- Skip = ${safeTestData.skipped}\n`;
    message += `- Failures = ${safeTestData.failed}\n`;
    message += `- Duration = ${safeTestData.duration}ms\n`;
    message += `- Passes (%) = ${passPercentage}\n\n`;

    // Coverage summary (if available)
    if (coverageData) {
      message += `🟢 **Coverage Summary:**\n`;
      message += `- Statements = ${coverageData.statements.pct.toFixed(2)}%\n`;
      message += `- Branches = ${coverageData.branches.pct.toFixed(2)}%\n`;
      message += `- Functions = ${coverageData.functions.pct.toFixed(2)}%\n`;
      message += `- Lines = ${coverageData.lines.pct.toFixed(2)}%\n\n`;
    }

    // Final status
    if (safeTestData.failed > 0) {
      message += `🛑 **Status:** ${statusText} - ${safeTestData.failed} test(s) failed`;
    } else {
      message += `🟢 **Status:** ${statusText} - All tests passed`;
    }

    // Add GitHub Actions context if available
    if (options.githubContext && options.githubContext.repository) {
      message += `\n\n🔗 **GitHub Action:** ${options.githubContext.serverUrl}/${options.githubContext.repository}/actions/runs/${options.githubContext.runId}`;
      if (options.githubContext.commit) {
        const shortCommit = options.githubContext.commit.substring(0, 7);
        message += `\n🔍 **Commit:** ${shortCommit} by ${options.author}`;
      }
      message += `\n🌿 **Branch:** ${options.branch}`;
    }

    return message;
  }

  /**
   * Format test coverage message like the example image
   * @param {Object} testData - Parsed test data
   * @param {Object} coverageData - Parsed coverage data
   * @param {Object} options - Additional options
   * @returns {string} Formatted message
   */
  formatMessage(testData, coverageData, options = {}) {
    const {
      projectName = "Script Labs App",
      branch = "main",
      author = "Automated",
      timestamp = new Date(),
    } = options;

    const statusEmoji = this.getStatusEmoji(testData, coverageData);
    const timeString = timestamp.toLocaleTimeString("en-US", {
      hour12: true,
      hour: "numeric",
      minute: "2-digit",
    });

    // Calculate pass percentage
    const passPercentage =
      testData.total > 0
        ? ((testData.passed / testData.total) * 100).toFixed(2)
        : "0.00";

    let message = `🟢 **${projectName}** | ${timeString}\n\n`;
    message += `**${statusEmoji} ${projectName.replace(/\s+/g, "-")}**\n`;
    message += `${author} | Test Coverage Report\n\n`;

    // Test Results
    message += `🟢 **Test Results:**\n`;
    message += `- Tests = ${testData.total}\n`;
    message += `- Passes = ${testData.passed}\n`;
    message += `- Skip = ${testData.skipped}\n`;
    message += `- Failures = ${testData.failed}\n`;
    message += `- Duration = ${testData.duration}ms\n`;
    message += `- Passes (%) = ${passPercentage}\n\n`;

    // Coverage Results (if available)
    if (coverageData) {
      message += `🟢 **Coverage Results:**\n`;
      message += `- Statements = ${coverageData.statements.pct.toFixed(2)}% (${
        coverageData.statements.covered
      }/${coverageData.statements.total})\n`;
      message += `- Branches = ${coverageData.branches.pct.toFixed(2)}% (${
        coverageData.branches.covered
      }/${coverageData.branches.total})\n`;
      message += `- Functions = ${coverageData.functions.pct.toFixed(2)}% (${
        coverageData.functions.covered
      }/${coverageData.functions.total})\n`;
      message += `- Lines = ${coverageData.lines.pct.toFixed(2)}% (${
        coverageData.lines.covered
      }/${coverageData.lines.total})\n\n`;
    }

    // Status Summary
    if (testData.failed > 0) {
      message += `🛑 **Status:** FAILED - ${testData.failed} test(s) failed\n`;
    } else if (testData.total === 0) {
      message += `🟡 **Status:** NO TESTS - No tests were found\n`;
    } else {
      message += `🟢 **Status:** SUCCESS - All tests passed\n`;
    }

    message += `🌿 **Branch:** ${branch}\n`;
    message += `🕒 **Time:** ${timestamp.toISOString()}\n`;

    // Add GitHub Actions context if available
    if (options.githubContext && options.githubContext.repository) {
      message += `🔗 **GitHub Action:** ${options.githubContext.serverUrl}/${options.githubContext.repository}/actions/runs/${options.githubContext.runId}\n`;
      if (options.githubContext.commit) {
        const shortCommit = options.githubContext.commit.substring(0, 7);
        message += `🔍 **Commit:** ${shortCommit} by ${author}\n`;
      }
    }

    return message;
  }

  /**
   * Send test notification to Telegram with clean format
   * @param {Object} testData - Parsed test data
   * @param {Object} coverageData - Parsed coverage data (optional)
   * @param {Object} options - Additional options
   */
  async sendNotification(testData, coverageData = null, options = {}) {
    if (!this.enabled) {
      console.log("🔕 Telegram notifications disabled");
      return;
    }

    try {
      // Use clean format like the image
      const message = this.formatCleanMessage(testData, coverageData, options);

      await this.bot.sendMessage(this.chatId, message, {
        parse_mode: "Markdown",
        disable_web_page_preview: true,
      });

      console.log("🔔 Test notification sent to Telegram");
    } catch (error) {
      console.error("Failed to send Telegram notification:", error.message);
    }
  }

  /**
   * Send notification with original detailed format
   * @param {Object} testData - Parsed test data
   * @param {Object} coverageData - Parsed coverage data (optional)
   * @param {Object} options - Additional options
   */
  async sendDetailedNotification(testData, coverageData = null, options = {}) {
    if (!this.enabled) {
      console.log("🔕 Telegram notifications disabled");
      return;
    }

    try {
      // Use detailed format
      const message = this.formatMessage(testData, coverageData, options);

      await this.bot.sendMessage(this.chatId, message, {
        parse_mode: "Markdown",
        disable_web_page_preview: true,
      });

      console.log("🔔 Detailed test notification sent to Telegram");
    } catch (error) {
      console.error("Failed to send Telegram notification:", error.message);
    }
  }

  /**
   * Send notification from Jest coverage summary file
   * @param {string} coverageFilePath - Path to coverage-summary.json
   * @param {Object} testResults - Jest test results
   * @param {Object} options - Additional options
   */
  async sendCoverageNotification(coverageFilePath, testResults, options = {}) {
    const coverageData = this.parseCoverageData(coverageFilePath);
    const testData = this.parseTestResults(testResults);

    await this.sendNotification(testData, coverageData, options);
  }

  /**
   * Test the bot connection
   */
  async testConnection() {
    if (!this.enabled) {
      console.log("🔕 Bot not enabled - missing credentials");
      return false;
    }

    try {
      const me = await this.bot.getMe();
      console.log(`🔔 Bot connected: ${me.first_name} (@${me.username})`);

      // Send test message
      await this.bot.sendMessage(
        this.chatId,
        "🔔 Test notification: Bot is working!"
      );
      console.log("✅ Test message sent successfully");

      return true;
    } catch (error) {
      console.error("🔕 Bot connection failed:", error.message);
      return false;
    }
  }
}

module.exports = TelegramTestNotifier;
