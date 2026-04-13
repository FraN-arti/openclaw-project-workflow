import { execSync } from "child_process";
import { relative } from "path";

/**
 * Generate smart commit with AI-powered conventional commit message
 */
export async function executeSmartCommit(params: {
  files?: string[];
  autoGenerate?: boolean;
  includeContext?: boolean;
  push?: boolean;
}): Promise<string> {
  const {
    files = [],
    autoGenerate = true,
    includeContext = true,
    push = false,
  } = params;

  try {
    // Get git status
    const status = execSync("git status --porcelain", { encoding: "utf-8" });
    
    if (!status.trim()) {
      return `✅ No changes to commit (working tree clean)`;
    }

    // Get changed files
    const changedFiles = status
      .split("\n")
      .filter((line) => line.trim())
      .map((line) => {
        const parts = line.trim().split(/\s+/);
        return { status: parts[0], file: parts.slice(1).join(" ") };
      });

    if (changedFiles.length === 0) {
      return `✅ No changes to commit`;
    }

    // Filter by specified files if provided
    let filesToCommit = changedFiles;
    if (files.length > 0) {
      filesToCommit = changedFiles.filter((f) =>
        files.some((file) => f.file.includes(file))
      );
    }

    if (filesToCommit.length === 0) {
      return `❌ No matching files found to commit`;
    }

    // Get git diff for analysis
    let diff = "";
    try {
      diff = execSync("git diff --cached", { encoding: "utf-8" });
      if (!diff) {
        // If nothing staged, get unstaged diff
        diff = execSync("git diff", { encoding: "utf-8" });
      }
    } catch (error) {
      // Diff might fail for new files
    }

    // Analyze changes
    const analysis = analyzeChanges(filesToCommit, diff);

    // Generate commit message
    const commitMessage = generateCommitMessage(analysis, includeContext);

    // Format output
    let output = `# 💡 Smart Commit Analysis\n\n`;
    output += `## Changed Files (${filesToCommit.length})\n\n`;
    for (const file of filesToCommit) {
      const icon = file.status.includes("M") ? "📝" : file.status.includes("A") ? "✨" : "🗑️";
      output += `- ${icon} ${file.file}\n`;
    }
    output += `\n`;

    output += `## 📋 Generated Commit Message\n\n`;
    output += "```\n";
    output += commitMessage;
    output += "\n```\n\n";

    output += `## 🎯 Commit Type: ${analysis.type}\n\n`;
    output += `**Scope:** ${analysis.scope || "none"}\n\n`;

    if (analysis.breakingChange) {
      output += `⚠️ **BREAKING CHANGE DETECTED**\n\n`;
    }

    if (analysis.relatedIssues.length > 0) {
      output += `**Related Issues:** ${analysis.relatedIssues.join(", ")}\n\n`;
    }

    output += `---\n\n`;
    output += `**To commit these changes:**\n\n`;
    output += "```bash\n";
    output += `git add ${filesToCommit.map((f) => f.file).join(" ")}\n`;
    output += `git commit -m "${commitMessage.split("\n")[0]}"\n`;
    if (commitMessage.split("\n").length > 1) {
      output += `# (Full message will be added automatically)\n`;
    }
    output += "```\n\n";

    if (push) {
      output += `**Note:** Auto-push is enabled but requires manual confirmation.\n`;
      output += `Run: \`git push\` after committing.\n`;
    }

    return output;
  } catch (error: any) {
    return `❌ Smart commit failed: ${error.message}\n\nMake sure you're in a git repository.`;
  }
}

interface ChangeAnalysis {
  type: "feat" | "fix" | "refactor" | "docs" | "test" | "chore" | "style" | "perf";
  scope?: string;
  description: string;
  body: string[];
  breakingChange: boolean;
  relatedIssues: string[];
}

/**
 * Analyze changes to determine commit type and details
 */
function analyzeChanges(files: Array<{ status: string; file: string }>, diff: string): ChangeAnalysis {
  const analysis: ChangeAnalysis = {
    type: "chore",
    description: "",
    body: [],
    breakingChange: false,
    relatedIssues: [],
  };

  // Determine type based on files
  const hasNewFiles = files.some((f) => f.status.includes("A"));
  const hasDeletedFiles = files.some((f) => f.status.includes("D"));
  const hasModifiedFiles = files.some((f) => f.status.includes("M"));

  // Check file types
  const hasTests = files.some((f) => f.file.includes("test") || f.file.includes("spec"));
  const hasDocs = files.some((f) => f.file.includes("README") || f.file.includes(".md"));
  const hasConfig = files.some((f) => f.file.includes("config") || f.file.includes(".json"));
  const hasSource = files.some((f) => 
    f.file.match(/\.(ts|js|tsx|jsx|java|py|go|rs)$/) && 
    !f.file.includes("test") && 
    !f.file.includes("spec")
  );

  // Determine commit type
  if (hasTests && !hasSource) {
    analysis.type = "test";
    analysis.description = "add/update tests";
  } else if (hasDocs && !hasSource) {
    analysis.type = "docs";
    analysis.description = "update documentation";
  } else if (hasConfig && !hasSource) {
    analysis.type = "chore";
    analysis.description = "update configuration";
  } else if (hasNewFiles && hasSource) {
    analysis.type = "feat";
    analysis.description = "add new feature";
  } else if (hasModifiedFiles && hasSource) {
    // Check diff for bug fixes
    if (diff.toLowerCase().includes("fix") || diff.toLowerCase().includes("bug")) {
      analysis.type = "fix";
      analysis.description = "fix bug";
    } else if (diff.toLowerCase().includes("refactor")) {
      analysis.type = "refactor";
      analysis.description = "refactor code";
    } else if (diff.toLowerCase().includes("performance") || diff.toLowerCase().includes("optimize")) {
      analysis.type = "perf";
      analysis.description = "improve performance";
    } else {
      analysis.type = "feat";
      analysis.description = "update feature";
    }
  } else if (hasDeletedFiles) {
    analysis.type = "refactor";
    analysis.description = "remove unused code";
  }

  // Determine scope from files
  const scopes = new Set<string>();
  for (const file of files) {
    const parts = file.file.split("/");
    if (parts.length > 1) {
      scopes.add(parts[0]);
    }
  }
  if (scopes.size === 1) {
    analysis.scope = Array.from(scopes)[0];
  }

  // Build body
  analysis.body.push(`Modified files:`);
  for (const file of files.slice(0, 10)) {
    analysis.body.push(`- ${file.file}`);
  }
  if (files.length > 10) {
    analysis.body.push(`... and ${files.length - 10} more`);
  }

  // Check for breaking changes
  if (diff.toLowerCase().includes("breaking") || diff.toLowerCase().includes("breaking change")) {
    analysis.breakingChange = true;
  }

  // Extract issue numbers
  const issueMatches = diff.match(/#\d+/g);
  if (issueMatches) {
    analysis.relatedIssues = Array.from(new Set(issueMatches));
  }

  return analysis;
}

/**
 * Generate conventional commit message
 */
function generateCommitMessage(analysis: ChangeAnalysis, includeContext: boolean): string {
  let message = "";

  // First line: type(scope): description
  message += analysis.type;
  if (analysis.scope) {
    message += `(${analysis.scope})`;
  }
  message += `: ${analysis.description}`;

  if (includeContext && analysis.body.length > 0) {
    message += "\n\n";
    message += analysis.body.join("\n");
  }

  if (analysis.relatedIssues.length > 0) {
    message += "\n\n";
    message += `Closes ${analysis.relatedIssues.join(", ")}`;
  }

  if (analysis.breakingChange) {
    message += "\n\n";
    message += "BREAKING CHANGE: API changes require migration";
  }

  return message;
}
