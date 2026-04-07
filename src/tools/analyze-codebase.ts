import { readdir, readFile, stat } from "fs/promises";
import { join, relative, extname } from "path";

interface FileInfo {
  path: string;
  size: number;
  imports: string[];
  exports: string[];
}

interface ModuleInfo {
  name: string;
  path: string;
  fileCount: number;
  dependencies: string[];
}

interface CodebaseAnalysis {
  totalFiles: number;
  totalSize: number;
  entryPoints: string[];
  modules: ModuleInfo[];
  dependencyGraph: Map<string, string[]>;
}

/**
 * Analyze codebase structure and dependencies
 */
export async function executeAnalyzeCodebase(params: {
  projectPath?: string;
  deep?: boolean;
}): Promise<string> {
  const { projectPath = process.cwd(), deep = false } = params;

  try {
    // Scan project files
    const files = await scanDirectory(projectPath, deep);
    
    if (files.length === 0) {
      return `No code files found in ${projectPath}`;
    }

    // Analyze files
    const fileInfos: FileInfo[] = [];
    for (const file of files) {
      try {
        const content = await readFile(file, "utf-8");
        const info = analyzeFile(file, content);
        fileInfos.push(info);
      } catch (error) {
        // Skip files that can't be read
      }
    }

    // Build analysis
    const analysis = buildAnalysis(projectPath, fileInfos);

    // Format output
    return formatAnalysis(analysis, projectPath);
  } catch (error: any) {
    return `❌ Codebase analysis failed: ${error.message}`;
  }
}

/**
 * Scan directory for code files
 */
async function scanDirectory(dir: string, deep: boolean): Promise<string[]> {
  const files: string[] = [];
  const codeExtensions = [".ts", ".js", ".tsx", ".jsx", ".mjs", ".cjs"];
  const ignoreDirs = ["node_modules", "dist", "build", ".git", "coverage"];

  async function scan(currentDir: string, depth: number) {
    if (!deep && depth > 3) return; // Limit depth if not deep scan

    try {
      const entries = await readdir(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(currentDir, entry.name);

        if (entry.isDirectory()) {
          if (!ignoreDirs.includes(entry.name)) {
            await scan(fullPath, depth + 1);
          }
        } else if (entry.isFile()) {
          const ext = extname(entry.name);
          if (codeExtensions.includes(ext)) {
            files.push(fullPath);
          }
        }
      }
    } catch (error) {
      // Skip directories we can't read
    }
  }

  await scan(dir, 0);
  return files;
}

/**
 * Analyze a single file
 */
function analyzeFile(filePath: string, content: string): FileInfo {
  const imports: string[] = [];
  const exports: string[] = [];

  // Find imports
  const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    imports.push(match[1]);
  }

  // Find exports
  const exportRegex = /export\s+(?:(?:async\s+)?function|class|const|let|var|interface|type)\s+(\w+)/g;
  while ((match = exportRegex.exec(content)) !== null) {
    exports.push(match[1]);
  }

  if (content.includes("export default")) {
    exports.push("default");
  }

  return {
    path: filePath,
    size: Buffer.byteLength(content, "utf-8"),
    imports,
    exports,
  };
}

/**
 * Build codebase analysis
 */
function buildAnalysis(projectPath: string, files: FileInfo[]): CodebaseAnalysis {
  const totalFiles = files.length;
  const totalSize = files.reduce((sum, f) => sum + f.size, 0);

  // Find entry points (files with no imports or main/index files)
  const entryPoints = files
    .filter((f) => {
      const name = f.path.toLowerCase();
      return (
        name.includes("index.") ||
        name.includes("main.") ||
        name.includes("app.") ||
        f.imports.length === 0
      );
    })
    .map((f) => relative(projectPath, f.path));

  // Group by directory (modules)
  const moduleMap = new Map<string, FileInfo[]>();
  for (const file of files) {
    const rel = relative(projectPath, file.path);
    const parts = rel.split(/[/\\]/);
    const moduleName = parts.length > 1 ? parts[0] : "root";
    
    if (!moduleMap.has(moduleName)) {
      moduleMap.set(moduleName, []);
    }
    moduleMap.get(moduleName)!.push(file);
  }

  // Build module info
  const modules: ModuleInfo[] = [];
  for (const [name, moduleFiles] of moduleMap.entries()) {
    const allImports = new Set<string>();
    for (const file of moduleFiles) {
      for (const imp of file.imports) {
        if (imp.startsWith(".")) {
          // Relative import - extract module
          const parts = imp.split("/");
          if (parts.length > 1) {
            allImports.add(parts[0].replace(".", ""));
          }
        }
      }
    }

    modules.push({
      name,
      path: name,
      fileCount: moduleFiles.length,
      dependencies: Array.from(allImports),
    });
  }

  // Build dependency graph
  const dependencyGraph = new Map<string, string[]>();
  for (const file of files) {
    const deps = file.imports.filter((imp) => !imp.startsWith("."));
    if (deps.length > 0) {
      dependencyGraph.set(relative(projectPath, file.path), deps);
    }
  }

  return {
    totalFiles,
    totalSize,
    entryPoints,
    modules,
    dependencyGraph,
  };
}

/**
 * Format analysis as markdown
 */
function formatAnalysis(analysis: CodebaseAnalysis, projectPath: string): string {
  let output = `# 🏗️ Codebase Analysis: ${projectPath}\n\n`;

  // Summary
  output += `## Summary\n`;
  output += `- **Total files:** ${analysis.totalFiles}\n`;
  output += `- **Total size:** ${(analysis.totalSize / 1024).toFixed(2)} KB\n`;
  output += `- **Entry points:** ${analysis.entryPoints.length}\n`;
  output += `- **Modules:** ${analysis.modules.length}\n\n`;

  // Entry points
  if (analysis.entryPoints.length > 0) {
    output += `## Entry Points\n\n`;
    for (const entry of analysis.entryPoints.slice(0, 10)) {
      output += `- ${entry}\n`;
    }
    output += `\n`;
  }

  // Modules
  output += `## Modules\n\n`;
  for (const module of analysis.modules.sort((a, b) => b.fileCount - a.fileCount)) {
    output += `### ${module.name}\n`;
    output += `- **Files:** ${module.fileCount}\n`;
    if (module.dependencies.length > 0) {
      output += `- **Dependencies:** ${module.dependencies.join(", ")}\n`;
    }
    output += `\n`;
  }

  // Dependency graph (top external deps)
  const externalDeps = new Map<string, number>();
  for (const deps of analysis.dependencyGraph.values()) {
    for (const dep of deps) {
      externalDeps.set(dep, (externalDeps.get(dep) || 0) + 1);
    }
  }

  if (externalDeps.size > 0) {
    output += `## Top External Dependencies\n\n`;
    const sorted = Array.from(externalDeps.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    
    for (const [dep, count] of sorted) {
      output += `- **${dep}** (used in ${count} files)\n`;
    }
  }

  return output;
}
