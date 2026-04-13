# Project Workflow Plugin

<div align="center">

[![OpenClaw](https://img.shields.io/badge/OpenClaw-2026.4.5-blue?style=flat-square&logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTIgMkw0IDZWMTJDNCAyMC41IDEyIDIyIDEyIDIyQzEyIDIyIDIwIDIwLjUgMjAgMTJWNkwxMiAyWiIgZmlsbD0iI2ZmZmZmZiIvPjwvc3ZnPg==)](https://openclaw.ai)
[![Composio](https://img.shields.io/badge/Composio-Integration-green?style=flat-square&logo=github)](https://composio.dev)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)

### **Stop repeating yourself.**

Automate your AI agent for seamless GitHub workflow. Stay on top of bugs, track completed work, and let your agent handle git history, code analysis, dependency checks, and PR management — all automatically.

</div>

---

## 🙏 Built With

This plugin is powered by amazing open-source projects:

- **[OpenClaw](https://openclaw.ai)** — The AI assistant framework that makes this plugin possible
- **[GitHub REST API](https://docs.github.com/en/rest)** — Direct GitHub integration

Special thanks to the OpenClaw community for building incredible tools! 🚀

---

## ⚙️ Requirements

### Required
- **Git** — Must be installed and available in PATH for local git features (history, blame, commits)
- **Node.js 22+** — Required for OpenClaw

### Optional
- **GitHub Personal Access Token** — For GitHub integration (PRs, issues, remote repository analysis)
  - Without token: All local features work (git history, code analysis, dependency checks)
  - With token: Full GitHub integration (analyze PRs, issues, commits)

**Check if Git is installed:**
```bash
git --version
```

If not installed, download from [git-scm.com](https://git-scm.com/downloads)

---

## How It Works

### 🔧 Hybrid Approach: Local + Remote

This plugin uses a **hybrid approach** for maximum flexibility:

#### **Local Git (Always Available)**
- ✅ Works **without internet**
- ✅ Works **without GitHub**
- ✅ Analyzes your local repository
- ✅ Creates commits **locally** (on your computer)

**What is a "local commit"?**
> A local commit saves your changes in git on your computer, but **does NOT send them to GitHub yet**.
> 
> Think of it like writing a letter and putting it in an envelope — it's ready to send, but still in your hands.
> 
> You decide when to push (send) it to GitHub.

#### **GitHub Integration (Optional, via GitHub API)**
- 🔄 Requires GitHub Personal Access Token
- 🔄 Analyzes remote PRs, issues, commits
- 🔄 Direct REST API integration (no external dependencies)

**The plugin automatically detects:**
- ✅ Is git available? → Enables git features
- ✅ Is there a remote repository? → Offers to push
- ✅ Is GitHub token configured? → Enables GitHub features

### 📋 Typical Workflow

```
You: "Add authentication to the API"

Plugin automatically:
1. ✅ Analyzes local git history
2. ✅ Finds related files
3. ✅ Checks dependencies
4. ✅ Makes changes
5. ✅ Creates commit locally: "feat(auth): add JWT authentication"

Agent asks:
"Changes ready! Detected remote: github.com/you/project
Composio connected ✅

What do you want to do?
1. Push to main
2. Create branch feature/auth and PR
3. Keep local only"

You choose → Plugin executes
```

### 🎯 What You Get

**Without Composio (Local Only):**
- Git history analysis
- Code structure analysis
- Smart commits with detailed messages
- Dependency checking

**With GitHub Token (Local + GitHub):**
- Everything above, PLUS:
- Analyze existing PRs/issues
- View commit history from GitHub
- Track remote repository activity

---

## Features

### 🔍 Smart Code Analysis
- **`project_analyze_codebase`** — Analyze project structure, dependencies, and architecture
- **`project_gather_context`** — Automatically find all related files for a task
  - Keyword-based file search using Node.js fs API
  - Cross-platform support (Windows, Linux, macOS)
  - No external dependencies required
- **`project_scan_issues`** — Scan codebase for issues (TODOs, FIXMEs, deprecated APIs, security)
  - Automatic issue detection
  - Priority grouping (critical, high, medium, low)
  - Multi-language support
  - Optional GitHub issue creation

### 📊 Git Integration
- **`project_git_history`** — Analyze git history (like codemaps) - who changed what and when
- **`project_smart_commit`** — AI-powered conventional commit message generation
  - Automatic commit type detection (feat/fix/refactor/docs/test/chore)
  - Scope extraction from file paths
  - Breaking change detection
  - Related issue linking
  - Detailed commit body with context
- Git blame integration
- Commit history analysis

### 🔗 GitHub Integration (via GitHub REST API)
- **`project_github_analyze`** — Analyze PRs, issues, commits
- **`project_health_dashboard`** — Live project health monitoring
  - Real-time issue tracking and trends
  - Health score calculation (0-100)
  - 7-day trend analysis
  - Actionable recommendations
- **`project_pr_review_handler`** — Automated PR review management
  - Analyze review comments
  - Suggest fixes for common patterns
  - Three modes: auto, suggest, manual
- Direct GitHub API integration
- No external dependencies

### 🏥 Project Health
- **`project_health_check`** — Comprehensive health analysis
  - Tests: coverage, failing tests, missing tests
  - Dependencies: outdated packages, vulnerabilities
  - Security: npm audit, hardcoded secrets, unsafe patterns
  - Performance: dependency count, bundle size
  - Code Quality: ESLint, Prettier configuration
  - Documentation: README completeness
  - Overall health score with recommendations

### ⚡ Smart Hooks (Automated Workflow)
- **Auto-analysis before code changes** — Automatically analyzes git history, related files, and dependencies before `edit`/`write`
- **Smart commit suggestions** — Generates conventional commit messages based on file changes and git diff analysis
- **Integration checks** — Warns about potential breaking changes and shows related files
- **GitHub integration hints** — Suggests push/PR actions when remote repository detected
- **Issue tracker integration** — Automatically detects branch issue numbers and suggests closing issues
- **Automatic changelog generation** — Generates CHANGELOG.md from conventional commits
- **Semantic versioning** — Suggests version bumps based on commit types

📖 **[Read the Smart Hooks Guide](./SMART_HOOKS.md)** for detailed usage examples and workflow tips.

## Installation

```bash
# From workspace directory
cd openclaw-project-workflow
npm install

# Install in OpenClaw
openclaw plugins install ./openclaw-project-workflow
```

## Configuration

### Basic Configuration

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
          "githubIntegration": false
        }
      }
    }
  }
}
```

### GitHub Integration Setup

**1. Generate GitHub Personal Access Token:**

- Go to: https://github.com/settings/tokens
- Click "Generate new token (classic)"
- Select scopes:
  - ✅ `repo` (Full control of private repositories)
- Copy the token (starts with `ghp_`)

**2. Add token to config:**

```json
{
  "plugins": {
    "entries": {
      "project-workflow": {
        "enabled": true,
        "config": {
          "autoAnalyze": true,
          "gitIntegration": true,
          "githubIntegration": true,
          "github": {
            "token": "ghp_your_token_here",
            "defaultRepo": "owner/repo"
          }
        }
      }
    }
  }
}
```

**⚠️ Security Note:** Keep your token private! Never commit it to git.

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

✅ **Production Ready** — All core features implemented and tested!

**Implemented:**
- ✅ Git history analysis (`project_git_history`)
- ✅ Context gathering with fallback (`project_gather_context`)
- ✅ Integration checks (`project_check_integration`)
- ✅ Codebase analysis (`project_analyze_codebase`)
- ✅ GitHub integration via Composio (`project_github_analyze`)
- ✅ Smart hooks (automatic analysis before/after edits)
- ✅ Intelligent commit message generation
- ✅ Issue tracker integration (auto-close issues)
- ✅ Automatic changelog generation
- ✅ Semantic versioning helper
- ✅ GitHub Actions CI/CD
- ✅ Comprehensive test suite (18 tests)

## License

MIT
