/**
 * Smart hook that runs before edit/write operations
 * Automatically analyzes context to help make informed changes
 */

import { executeGitHistory } from "../tools/git-history.js";
import { executeGatherContext } from "../tools/gather-context.js";
import { executeCheckIntegration } from "../tools/check-integration.js";

interface BeforeEditContext {
  tool: string;
  params: any;
}

interface AnalysisResult {
  shouldProceed: boolean;
  analysis: string;
  warnings?: string[];
}

/**
 * Analyzes file context before editing
 */
export async function analyzeBeforeEdit(
  ctx: BeforeEditContext,
  api: any
): Promise<AnalysisResult> {
  const filePath = ctx.params.path;
  
  if (!filePath) {
    return {
      shouldProceed: true,
      analysis: "No file path provided, skipping analysis"
    };
  }

  const analysisResults: string[] = [];
  const warnings: string[] = [];

  try {
    // 1. Git History Analysis
    analysisResults.push("📊 Git History Analysis:");
    try {
      const gitHistory = await executeGitHistory({
        filePath,
        maxCommits: 5
      });
      analysisResults.push(gitHistory);
    } catch (error: any) {
      analysisResults.push(`⚠️ Git history unavailable: ${error.message}`);
    }

    // 2. Gather Related Files
    analysisResults.push("\n🔍 Related Files:");
    try {
      const relatedFiles = await executeGatherContext({
        task: `Analyzing dependencies for ${filePath}`,
        files: [filePath]
      }, api);
      analysisResults.push(relatedFiles);
    } catch (error: any) {
      analysisResults.push(`⚠️ Could not gather context: ${error.message}`);
    }

    // 3. Integration Check
    if (ctx.params.edits || ctx.params.content) {
      analysisResults.push("\n⚡ Integration Check:");
      try {
        const integrationCheck = await executeCheckIntegration({
          files: [filePath],
          changes: "Planned modifications to file"
        });
        analysisResults.push(integrationCheck);
        
        // Check for potential breaking changes
        if (integrationCheck.includes("WARNING") || integrationCheck.includes("BREAKING")) {
          warnings.push("Potential breaking changes detected!");
        }
      } catch (error: any) {
        analysisResults.push(`⚠️ Integration check failed: ${error.message}`);
      }
    }

    return {
      shouldProceed: true,
      analysis: analysisResults.join("\n"),
      warnings: warnings.length > 0 ? warnings : undefined
    };

  } catch (error: any) {
    return {
      shouldProceed: true,
      analysis: `⚠️ Analysis failed: ${error.message}`,
      warnings: ["Analysis failed, proceeding with caution"]
    };
  }
}

/**
 * Main hook handler for before_tool_call
 */
export async function handleBeforeEdit(ctx: any, api: any): Promise<{ block: boolean; message?: string }> {
  // Only analyze for edit/write operations
  if (ctx.tool !== "edit" && ctx.tool !== "write") {
    return { block: false };
  }

  // Check if auto-analyze is enabled
  if (!api.config?.autoAnalyze) {
    return { block: false };
  }

  console.log(`[project-workflow] Running smart analysis before ${ctx.tool}...`);

  const result = await analyzeBeforeEdit(ctx, api);

  // Log analysis results
  if (result.analysis) {
    console.log("\n" + "=".repeat(60));
    console.log("🔍 SMART ANALYSIS RESULTS");
    console.log("=".repeat(60));
    console.log(result.analysis);
    console.log("=".repeat(60) + "\n");
  }

  // Show warnings if any
  if (result.warnings && result.warnings.length > 0) {
    console.warn("\n⚠️  WARNINGS:");
    result.warnings.forEach(w => console.warn(`  - ${w}`));
    console.warn("");
  }

  return {
    block: false,
    message: result.warnings ? `Analysis complete with ${result.warnings.length} warning(s)` : undefined
  };
}
