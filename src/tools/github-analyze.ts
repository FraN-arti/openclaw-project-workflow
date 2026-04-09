/**
 * Analyze GitHub repository data via GitHub REST API
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

  // Check if GitHub integration is enabled
  if (!api.config.githubIntegration) {
    return `❌ GitHub integration is disabled.\n\nEnable it in config:\n{\n  "githubIntegration": true,\n  "github": {\n    "token": "ghp_your_token_here"\n  }\n}`;
  }

  // Check if token is configured
  const token = api.config.github?.token;
  if (!token) {
    return `❌ GitHub token not configured.\n\nAdd to your OpenClaw config (~/.openclaw/openclaw.json):\n\n{\n  "plugins": {\n    "entries": {\n      "project-workflow": {\n        "config": {\n          "githubIntegration": true,\n          "github": {\n            "token": "ghp_your_token_here",\n            "defaultRepo": "owner/repo"\n          }\n        }\n      }\n    }\n  }\n}\n\nGet token at: https://github.com/settings/tokens\nRequired scope: repo (Full control of private repositories)`;
  }

  // Parse repo (owner/repo)
  const [owner, repoName] = repo.split("/");
  if (!owner || !repoName) {
    return `❌ Invalid repo format. Use: owner/repo (e.g., "octocat/Hello-World")`;
  }

  try {
    let result: string;

    switch (type) {
      case "pr":
        result = await analyzePRs(owner, repoName, limit, token);
        break;
      case "issues":
        result = await analyzeIssues(owner, repoName, limit, token);
        break;
      case "commits":
        result = await analyzeCommits(owner, repoName, limit, token);
        break;
      default:
        return `❌ Unknown type: ${type}. Use: pr, issues, or commits`;
    }

    return result;
  } catch (error: any) {
    if (error.message?.includes("401")) {
      return `❌ GitHub authentication failed. Check your token.\n\nToken should have 'repo' scope.\nGet new token at: https://github.com/settings/tokens`;
    }
    if (error.message?.includes("404")) {
      return `❌ Repository not found: ${owner}/${repoName}\n\nMake sure:\n1. Repository exists\n2. You have access to it\n3. Token has correct permissions`;
    }
    return `❌ GitHub analysis failed: ${error.message}`;
  }
}

/**
 * Analyze Pull Requests
 */
async function analyzePRs(owner: string, repo: string, limit: number, token: string): Promise<string> {
  const url = `https://api.github.com/repos/${owner}/${repo}/pulls?state=all&per_page=${limit}`;
  
  const response = await fetch(url, {
    headers: {
      "Authorization": `Bearer ${token}`,
      "Accept": "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "OpenClaw-Project-Workflow"
    }
  });

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
  }

  const prs = await response.json();

  if (!Array.isArray(prs) || prs.length === 0) {
    return `No PRs found in ${owner}/${repo}`;
  }

  let output = `# 🔗 GitHub PRs: ${owner}/${repo}\n\n`;
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
async function analyzeIssues(owner: string, repo: string, limit: number, token: string): Promise<string> {
  const url = `https://api.github.com/repos/${owner}/${repo}/issues?state=all&per_page=${limit}`;
  
  const response = await fetch(url, {
    headers: {
      "Authorization": `Bearer ${token}`,
      "Accept": "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "OpenClaw-Project-Workflow"
    }
  });

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
  }

  const issues = await response.json();

  if (!Array.isArray(issues) || issues.length === 0) {
    return `No issues found in ${owner}/${repo}`;
  }

  let output = `# 🐛 GitHub Issues: ${owner}/${repo}\n\n`;
  
  // Filter out PRs (they appear in issues list too)
  const realIssues = issues.filter(issue => !issue.pull_request);
  
  if (realIssues.length === 0) {
    return `No issues found in ${owner}/${repo} (only PRs)`;
  }

  output += `## Recent Issues (${realIssues.length})\n\n`;
  
  for (const issue of realIssues) {
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
async function analyzeCommits(owner: string, repo: string, limit: number, token: string): Promise<string> {
  const url = `https://api.github.com/repos/${owner}/${repo}/commits?per_page=${limit}`;
  
  const response = await fetch(url, {
    headers: {
      "Authorization": `Bearer ${token}`,
      "Accept": "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "OpenClaw-Project-Workflow"
    }
  });

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
  }

  const commits = await response.json();

  if (!Array.isArray(commits) || commits.length === 0) {
    return `No commits found in ${owner}/${repo}`;
  }

  let output = `# 📝 GitHub Commits: ${owner}/${repo}\n\n`;
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
