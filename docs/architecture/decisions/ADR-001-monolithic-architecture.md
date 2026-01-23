# ADR-001: Monolithic Architecture

## Status

**Accepted** - January 2025

## Context

We need to choose an architectural pattern for the MTG Binder application. The options considered were:

1. **Modular Monolith** - Single deployable unit with logical module separation
2. **Microservices** - Distributed services communicating via network
3. **Serverless** - Function-as-a-Service (FaaS) approach

### Constraints

- **Team Size**: 1-2 developers
- **Budget**: Minimal infrastructure costs preferred
- **Timeline**: MVP needed quickly
- **Scale**: Personal/hobbyist use (< 10,000 users expected)
- **Features**: Collection management, wishlists, real-time trading

## Decision

We will use a **Modular Monolith** architecture with:
- Single Express.js server
- Logical separation via folders (routes, services, middleware)
- Shared database (PostgreSQL)
- Co-located WebSocket server for real-time features

## Rationale

### Why NOT Microservices?

| Factor | Microservices | Our Needs |
|--------|---------------|-----------|
| Team size | 5+ developers typically | 1-2 developers |
| Deployment complexity | High (orchestration, service mesh) | Want simple |
| Operational overhead | High (monitoring each service) | Minimal ops desired |
| Development speed | Slower (API contracts, versioning) | Fast iteration needed |
| Cost | Higher (multiple instances, networking) | Budget-conscious |

**Rule of thumb**: Microservices add value when you need independent deployment and scaling of components, or have large teams needing autonomy. Neither applies here.

### Why NOT Serverless?

- WebSocket connections require persistent servers
- Cold starts would impact UX for trading sessions
- PostgreSQL connection pooling challenges with FaaS
- Would require significant rearchitecture later

### Why Monolith Works

1. **Simplicity**: One codebase, one deployment, one database
2. **Performance**: No network hops between "services"
3. **Transactions**: ACID guarantees across all operations
4. **Development Speed**: No API versioning overhead
5. **Debugging**: Full stack traces, single log stream
6. **Cost**: Single server instance sufficient

## Consequences

### Positive

- ✅ Fast development iteration
- ✅ Simple deployment (one container/process)
- ✅ Low operational overhead
- ✅ Easy local development
- ✅ Shared types between modules (TypeScript)
- ✅ Database transactions work naturally

### Negative

- ❌ Horizontal scaling requires full app replication
- ❌ Large test suite runs all tests together
- ❌ Memory limit is single process limit
- ❌ Single point of failure (mitigated by replicas)

### Neutral

- Scaling path exists: can extract services later if needed
- Vertical scaling sufficient for expected load

## Scaling Path

If we need to scale beyond a single server:

1. **Phase 1 (current)**: Single server, vertical scaling
2. **Phase 2 (1k+ users)**: Load-balanced replicas, Redis for sessions
3. **Phase 3 (10k+ users)**: Read replicas for database, CDN for static assets
4. **Phase 4 (100k+ users)**: Extract high-load components to services

We are currently at Phase 1 and expect to remain here for the foreseeable future.

## References

- [MonolithFirst by Martin Fowler](https://martinfowler.com/bliki/MonolithFirst.html)
- [Modular Monolith: A Primer](https://www.kamilgrzybek.com/blog/posts/modular-monolith-primer)
