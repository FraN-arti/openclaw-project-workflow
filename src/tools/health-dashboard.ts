/**
 * Generate project health dashboard with issues, trends, and problem map
 */
export async function executeHealthDashboard(params: {
  repo: string;
  format?: "markdown" | "html" | "json";
}, api: any): Promise<string> {
  const { repo, format = "markdown" } = params;

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
    // Fetch issues
    const issuesUrl = `https://api.github.com/repos/${owner}/${repoName}/issues?state=all&per_page=100`;
    const issuesResponse = await fetch(issuesUrl, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "OpenClaw-Project-Workflow"
      }
    });

    if (!issuesResponse.ok) {
      throw new Error(`GitHub API error: ${issuesResponse.status}`);
    }

    const allIssues = await issuesResponse.json();
    const issues = allIssues.filter((i: any) => !i.pull_request);

    // Analyze issues
    const open = issues.filter((i: any) => i.state === "open");
    const closed = issues.filter((i: any) => i.state === "closed");

    // Group by labels
    const byLabel: Record<string, number> = {};
    for (const issue of open) {
      if (issue.labels && issue.labels.length > 0) {
        for (const label of issue.labels) {
          byLabel[label.name] = (byLabel[label.name] || 0) + 1;
        }
      }
    }

    // Priority detection
    const critical = open.filter((i: any) => 
      i.labels?.some((l: any) => l.name.toLowerCase().includes("critical") || l.name.toLowerCase().includes("bug"))
    );
    const high = open.filter((i: any) => 
      i.labels?.some((l: any) => l.name.toLowerCase().includes("high") || l.name.toLowerCase().includes("enhancement"))
    );

    // Calculate trends (last 7 days)
    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const openedThisWeek = issues.filter((i: any) => new Date(i.created_at).getTime() > weekAgo);
    const closedThisWeek = closed.filter((i: any) => i.closed_at && new Date(i.closed_at).getTime() > weekAgo);

    // Calculate average time to close
    let avgTimeToClose = 0;
    if (closed.length > 0) {
      const times = closed
        .filter((i: any) => i.closed_at)
        .map((i: any) => {
          const created = new Date(i.created_at).getTime();
          const closedAt = new Date(i.closed_at).getTime();
          return (closedAt - created) / (1000 * 60 * 60 * 24); // days
        });
      avgTimeToClose = times.reduce((a, b) => a + b, 0) / times.length;
    }

    // Health score (0-100)
    let healthScore = 100;
    healthScore -= critical.length * 10; // -10 per critical
    healthScore -= high.length * 5; // -5 per high
    healthScore -= Math.max(0, open.length - 10) * 2; // -2 per issue over 10
    healthScore = Math.max(0, Math.min(100, healthScore));

    // Format output
    if (format === "json") {
      return JSON.stringify({
        repo,
        summary: {
          open: open.length,
          closed: closed.length,
          critical: critical.length,
          high: high.length,
          healthScore,
        },
        trends: {
          openedThisWeek: openedThisWeek.length,
          closedThisWeek: closedThisWeek.length,
          avgTimeToClose: avgTimeToClose.toFixed(1),
        },
        byLabel,
      }, null, 2);
    }

    // Markdown format
    let output = `# 📊 Project Health Dashboard: ${repo}\n\n`;
    
    // Health score
    const scoreEmoji = healthScore >= 80 ? "🟢" : healthScore >= 60 ? "🟡" : "🔴";
    output += `## Overall Score: ${healthScore}/100 ${scoreEmoji}\n\n`;

    // Summary
    output += `## Summary\n\n`;
    output += `- **Open issues:** ${open.length}\n`;
    output += `- **Closed issues:** ${closed.length}\n`;
    output += `- **Critical:** ${critical.length} 🔴\n`;
    output += `- **High priority:** ${high.length} 🟡\n\n`;

    // Trends
    output += `## 📈 Trends (Last 7 Days)\n\n`;
    output += `- **Opened:** ${openedThisWeek.length}\n`;
    output += `- **Closed:** ${closedThisWeek.length}\n`;
    output += `- **Average time to close:** ${avgTimeToClose.toFixed(1)} days\n`;
    const trend = closedThisWeek.length > openedThisWeek.length ? "📉 Improving" : "📈 Growing";
    output += `- **Trend:** ${trend}\n\n`;

    // By label
    if (Object.keys(byLabel).length > 0) {
      output += `## 🏷️ Issues by Label\n\n`;
      const sorted = Object.entries(byLabel).sort((a, b) => b[1] - a[1]);
      for (const [label, count] of sorted.slice(0, 10)) {
        output += `- **${label}:** ${count}\n`;
      }
      output += `\n`;
    }

    // Critical issues
    if (critical.length > 0) {
      output += `## 🔴 Critical Issues\n\n`;
      for (const issue of critical.slice(0, 5)) {
        output += `- #${issue.number}: ${issue.title}\n`;
      }
      if (critical.length > 5) {
        output += `\n... and ${critical.length - 5} more\n`;
      }
      output += `\n`;
    }

    // Recommendations
    output += `## 💡 Recommendations\n\n`;
    if (critical.length > 0) {
      output += `1. 🔴 **HIGH PRIORITY:** Fix ${critical.length} critical issue${critical.length > 1 ? "s" : ""}\n`;
    }
    if (open.length > 20) {
      output += `2. 📋 Consider triaging and closing stale issues (${open.length} open)\n`;
    }
    if (avgTimeToClose > 14) {
      output += `3. ⏱️ Average time to close is high (${avgTimeToClose.toFixed(1)} days) - consider faster response\n`;
    }
    if (healthScore >= 80) {
      output += `✅ Project health is good! Keep up the great work!\n`;
    }

    return output;
  } catch (error: any) {
    return `❌ Health dashboard failed: ${error.message}`;
  }
}
