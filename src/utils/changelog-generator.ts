/**
 * Automatic Changelog Generator
 * Generates CHANGELOG.md from git commit history
 */

import { execSync } from "child_process";

interface Commit {
  hash: string;
  type: string;
  scope?: string;
  subject: string;
  body?: string;
  breaking: boolean;
  issues: number[];
}

interface ChangelogSection {
  title: string;
  commits: Commit[];
}

/**
 * Parse conventional commit message
 */
function parseCommit(message: string, hash: string): Commit | null {
  // Format: type(scope): subject
  const conventionalRegex = /^(\w+)(?:\(([^)]+)\))?: (.+)$/;
  const lines = message.split("\n");
  const firstLine = lines[0];
  
  const match = firstLine.match(conventionalRegex);
  if (!match) {
    return null; // Not a conventional commit
  }
  
  const [, type, scope, subject] = match;
  const body = lines.slice(1).join("\n").trim();
  
  // Check for breaking changes
  const breaking = body.includes("BREAKING CHANGE") || firstLine.includes("!");
  
  // Extract issue numbers
  const issueRegex = /#(\d+)/g;
  const issues: number[] = [];
  let issueMatch;
  while ((issueMatch = issueRegex.exec(message)) !== null) {
    issues.push(parseInt(issueMatch[1]));
  }
  
  return {
    hash,
    type,
    scope,
    subject,
    body: body || undefined,
    breaking,
    issues
  };
}

/**
 * Get commits since last tag
 */
function getCommitsSinceLastTag(): Commit[] {
  try {
    // Get last tag
    let lastTag: string;
    try {
      lastTag = execSync("git describe --tags --abbrev=0", {
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "ignore"]
      }).trim();
    } catch {
      // No tags yet, get all commits
      lastTag = "";
    }
    
    // Get commits
    const range = lastTag ? `${lastTag}..HEAD` : "HEAD";
    const log = execSync(`git log ${range} --format=%H|||%s|||%b|||END`, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "ignore"]
    });
    
    const commits: Commit[] = [];
    const entries = log.split("|||END").filter(e => e.trim());
    
    for (const entry of entries) {
      const [hash, subject, body] = entry.split("|||").map(s => s.trim());
      const message = `${subject}\n${body}`;
      const commit = parseCommit(message, hash);
      
      if (commit) {
        commits.push(commit);
      }
    }
    
    return commits;
  } catch (error: any) {
    throw new Error(`Failed to get commits: ${error.message}`);
  }
}

/**
 * Group commits by type
 */
function groupCommits(commits: Commit[]): ChangelogSection[] {
  const sections: Map<string, Commit[]> = new Map();
  
  // Define section order and titles
  const sectionTitles: Record<string, string> = {
    feat: "✨ Features",
    fix: "🐛 Bug Fixes",
    perf: "⚡ Performance",
    refactor: "♻️ Refactoring",
    docs: "📝 Documentation",
    style: "💄 Styling",
    test: "✅ Tests",
    build: "🔧 Build",
    ci: "👷 CI/CD",
    chore: "🔨 Chores"
  };
  
  // Group commits
  for (const commit of commits) {
    if (!sections.has(commit.type)) {
      sections.set(commit.type, []);
    }
    sections.get(commit.type)!.push(commit);
  }
  
  // Convert to sections with proper order
  const result: ChangelogSection[] = [];
  
  // Breaking changes first
  const breakingCommits = commits.filter(c => c.breaking);
  if (breakingCommits.length > 0) {
    result.push({
      title: "⚠️ BREAKING CHANGES",
      commits: breakingCommits
    });
  }
  
  // Then other sections in order
  for (const [type, title] of Object.entries(sectionTitles)) {
    const typeCommits = sections.get(type);
    if (typeCommits && typeCommits.length > 0) {
      result.push({
        title,
        commits: typeCommits.filter(c => !c.breaking) // Exclude breaking (already shown)
      });
    }
  }
  
  return result;
}

/**
 * Format changelog section
 */
function formatSection(section: ChangelogSection): string {
  let output = `### ${section.title}\n\n`;
  
  for (const commit of section.commits) {
    const scope = commit.scope ? `**${commit.scope}:** ` : "";
    const issues = commit.issues.length > 0 
      ? ` (${commit.issues.map(n => `#${n}`).join(", ")})`
      : "";
    const hash = commit.hash.substring(0, 7);
    
    output += `- ${scope}${commit.subject}${issues} ([${hash}](../../commit/${commit.hash}))\n`;
  }
  
  output += "\n";
  return output;
}

/**
 * Generate changelog for unreleased changes
 */
export function generateChangelog(version?: string): string {
  try {
    const commits = getCommitsSinceLastTag();
    
    if (commits.length === 0) {
      return "No changes since last release.";
    }
    
    const sections = groupCommits(commits);
    
    // Header
    const date = new Date().toISOString().split("T")[0];
    const versionHeader = version ? `## [${version}] - ${date}` : `## [Unreleased]`;
    
    let changelog = `${versionHeader}\n\n`;
    
    // Sections
    for (const section of sections) {
      if (section.commits.length > 0) {
        changelog += formatSection(section);
      }
    }
    
    return changelog;
  } catch (error: any) {
    return `❌ Failed to generate changelog: ${error.message}`;
  }
}

/**
 * Update CHANGELOG.md file
 */
export function updateChangelogFile(version?: string): string {
  try {
    const newEntry = generateChangelog(version);
    
    // Read existing changelog
    let existingChangelog = "";
    try {
      const fs = require("fs");
      existingChangelog = fs.readFileSync("CHANGELOG.md", "utf-8");
    } catch {
      // No existing changelog
      existingChangelog = "# Changelog\n\nAll notable changes to this project will be documented in this file.\n\n";
    }
    
    // Insert new entry after header
    const lines = existingChangelog.split("\n");
    const headerEnd = lines.findIndex((line, i) => i > 0 && line.startsWith("##"));
    
    if (headerEnd === -1) {
      // No existing entries, append
      existingChangelog += "\n" + newEntry;
    } else {
      // Insert before first entry
      lines.splice(headerEnd, 0, newEntry);
      existingChangelog = lines.join("\n");
    }
    
    // Write back
    const fs = require("fs");
    fs.writeFileSync("CHANGELOG.md", existingChangelog);
    
    return `✅ CHANGELOG.md updated with ${version || "unreleased"} changes`;
  } catch (error: any) {
    return `❌ Failed to update CHANGELOG.md: ${error.message}`;
  }
}
