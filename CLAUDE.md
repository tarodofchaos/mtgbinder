# CLAUDE.md - Project Guide

## Project Overview

A full-stack application using Node.js, React, and Express.

## Project Structure

```
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Route-level page components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── services/       # API client functions
│   │   ├── utils/          # Helper functions
│   │   ├── context/        # React context providers
│   │   ├── types/          # TypeScript type definitions
│   │   ├── App.tsx         # Root component
│   │   └── index.tsx       # Entry point
│   └── package.json
├── server/                 # Express backend
│   ├── src/
│   │   ├── routes/         # API route handlers
│   │   ├── controllers/    # Business logic
│   │   ├── models/         # Database models
│   │   ├── middleware/     # Express middleware
│   │   ├── services/       # External service integrations
│   │   ├── utils/          # Helper functions
│   │   ├── types/          # TypeScript type definitions
│   │   └── index.ts        # Server entry point
│   └── package.json
├── shared/                 # Shared types/utilities between client and server
└── package.json            # Root package.json for workspace
```

## Common Commands

### Development
```bash
npm run dev              # Start both client and server in development mode
npm run dev:client       # Start React dev server only (port 3000)
npm run dev:server       # Start Express server only (port 5000)
```

### Testing
```bash
npm test                 # Run all tests
npm run test:client      # Run React tests (Jest + React Testing Library)
npm run test:server      # Run server tests (Jest/Mocha)
npm run test:e2e         # Run end-to-end tests (Cypress/Playwright)
npm run test:coverage    # Generate coverage report
```

### Build & Production
```bash
npm run build            # Build both client and server
npm run build:client     # Build React for production
npm run build:server     # Compile TypeScript server
npm start                # Start production server
```

### Code Quality
```bash
npm run lint             # Run ESLint
npm run lint:fix         # Fix auto-fixable lint issues
npm run format           # Run Prettier
npm run typecheck        # Run TypeScript type checking
```

## Code Style Preferences

### General
- Use TypeScript for both client and server
- Use functional components with hooks (no class components)
- Prefer named exports over default exports
- Use async/await over raw promises
- Keep functions small and focused (single responsibility)

### Naming Conventions
- **Files**: kebab-case for files (`user-service.ts`), PascalCase for React components (`UserProfile.tsx`)
- **Variables/Functions**: camelCase (`getUserById`, `isLoading`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_RETRY_COUNT`)
- **Types/Interfaces**: PascalCase with descriptive names (`UserResponse`, `CreateCardInput`)
- **React Components**: PascalCase (`CardList`, `NavigationBar`)

### React Patterns
- Co-locate component styles and tests with components
- Use custom hooks to extract reusable logic
- Prefer controlled components for forms
- Use React Query or SWR for server state management
- Keep components under 200 lines; extract sub-components if larger

### Express Patterns
- Use router-level middleware for route groups
- Validate request input at the controller level
- Return consistent error response shapes
- Use dependency injection for testability

## Things to Avoid

- **No `any` types** - Use `unknown` and narrow with type guards if needed
- **No console.log in production code** - Use a proper logger (winston, pino)
- **No secrets in code** - Use environment variables via `.env` files
- **No synchronous file operations** - Use async fs methods
- **No nested ternaries** - Use early returns or switch statements
- **No magic numbers/strings** - Define constants with meaningful names
- **No business logic in route handlers** - Move to controllers/services
- **No direct DOM manipulation in React** - Use refs when necessary
- **No index.ts barrel files that re-export everything** - Causes circular dependencies and bundle bloat
- **Avoid prop drilling** - Use context or composition patterns

## Key Dependencies

### Frontend (client)
| Package | Purpose |
|---------|---------|
| `react` | UI library |
| `react-router-dom` | Client-side routing |
| `axios` or `fetch` | HTTP client for API calls |
| `@tanstack/react-query` | Server state management and caching |
| `tailwindcss` or `styled-components` | Styling |
| `zod` | Runtime schema validation |
| `react-hook-form` | Form state management |

### Backend (server)
| Package | Purpose |
|---------|---------|
| `express` | Web framework |
| `cors` | Cross-origin resource sharing |
| `helmet` | Security headers |
| `dotenv` | Environment variable loading |
| `zod` | Request validation |
| `prisma` or `mongoose` | Database ORM/ODM |
| `jsonwebtoken` | JWT authentication |
| `bcrypt` | Password hashing |
| `winston` or `pino` | Logging |

### Development
| Package | Purpose |
|---------|---------|
| `typescript` | Type safety |
| `eslint` | Linting |
| `prettier` | Code formatting |
| `jest` | Testing framework |
| `supertest` | HTTP assertion testing |
| `nodemon` or `tsx` | Development server with hot reload |

## Environment Variables

Required variables in `.env`:
```
NODE_ENV=development
PORT=5000
DATABASE_URL=<connection-string>
JWT_SECRET=<secret-key>
CLIENT_URL=http://localhost:3000
```

## API Conventions

- RESTful endpoints: `GET /api/cards`, `POST /api/cards`, `PUT /api/cards/:id`
- Return JSON with consistent shape: `{ data, error, message }`
- Use HTTP status codes correctly (200, 201, 400, 401, 404, 500)
- Version APIs if needed: `/api/v1/...`
