/**
 * Gather context for a task using context-gatherer subagent
 */
export async function executeGatherContext(
  params: {
    task: string;
    files?: string[];
  },
  api: any
): Promise<string> {
  const { task, files } = params;

  try {
    // Use context-gatherer subagent to find relevant files
    const result = await api.runtime.spawnSubagent({
      agentId: "context-gatherer",
      task: `Find all files relevant to: ${task}${files ? `\n\nStarting files: ${files.join(", ")}` : ""}`,
      mode: "run",
      timeoutSeconds: 60,
    });

    if (!result || !result.output) {
      return `⚠️ Context gathering completed but no files found.\n\nTask: ${task}`;
    }

    // Parse the output to extract file list
    const output = result.output;
    
    // Build formatted response
    let response = `# 📁 Context for: "${task}"\n\n`;
    
    if (files && files.length > 0) {
      response += `## Starting Files\n`;
      for (const file of files) {
        response += `- ${file}\n`;
      }
      response += `\n`;
    }

    response += `## Related Files Found\n\n`;
    response += output;
    
    response += `\n\n---\n`;
    response += `💡 **Tip:** These files were found by analyzing imports, dependencies, and code structure.\n`;
    response += `Review them before making changes to understand the full context.`;

    return response;
  } catch (error: any) {
    return `❌ Context gathering failed: ${error.message}\n\nTask: ${task}`;
  }
}
