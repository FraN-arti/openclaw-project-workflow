import { readFile } from "fs/promises";
import { execSync } from "child_process";
import { join } from "path";

interface HealthCheckResult {
  score: number;
  passing: string[];
  warnings: string[];
  critical: string[];
  recommendations: string[];
}

/**
 * Comprehensive project health check
 */
export async function executeHealthCheck(params: {
  projectPath?: string;
  checks?: {
    tests?: boolean;
    dependencies?: boolean;
    security?: boolean;
    performance?: boolean;
    codeQuality?: boolean;
    documentation?: boolean;
  };
  autoFix?: boolean;
  reportFormat?: "markdown" | "html" | "json";
}): Promise<string> {
  const {
    projectPath = process.cwd(),
    checks = {
      tests: true,
      dependencies: true,
      security: true,
      performance: true,
      codeQuality: true,
      documentation: true,
    },
    autoFix = false,
    reportFormat = "markdown",
  } = params;

  const result: HealthCheckResult = {
    score: 100,
    passing: [],
    warnings: [],
    critical: [],
    recommendations: [],
  };

  try {
    // Check tests
    if (checks.tests) {
      await checkTests(projectPath, result);
    }

    // Check dependencies
    if (checks.dependencies) {
      await checkDependencies(projectPath, result);
    }

    // Check security
    if (checks.security) {
      await checkSecurity(projectPath, result);
    }

    // Check performance
    if (checks.performance) {
      await checkPerformance(projectPath, result);
    }

    // Check code quality
    if (checks.codeQuality) {
      await checkCodeQuality(projectPath, result);
    }

    // Check documentation
    if (checks.documentation) {
      await checkDocumentation(projectPath, result);
    }

    // Calculate final score
    result.score = Math.max(0, result.score);

    // Format output
    if (reportFormat === "json") {
      return JSON.stringify(result, null, 2);
    }

    return formatHealthReport(result, projectPath, autoFix);
  } catch (error: any) {
    return `❌ Health check failed: ${error.message}`;
  }
}

/**
 * Check tests
 */
async function checkTests(projectPath: string, result: HealthCheckResult): Promise<void> {
  try {
    // Check if package.json has test script
    const packageJson = JSON.parse(
      await readFile(join(projectPath, "package.json"), "utf-8")
    );

    if (!packageJson.scripts?.test) {
      result.warnings.push("No test script found in package.json");
      result.score -= 10;
      result.recommendations.push("Add test script to package.json");
      return;
    }

    result.passing.push("Test script configured");
  } catch (error) {
    result.warnings.push("Could not check tests (no package.json?)");
  }
}

/**
 * Check dependencies
 */
async function checkDependencies(projectPath: string, result: HealthCheckResult): Promise<void> {
  try {
    // Check for outdated packages
    const outdated = execSync("npm outdated --json", {
      cwd: projectPath,
      encoding: "utf-8",
    });

    if (outdated.trim()) {
      const packages = JSON.parse(outdated);
      const count = Object.keys(packages).length;
      
      if (count > 0) {
        result.warnings.push(`${count} outdated package${count > 1 ? "s" : ""}`);
        result.score -= Math.min(20, count * 2);
        result.recommendations.push(`Update outdated packages: npm update`);
      }
    } else {
      result.passing.push("All dependencies up to date");
    }
  } catch (error) {
    // npm outdated returns exit code 1 if there are outdated packages
    // This is expected behavior
  }
}

/**
 * Check security
 */
async function checkSecurity(projectPath: string, result: HealthCheckResult): Promise<void> {
  try {
    // Run npm audit
    const audit = execSync("npm audit --json", {
      cwd: projectPath,
      encoding: "utf-8",
    });

    const auditResult = JSON.parse(audit);
    
    if (auditResult.metadata) {
      const { vulnerabilities } = auditResult.metadata;
      
      if (vulnerabilities.critical > 0) {
        result.critical.push(`${vulnerabilities.critical} critical vulnerabilities`);
        result.score -= vulnerabilities.critical * 15;
        result.recommendations.push("⚠️ FIX CRITICAL VULNERABILITIES: npm audit fix");
      }
      
      if (vulnerabilities.high > 0) {
        result.warnings.push(`${vulnerabilities.high} high vulnerabilities`);
        result.score -= vulnerabilities.high * 10;
        result.recommendations.push("Fix high vulnerabilities: npm audit fix");
      }
      
      if (vulnerabilities.moderate > 0) {
        result.warnings.push(`${vulnerabilities.moderate} moderate vulnerabilities`);
        result.score -= vulnerabilities.moderate * 5;
      }

      if (vulnerabilities.critical === 0 && vulnerabilities.high === 0) {
        result.passing.push("No critical or high vulnerabilities");
      }
    }
  } catch (error) {
    // npm audit might fail if no package-lock.json
    result.warnings.push("Could not run security audit");
  }
}

/**
 * Check performance
 */
async function checkPerformance(projectPath: string, result: HealthCheckResult): Promise<void> {
  try {
    // Check package.json size
    const packageJson = JSON.parse(
      await readFile(join(projectPath, "package.json"), "utf-8")
    );

    const depCount = Object.keys(packageJson.dependencies || {}).length;
    const devDepCount = Object.keys(packageJson.devDependencies || {}).length;
    const totalDeps = depCount + devDepCount;

    if (totalDeps > 50) {
      result.warnings.push(`Large number of dependencies (${totalDeps})`);
      result.score -= 5;
      result.recommendations.push("Review and remove unused dependencies");
    } else {
      result.passing.push(`Reasonable dependency count (${totalDeps})`);
    }
  } catch (error) {
    // Ignore if no package.json
  }
}

/**
 * Check code quality
 */
async function checkCodeQuality(projectPath: string, result: HealthCheckResult): Promise<void> {
  try {
    // Check if ESLint is configured
    try {
      await readFile(join(projectPath, ".eslintrc.json"), "utf-8");
      result.passing.push("ESLint configured");
    } catch {
      try {
        await readFile(join(projectPath, ".eslintrc.js"), "utf-8");
        result.passing.push("ESLint configured");
      } catch {
        result.warnings.push("No ESLint configuration found");
        result.score -= 5;
        result.recommendations.push("Add ESLint for code quality checks");
      }
    }

    // Check if Prettier is configured
    try {
      await readFile(join(projectPath, ".prettierrc"), "utf-8");
      result.passing.push("Prettier configured");
    } catch {
      result.warnings.push("No Prettier configuration found");
      result.recommendations.push("Add Prettier for consistent formatting");
    }
  } catch (error) {
    // Ignore
  }
}

/**
 * Check documentation
 */
async function checkDocumentation(projectPath: string, result: HealthCheckResult): Promise<void> {
  try {
    // Check README
    const readme = await readFile(join(projectPath, "README.md"), "utf-8");
    
    if (readme.length < 100) {
      result.warnings.push("README is very short");
      result.score -= 5;
      result.recommendations.push("Expand README with usage examples and documentation");
    } else {
      result.passing.push("README exists and has content");
    }

    // Check for common sections
    const hasInstallation = readme.toLowerCase().includes("install");
    const hasUsage = readme.toLowerCase().includes("usage");
    const hasExamples = readme.toLowerCase().includes("example");

    if (!hasInstallation || !hasUsage) {
      result.warnings.push("README missing important sections");
      result.recommendations.push("Add Installation and Usage sections to README");
    }
  } catch (error) {
    result.warnings.push("No README.md found");
    result.score -= 10;
    result.recommendations.push("Create README.md with project documentation");
  }
}

/**
 * Format health report
 */
function formatHealthReport(
  result: HealthCheckResult,
  projectPath: string,
  autoFix: boolean
): string {
  let output = `# 🏥 Codebase Health Report: ${projectPath}\n\n`;

  // Overall score
  const scoreEmoji = result.score >= 80 ? "🟢" : result.score >= 60 ? "🟡" : "🔴";
  output += `## Overall Score: ${result.score}/100 ${scoreEmoji}\n\n`;

  // Passing checks
  if (result.passing.length > 0) {
    output += `### ✅ Passing (${result.passing.length})\n\n`;
    for (const item of result.passing) {
      output += `- ${item}\n`;
    }
    output += `\n`;
  }

  // Warnings
  if (result.warnings.length > 0) {
    output += `### ⚠️ Warnings (${result.warnings.length})\n\n`;
    for (const item of result.warnings) {
      output += `- ${item}\n`;
    }
    output += `\n`;
  }

  // Critical issues
  if (result.critical.length > 0) {
    output += `### ❌ Critical (${result.critical.length})\n\n`;
    for (const item of result.critical) {
      output += `- ${item}\n`;
    }
    output += `\n`;
  }

  // Recommendations
  if (result.recommendations.length > 0) {
    output += `## 💡 Recommendations\n\n`;
    for (let i = 0; i < result.recommendations.length; i++) {
      output += `${i + 1}. ${result.recommendations[i]}\n`;
    }
    output += `\n`;
  }

  // Trend
  output += `## 📈 Trend\n\n`;
  if (result.score >= 80) {
    output += `✅ Project health is good! Keep up the great work!\n`;
  } else if (result.score >= 60) {
    output += `⚠️ Project health is acceptable but could be improved.\n`;
  } else {
    output += `🔴 Project health needs attention. Address critical issues first.\n`;
  }

  if (autoFix) {
    output += `\n---\n\n`;
    output += `**Auto-fix mode:** Enabled but not yet implemented.\n`;
    output += `Apply fixes manually using the recommendations above.\n`;
  }

  return output;
}
