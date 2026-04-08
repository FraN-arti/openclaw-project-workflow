# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
