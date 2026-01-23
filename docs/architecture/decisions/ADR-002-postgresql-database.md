# ADR-002: PostgreSQL as Primary Database

## Status

**Accepted** - January 2025

## Context

We need to choose a database for storing:
- User accounts and authentication data
- MTG card catalog (~1.5M+ cards from MTGJSON)
- User collections (many-to-many with conditions, quantities)
- Wishlists with priorities and constraints
- Trading sessions with match results

### Options Considered

1. **PostgreSQL** - Relational database
2. **MongoDB** - Document database
3. **SQLite** - Embedded database
4. **MySQL/MariaDB** - Relational database

## Decision

We will use **PostgreSQL** as our primary database, accessed via **Prisma ORM**.

## Rationale

### Data Relationships

Our data is highly relational:

```
User ─────┬──── CollectionItem ────── Card
          │
          ├──── WishlistItem ──────── Card
          │
          └──── TradeSession ────────┐
                                     │
User ────────────────────────────────┘
```

**Collection queries require**:
- Joining users → collection_items → cards
- Filtering by user, aggregating by card
- Complex conditions (condition >= minCondition, foilOnly, etc.)

**Trade matching requires**:
- Three-table joins (collection ⋈ cards ⋈ wishlist)
- Comparing conditions across tables
- Aggregating match results

### Why PostgreSQL Over Alternatives

| Feature | PostgreSQL | MongoDB | SQLite | MySQL |
|---------|------------|---------|--------|-------|
| Complex joins | Excellent | Poor | Good | Good |
| ACID compliance | Full | Document-level | Full | Full |
| JSON support | Native (JSONB) | Native | Limited | Limited |
| Full-text search | Built-in | Built-in | Extension | Built-in |
| Enum types | Native | No | No | Yes |
| Array types | Native | Native | No | No |
| Connection pooling | PgBouncer | Built-in | N/A | ProxySQL |
| Scaling | Read replicas | Sharding | N/A | Read replicas |
| Free hosting | Supabase, Render | Atlas (limited) | N/A | PlanetScale |

### Why NOT MongoDB

While MongoDB handles card catalog data well, our use case involves:
- Many-to-many relationships (users ↔ cards via collections)
- Complex filtering conditions
- Value aggregation for trade matching

These are SQL's strengths. MongoDB would require:
- Denormalized data (storage overhead, sync complexity)
- Application-side joins (N+1 queries)
- Complex aggregation pipelines

### Why NOT SQLite

SQLite is excellent for embedded use but:
- Single-writer limitation problematic for web apps
- No network access (can't separate app and DB servers)
- Limited concurrent connection handling

### ORM Choice: Prisma

We use Prisma ORM because:
- **Type safety**: Generated TypeScript types from schema
- **Migrations**: Declarative schema with automatic migrations
- **Query builder**: Type-safe queries without raw SQL (mostly)
- **Raw SQL escape hatch**: When needed for performance

```typescript
// Prisma generates types from schema.prisma
const items = await prisma.collectionItem.findMany({
  where: { userId, forTrade: { gt: 0 } },
  include: { card: true },
});
// items is fully typed: Array<CollectionItem & { card: Card }>
```

## Consequences

### Positive

- ✅ Strong consistency (ACID transactions)
- ✅ Powerful query capabilities (joins, aggregations)
- ✅ Native enum support (CardCondition, Priority)
- ✅ JSONB for flexible data (matchesJson in TradeSession)
- ✅ Excellent Prisma integration
- ✅ Free tier hosting available (Supabase, Render)
- ✅ Mature ecosystem, well-documented

### Negative

- ❌ Vertical scaling limits (mitigated by read replicas)
- ❌ Schema migrations required for changes
- ❌ Connection limits without pooling (PgBouncer helps)

### Mitigations

1. **Connection limits**: Use Prisma's built-in connection pooling
2. **Schema flexibility**: JSONB columns for semi-structured data
3. **Scaling**: Add read replicas when needed

## Schema Design Principles

1. **Normalize core entities**: Users, Cards, Collections
2. **Use JSONB sparingly**: Only for truly flexible data (matchesJson)
3. **Index foreign keys**: All `userId`, `cardId` columns indexed
4. **Use enums**: CardCondition, Priority, TradeSessionStatus
5. **Composite unique constraints**: Prevent duplicate collection entries

## References

- [PostgreSQL vs MongoDB](https://www.prisma.io/dataguide/postgresql/mongodb-vs-postgresql)
- [Prisma with PostgreSQL](https://www.prisma.io/docs/concepts/database-connectors/postgresql)
