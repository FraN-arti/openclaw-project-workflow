/**
 * Semantic Versioning Helper
 * Automatically bumps version based on commit types
 */

import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

interface Version {
  major: number;
  minor: number;
  patch: number;
}

/**
 * Parse version string
 */
function parseVersion(versionString: string): Version {
  const match = versionString.match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!match) {
    throw new Error(`Invalid version format: ${versionString}`);
  }
  
  return {
    major: parseInt(match[1]),
    minor: parseInt(match[2]),
    patch: parseInt(match[3])
  };
}

/**
 * Format version object to string
 */
function formatVersion(version: Version): string {
  return `${version.major}.${version.minor}.${version.patch}`;
}

/**
 * Get current version from package.json
 */
function getCurrentVersion(): Version {
  try {
    const packageJson = JSON.parse(fs.readFileSync("package.json", "utf-8"));
    return parseVersion(packageJson.version);
  } catch (error: any) {
    throw new Error(`Failed to read version: ${error.message}`);
  }
}

/**
 * Determine version bump type from commits
 */
function determineVersionBump(): "major" | "minor" | "patch" {
  try {
    // Get commits since last tag
    let lastTag: string;
    try {
      lastTag = execSync("git describe --tags --abbrev=0", {
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "ignore"]
      }).trim();
    } catch {
      // No tags yet, default to patch
      return "patch";
    }
    
    // Get commit messages
    const log = execSync(`git log ${lastTag}..HEAD --format=%s`, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "ignore"]
    });
    
    const commits = log.split("\n").filter(c => c.trim());
    
    // Check for breaking changes (major bump)
    const hasBreaking = commits.some(c => 
      c.includes("BREAKING CHANGE") || 
      c.includes("!")
    );
    
    if (hasBreaking) {
      return "major";
    }
    
    // Check for features (minor bump)
    const hasFeature = commits.some(c => c.startsWith("feat"));
    
    if (hasFeature) {
      return "minor";
    }
    
    // Default to patch
    return "patch";
  } catch (error: any) {
    // If error, default to patch
    return "patch";
  }
}

/**
 * Bump version
 */
export function bumpVersion(type?: "major" | "minor" | "patch"): string {
  try {
    const current = getCurrentVersion();
    const bumpType = type || determineVersionBump();
    
    const newVersion: Version = { ...current };
    
    switch (bumpType) {
      case "major":
        newVersion.major++;
        newVersion.minor = 0;
        newVersion.patch = 0;
        break;
      case "minor":
        newVersion.minor++;
        newVersion.patch = 0;
        break;
      case "patch":
        newVersion.patch++;
        break;
    }
    
    const newVersionString = formatVersion(newVersion);
    
    // Update package.json
    const packageJson = JSON.parse(fs.readFileSync("package.json", "utf-8"));
    packageJson.version = newVersionString;
    fs.writeFileSync("package.json", JSON.stringify(packageJson, null, 2) + "\n");
    
    return `✅ Version bumped: ${formatVersion(current)} → ${newVersionString} (${bumpType})`;
  } catch (error: any) {
    return `❌ Failed to bump version: ${error.message}`;
  }
}

/**
 * Suggest next version
 */
export function suggestNextVersion(): string {
  try {
    const current = getCurrentVersion();
    const bumpType = determineVersionBump();
    
    const suggested: Version = { ...current };
    
    switch (bumpType) {
      case "major":
        suggested.major++;
        suggested.minor = 0;
        suggested.patch = 0;
        break;
      case "minor":
        suggested.minor++;
        suggested.patch = 0;
        break;
      case "patch":
        suggested.patch++;
        break;
    }
    
    let output = `📦 Current version: ${formatVersion(current)}\n`;
    output += `💡 Suggested next version: ${formatVersion(suggested)} (${bumpType} bump)\n\n`;
    
    output += `Reasoning:\n`;
    
    if (bumpType === "major") {
      output += `- ⚠️ Breaking changes detected\n`;
    } else if (bumpType === "minor") {
      output += `- ✨ New features added\n`;
    } else {
      output += `- 🐛 Bug fixes or minor changes\n`;
    }
    
    output += `\nTo bump version:\n`;
    output += `  npm version ${bumpType}\n`;
    output += `  git push --tags\n`;
    
    return output;
  } catch (error: any) {
    return `❌ Failed to suggest version: ${error.message}`;
  }
}

/**
 * Create git tag for current version
 */
export function createVersionTag(): string {
  try {
    const current = getCurrentVersion();
    const versionString = formatVersion(current);
    const tagName = `v${versionString}`;
    
    // Check if tag already exists
    try {
      execSync(`git rev-parse ${tagName}`, {
        stdio: "ignore"
      });
      return `⚠️ Tag ${tagName} already exists`;
    } catch {
      // Tag doesn't exist, create it
    }
    
    // Create tag
    execSync(`git tag -a ${tagName} -m "Release ${versionString}"`, {
      stdio: "ignore"
    });
    
    return `✅ Created tag: ${tagName}\n\nTo push tag:\n  git push origin ${tagName}`;
  } catch (error: any) {
    return `❌ Failed to create tag: ${error.message}`;
  }
}
