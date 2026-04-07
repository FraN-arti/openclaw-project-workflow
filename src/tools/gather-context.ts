import * as fs from "fs";
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
    const idempotencyKey = `context-gatherer-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const { runId } = await api.runtime.subagent.run({
      idempotencyKey,
      sessionKey: `agent:main:subagent:${idempotencyKey}`,
      message: `Find all files relevant to: ${task}${files ? `\n\nStarting files: ${files.join(", ")}` : ""}`,
      deliver: false,
    });

    // Wait for completion
    const result = await api.runtime.subagent.waitForRun({
      runId,
      timeoutMs: 60000,
    });

    console.log('[project-workflow] Subagent result:', JSON.stringify(result, null, 2));

    if (!result || !result.output) {
      console.warn('[project-workflow] No output from subagent');
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
    console.error(`[project-workflow] context-gatherer failed:`, error);
    console.warn(`context-gatherer unavailable, using fallback: ${error.message}`);
    return fallbackContextGathering(task, files, cwd);
  }
}

/**
 * Fallback context gathering using simple file search (no shell commands)
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
 * Find relevant files using fs.readdirSync (no shell commands)
 */
function findRelevantFiles(cwd: string, keywords: string[], maxDepth: number = 5): string[] {
  const files = new Set<string>();
  const extensions = new Set([".ts", ".js", ".tsx", ".jsx", ".py", ".java", ".go", ".rs", ".c", ".cpp", ".h"]);

  try {
    // Recursively scan directory
    scanDirectory(cwd, cwd, extensions, files, 0, maxDepth);

    // Score files by keyword matches in filename
    const scoredFiles = Array.from(files).map(file => {
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
      .map(f => path.relative(cwd, f.file));

    return topFiles;
  } catch (error) {
    console.warn("Fallback file search failed:", error);
    return [];
  }
}

/**
 * Recursively scan directory for source files
 */
function scanDirectory(
  dir: string,
  rootDir: string,
  extensions: Set<string>,
  results: Set<string>,
  depth: number,
  maxDepth: number
): void {
  if (depth > maxDepth) return;

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      // Skip common ignore patterns
      if (entry.name.startsWith(".") || 
          entry.name === "node_modules" || 
          entry.name === "dist" || 
          entry.name === "build" ||
          entry.name === "__pycache__" ||
          entry.name === "target") {
        continue;
      }

      if (entry.isDirectory()) {
        scanDirectory(fullPath, rootDir, extensions, results, depth + 1, maxDepth);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (extensions.has(ext)) {
          results.add(fullPath);
        }
      }
    }
  } catch (error) {
    // Skip directories we can't read
    console.warn(`Cannot read directory ${dir}:`, error);
  }
}
