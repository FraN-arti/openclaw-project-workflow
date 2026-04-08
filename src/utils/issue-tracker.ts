/**
 * GitHub Issue Tracker Integration
 * Automatically links commits to issues and suggests closing them
 */

import { execSync } from "child_process";

interface IssueReference {
  number: number;
  action: "closes" | "fixes" | "resolves" | "references";
  keyword: string;
}

/**
 * Extract issue references from commit message
 */
export function extractIssueReferences(message: string): IssueReference[] {
  const references: IssueReference[] = [];
  
  // Patterns that close issues
  const closePatterns = [
    /(?:close|closes|closed)\s+#(\d+)/gi,
    /(?:fix|fixes|fixed)\s+#(\d+)/gi,
    /(?:resolve|resolves|resolved)\s+#(\d+)/gi,
  ];
  
  // Pattern that just references
  const referencePattern = /#(\d+)/g;
  
  // Check closing patterns first
  for (const pattern of closePatterns) {
    let match;
    while ((match = pattern.exec(message)) !== null) {
      const number = parseInt(match[1]);
      const keyword = match[0].split(" ")[0].toLowerCase();
      
      references.push({
        number,
        action: keyword.startsWith("close") ? "closes" :
                keyword.startsWith("fix") ? "fixes" : "resolves",
        keyword: match[0]
      });
    }
  }
  
  // Find all references (that aren't already in closing patterns)
  const closedNumbers = new Set(references.map(r => r.number));
  let match;
  while ((match = referencePattern.exec(message)) !== null) {
    const number = parseInt(match[1]);
    if (!closedNumbers.has(number)) {
      references.push({
        number,
        action: "references",
        keyword: match[0]
      });
    }
  }
  
  return references;
}

/**
 * Suggest issue references for commit message
 */
export function suggestIssueReferences(
  changes: string,
  openIssues?: Array<{ number: number; title: string }>
): string {
  let suggestions = "";
  
  // Analyze changes to suggest relevant issues
  const keywords = changes.toLowerCase();
  
  if (openIssues && openIssues.length > 0) {
    suggestions += "\n💡 Open issues that might be related:\n";
    
    for (const issue of openIssues.slice(0, 5)) {
      const titleLower = issue.title.toLowerCase();
      
      // Simple keyword matching
      const changeWords = keywords.split(/\s+/);
      const titleWords = titleLower.split(/\s+/);
      const matches = changeWords.filter(w => w.length > 3 && titleWords.includes(w));
      
      if (matches.length > 0) {
        suggestions += `  - #${issue.number}: ${issue.title}\n`;
      }
    }
    
    suggestions += "\nTo close an issue, add to commit message:\n";
    suggestions += "  - 'Fixes #123' or 'Closes #123' or 'Resolves #123'\n";
    suggestions += "To reference without closing:\n";
    suggestions += "  - 'Related to #123' or just '#123'\n";
  }
  
  return suggestions;
}

/**
 * Enhance commit message with issue references
 */
export function enhanceCommitWithIssues(
  baseMessage: string,
  issueNumbers: number[],
  action: "closes" | "fixes" | "resolves" | "references" = "fixes"
): string {
  if (issueNumbers.length === 0) {
    return baseMessage;
  }
  
  const issueRefs = issueNumbers.map(n => `#${n}`).join(", ");
  
  if (action === "references") {
    return `${baseMessage}\n\nRelated to ${issueRefs}`;
  } else {
    const actionWord = action.charAt(0).toUpperCase() + action.slice(1);
    return `${baseMessage}\n\n${actionWord} ${issueRefs}`;
  }
}

/**
 * Check if current branch is linked to an issue
 */
export function getBranchIssueNumber(): number | null {
  try {
    const branch = execSync("git rev-parse --abbrev-ref HEAD", {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "ignore"]
    }).trim();
    
    // Common patterns: issue-123, feature/123-description, 123-fix-bug
    const patterns = [
      /issue-(\d+)/i,
      /^(\d+)-/,
      /\/(\d+)-/,
    ];
    
    for (const pattern of patterns) {
      const match = branch.match(pattern);
      if (match) {
        return parseInt(match[1]);
      }
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * Format issue tracker suggestions for display
 */
export function formatIssueTrackerSuggestions(
  commitMessage: string,
  branchIssue: number | null,
  openIssues?: Array<{ number: number; title: string }>
): string {
  let output = "\n" + "=".repeat(60) + "\n";
  output += "🔗 ISSUE TRACKER INTEGRATION\n";
  output += "=".repeat(60) + "\n";
  
  // Check if commit already has issue references
  const existingRefs = extractIssueReferences(commitMessage);
  
  if (existingRefs.length > 0) {
    output += "\n✅ Commit already references issues:\n";
    for (const ref of existingRefs) {
      const action = ref.action === "references" ? "References" : 
                     ref.action.charAt(0).toUpperCase() + ref.action.slice(1);
      output += `  - ${action} #${ref.number}\n`;
    }
  }
  
  // Suggest branch issue
  if (branchIssue && !existingRefs.find(r => r.number === branchIssue)) {
    output += `\n💡 Current branch appears to be for issue #${branchIssue}\n`;
    output += `   Consider adding: "Fixes #${branchIssue}"\n`;
  }
  
  // Suggest related open issues
  if (openIssues && openIssues.length > 0) {
    const suggestions = suggestIssueReferences(commitMessage, openIssues);
    if (suggestions) {
      output += suggestions;
    }
  }
  
  output += "\n" + "=".repeat(60) + "\n";
  
  return output;
}
