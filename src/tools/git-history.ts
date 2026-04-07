import { getGitLog, getGitBlame, formatGitHistory, type GitHistoryResult } from "../utils/git-utils.js";

/**
 * Analyze git history for files - shows who changed what and when (like codemaps)
 */
export async function executeGitHistory(params: {
  filePath?: string;
  since?: string;
  author?: string;
  maxCommits?: number;
}): Promise<string> {
  const { filePath, since, author, maxCommits = 20 } = params;

  try {
    // Get git log
    const commits = await getGitLog({
      filePath,
      since,
      author,
      maxCommits,
    });

    if (commits.length === 0) {
      return `No git history found${filePath ? ` for ${filePath}` : ""}.`;
    }

    // Get blame if specific file
    let blame = undefined;
    if (filePath) {
      try {
        blame = await getGitBlame({ filePath });
      } catch (error: any) {
        // Blame might fail for new files or binary files
        console.warn(`Blame failed for ${filePath}: ${error.message}`);
      }
    }

    // Build result
    const authors = Array.from(new Set(commits.map((c) => c.author)));
    const dates = commits.map((c) => c.date).sort();

    const result: GitHistoryResult = {
      commits,
      blame,
      summary: {
        totalCommits: commits.length,
        authors,
        dateRange: {
          first: dates[0],
          last: dates[dates.length - 1],
        },
      },
    };

    return formatGitHistory(result, filePath);
  } catch (error: any) {
    return `❌ Git history analysis failed: ${error.message}\n\nMake sure you're in a git repository.`;
  }
}
