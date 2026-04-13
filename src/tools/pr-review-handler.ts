/**
 * Handle PR review comments - analyze, suggest fixes, and respond
 */
export async function executePrReviewHandler(params: {
  repo: string;
  prNumber: number;
  mode?: "auto" | "suggest" | "manual";
}, api: any): Promise<string> {
  const { repo, prNumber, mode = "suggest" } = params;

  // Check if GitHub integration is enabled
  if (!api.config.githubIntegration) {
    return `❌ GitHub integration is disabled. Enable it in config.`;
  }

  const token = api.config.github?.token;
  if (!token) {
    return `❌ GitHub token not configured.`;
  }

  const [owner, repoName] = repo.split("/");
  if (!owner || !repoName) {
    return `❌ Invalid repo format. Use: owner/repo`;
  }

  try {
    // Fetch PR details
    const prUrl = `https://api.github.com/repos/${owner}/${repoName}/pulls/${prNumber}`;
    const prResponse = await fetch(prUrl, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "OpenClaw-Project-Workflow"
      }
    });

    if (!prResponse.ok) {
      throw new Error(`GitHub API error: ${prResponse.status}`);
    }

    const pr = await prResponse.json();

    // Fetch review comments
    const commentsUrl = `https://api.github.com/repos/${owner}/${repoName}/pulls/${prNumber}/comments`;
    const commentsResponse = await fetch(commentsUrl, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "OpenClaw-Project-Workflow"
      }
    });

    if (!commentsResponse.ok) {
      throw new Error(`Failed to fetch comments: ${commentsResponse.status}`);
    }

    const comments = await commentsResponse.json();

    if (!Array.isArray(comments) || comments.length === 0) {
      return `✅ No review comments found for PR #${prNumber}`;
    }

    // Group comments by file
    const byFile: Record<string, any[]> = {};
    for (const comment of comments) {
      const file = comment.path || "general";
      if (!byFile[file]) {
        byFile[file] = [];
      }
      byFile[file].push(comment);
    }

    // Format output
    let output = `# 🔍 PR Review Analysis: #${prNumber}\n\n`;
    output += `**Title:** ${pr.title}\n`;
    output += `**Status:** ${pr.state}\n`;
    output += `**Comments:** ${comments.length}\n\n`;

    output += `## 📝 Review Comments by File\n\n`;

    for (const [file, fileComments] of Object.entries(byFile)) {
      output += `### ${file}\n\n`;
      
      for (const comment of fileComments) {
        const author = comment.user?.login || "unknown";
        const line = comment.line || comment.original_line || "?";
        const body = comment.body || "";
        
        output += `**Line ${line}** (by @${author}):\n`;
        output += `> ${body}\n\n`;

        // Analyze comment and suggest fix
        const suggestion = analyzeComment(body, file);
        if (suggestion) {
          output += `💡 **Suggested action:** ${suggestion}\n\n`;
        }
      }
    }

    output += `---\n\n`;

    if (mode === "auto") {
      output += `**Mode: AUTO** - AI will automatically fix all comments and push changes.\n`;
      output += `⚠️ This feature is not yet implemented. Use "suggest" mode for now.\n\n`;
    } else if (mode === "suggest") {
      output += `**Mode: SUGGEST** - Review suggestions above and apply manually.\n\n`;
      output += `**Next steps:**\n`;
      output += `1. Review each suggestion\n`;
      output += `2. Make changes locally\n`;
      output += `3. Commit and push\n`;
      output += `4. Reply to comments on GitHub\n\n`;
    } else {
      output += `**Mode: MANUAL** - Analysis only, no suggestions.\n\n`;
    }

    return output;
  } catch (error: any) {
    return `❌ PR review handler failed: ${error.message}`;
  }
}

/**
 * Analyze review comment and suggest action
 */
function analyzeComment(body: string, file: string): string | null {
  const lower = body.toLowerCase();

  // Common patterns
  if (lower.includes("typo") || lower.includes("spelling")) {
    return "Fix typo in text";
  }

  if (lower.includes("rename") || lower.includes("should be called")) {
    return "Rename variable/function as suggested";
  }

  if (lower.includes("remove") || lower.includes("delete") || lower.includes("unnecessary")) {
    return "Remove unnecessary code";
  }

  if (lower.includes("add") || lower.includes("missing")) {
    return "Add missing code/documentation";
  }

  if (lower.includes("refactor") || lower.includes("simplify")) {
    return "Refactor code for better readability";
  }

  if (lower.includes("test") || lower.includes("coverage")) {
    return "Add tests for this code";
  }

  if (lower.includes("security") || lower.includes("vulnerability")) {
    return "⚠️ Fix security issue (HIGH PRIORITY)";
  }

  if (lower.includes("performance") || lower.includes("optimize")) {
    return "Optimize performance";
  }

  if (lower.includes("documentation") || lower.includes("comment")) {
    return "Add/update documentation";
  }

  // Generic suggestion
  if (lower.includes("?")) {
    return "Answer question in comment";
  }

  return null;
}
