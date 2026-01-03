# Agent Instructions

## Project Overview

**Markdown Annotator** is a React web app for annotating Markdown specifications with highlights and comments, designed to generate structured feedback for LLM coding agents.

### Tech Stack
- React 19 + Vite
- Tailwind CSS v4 + @tailwindcss/typography
- react-markdown for rendering

### Architecture
Simple single-page app with all state in the main App component:
- `src/App.jsx` - Main component, manages annotations state and view switching
- `src/components/InputView.jsx` - Markdown input textarea + Share URL
- `src/components/AnnotationView.jsx` - Rendered markdown with text selection
- `src/components/CommentDialog.jsx` - Modal for adding feedback to selections
- `src/components/AnnotationList.jsx` - Sidebar showing all annotations

### Key Behaviors
- Text selection in rendered markdown triggers CommentDialog
- Annotations stored in memory only (no persistence)
- URL params (`?markdown=` or `?md=`) can prefill content (base64 or URL-encoded)
- Export copies feedback as formatted markdown with blockquotes

### Commands
```bash
npm run dev      # Start dev server (localhost:5173)
npm run build    # Production build
npm run lint     # ESLint
```

### Docker
```bash
docker compose up    # Runs dev server
```

---

## Issue Tracking (beads)

This project uses **bd** (beads) for issue tracking. Run `bd onboard` to get started.

### Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --status in_progress  # Claim work
bd close <id>         # Complete work
bd sync               # Sync with git
```

## Landing the Plane (Session Completion)

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - `npm run lint && npm run build`
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   bd sync
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds

