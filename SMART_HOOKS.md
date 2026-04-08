# Smart Hooks Usage Guide

Smart Hooks automatically enhance your workflow by analyzing code context before changes and suggesting intelligent commits after.

## Features

### 1. Before Edit Analysis

When you use `edit` or `write` tools, the plugin automatically:

- **📊 Git History Analysis** — Shows recent changes to the file
- **🔍 Related Files Discovery** — Finds files that depend on or are imported by the target file
- **⚡ Integration Check** — Warns about potential breaking changes

**Example:**
```
You: "Edit src/auth.ts to add JWT validation"

Plugin automatically runs:
=============================================================
🔍 SMART ANALYSIS RESULTS
=============================================================
📊 Git History Analysis:
  Last modified: 2 days ago by Archi
  Recent changes: "feat(auth): add login endpoint"
  
🔍 Related Files:
  - src/api/routes.ts (imports auth.ts)
  - src/middleware/auth-middleware.ts (imports auth.ts)
  
⚡ Integration Check:
  ✅ No breaking changes detected
  ℹ️ 2 files depend on this module
=============================================================

[Edit proceeds with full context]
```

### 2. After Edit Commit Suggestions

After successful edits, the plugin:

- **Analyzes git diff** — Understands what changed
- **Generates conventional commit message** — Following [Conventional Commits](https://www.conventionalcommits.org/)
- **Suggests next actions** — Push, PR, or keep local

**Commit Types:**
- `feat` — New features (code files)
- `fix` — Bug fixes (detected from diff keywords)
- `docs` — Documentation (.md, .txt files)
- `style` — Styling (.css, .scss files)
- `refactor` — Code refactoring
- `test` — Test files (.test.ts, .spec.ts)
- `config` — Configuration files (.json, .yml, .ini)
- `chore` — Other changes

**Example:**
```
[After editing src/auth.ts]

=============================================================
💡 SMART COMMIT SUGGESTION
=============================================================
Type:    feat
Scope:   src
Message: add JWT validation
Changes: (+15/-3 lines)

Suggested commit command:
  git add "src/auth.ts"
  git commit -m "feat(src): add JWT validation"
=============================================================

💡 GitHub remote detected. After committing, you can:
  - Push to main: git push origin main
  - Create PR: Use project_github_analyze tool
```

## Configuration

Enable/disable Smart Hooks in your OpenClaw config:

```json
{
  "plugins": {
    "entries": {
      "project-workflow": {
        "enabled": true,
        "config": {
          "autoAnalyze": true  // Enable Smart Hooks
        }
      }
    }
  }
}
```

## Workflow Example

**Complete workflow with Smart Hooks:**

```
1. You: "Add authentication to the API"

2. Plugin gathers context:
   - Finds related files (routes, middleware, tests)
   - Checks git history
   - Analyzes dependencies

3. You make changes with full context

4. Plugin suggests commit:
   "feat(api): add JWT authentication middleware"

5. You commit and push:
   git add .
   git commit -m "feat(api): add JWT authentication middleware"
   git push origin main
```

## Benefits

✅ **No more blind edits** — Always know what you're changing and why
✅ **Consistent commits** — Conventional commit messages automatically
✅ **Catch breaking changes** — Warnings before you break something
✅ **Save time** — No manual git history checking or commit message writing
✅ **Better collaboration** — Clear, structured commit history

## Tips

- Smart Hooks work best in git repositories
- Keep commits focused on single changes for better suggestions
- Review warnings before proceeding with risky changes
- Use suggested commit messages as a starting point, customize if needed

## Troubleshooting

**"Not in a git repository"**
- Smart Hooks require git for full functionality
- Initialize git: `git init`

**"No uncommitted changes detected"**
- File might already be staged
- Check: `git status`

**Analysis takes too long**
- Large projects may take a few seconds
- Analysis runs in background, doesn't block edits
