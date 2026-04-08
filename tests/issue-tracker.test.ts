/**
 * Tests for Issue Tracker Integration
 */

import {
  extractIssueReferences,
  suggestIssueReferences,
  enhanceCommitWithIssues,
  getBranchIssueNumber
} from "../src/utils/issue-tracker.js";

console.log("=".repeat(60));
console.log("Issue Tracker Integration - Tests");
console.log("=".repeat(60) + "\n");

let passedTests = 0;
let failedTests = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`✅ ${name}`);
    passedTests++;
  } catch (error: any) {
    console.log(`❌ ${name}`);
    console.log(`   Error: ${error.message}\n`);
    failedTests++;
  }
}

// Test 1: Extract "closes" references
test("Extract 'closes #123' reference", () => {
  const refs = extractIssueReferences("feat: add feature\n\nCloses #123");
  
  if (refs.length !== 1) {
    throw new Error(`Expected 1 reference, got ${refs.length}`);
  }
  
  if (refs[0].number !== 123 || refs[0].action !== "closes") {
    throw new Error(`Expected closes #123, got ${refs[0].action} #${refs[0].number}`);
  }
});

// Test 2: Extract "fixes" references
test("Extract 'fixes #456' reference", () => {
  const refs = extractIssueReferences("fix: bug fix\n\nFixes #456");
  
  if (refs.length !== 1) {
    throw new Error(`Expected 1 reference, got ${refs.length}`);
  }
  
  if (refs[0].number !== 456 || refs[0].action !== "fixes") {
    throw new Error(`Expected fixes #456, got ${refs[0].action} #${refs[0].number}`);
  }
});

// Test 3: Extract "resolves" references
test("Extract 'resolves #789' reference", () => {
  const refs = extractIssueReferences("feat: new feature\n\nResolves #789");
  
  if (refs.length !== 1) {
    throw new Error(`Expected 1 reference, got ${refs.length}`);
  }
  
  if (refs[0].number !== 789 || refs[0].action !== "resolves") {
    throw new Error(`Expected resolves #789, got ${refs[0].action} #${refs[0].number}`);
  }
});

// Test 4: Extract simple reference
test("Extract simple '#100' reference", () => {
  const refs = extractIssueReferences("feat: related to #100");
  
  if (refs.length !== 1) {
    throw new Error(`Expected 1 reference, got ${refs.length}`);
  }
  
  if (refs[0].number !== 100 || refs[0].action !== "references") {
    throw new Error(`Expected references #100, got ${refs[0].action} #${refs[0].number}`);
  }
});

// Test 5: Extract multiple references
test("Extract multiple issue references", () => {
  const refs = extractIssueReferences("feat: feature\n\nCloses #1, fixes #2, related to #3");
  
  if (refs.length !== 3) {
    throw new Error(`Expected 3 references, got ${refs.length}`);
  }
});

// Test 6: No references
test("No issue references in message", () => {
  const refs = extractIssueReferences("feat: simple commit message");
  
  if (refs.length !== 0) {
    throw new Error(`Expected 0 references, got ${refs.length}`);
  }
});

// Test 7: Enhance commit with issue
test("Enhance commit message with issue", () => {
  const enhanced = enhanceCommitWithIssues("feat: add feature", [123], "fixes");
  
  if (!enhanced.includes("Fixes #123")) {
    throw new Error("Expected 'Fixes #123' in enhanced message");
  }
});

// Test 8: Enhance commit with multiple issues
test("Enhance commit with multiple issues", () => {
  const enhanced = enhanceCommitWithIssues("feat: add feature", [123, 456], "closes");
  
  if (!enhanced.includes("Closes #123, #456")) {
    throw new Error("Expected 'Closes #123, #456' in enhanced message");
  }
});

// Test 9: Suggest issue references
test("Suggest issue references based on changes", () => {
  const openIssues = [
    { number: 1, title: "Fix authentication bug" },
    { number: 2, title: "Add login feature" }
  ];
  
  const suggestions = suggestIssueReferences("authentication fix", openIssues);
  
  if (!suggestions.includes("#1")) {
    throw new Error("Expected suggestion for issue #1");
  }
});

// Test 10: Get branch issue number
test("Get issue number from branch name", () => {
  // This test depends on actual git branch, so we just check it doesn't crash
  const issueNumber = getBranchIssueNumber();
  
  // Should return number or null, not throw
  if (issueNumber !== null && typeof issueNumber !== "number") {
    throw new Error("Expected number or null");
  }
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
