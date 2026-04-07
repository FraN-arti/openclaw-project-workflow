/**
 * Analyze GitHub repository data via Composio
 */
export async function executeGithubAnalyze(
  params: {
    repo: string;
    type: "pr" | "issues" | "commits";
    limit?: number;
  },
  api: any
): Promise<string> {
  const { repo, type, limit = 10 } = params;

  // Parse repo (owner/repo)
  const [owner, repoName] = repo.split("/");
  if (!owner || !repoName) {
    return `❌ Invalid repo format. Use: owner/repo (e.g., "octocat/Hello-World")`;
  }

  try {
    let result: string;

    switch (type) {
      case "pr":
        result = await analyzePRs(owner, repoName, limit, api);
        break;
      case "issues":
        result = await analyzeIssues(owner, repoName, limit, api);
        break;
      case "commits":
        result = await analyzeCommits(owner, repoName, limit, api);
        break;
      default:
        return `❌ Unknown type: ${type}. Use: pr, issues, or commits`;
    }

    return result;
  } catch (error: any) {
    if (error.message?.includes("Composio")) {
      return `❌ GitHub integration requires Composio.\n\nPlease set up Composio first:\n1. Install: npm install -g composio-core\n2. Configure: openclaw composio setup --key <your-key>\n3. Connect GitHub at: https://dashboard.composio.dev`;
    }
    return `❌ GitHub analysis failed: ${error.message}`;
  }
}

/**
 * Analyze Pull Requests
 */
async function analyzePRs(owner: string, repo: string, limit: number, api: any): Promise<string> {
  // Use Composio GitHub tools
  const result = await api.runtime.callTool("GITHUB_LIST_PULL_REQUESTS", {
    owner,
    repo,
    state: "all",
    per_page: limit,
  });

  if (!result || !result.data) {
    return `No PRs found in ${owner}/${repo}`;
  }

  let output = `# 🔗 GitHub PRs: ${owner}/${repo}\n\n`;
  
  const prs = result.data.pull_requests || result.data || [];
  
  if (prs.length === 0) {
    return `No PRs found in ${owner}/${repo}`;
  }

  output += `## Recent Pull Requests (${prs.length})\n\n`;
  
  for (const pr of prs) {
    const state = pr.state === "open" ? "🟢 Open" : pr.merged_at ? "🟣 Merged" : "🔴 Closed";
    const date = new Date(pr.created_at).toISOString().split("T")[0];
    output += `### #${pr.number}: ${pr.title}\n`;
    output += `- **Status:** ${state}\n`;
    output += `- **Author:** ${pr.user?.login || "unknown"}\n`;
    output += `- **Created:** ${date}\n`;
    output += `- **URL:** ${pr.html_url}\n`;
    if (pr.body) {
      const preview = pr.body.substring(0, 150);
      output += `- **Description:** ${preview}${pr.body.length > 150 ? "..." : ""}\n`;
    }
    output += `\n`;
  }

  return output;
}

/**
 * Analyze Issues
 */
async function analyzeIssues(owner: string, repo: string, limit: number, api: any): Promise<string> {
  const result = await api.runtime.callTool("GITHUB_LIST_REPOSITORY_ISSUES", {
    owner,
    repo,
    state: "all",
    per_page: limit,
  });

  if (!result || !result.data) {
    return `No issues found in ${owner}/${repo}`;
  }

  let output = `# 🐛 GitHub Issues: ${owner}/${repo}\n\n`;
  
  const issues = result.data.issues || result.data || [];
  
  if (issues.length === 0) {
    return `No issues found in ${owner}/${repo}`;
  }

  output += `## Recent Issues (${issues.length})\n\n`;
  
  for (const issue of issues) {
    // Skip PRs (they appear in issues list too)
    if (issue.pull_request) continue;

    const state = issue.state === "open" ? "🟢 Open" : "🔴 Closed";
    const date = new Date(issue.created_at).toISOString().split("T")[0];
    output += `### #${issue.number}: ${issue.title}\n`;
    output += `- **Status:** ${state}\n`;
    output += `- **Author:** ${issue.user?.login || "unknown"}\n`;
    output += `- **Created:** ${date}\n`;
    output += `- **Comments:** ${issue.comments || 0}\n`;
    if (issue.labels && issue.labels.length > 0) {
      const labels = issue.labels.map((l: any) => l.name).join(", ");
      output += `- **Labels:** ${labels}\n`;
    }
    output += `- **URL:** ${issue.html_url}\n`;
    output += `\n`;
  }

  return output;
}

/**
 * Analyze Commits
 */
async function analyzeCommits(owner: string, repo: string, limit: number, api: any): Promise<string> {
  const result = await api.runtime.callTool("GITHUB_LIST_COMMITS", {
    owner,
    repo,
    per_page: limit,
  });

  if (!result || !result.data) {
    return `No commits found in ${owner}/${repo}`;
  }

  let output = `# 📝 GitHub Commits: ${owner}/${repo}\n\n`;
  
  const commits = result.data.commits || result.data || [];
  
  if (commits.length === 0) {
    return `No commits found in ${owner}/${repo}`;
  }

  output += `## Recent Commits (${commits.length})\n\n`;
  
  for (const commit of commits) {
    const sha = commit.sha.substring(0, 7);
    const author = commit.commit?.author?.name || commit.author?.login || "unknown";
    const date = new Date(commit.commit?.author?.date || commit.commit?.committer?.date).toISOString().split("T")[0];
    const message = commit.commit?.message || "";
    const firstLine = message.split("\n")[0];
    
    output += `- **${date}** | ${author} | \`${sha}\` | ${firstLine}\n`;
  }

  return output;
}
