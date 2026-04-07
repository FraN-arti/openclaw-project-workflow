import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { Type } from "@sinclair/typebox";

export default definePluginEntry({
  id: "project-workflow",
  name: "Project Workflow",
  description: "Advanced project workflow automation with smart code analysis, git integration, and GitHub automation",
  
  register(api) {
    // Register tools
    api.registerTool({
      name: "project_analyze_codebase",
      description: "Analyze project structure, dependencies, and architecture",
      parameters: Type.Object({
        projectPath: Type.Optional(Type.String({ description: "Path to project root (defaults to workspace)" })),
        deep: Type.Optional(Type.Boolean({ description: "Deep analysis including all dependencies", default: false }))
      }),
      async execute(_id, params) {
        const { executeAnalyzeCodebase } = await import("./src/tools/analyze-codebase.js");
        const result = await executeAnalyzeCodebase(params);
        return {
          content: [{
            type: "text",
            text: result
          }]
        };
      }
    });

    api.registerTool({
      name: "project_git_history",
      description: "Analyze git history for files (like codemaps) - shows who changed what and when",
      parameters: Type.Object({
        filePath: Type.Optional(Type.String({ description: "Specific file to analyze" })),
        since: Type.Optional(Type.String({ description: "Show changes since date (e.g., '2 weeks ago')" })),
        author: Type.Optional(Type.String({ description: "Filter by author" })),
        maxCommits: Type.Optional(Type.Number({ description: "Maximum commits to show", default: 20 }))
      }),
      async execute(_id, params) {
        const { executeGitHistory } = await import("./src/tools/git-history.js");
        const result = await executeGitHistory(params);
        return {
          content: [{
            type: "text",
            text: result
          }]
        };
      }
    });

    api.registerTool({
      name: "project_check_integration",
      description: "Check dependencies and potential issues before making changes",
      parameters: Type.Object({
        files: Type.Array(Type.String(), { description: "Files to check" }),
        changes: Type.String({ description: "Description of planned changes" })
      }),
      async execute(_id, params) {
        const { executeCheckIntegration } = await import("./src/tools/check-integration.js");
        const result = await executeCheckIntegration(params);
        return {
          content: [{
            type: "text",
            text: result
          }]
        };
      }
    });

    api.registerTool({
      name: "project_gather_context",
      description: "Gather all related files for a task using context-gatherer and import analysis",
      parameters: Type.Object({
        task: Type.String({ description: "Task description" }),
        files: Type.Optional(Type.Array(Type.String(), { description: "Starting files (optional)" }))
      }),
      async execute(_id, params) {
        const { executeGatherContext } = await import("./src/tools/gather-context.js");
        const result = await executeGatherContext(params, api);
        return {
          content: [{
            type: "text",
            text: result
          }]
        };
      }
    });

    api.registerTool({
      name: "project_github_analyze",
      description: "Analyze GitHub repository data (PRs, issues, commits) via Composio",
      parameters: Type.Object({
        repo: Type.String({ description: "Repository name (owner/repo)" }),
        type: Type.Union([
          Type.Literal("pr"),
          Type.Literal("issues"),
          Type.Literal("commits")
        ], { description: "Type of analysis" }),
        limit: Type.Optional(Type.Number({ description: "Maximum items to analyze", default: 10 }))
      }),
      async execute(_id, params) {
        const { executeGithubAnalyze } = await import("./src/tools/github-analyze.js");
        const result = await executeGithubAnalyze(params, api);
        return {
          content: [{
            type: "text",
            text: result
          }]
        };
      }
    });

    // Register hooks
    api.registerHook("before_tool_call", async (ctx) => {
      // Auto-analyze before edit/write
      if ((ctx.tool === "edit" || ctx.tool === "write") && api.config.autoAnalyze) {
        // TODO: Implement auto-analysis
        console.log(`[project-workflow] Auto-analyzing before ${ctx.tool}...`);
      }
      return { block: false };
    });

    api.registerHook("after_tool_call", async (ctx) => {
      // Suggest commit after successful edit/write
      if ((ctx.tool === "edit" || ctx.tool === "write") && ctx.result?.ok) {
        // TODO: Suggest smart commit message
        console.log(`[project-workflow] Changes made, consider committing...`);
      }
      return {};
    });

    console.log("[project-workflow] Plugin registered successfully");
  }
});
