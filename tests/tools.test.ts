/**
 * Integration tests for all project-workflow tools
 */

import { executeAnalyzeCodebase } from "../src/tools/analyze-codebase.js";
import { executeGitHistory } from "../src/tools/git-history.js";
import { executeCheckIntegration } from "../src/tools/check-integration.js";
import { executeGatherContext } from "../src/tools/gather-context.js";
import * as fs from "fs";
import * as path from "path";

console.log("=".repeat(60));
console.log("Project Workflow Tools - Integration Tests");
console.log("=".repeat(60) + "\n");

let passedTests = 0;
let failedTests = 0;

function test(name: string, fn: () => Promise<void>) {
  return fn()
    .then(() => {
      console.log(`✅ ${name}`);
      passedTests++;
    })
    .catch((error) => {
      console.log(`❌ ${name}`);
      console.log(`   Error: ${error.message}\n`);
      failedTests++;
    });
}

// Test 1: Analyze Codebase
await test("project_analyze_codebase - should analyze project structure", async () => {
  const result = await executeAnalyzeCodebase({ projectPath: "." });
  
  if (!result || typeof result !== "string") {
    throw new Error("Expected string result");
  }
  
  if (!result.includes("Codebase Analysis") && !result.includes("Summary") && !result.includes("No code files found")) {
    throw new Error("Expected codebase analysis information");
  }
});

// Test 2: Git History
await test("project_git_history - should get git history", async () => {
  const result = await executeGitHistory({ maxCommits: 3 });
  
  if (!result || typeof result !== "string") {
    throw new Error("Expected string result");
  }
  
  // Should either show commits or indicate no git repo
  if (!result.includes("commit") && !result.includes("not a git repository")) {
    throw new Error("Expected git history or no-git message");
  }
});

// Test 3: Git History for specific file
await test("project_git_history - should get history for specific file", async () => {
  const testFile = "package.json";
  
  if (!fs.existsSync(testFile)) {
    throw new Error("Test file not found");
  }
  
  const result = await executeGitHistory({ filePath: testFile, maxCommits: 2 });
  
  if (!result || typeof result !== "string") {
    throw new Error("Expected string result");
  }
});

// Test 4: Check Integration
await test("project_check_integration - should check file dependencies", async () => {
  const result = await executeCheckIntegration({
    files: ["index.ts"],
    changes: "Test changes"
  });
  
  if (!result || typeof result !== "string") {
    throw new Error("Expected string result");
  }
  
  if (!result.includes("Integration Check") && !result.includes("File not found")) {
    throw new Error("Expected integration check information");
  }
});

// Test 5: Gather Context
await test("project_gather_context - should gather related files", async () => {
  const mockApi = {
    config: {},
    registerTool: () => {},
    registerHook: () => {}
  };
  
  const result = await executeGatherContext({
    task: "Test task",
    files: ["package.json"]
  }, mockApi);
  
  if (!result || typeof result !== "string") {
    throw new Error("Expected string result");
  }
  
  if (!result.includes("Context") && !result.includes("Files")) {
    throw new Error("Expected context gathering information");
  }
});

// Test 6: Edge Case - Large project (should not hang)
await test("Edge case: Large project should not hang", async () => {
  const startTime = Date.now();
  
  await executeAnalyzeCodebase({ projectPath: "." });
  
  const duration = Date.now() - startTime;
  
  if (duration > 30000) { // 30 seconds max
    throw new Error(`Analysis took too long: ${duration}ms`);
  }
});

// Test 7: Edge Case - Non-existent file
await test("Edge case: Non-existent file should handle gracefully", async () => {
  const result = await executeGitHistory({ 
    filePath: "non-existent-file-12345.txt" 
  });
  
  if (!result || typeof result !== "string") {
    throw new Error("Expected string result");
  }
  
  // Should not crash - any result is acceptable (error message or empty history)
  // The important thing is it didn't throw an exception
});

// Test 8: Edge Case - Empty changes description
await test("Edge case: Empty changes should handle gracefully", async () => {
  const result = await executeCheckIntegration({
    files: ["package.json"],
    changes: ""
  });
  
  if (!result || typeof result !== "string") {
    throw new Error("Expected string result");
  }
  
  // Should not crash
});

// Summary
console.log("\n" + "=".repeat(60));
console.log("Test Summary");
console.log("=".repeat(60));
console.log(`✅ Passed: ${passedTests}`);
console.log(`❌ Failed: ${failedTests}`);
console.log(`Total: ${passedTests + failedTests}`);
console.log("=".repeat(60));

if (failedTests > 0) {
  process.exit(1);
}
