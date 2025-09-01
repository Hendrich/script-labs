#!/usr/bin/env node

/**
 * Test GitHub environment variables
 */

console.log("ðŸ” GitHub Environment Variables Check:");
console.log("================================");

const githubVars = {
  GITHUB_REPOSITORY: process.env.GITHUB_REPOSITORY,
  GITHUB_RUN_ID: process.env.GITHUB_RUN_ID,
  GITHUB_SERVER_URL: process.env.GITHUB_SERVER_URL,
  GITHUB_SHA: process.env.GITHUB_SHA,
  GITHUB_REF_NAME: process.env.GITHUB_REF_NAME,
  GITHUB_ACTOR: process.env.GITHUB_ACTOR,
  GITHUB_WORKFLOW: process.env.GITHUB_WORKFLOW,
  GIT_BRANCH: process.env.GIT_BRANCH,
  GIT_AUTHOR: process.env.GIT_AUTHOR,
  GIT_COMMIT: process.env.GIT_COMMIT,
};

for (const [key, value] of Object.entries(githubVars)) {
  const status = value ? "âœ…" : "âŒ";
  console.log(`${status} ${key}: ${value || "not set"}`);
}

console.log("\nðŸ“‹ Options that would be sent:");
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

console.log(JSON.stringify(options, null, 2));
