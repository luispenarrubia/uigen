# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

UIGen is an AI-powered React component generator with live preview. It allows users to describe React components in natural language and see them generated and rendered in real-time using a virtual file system.

## Development Commands

### Initial Setup
```bash
npm run setup
```
This installs dependencies, generates Prisma client, and runs database migrations.

### Development Server
```bash
npm run dev
```
Runs Next.js development server with Turbopack on http://localhost:3000

### Testing
```bash
npm test              # Run all tests with Vitest
```

### Database Operations
```bash
npx prisma generate   # Regenerate Prisma client after schema changes
npx prisma migrate dev # Create and apply new migration
npm run db:reset      # Reset database (destructive)
```

### Other Commands
```bash
npm run build         # Production build
npm run start         # Start production server
npm run lint          # Run ESLint
```

## Architecture

### Virtual File System (VFS)

The core innovation is a **client-side virtual file system** that operates entirely in-memory—no files are written to disk during development.

- **Implementation**: `src/lib/file-system.ts` - `VirtualFileSystem` class manages files/directories with a Map-based tree structure
- **Context**: `src/lib/contexts/file-system-context.tsx` - React context provides VFS access throughout the app
- **Operations**: Create, read, update, delete, rename files and directories
- **Serialization**: Projects are serialized to JSON and stored in the database (`Project.data` field)

### AI Component Generation Flow

1. **User Input** → Chat interface (`src/components/chat/ChatInterface.tsx`)
2. **API Route** → `/api/chat/route.ts` handles streaming responses
3. **LLM Provider** → `src/lib/provider.ts` - Uses Anthropic Claude API or falls back to mock provider when no API key is present
4. **AI Tools** → LLM has access to two tools:
   - `str_replace_editor` (`src/lib/tools/str-replace.ts`) - Create/view/edit files in VFS
   - `file_manager` (`src/lib/tools/file-manager.ts`) - Rename/delete files in VFS
5. **File System Updates** → Tool calls update the VFS in real-time
6. **Preview Rendering** → `PreviewFrame` component transforms and renders the generated React components

### Live Preview System

**Location**: `src/components/preview/PreviewFrame.tsx` and `src/lib/transform/jsx-transformer.ts`

The preview system uses a sophisticated browser-based transpilation approach:

1. **Transpilation**: JSX/TSX files are transformed to JavaScript using Babel Standalone (`@babel/standalone`)
2. **Module System**: Creates an ES Module import map with blob URLs for each transpiled file
3. **Import Aliasing**: Supports `@/` path alias (points to root `/`)
4. **External Dependencies**: Third-party packages are loaded from `esm.sh` CDN
5. **CSS Handling**: CSS files are collected and injected as `<style>` tags
6. **Entry Point**: Looks for `/App.jsx` (or other standard entry points) and renders it in an isolated iframe
7. **Error Handling**: Syntax errors are displayed with formatted error messages; runtime errors are caught by React Error Boundary

### Database Schema

**Location**: `prisma/schema.prisma`

The database schema is defined in the `prisma/schema.prisma` file. Reference it anytime you need to understand the structure of the data stored in the database.

- **User**: Authentication (email/password with bcrypt hashing)
- **Project**: Stores chat history and VFS state as JSON
  - `messages`: Serialized chat messages array
  - `data`: Serialized VFS structure
  - Can be owned by a user or anonymous (userId nullable)

Generated Prisma client is output to `src/generated/prisma/` (custom location).

### Authentication

**Location**: `src/lib/auth.ts`, `src/middleware.ts`

- **JWT-based** using `jose` library
- Session stored in HTTP-only cookie (`auth-token`)
- 7-day session expiration
- Middleware protects certain API routes
- Anonymous users can create projects without authentication (temporary sessions tracked via `src/lib/anon-work-tracker.ts`)

### Project Structure

```
src/
├── app/                      # Next.js App Router
│   ├── api/chat/             # AI streaming endpoint
│   ├── [projectId]/          # Dynamic project page
│   ├── layout.tsx            # Root layout
│   └── page.tsx              # Home page
├── components/
│   ├── chat/                 # Chat UI components
│   ├── editor/               # Code editor and file tree
│   ├── preview/              # Live preview iframe
│   ├── auth/                 # Authentication forms
│   └── ui/                   # Shared UI components (shadcn/ui)
├── lib/
│   ├── file-system.ts        # Virtual file system implementation
│   ├── contexts/             # React contexts (VFS, chat)
│   ├── tools/                # AI tools for file manipulation
│   ├── transform/            # JSX transpilation and preview HTML generation
│   ├── prompts/              # System prompts for AI
│   ├── provider.ts           # LLM provider (Anthropic or mock)
│   ├── auth.ts               # JWT session management
│   └── prisma.ts             # Prisma client singleton
├── actions/                  # Server actions for projects
└── generated/prisma/         # Generated Prisma client (custom output)
```

## Key Implementation Details

### System Prompt for AI

**Location**: `src/lib/prompts/generation.tsx`

The AI is instructed to:
- Create React components using Tailwind CSS
- Always create `/App.jsx` as the entry point
- Use `@/` import alias for local files
- Operate on the root `/` of the virtual file system
- Keep responses brief

### Mock Provider Fallback

When `ANTHROPIC_API_KEY` is not set, a `MockLanguageModel` provides static component generation for demo purposes. It generates simple Counter, Form, or Card components based on user prompts.

### File Tree and Code Editor

- **File Tree**: `src/components/editor/FileTree.tsx` - Displays VFS structure
- **Code Editor**: `src/components/editor/CodeEditor.tsx` - Uses Monaco Editor for syntax highlighting and editing

### Testing

- **Framework**: Vitest with React Testing Library
- **Environment**: jsdom
- **Config**: `vitest.config.mts`
- Tests are co-located with components in `__tests__/` directories

## Code Style Guidelines

- Use comments sparingly. Only comment complex code.

## Environment Variables

```bash
ANTHROPIC_API_KEY=your-api-key-here    # Optional - uses mock provider without it
JWT_SECRET=your-secret-key              # Optional - defaults to development key
DATABASE_URL="file:./prisma/dev.db"    # SQLite database (auto-configured)
```

## Tech Stack

- **Framework**: Next.js 15 (App Router), React 19
- **Styling**: Tailwind CSS v4
- **Database**: SQLite with Prisma ORM
- **AI**: Anthropic Claude API via Vercel AI SDK
- **Transpilation**: Babel Standalone (browser-based)
- **Editor**: Monaco Editor
- **Testing**: Vitest + React Testing Library
- **Auth**: JWT with jose library

## Important Notes

- The virtual file system is ephemeral in development—only persisted to database for saved projects
- Preview rendering happens entirely client-side using ES Module import maps and blob URLs
- The project requires Node.js 18+ and works without an Anthropic API key (using mock responses)
- All component generation follows the pattern: AI creates files → VFS updates → Preview auto-refreshes
