import { readdir, readFile } from "fs/promises";
import { join, relative } from "path";

interface Issue {
  type: "todo" | "fixme" | "bug" | "deprecated" | "security" | "performance";
  file: string;
  line: number;
  message: string;
  priority: "critical" | "high" | "medium" | "low";
}

/**
 * Scan codebase for issues (TODOs, FIXMEs, deprecated APIs, etc.)
 */
export async function executeScanIssues(params: {
  projectPath?: string;
  scanTypes?: string[];
  autoCreate?: boolean;
}): Promise<string> {
  const {
    projectPath = process.cwd(),
    scanTypes = ["todos", "bugs", "deprecated", "security"],
    autoCreate = false,
  } = params;

  try {
    const issues = await scanForIssues(projectPath, scanTypes);

    if (issues.length === 0) {
      return `✅ No issues found in ${projectPath}`;
    }

    // Group by type and priority
    const grouped = groupIssues(issues);

    // Format output
    let output = `# 🔍 Issue Scan Results: ${projectPath}\n\n`;
    output += `**Total issues found:** ${issues.length}\n\n`;

    // Critical issues
    if (grouped.critical.length > 0) {
      output += `## 🔴 Critical (${grouped.critical.length})\n\n`;
      for (const issue of grouped.critical) {
        output += formatIssue(issue, projectPath);
      }
      output += `\n`;
    }

    // High priority
    if (grouped.high.length > 0) {
      output += `## 🟡 High Priority (${grouped.high.length})\n\n`;
      for (const issue of grouped.high) {
        output += formatIssue(issue, projectPath);
      }
      output += `\n`;
    }

    // Medium priority
    if (grouped.medium.length > 0) {
      output += `## 🟢 Medium (${grouped.medium.length})\n\n`;
      for (const issue of grouped.medium.slice(0, 10)) {
        output += formatIssue(issue, projectPath);
      }
      if (grouped.medium.length > 10) {
        output += `\n... and ${grouped.medium.length - 10} more\n`;
      }
      output += `\n`;
    }

    // Low priority
    if (grouped.low.length > 0) {
      output += `## ⚪ Low (${grouped.low.length})\n\n`;
      output += `${grouped.low.length} low-priority issues found (use detailed scan to see all)\n\n`;
    }

    if (autoCreate) {
      output += `\n---\n\n`;
      output += `**Note:** Auto-create is enabled but not yet implemented.\n`;
      output += `Use \`project_create_github_issues\` to create issues on GitHub.\n`;
    }

    return output;
  } catch (error: any) {
    return `❌ Issue scan failed: ${error.message}`;
  }
}

/**
 * Scan directory for issues
 */
async function scanForIssues(dir: string, scanTypes: string[]): Promise<Issue[]> {
  const issues: Issue[] = [];
  const codeExtensions = [".ts", ".js", ".tsx", ".jsx", ".java", ".py", ".go", ".rs"];
  const ignoreDirs = ["node_modules", "dist", "build", ".git", "coverage"];

  async function scan(currentDir: string) {
    try {
      const entries = await readdir(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(currentDir, entry.name);

        if (entry.isDirectory()) {
          if (!ignoreDirs.includes(entry.name)) {
            await scan(fullPath);
          }
        } else if (entry.isFile()) {
          const ext = entry.name.substring(entry.name.lastIndexOf("."));
          if (codeExtensions.includes(ext)) {
            const fileIssues = await scanFile(fullPath, scanTypes);
            issues.push(...fileIssues);
          }
        }
      }
    } catch (error) {
      // Skip directories we can't read
    }
  }

  await scan(dir);
  return issues;
}

/**
 * Scan a single file for issues
 */
async function scanFile(filePath: string, scanTypes: string[]): Promise<Issue[]> {
  const issues: Issue[] = [];

  try {
    const content = await readFile(filePath, "utf-8");
    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;

      // TODO comments
      if (scanTypes.includes("todos")) {
        const todoMatch = line.match(/\/\/\s*TODO:?\s*(.+)/i) || line.match(/#\s*TODO:?\s*(.+)/i);
        if (todoMatch) {
          issues.push({
            type: "todo",
            file: filePath,
            line: lineNumber,
            message: todoMatch[1].trim(),
            priority: "medium",
          });
        }
      }

      // FIXME comments
      if (scanTypes.includes("bugs")) {
        const fixmeMatch = line.match(/\/\/\s*FIXME:?\s*(.+)/i) || line.match(/#\s*FIXME:?\s*(.+)/i);
        if (fixmeMatch) {
          issues.push({
            type: "fixme",
            file: filePath,
            line: lineNumber,
            message: fixmeMatch[1].trim(),
            priority: "high",
          });
        }
      }

      // Deprecated APIs
      if (scanTypes.includes("deprecated")) {
        if (line.includes("@deprecated") || line.includes("DEPRECATED")) {
          issues.push({
            type: "deprecated",
            file: filePath,
            line: lineNumber,
            message: "Deprecated API usage",
            priority: "medium",
          });
        }
      }

      // Security issues
      if (scanTypes.includes("security")) {
        // Hardcoded secrets
        if (
          line.match(/api[_-]?key\s*=\s*['"][^'"]+['"]/i) ||
          line.match(/password\s*=\s*['"][^'"]+['"]/i) ||
          line.match(/secret\s*=\s*['"][^'"]+['"]/i)
        ) {
          issues.push({
            type: "security",
            file: filePath,
            line: lineNumber,
            message: "Potential hardcoded secret",
            priority: "critical",
          });
        }

        // Dangerous functions
        if (line.includes("eval(") || line.includes("innerHTML")) {
          issues.push({
            type: "security",
            file: filePath,
            line: lineNumber,
            message: "Potentially unsafe code pattern",
            priority: "high",
          });
        }
      }
    }
  } catch (error) {
    // Skip files we can't read
  }

  return issues;
}

/**
 * Group issues by priority
 */
function groupIssues(issues: Issue[]): {
  critical: Issue[];
  high: Issue[];
  medium: Issue[];
  low: Issue[];
} {
  return {
    critical: issues.filter((i) => i.priority === "critical"),
    high: issues.filter((i) => i.priority === "high"),
    medium: issues.filter((i) => i.priority === "medium"),
    low: issues.filter((i) => i.priority === "low"),
  };
}

/**
 * Format a single issue
 */
function formatIssue(issue: Issue, projectPath: string): string {
  const relPath = relative(projectPath, issue.file);
  const icon = {
    todo: "📝",
    fixme: "🐛",
    bug: "🐛",
    deprecated: "⚠️",
    security: "🔒",
    performance: "⚡",
  }[issue.type];

  return `- ${icon} **${relPath}:${issue.line}** — ${issue.message}\n`;
}
