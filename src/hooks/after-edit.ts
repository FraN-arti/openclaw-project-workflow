/**
 * Smart hook that runs after edit/write operations
 * Suggests intelligent commit messages and next actions
 */

import { execSync } from "child_process";
import * as path from "path";
import * as fs from "fs";

interface AfterEditContext {
  tool: string;
  params: any;
  result: any;
}

interface CommitSuggestion {
  type: string;
  scope?: string;
  message: string;
  body?: string;
  fullMessage: string;
}

/**
 * Analyzes changes and generates smart commit message
 */
export async function generateCommitMessage(
  filePath: string,
  changeDescription?: string
): Promise<CommitSuggestion> {
  try {
    // Get file extension and name
    const ext = path.extname(filePath);
    const fileName = path.basename(filePath, ext);
    const dirName = path.basename(path.dirname(filePath));

    // Determine commit type based on context
    let type = "chore";
    let scope = dirName !== "." ? dirName : undefined;

    // Analyze file type and name
    if (ext === ".md" || ext === ".txt") {
      type = "docs";
    } else if (ext === ".json" || ext === ".yml" || ext === ".yaml" || ext === ".ini") {
      type = "config";
    } else if (ext === ".css" || ext === ".scss" || ext === ".sass") {
      type = "style";
    } else if (fileName.includes("test") || fileName.includes("spec") || ext === ".test.ts" || ext === ".spec.ts") {
      type = "test";
    } else if (ext === ".ts" || ext === ".js" || ext === ".java" || ext === ".py" || ext === ".go") {
      type = "feat"; // Assume feature by default for code files
    }

    // Try to get git diff to understand changes better
    let diffAnalysis = "";
    try {
      const diff = execSync(`git diff HEAD -- "${filePath}"`, {
        encoding: "utf-8",
        cwd: path.dirname(filePath),
        stdio: ["pipe", "pipe", "ignore"]
      });

      // Analyze diff for keywords (only if not already determined by file type)
      if (type === "feat" && diff) {
        if (diff.includes("fix") || diff.includes("bug")) {
          type = "fix";
        } else if (diff.includes("refactor") || diff.includes("rename")) {
          type = "refactor";
        }
      }

      // Count changes
      const additions = (diff.match(/^\+[^+]/gm) || []).length;
      const deletions = (diff.match(/^-[^-]/gm) || []).length;
      diffAnalysis = `(+${additions}/-${deletions} lines)`;
    } catch (error: any) {
      // Git diff failed, file might be new
      if (error.message?.includes("not a git repository")) {
        diffAnalysis = "(not in git repo)";
      } else {
        diffAnalysis = "(new file)";
        type = "feat";
      }
    }

    // Generate message
    const shortMessage = changeDescription || `update ${fileName}`;
    const scopePart = scope ? `(${scope})` : "";
    const fullMessage = `${type}${scopePart}: ${shortMessage}`;

    return {
      type,
      scope,
      message: shortMessage,
      body: diffAnalysis,
      fullMessage
    };
  } catch (error) {
    // Fallback to simple message
    return {
      type: "chore",
      message: `update ${path.basename(filePath)}`,
      fullMessage: `chore: update ${path.basename(filePath)}`
    };
  }
}

/**
 * Checks if file is in a git repository
 */
function isInGitRepo(filePath: string): boolean {
  try {
    execSync("git rev-parse --git-dir", {
      cwd: path.dirname(filePath),
      stdio: "ignore"
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Checks if there are uncommitted changes
 */
function hasUncommittedChanges(filePath: string): boolean {
  try {
    const status = execSync("git status --porcelain", {
      encoding: "utf-8",
      cwd: path.dirname(filePath)
    });
    return status.trim().length > 0;
  } catch {
    return false;
  }
}

/**
 * Main hook handler for after_tool_call
 */
export async function handleAfterEdit(ctx: AfterEditContext, api: any): Promise<void> {
  // Only handle successful edit/write operations
  if (ctx.tool !== "edit" && ctx.tool !== "write") {
    return;
  }

  if (!ctx.result?.ok) {
    return;
  }

  const filePath = ctx.params.path;
  if (!filePath) {
    return;
  }

  console.log(`[project-workflow] Analyzing changes to ${filePath}...`);

  // Check if in git repo
  if (!isInGitRepo(filePath)) {
    console.log("[project-workflow] Not in a git repository, skipping commit suggestion");
    return;
  }

  // Check for uncommitted changes
  if (!hasUncommittedChanges(filePath)) {
    console.log("[project-workflow] No uncommitted changes detected");
    return;
  }

  // Generate commit suggestion
  const suggestion = await generateCommitMessage(filePath);

  console.log("\n" + "=".repeat(60));
  console.log("💡 SMART COMMIT SUGGESTION");
  console.log("=".repeat(60));
  console.log(`Type:    ${suggestion.type}`);
  if (suggestion.scope) {
    console.log(`Scope:   ${suggestion.scope}`);
  }
  console.log(`Message: ${suggestion.message}`);
  if (suggestion.body) {
    console.log(`Changes: ${suggestion.body}`);
  }
  console.log("");
  console.log("Suggested commit command:");
  console.log(`  git add "${filePath}"`);
  console.log(`  git commit -m "${suggestion.fullMessage}"`);
  console.log("=".repeat(60) + "\n");

  // Check for remote repository
  try {
    const remote = execSync("git remote -v", {
      encoding: "utf-8",
      cwd: path.dirname(filePath),
      stdio: ["pipe", "pipe", "ignore"]
    });

    if (remote.includes("github.com")) {
      console.log("💡 GitHub remote detected. After committing, you can:");
      console.log("  - Push to main: git push origin main");
      console.log("  - Create PR: Use project_github_analyze tool");
      console.log("");
    }
  } catch {
    // No remote or git command failed
  }
}
