import { readFile } from "fs/promises";
import { join, dirname } from "path";

interface DependencyInfo {
  file: string;
  imports: string[];
  exports: string[];
}

interface IntegrationIssue {
  severity: "warning" | "error";
  file: string;
  message: string;
}

/**
 * Check integration and dependencies before making changes
 */
export async function executeCheckIntegration(params: {
  files: string[];
  changes: string;
}): Promise<string> {
  const { files, changes } = params;

  try {
    const issues: IntegrationIssue[] = [];
    const dependencies: DependencyInfo[] = [];

    // Analyze each file
    for (const file of files) {
      try {
        const content = await readFile(file, "utf-8");
        const info = analyzeFile(file, content);
        dependencies.push(info);
      } catch (error: any) {
        issues.push({
          severity: "error",
          file,
          message: `Cannot read file: ${error.message}`,
        });
      }
    }

    // Find files that import the target files
    const importers = await findImporters(files);

    // Build response
    let response = `# ⚠️ Integration Check\n\n`;
    response += `## Files to Change\n`;
    for (const file of files) {
      response += `- ${file}\n`;
    }
    response += `\n## Planned Changes\n${changes}\n\n`;

    // Show importers
    if (importers.length > 0) {
      response += `## ⚠️ Files That Import These\n\n`;
      response += `These files depend on the files you're changing:\n\n`;
      for (const imp of importers) {
        response += `- **${imp.file}**\n`;
        response += `  - Imports: ${imp.imports.join(", ")}\n`;
      }
      response += `\n`;
    }

    // Show exports
    response += `## Exported Items\n\n`;
    for (const dep of dependencies) {
      if (dep.exports.length > 0) {
        response += `**${dep.file}:**\n`;
        for (const exp of dep.exports) {
          response += `- ${exp}\n`;
        }
      }
    }

    // Show issues
    if (issues.length > 0) {
      response += `\n## ⚠️ Potential Issues\n\n`;
      for (const issue of issues) {
        const icon = issue.severity === "error" ? "❌" : "⚠️";
        response += `${icon} **${issue.file}**: ${issue.message}\n`;
      }
    }

    // Recommendations
    response += `\n## 💡 Recommendations\n\n`;
    if (importers.length > 0) {
      response += `- **${importers.length} file(s)** import these files\n`;
      response += `- If you change function signatures or exports, these files may break\n`;
      response += `- Consider checking these files after making changes\n`;
    } else {
      response += `- No files import these directly (safe to modify)\n`;
    }

    return response;
  } catch (error: any) {
    return `❌ Integration check failed: ${error.message}`;
  }
}

/**
 * Analyze a file to find imports and exports
 */
function analyzeFile(file: string, content: string): DependencyInfo {
  const imports: string[] = [];
  const exports: string[] = [];

  // Find imports (simple regex, works for most cases)
  const importRegex = /import\s+(?:{([^}]+)}|(\w+))\s+from\s+['"]([^'"]+)['"]/g;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const items = match[1] || match[2];
    if (items) {
      imports.push(...items.split(",").map((s) => s.trim()));
    }
  }

  // Find exports
  const exportRegex = /export\s+(?:(?:async\s+)?function|class|const|let|var|interface|type)\s+(\w+)/g;
  while ((match = exportRegex.exec(content)) !== null) {
    exports.push(match[1]);
  }

  // Find default exports
  if (content.includes("export default")) {
    exports.push("default");
  }

  return { file, imports, exports };
}

/**
 * Find files that import the target files
 */
async function findImporters(targetFiles: string[]): Promise<DependencyInfo[]> {
  // This is a simplified version
  // In a real implementation, we would scan the entire project
  // For now, we return empty array and rely on context-gatherer
  return [];
}
