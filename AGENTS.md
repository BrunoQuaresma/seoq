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

## Code Quality Workflow

After completing a task, agents must:

1. **Verify lint errors**: Run `npm run lint` to check for any ESLint errors
2. **Format code**: Run `npm run format` to format all code files with Prettier
3. **Re-check lint errors**: Run `npm run lint` again to ensure no lint errors remain after formatting
4. **Build the code**: Run `npm run build` to compile TypeScript and verify the build succeeds
5. **Fix build issues**: If the build fails, fix any TypeScript compilation errors or other build issues
6. **Ensure clean state**: The task is only considered complete when there are no lint errors, all files are properly formatted, and the build succeeds without errors

This ensures consistent code quality, formatting, and that the code compiles successfully across the project.
