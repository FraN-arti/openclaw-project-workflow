/**
 * Basic tests for Smart Hooks functionality
 */

import { generateCommitMessage } from "../src/hooks/after-edit.js";

// Test commit message generation
async function testCommitMessageGeneration() {
  console.log("Testing commit message generation...\n");

  const testCases = [
    { file: "src/auth.ts", expected: "feat" },
    { file: "README.md", expected: "docs" },
    { file: "config.json", expected: "config" },
    { file: "styles.css", expected: "style" },
    { file: "test.spec.ts", expected: "test" }
  ];

  for (const testCase of testCases) {
    const result = await generateCommitMessage(testCase.file);
    const passed = result.type === testCase.expected;
    
    console.log(`${passed ? "✅" : "❌"} ${testCase.file}`);
    console.log(`   Expected: ${testCase.expected}, Got: ${result.type}`);
    console.log(`   Message: ${result.fullMessage}\n`);
  }
}

// Run tests
console.log("=".repeat(60));
console.log("Smart Hooks Tests");
console.log("=".repeat(60) + "\n");

testCommitMessageGeneration()
  .then(() => {
    console.log("=".repeat(60));
    console.log("Tests completed!");
    console.log("=".repeat(60));
  })
  .catch((error) => {
    console.error("Test failed:", error);
    process.exit(1);
  });
