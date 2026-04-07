import { execSync } from "child_process";
import * as path from "path";

/**
 * Gather context for a task using context-gatherer subagent with fallback
 */
export async function executeGatherContext(
  params: {
    task: string;
    files?: string[];
    cwd?: string;
  },
  api: any
): Promise<string> {
  const { task, files, cwd = process.cwd() } = params;

  try {
    // Try using context-gatherer subagent first
    const result = await api.runtime.spawnSubagent({
      agentId: "context-gatherer",
      task: `Find all files relevant to: ${task}${files ? `\n\nStarting files: ${files.join(", ")}` : ""}`,
      mode: "run",
      timeoutSeconds: 60,
    });

    if (!result || !result.output) {
      return `⚠️ Context gathering completed but no files found.\n\nTask: ${task}`;
    }

    // Parse the output to extract file list
    const output = result.output;
    
    // Build formatted response
    let response = `# 📁 Context for: "${task}"\n\n`;
    
    if (files && files.length > 0) {
      response += `## Starting Files\n`;
      for (const file of files) {
        response += `- ${file}\n`;
      }
      response += `\n`;
    }

    response += `## Related Files Found\n\n`;
    response += output;
    
    response += `\n\n---\n`;
    response += `💡 **Tip:** These files were found by analyzing imports, dependencies, and code structure.\n`;
    response += `Review them before making changes to understand the full context.`;

    return response;
  } catch (error: any) {
    // Fallback: use simple file search if context-gatherer is unavailable
    console.warn(`context-gatherer unavailable, using fallback: ${error.message}`);
    return fallbackContextGathering(task, files, cwd);
  }
}

/**
 * Fallback context gathering using simple file search
 */
function fallbackContextGathering(
  task: string,
  files?: string[],
  cwd: string = process.cwd()
): string {
  let response = `# 📁 Context for: "${task}"\n\n`;
  response += `⚠️ **Note:** Using fallback search (context-gatherer subagent unavailable)\n\n`;

  if (files && files.length > 0) {
    response += `## Starting Files\n`;
    for (const file of files) {
      response += `- ${file}\n`;
    }
    response += `\n`;
  }

  try {
    // Extract keywords from task
    const keywords = extractKeywords(task);
    
    response += `## Search Strategy\n`;
    response += `Keywords extracted: ${keywords.join(", ")}\n\n`;

    // Find relevant files by extension and content
    const relevantFiles = findRelevantFiles(cwd, keywords);

    if (relevantFiles.length === 0) {
      response += `## No files found\n\n`;
      response += `Try being more specific or check if you're in the right directory.\n`;
    } else {
      response += `## Related Files Found (${relevantFiles.length})\n\n`;
      for (const file of relevantFiles) {
        response += `- ${file}\n`;
      }
    }

    response += `\n---\n`;
    response += `💡 **Tip:** This is a basic keyword search. For better results, ensure context-gatherer subagent is available.\n`;

    return response;
  } catch (fallbackError: any) {
    return `❌ Both context-gatherer and fallback search failed.\n\nTask: ${task}\nError: ${fallbackError.message}`;
  }
}

/**
 * Extract keywords from task description
 */
function extractKeywords(task: string): string[] {
  // Remove common words and extract meaningful terms
  const stopWords = new Set(["add", "create", "implement", "fix", "update", "the", "a", "an", "to", "for", "in", "on"]);
  
  const words = task
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word));

  return [...new Set(words)];
}

/**
 * Find relevant files using simple grep/find
 */
function findRelevantFiles(cwd: string, keywords: string[]): string[] {
  const files = new Set<string>();

  try {
    // Find common source files
    const extensions = [".ts", ".js", ".tsx", ".jsx", ".py", ".java", ".go", ".rs"];
    const extPattern = extensions.map(ext => `*${ext}`).join(" -o -name ");

    // Use find to get all source files (cross-platform)
    let findCmd: string;
    if (process.platform === "win32") {
      // Windows: use dir /s /b
      const extList = extensions.map(ext => `*${ext}`).join(" ");
      findCmd = `dir /s /b ${extList}`;
    } else {
      // Unix: use find
      findCmd = `find . -type f \\( -name ${extPattern} \\) 2>/dev/null | head -100`;
    }

    const allFiles = execSync(findCmd, { cwd, encoding: "utf-8", maxBuffer: 1024 * 1024 })
      .split("\n")
      .filter(f => f.trim())
      .map(f => f.trim());

    // Score files by keyword matches in filename
    const scoredFiles = allFiles.map(file => {
      const basename = path.basename(file).toLowerCase();
      const score = keywords.reduce((acc, keyword) => {
        return acc + (basename.includes(keyword) ? 1 : 0);
      }, 0);
      return { file, score };
    });

    // Return top matches
    const topFiles = scoredFiles
      .filter(f => f.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 20)
      .map(f => f.file);

    return topFiles;
  } catch (error) {
    console.warn("Fallback file search failed:", error);
    return [];
  }
}
