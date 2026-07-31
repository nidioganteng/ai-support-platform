# GitFlow and Conventions

## Commit Rules for AI Agents
**NEVER commit code directly.** The AI's job is only to prepare and write the commit message — the human always runs `git commit` themselves. When a commit is needed, output the message in a code block and stop there. Do not run `git add`, `git commit`, `git push`, or any other git write command unless explicitly overridden.

## Branching Model
- **`main`** : Main integration and production branch. Direct commits are strictly prohibited.
- **Feature/Fix Branches** (branched from `main`):
  - `feat/*` — New features (e.g., `feat/auth-clerk`)
  - `fix/*` — Bug fixes (e.g., `fix/api-rate-limit`)
  - `chore/*` — Maintenance / dependency updates
  - `infra/*` — Docker, CI/CD, DevOps tasks
  - `docs/*` — Documentation changes
  - `refactor/*` — Code refactoring

## Commit Format (Conventional Commits)
Use the format: `<type>(<scope>): <short description in lowercase>`

*Examples:*
- `feat(web): add sidebar navigation`
- `fix(api): handle missing organization id in upload`

## Pull Request Standard
When creating a PR to `main`, use the following template.

**BEFORE claiming any change is finished, you must run and pass:**
- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`

### PR Title:
`<type>(<scope>): <short description in lowercase>`

### PR Body:
```markdown
## Summary
[Briefly explain the feature or fix]

## Changes
- **`apps/api/...`**: [Description]
- **`apps/web/...`**: [Description]

## Verification
- ✅ `pnpm lint` — 0 errors
- ✅ `pnpm typecheck` — 0 errors
- ✅ `pnpm test` — Tests passing
- ✅ `npx graphify@latest update .` — Knowledge graph updated

Closes #N
```
