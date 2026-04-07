import * as fs from "fs";
import * as path from "path";

/**
 * Gather context for a task using file system search
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

  let response = `# 📁 Context for: "${task}"\n\n`;

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
    response += `💡 **Tip:** Files are matched by keywords in their names and paths.\n`;

    return response;
  } catch (error: any) {
    return `❌ File search failed.\n\nTask: ${task}\nError: ${error.message}`;
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
