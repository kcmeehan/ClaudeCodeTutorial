# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

UIGen is an AI-powered React component generator with live preview. Users describe components in a chat interface, Claude generates the code using tools, and a sandboxed iframe renders the output in real time.

## Commands

```bash
# First-time setup (installs deps, generates Prisma client, runs migrations)
npm run setup

# Development server (uses Turbopack)
npm run dev

# Run tests (Vitest + jsdom)
npm test

# Run a single test file
npx vitest run src/components/chat/__tests__/ChatInterface.test.tsx

# Lint
npm run lint

# Reset database
npm run db:reset

# Build
npm run build
```

## Architecture

### Request Flow

1. User sends a chat message → `POST /api/chat` (`src/app/api/chat/route.ts`)
2. Route reconstructs a `VirtualFileSystem` from serialized file data sent by the client
3. `streamText` (Vercel AI SDK) calls Claude (`claude-haiku-4-5`) with two tools:
   - `str_replace_editor` — view/create/edit files via string replacement or insert
   - `file_manager` — rename/delete files
4. As the stream returns tool calls, the client's `FileSystemContext` (`src/lib/contexts/file-system-context.tsx`) applies them to a client-side `VirtualFileSystem`
5. File changes trigger `refreshTrigger`, causing `PreviewFrame` to recompile all files and reload the iframe

### Virtual File System

`VirtualFileSystem` (`src/lib/file-system.ts`) is an in-memory tree of `FileNode` objects. It lives on both server (per-request, reconstructed from JSON) and client (persisted across renders via React context). Key methods: `createFile`, `updateFile`, `deleteFile`, `rename`, `serialize`/`deserializeFromNodes`.

### Preview Pipeline

`PreviewFrame` (`src/components/preview/PreviewFrame.tsx`) rerenders whenever `refreshTrigger` changes:
1. Calls `createImportMap` (`src/lib/transform/jsx-transformer.ts`) which transpiles all `.jsx`/`.tsx` files using `@babel/standalone`, creates Blob URLs, and builds an ES module import map
2. Third-party imports are routed to `https://esm.sh/`; missing local imports get placeholder stub modules
3. `createPreviewHTML` produces an `srcdoc` HTML page with the import map, inlined CSS, and an `ErrorBoundary` that mounts the entry component (`/App.jsx` by default)

### Auth

JWT-based sessions stored in httpOnly cookies (`src/lib/auth.ts`). Uses `jose` for signing/verification. The middleware (`src/middleware.ts`) handles protected routes. Users can also use the app anonymously; projects are associated with a userId only when authenticated.

### AI Provider

`getLanguageModel()` (`src/lib/provider.ts`) returns the real Anthropic model (`claude-haiku-4-5`) if `ANTHROPIC_API_KEY` is set, or a `MockLanguageModel` that streams static responses — useful for development without an API key.

### Database

Prisma + SQLite (`prisma/dev.db`). Two models: `User` and `Project`. Projects store chat `messages` and file system `data` as JSON strings. The Prisma client is generated to `src/generated/prisma`.

Always reference `prisma/schema.prisma` when reasoning about the structure of data stored in the database.

### Key Contexts

- `FileSystemContext` — wraps `VirtualFileSystem`, handles tool call dispatch, exposes CRUD operations
- `ChatContext` (`src/lib/contexts/chat-context.tsx`) — manages chat message state and streaming via Vercel AI SDK's `useChat`

## Environment Variables

```
ANTHROPIC_API_KEY=   # Optional; falls back to mock provider if absent
JWT_SECRET=          # Optional; defaults to "development-secret-key"
```
