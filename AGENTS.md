# Agent Guidelines

## Commit Message Convention

This project uses **Conventional Commits** (semver-based) for commit messages.

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: A new feature (increments MINOR version)
- `fix`: A bug fix (increments PATCH version)
- `docs`: Documentation only changes
- `style`: Code style changes (formatting, missing semi colons, etc.)
- `refactor`: Code refactoring without feature changes or bug fixes
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `build`: Changes to build system or external dependencies
- `ci`: Changes to CI configuration files and scripts
- `chore`: Other changes that don't modify src or test files (e.g., project setup)
- `revert`: Reverts a previous commit

### Examples

```
feat: add user authentication command
fix: resolve parsing error in config file
chore: initial project setup
docs: update README with installation instructions
refactor: extract command handlers into separate modules
```

### Scope (Optional)

The scope should be the area of the codebase affected:
- `cli`: CLI-related changes
- `config`: Configuration changes
- `deps`: Dependency updates

### Breaking Changes

For breaking changes, add `!` after the type/scope and include `BREAKING CHANGE:` in the footer:

```
feat!: change command API structure

BREAKING CHANGE: The command structure has been redesigned. Old commands are no longer supported.
```

