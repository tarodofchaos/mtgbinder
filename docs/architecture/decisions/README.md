# Architecture Decision Records (ADRs)

This directory contains Architecture Decision Records (ADRs) that document significant architectural decisions made in the MTG Binder project.

## What is an ADR?

An ADR is a document that captures an important architectural decision along with its context and consequences. It helps future developers (including yourself) understand **why** decisions were made.

## ADR Index

| ID | Title | Status | Date |
|----|-------|--------|------|
| [ADR-001](./ADR-001-monolithic-architecture.md) | Monolithic Architecture | Accepted | Jan 2025 |
| [ADR-002](./ADR-002-postgresql-database.md) | PostgreSQL as Primary Database | Accepted | Jan 2025 |
| [ADR-003](./ADR-003-socketio-realtime.md) | Socket.IO for Real-Time Trading | Accepted | Jan 2025 |
| [ADR-004](./ADR-004-jwt-authentication.md) | JWT for Authentication | Accepted | Jan 2025 |
| [ADR-005](./ADR-005-trade-matching-by-name.md) | Trade Matching by Card Name Only | Accepted | Jan 2025 |

## ADR Template

When adding a new ADR, use this template:

```markdown
# ADR-XXX: Title

## Status

**Proposed** | **Accepted** | **Deprecated** | **Superseded by ADR-XXX**

## Context

What is the issue that we're seeing that is motivating this decision?

## Decision

What is the decision that we're making?

## Rationale

Why did we choose this option over alternatives?

## Consequences

What are the positive and negative consequences of this decision?

## References

Links to related resources
```

## Naming Convention

- Files: `ADR-XXX-short-title.md`
- Numbers: Sequential, zero-padded (001, 002, etc.)
- Titles: Kebab-case, descriptive

## Lifecycle

1. **Proposed**: Under discussion
2. **Accepted**: Decision made and implemented
3. **Deprecated**: No longer relevant
4. **Superseded**: Replaced by a newer ADR

## Further Reading

- [ADR GitHub Organization](https://adr.github.io/)
- [Documenting Architecture Decisions](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions)
- [ADR Tools](https://github.com/npryce/adr-tools)
