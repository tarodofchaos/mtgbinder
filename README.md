# MTG Binder

A full-stack Magic: The Gathering card collection and trading application. Track your collection, manage wishlists, and trade cards with other players in real-time.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)

## Features

- **Collection Management**: Track cards with condition, quantity, foil status, and trade availability
- **Wishlist**: Maintain wishlists with priority levels, price limits, and condition requirements
- **Public Binder Sharing**: Share your trade binder via unique URLs and QR codes
- **Real-time Trading**: Match trades with other users in live trading sessions
- **Card Search**: Search cards with autocomplete powered by Scryfall data

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite, Material-UI v7, TanStack Query |
| Backend | Express.js, Socket.IO, Prisma ORM |
| Database | PostgreSQL |
| Language | TypeScript (throughout) |

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0 (comes with Node.js)
- **PostgreSQL** >= 14.0

### Installing PostgreSQL

**macOS (using Homebrew):**
```bash
brew install postgresql@14
brew services start postgresql@14
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

**Windows:**
Download and install from [PostgreSQL Downloads](https://www.postgresql.org/download/windows/)

## Installation

### 1. Clone the repository

```bash
git clone <repository-url>
cd mtg-binder
```

### 2. Install dependencies

```bash
npm install
```

This installs dependencies for all workspaces (client, server, shared).

### 3. Set up environment variables

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Required
DATABASE_URL=postgresql://postgres:password@localhost:5432/mtg_binder
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Optional (defaults shown)
NODE_ENV=development
PORT=5000
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:3000
```

> **Tip**: Generate a secure JWT secret with:
> ```bash
> node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
> ```

### 4. Create the database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create the database
CREATE DATABASE mtg_binder;

# Exit psql
\q
```

### 5. Run database migrations

```bash
npm run db:migrate
```

This creates all necessary tables in your database.

### 6. Generate Prisma client

```bash
npm run db:generate
```

### 7. (Optional) Seed the database

```bash
npm run db:seed
```

### 8. (Optional) Import card data

Import card data from MTGJSON for full card search functionality:

```bash
npm run import:cards
```

> **Note**: This downloads and processes a large dataset. It may take several minutes.

## Running the Application

### Development mode

Start both frontend and backend with hot-reload:

```bash
npm run dev
```

This runs:
- **Frontend**: http://localhost:3000 (Vite dev server)
- **Backend**: http://localhost:5000 (Express with tsx watch)

### Run services individually

```bash
# Frontend only
npm run dev:client

# Backend only
npm run dev:server
```

### Production mode

Build and start the production server:

```bash
npm run build
npm start
```

### Docker

Build and run with Docker:

```bash
# Build the image
docker build -t mtg-binder .

# Run with environment variables
docker run -p 5000:5000 \
  -e DATABASE_URL="postgresql://user:pass@host:5432/mtgbinder" \
  -e JWT_SECRET="your-secret-key" \
  -e CLIENT_URL="http://localhost:5000" \
  -e NODE_ENV="production" \
  mtg-binder
```

The container automatically:
- Runs database migrations on startup
- Imports card data from MTGJSON if the database is empty (first run only)

### Deployment

For production deployment guides, see:
- [Deploying to Coolify](docs/deployment/coolify.md) - Self-hosted PaaS deployment

## Database Commands

| Command | Description |
|---------|-------------|
| `npm run db:migrate` | Run Prisma migrations |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:seed` | Seed database with initial data |
| `npm run db:studio` | Open Prisma Studio (database GUI) |

## Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode (client)
npm run test:watch --workspace=client
```

## Code Quality

```bash
# Run linter
npm run lint

# Auto-fix lint issues
npm run lint:fix

# Type checking
npm run typecheck
```

## Project Structure

```
mtg-binder/
├── client/                 # React frontend (Vite)
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Route-level pages
│   │   ├── services/       # API clients
│   │   └── context/        # React context providers
│   └── package.json
├── server/                 # Express backend
│   ├── src/
│   │   ├── routes/         # API route handlers
│   │   ├── services/       # Business logic
│   │   ├── middleware/     # Express middleware
│   │   └── utils/          # Utilities
│   ├── prisma/
│   │   └── schema.prisma   # Database schema
│   └── package.json
├── shared/                 # Shared types and utilities
│   └── src/index.ts
├── docs/                   # Documentation
│   └── architecture/       # ADRs and architecture docs
└── package.json            # Root workspace config
```

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create new account |
| POST | `/api/auth/login` | Login and get JWT token |
| GET | `/api/auth/me` | Get current user |

### Collection
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/collection` | Get user's collection |
| POST | `/api/collection` | Add card to collection |
| PATCH | `/api/collection/:id` | Update collection item |
| DELETE | `/api/collection/:id` | Remove from collection |

### Wishlist
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/wishlist` | Get user's wishlist |
| POST | `/api/wishlist` | Add card to wishlist |
| PATCH | `/api/wishlist/:id` | Update wishlist item |
| DELETE | `/api/wishlist/:id` | Remove from wishlist |

### Trading
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/binder/:shareCode` | Get public trade binder |
| POST | `/api/trade/sessions` | Create trade session |
| GET | `/api/trade/sessions/:id` | Get session details |

### Cards
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/cards/search` | Search cards |
| GET | `/api/cards/autocomplete` | Autocomplete card names |

## Architecture Decisions

Key architectural decisions are documented in ADRs:

- [ADR-001: Monolithic Architecture](docs/architecture/decisions/ADR-001-monolithic-architecture.md)
- [ADR-002: PostgreSQL Database](docs/architecture/decisions/ADR-002-postgresql-database.md)
- [ADR-003: Socket.IO for Real-Time](docs/architecture/decisions/ADR-003-socketio-realtime.md)
- [ADR-004: JWT Authentication](docs/architecture/decisions/ADR-004-jwt-authentication.md)
- [ADR-005: Trade Matching by Name](docs/architecture/decisions/ADR-005-trade-matching-by-name.md)

## Troubleshooting

### Database connection issues

1. Ensure PostgreSQL is running:
   ```bash
   # macOS
   brew services list | grep postgresql

   # Linux
   sudo systemctl status postgresql
   ```

2. Verify your `DATABASE_URL` in `.env` is correct

3. Try connecting manually:
   ```bash
   psql -U postgres -d mtg_binder
   ```

### Port already in use

If port 3000 or 5000 is in use:

```bash
# Find process using the port
lsof -i :5000

# Kill the process
kill -9 <PID>
```

Or change ports in `.env`:
```env
PORT=5001
CLIENT_URL=http://localhost:3001
```

### Prisma client out of sync

If you see Prisma errors after pulling new changes:

```bash
npm run db:generate
npm run db:migrate
```

## Claude Code AI Assistant

This project includes custom configurations for [Claude Code](https://docs.anthropic.com/en/docs/claude-code), Anthropic's AI coding assistant. These customizations are stored in the `.claude/` directory and provide automated workflows, specialized agents, and safety guardrails.

### Prerequisites for Claude Code

To use the AI assistant features:

1. Install Claude Code CLI
2. Have access to Azure DevOps (for some workflows)
3. Configure MCP (Model Context Protocol) servers if using ADO integration

### Custom Slash Commands

Invoke these commands directly in Claude Code by typing the command name:

#### `/comeonteamdostuff <story-prefix>`

**Complete end-to-end story workflow** - Automates the entire development lifecycle from Azure DevOps story to merged PR.

```
/comeonteamdostuff 001
```

**What it does:**
1. Finds story `[MTG-001]` in Azure DevOps
2. Updates status to "Doing"
3. Runs conflict checks against ADRs and in-progress work
4. Implements the story (creates branch, writes code)
5. Runs QA tests
6. Performs automated code review
7. Creates PR with proper formatting
8. Waits for human approval
9. Updates status to "Done"

**Quality Gates:** The workflow pauses for human approval at three critical points:
- After conflict analysis
- After QA testing
- After code review

#### `/test`

**Run tests and analyze results** - Executes the test suite and provides intelligent failure analysis.

```
/test
```

**What it does:**
- Runs all tests via `npm test`
- Summarizes pass/fail counts
- Analyzes failures and suggests fixes
- Reports coverage if available

#### `/code-review`

**Thorough code review** - Reviews code changes with categorized feedback.

```
/code-review
```

**Feedback Categories:**
- 🔴 **Critical**: Must fix before merge (security, data loss)
- 🟠 **Major**: Should fix, blocks approval
- 🟡 **Minor**: Nice to fix (style, small optimizations)
- 💭 **Suggestion**: Consider for future

### Custom Agents

Specialized AI agents that can be spawned for specific tasks. These are used internally by commands but can also be invoked directly via the Task tool.

#### `code-reviewer`

Expert code reviewer for TypeScript, React, and Node.js applications.

**Capabilities:**
- Analyzes git diffs between branches
- Applies comprehensive review checklist (correctness, security, error handling, performance)
- Auto-fixes minor issues (import ordering, trailing whitespace, console.log removal)
- Generates structured review reports with severity ratings
- Follows project-specific conventions from CLAUDE.md

**Review Areas:**
- Security vulnerabilities (injection, XSS, hardcoded secrets)
- Error handling and async/await patterns
- Type safety (flags `any` usage)
- React patterns (MUI v7, TanStack Query, hooks)
- Naming conventions and code organization

#### `story-conflict-checker`

Conflict detection specialist for pre-implementation analysis.

**Capabilities:**
- Reviews all ADRs for potential conflicts
- Scans discovery stories for overlapping work
- Searches Azure DevOps for in-progress work items
- Analyzes codebase impact (files, shared components)
- Generates risk assessment (Low/Medium/High)

**Output includes:**
- ADR compliance checklist
- Related stories analysis
- In-progress work conflicts
- File impact predictions
- Go/no-go recommendation

### Hookify Rules (Safety Guardrails)

Automatic warnings that trigger when potentially dangerous patterns are detected. These rules run in the background and alert you before problems occur.

#### `warn-debugger-statement`

**Triggers when:** Code contains `debugger` statements

**Why it matters:**
- `debugger` statements should never ship to production
- Can freeze the browser for end users
- May expose internal state via DevTools

**Recommendation:** Use for local debugging only, remove before committing.

#### `warn-eval-usage`

**Triggers when:** Code contains `eval()` calls

**Why it matters:**
- Enables code injection attacks
- Bypasses JavaScript security model
- Makes code harder to debug and maintain

**Safer alternatives:**
- `JSON.parse()` for JSON data
- Bracket notation `obj[prop]` for dynamic property access
- Template engines for dynamic content

#### `workflow-gate-reminder`

**Triggers when:** An agent is spawned during a workflow

**Purpose:** Ensures human oversight at critical decision points by reminding to:
- Wait for agent completion
- Review output carefully
- Request explicit user approval at quality gates
- Handle failures before proceeding

### Directory Structure

```
.claude/
├── commands/                    # Custom slash commands
│   ├── comeonteamdostuff.md    # Full story workflow
│   └── test.md                 # Test runner
├── agents/                      # Specialized AI agents
│   ├── code-reviewer.md        # Code review expert
│   └── story-conflict-checker.md # Conflict detection
├── skills/                      # Reusable skill definitions
│   └── code-review/
│       └── SKILL.md            # Code review skill
├── hookify.*.local.md          # Safety rule definitions
├── settings.json               # Shared settings
└── settings.local.json         # Local overrides (not committed)
```

### Extending Claude Code

#### Adding a New Command

Create a new markdown file in `.claude/commands/`:

```markdown
---
description: Brief description of what the command does
argument-hint: [optional-arg] description
allowed-tools: Read, Write, Edit, Bash, Glob, Grep
model: claude-sonnet-4-5-20250929
---

# /your-command-name

Instructions for Claude Code to follow when this command is invoked...
```

#### Adding a New Agent

Create a new markdown file in `.claude/agents/`:

```markdown
---
name: agent-name
description: What this agent specializes in
tools: Read, Edit, Bash, Glob, Grep
model: claude-sonnet-4-5-20250929
---

# Agent Name

You are an expert in [specialty]. Your job is to...

## Input
What the agent receives...

## Process
Steps the agent follows...

## Output
Expected output format...
```

#### Adding a Hookify Rule

Create a new file matching the pattern `.claude/hookify.*.local.md`:

```markdown
---
name: rule-name
enabled: true
event: file           # or 'tool_call'
action: warn          # or 'block'
conditions:
  - field: content    # or 'tool_name'
    operator: regex_match  # or 'equals', 'contains'
    pattern: your-regex-pattern
---

⚠️ **Warning Title**

Explanation of what was detected and why it matters...

**Recommendations:**
- How to fix or avoid the issue
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.
