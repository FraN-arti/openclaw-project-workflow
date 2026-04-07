import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export interface GitCommit {
  hash: string;
  author: string;
  date: string;
  message: string;
}

export interface GitBlameEntry {
  lineStart: number;
  lineEnd: number;
  author: string;
  hash: string;
  date: string;
}

export interface GitHistoryResult {
  commits: GitCommit[];
  blame?: GitBlameEntry[];
  summary: {
    totalCommits: number;
    authors: string[];
    dateRange: { first: string; last: string };
  };
}

/**
 * Get git log for a file or entire repository
 */
export async function getGitLog(options: {
  filePath?: string;
  since?: string;
  author?: string;
  maxCommits?: number;
  cwd?: string;
}): Promise<GitCommit[]> {
  const { filePath, since, author, maxCommits = 20, cwd = process.cwd() } = options;

  let cmd = `git log --pretty=format:"%H|%an|%ai|%s" -n ${maxCommits}`;
  
  if (since) {
    cmd += ` --since="${since}"`;
  }
  
  if (author) {
    cmd += ` --author="${author}"`;
  }
  
  if (filePath) {
    cmd += ` --follow -- "${filePath}"`;
  }

  try {
    const { stdout } = await execAsync(cmd, { cwd });
    
    if (!stdout.trim()) {
      return [];
    }

    return stdout
      .trim()
      .split("\n")
      .map((line) => {
        const [hash, author, date, message] = line.split("|");
        return { hash, author, date, message };
      });
  } catch (error: any) {
    throw new Error(`Git log failed: ${error.message}`);
  }
}

/**
 * Get git blame for a file
 */
export async function getGitBlame(options: {
  filePath: string;
  cwd?: string;
}): Promise<GitBlameEntry[]> {
  const { filePath, cwd = process.cwd() } = options;

  const cmd = `git blame --line-porcelain "${filePath}"`;

  try {
    const { stdout } = await execAsync(cmd, { cwd });
    
    const entries: GitBlameEntry[] = [];
    const lines = stdout.split("\n");
    
    let currentHash = "";
    let currentAuthor = "";
    let currentDate = "";
    let lineNumber = 0;

    for (const line of lines) {
      if (line.match(/^[0-9a-f]{40}/)) {
        currentHash = line.split(" ")[0];
        lineNumber = parseInt(line.split(" ")[2]);
      } else if (line.startsWith("author ")) {
        currentAuthor = line.substring(7);
      } else if (line.startsWith("author-time ")) {
        const timestamp = parseInt(line.substring(12));
        currentDate = new Date(timestamp * 1000).toISOString();
      } else if (line.startsWith("\t")) {
        // Actual code line
        entries.push({
          lineStart: lineNumber,
          lineEnd: lineNumber,
          author: currentAuthor,
          hash: currentHash,
          date: currentDate,
        });
      }
    }

    // Merge consecutive lines by same author
    const merged: GitBlameEntry[] = [];
    let current: GitBlameEntry | null = null;

    for (const entry of entries) {
      if (
        current &&
        current.author === entry.author &&
        current.hash === entry.hash &&
        current.lineEnd === entry.lineStart - 1
      ) {
        current.lineEnd = entry.lineEnd;
      } else {
        if (current) merged.push(current);
        current = { ...entry };
      }
    }
    if (current) merged.push(current);

    return merged;
  } catch (error: any) {
    throw new Error(`Git blame failed: ${error.message}`);
  }
}

/**
 * Format git history result as markdown
 */
export function formatGitHistory(result: GitHistoryResult, filePath?: string): string {
  let output = `# 📊 Git History${filePath ? `: ${filePath}` : ""}\n\n`;

  // Summary
  output += `## Summary\n`;
  output += `- **Total commits:** ${result.summary.totalCommits}\n`;
  output += `- **Authors:** ${result.summary.authors.join(", ")}\n`;
  output += `- **Date range:** ${result.summary.dateRange.first} → ${result.summary.dateRange.last}\n\n`;

  // Recent commits
  output += `## Recent Commits\n\n`;
  for (const commit of result.commits.slice(0, 10)) {
    const shortHash = commit.hash.substring(0, 7);
    const date = new Date(commit.date).toISOString().split("T")[0];
    output += `- **${date}** | ${commit.author} | \`${shortHash}\` | ${commit.message}\n`;
  }

  // Blame summary
  if (result.blame && result.blame.length > 0) {
    output += `\n## Code Ownership (Blame)\n\n`;
    
    const authorStats = new Map<string, number>();
    for (const entry of result.blame) {
      const lines = entry.lineEnd - entry.lineStart + 1;
      authorStats.set(entry.author, (authorStats.get(entry.author) || 0) + lines);
    }

    const totalLines = Array.from(authorStats.values()).reduce((a, b) => a + b, 0);
    
    for (const [author, lines] of Array.from(authorStats.entries()).sort((a, b) => b[1] - a[1])) {
      const percent = ((lines / totalLines) * 100).toFixed(1);
      output += `- **${author}**: ${lines} lines (${percent}%)\n`;
    }

    output += `\n### Line-by-line breakdown\n\n`;
    for (const entry of result.blame.slice(0, 20)) {
      const shortHash = entry.hash.substring(0, 7);
      const date = new Date(entry.date).toISOString().split("T")[0];
      const lineRange = entry.lineStart === entry.lineEnd 
        ? `L${entry.lineStart}` 
        : `L${entry.lineStart}-${entry.lineEnd}`;
      output += `- **${lineRange}** | ${entry.author} | \`${shortHash}\` | ${date}\n`;
    }
  }

  return output;
}
