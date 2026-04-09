# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.0] - 2026-04-09

### Changed
- **GitHub Integration** - Replaced Composio with direct GitHub REST API
  - No external dependencies required
  - Uses native fetch API
  - GitHub Personal Access Token authentication
  - Direct API calls to GitHub endpoints
- **Configuration** - Added `github.token` and `github.defaultRepo` options
- **README** - Updated with GitHub token setup instructions

### Removed
- Composio dependency for GitHub integration

## [0.3.0] - 2026-04-08

### Added
- **Issue Tracker Integration** - Automatic issue detection and closing
  - Extract issue references from commit messages (closes, fixes, resolves)
  - Detect issue numbers from branch names
  - Suggest issue references based on changes
  - Enhance commit messages with issue links
- **Automatic Changelog Generator** - Generate CHANGELOG.md from conventional commits
  - Parse conventional commit messages
  - Group commits by type (feat, fix, docs, etc.)
  - Format changelog with emojis and links
  - Update CHANGELOG.md automatically
- **Semantic Versioning Helper** - Automatic version bumping
  - Determine version bump type from commits (major/minor/patch)
  - Suggest next version based on changes
  - Update package.json version
  - Create git tags for releases
- **GitHub Actions CI/CD** - Automated testing and checks
  - Run tests on push and pull requests
  - TypeScript type checking
  - Code quality checks
  - Analyze changed files and breaking changes
- **Comprehensive Test Suite** - 18 tests covering all features
  - 8 integration tests for tools
  - 10 tests for issue tracker
  - Edge case testing (large projects, missing files)

### Changed
- Updated README.md with new features
- Enhanced after-edit hook with issue tracker integration

## [0.2.0] - 2026-04-08

### Added
- **Smart Hooks** - Automated workflow enhancement
  - `before_tool_call` hook: Automatic analysis before edit/write operations
  - `after_tool_call` hook: Intelligent commit message generation
  - Git history analysis before changes
  - Related files discovery
  - Integration checks with breaking change warnings
  - Conventional commit message generation
  - GitHub remote detection and suggestions
- **Tests** - Basic test suite for Smart Hooks functionality
- **Documentation** - Comprehensive Smart Hooks usage guide (SMART_HOOKS.md)
- **Type Safety** - Added @types/node for better TypeScript support

### Changed
- Updated README.md with Smart Hooks documentation
- Improved commit type detection logic (docs, test, config, style)
- Enhanced tsconfig.json with Node.js types

### Fixed
- TypeScript compilation errors
- Error handling in hooks (proper type annotations)

## [0.1.0] - 2026-04-07

### Added
- Initial plugin implementation
- 5 core tools:
  - `project_analyze_codebase` - Project structure analysis
  - `project_git_history` - Git history analysis
  - `project_gather_context` - Context gathering with fallback
  - `project_check_integration` - Dependency and integration checks
  - `project_github_analyze` - GitHub PR/issues/commits analysis via Composio
- Git utilities for history and blame
- Basic plugin structure and configuration
- README with feature documentation
- MIT License

[0.2.0]: https://github.com/FraN-arti/openclaw-project-workflow/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/FraN-arti/openclaw-project-workflow/releases/tag/v0.1.0
