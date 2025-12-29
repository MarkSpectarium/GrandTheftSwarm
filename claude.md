# Claude Code Context

## Setup

This is a pnpm monorepo. `node_modules` is gitignored.

**Before running builds or typechecks**, install dependencies:
```bash
pnpm install
```

If you see errors like "Cannot find module 'react'" or "Cannot find module 'express'",
it means dependencies aren't installed - not a code problem.

## Project Structure

- `packages/client` - React frontend (Vite + TypeScript)
- `packages/api` - Express backend
- `packages/shared` - Shared types and production configs

## Key Commands

```bash
pnpm install          # Install all dependencies
pnpm build            # Build all packages
pnpm typecheck        # Type check all packages
pnpm test             # Run tests
```
