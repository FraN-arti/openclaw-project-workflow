# Project Workflow Plugin

Advanced project workflow automation for OpenClaw with smart code analysis, git integration, and GitHub automation.

## Features

### 🔍 Smart Code Analysis
- **`project_analyze_codebase`** — Analyze project structure, dependencies, and architecture
- **`project_gather_context`** — Automatically find all related files for a task

### 📊 Git Integration
- **`project_git_history`** — Analyze git history (like codemaps) - who changed what and when
- Git blame integration
- Commit history analysis

### 🔗 GitHub Integration (via Composio)
- **`project_github_analyze`** — Analyze PRs, issues, commits
- Automatic PR/issue linking
- Code review automation

### ⚡ Smart Hooks
- **Auto-analysis before code changes** — Automatically gathers context before `edit`/`write`
- **Smart commit suggestions** — Generates meaningful commit messages
- **Integration checks** — Warns about potential breaking changes

## Installation

```bash
# From workspace directory
cd openclaw-project-workflow
npm install

# Install in OpenClaw
openclaw plugins install ./openclaw-project-workflow
```

## Configuration

Add to `~/.openclaw/openclaw.json`:

```json
{
  "plugins": {
    "entries": {
      "project-workflow": {
        "enabled": true,
        "config": {
          "autoAnalyze": true,
          "gitIntegration": true,
          "githubIntegration": true
        }
      }
    }
  }
}
```

## Usage

### Analyze Codebase
```
project_analyze_codebase({ projectPath: "./my-project" })
```

### Check Git History
```
project_git_history({ filePath: "src/main.ts", since: "2 weeks ago" })
```

### Gather Context
```
project_gather_context({ task: "Add authentication to API" })
```

### Analyze GitHub
```
project_github_analyze({ repo: "owner/repo", type: "pr", limit: 10 })
```

## Workflow

1. **You give a task** → Plugin gathers context automatically
2. **Analysis runs** → Git history, dependencies, related files
3. **Changes made** → Integration checks run
4. **Commit suggested** → Smart commit message generated

## Development Status

🚧 **Work in Progress** — Core structure ready, implementing tools next.

## License

MIT
