# AI Context: Project CRM Docker

## Purpose
This file is the default context for AI work in this repository.

Primary objective: **reduce token usage** by avoiding repeated full-project scanning.

## Hard Scope Rules (Do Not Ignore)
1. **Only scan these folders by default:**
   - `frontend/`
   - `backend/`
2. **Do NOT re-scan unrelated folders** unless the task explicitly requires it.
3. **Ignore package-heavy or non-functional folders/files by default:**
   - `frontend/node_modules/`
   - `backend/node_modules/`
   - `.git/`
   - build artifacts and uploads unless task-specific
4. **Do NOT read package/dependency files** (`package.json`, `package-lock.json`) unless the task is about dependencies, scripts, build, or install issues.
5. Reuse this document as the first reference before opening more files.

## Project Snapshot

### Frontend (`frontend/`)
- Stack: Vite + React + TypeScript
- Main source root: `frontend/src/`
- Core app files:
  - `src/main.tsx`
  - `src/App.tsx`
- Main UI pages:
  - `src/pages/Home.tsx`
  - `src/pages/Clients.tsx`
  - `src/pages/Notifications.tsx`
  - `src/pages/AddBusiness.tsx`
  - `src/pages/AddPersonal.tsx`
  - `src/pages/Profile.tsx`
  - `src/pages/UserManagement.tsx`
  - `src/pages/SignIn.tsx`
- Feature domains:
  - `src/features/business/`
  - `src/features/personal/`
  - `src/features/dashboard/`

### Backend (`backend/`)
- Stack: Node.js + Express
- Entry file: `backend/index.js`
- Major layers:
  - Routes: `backend/routes/`
  - Controllers: `backend/controllers/`
  - Models: `backend/models/`
  - Middleware: `backend/middleware/`
  - DB scripts/schema: `backend/database/`
  - Utilities: `backend/utils/`
  - Config: `backend/config/`

## Domain Reminder
This CRM is used to manage:
- client tax documents
- client birthdays and related follow-up data

## Update Rule (Mandatory)
Whenever code structure or responsibility changes in `frontend/` or `backend/`, this file **must be updated in the same change set**.

Minimum required updates:
- add/remove renamed folders
- add/remove key entry files
- update feature/domain mapping
- update any new “ignore-by-default” directories

If this file is outdated, refresh it before continuing implementation.
