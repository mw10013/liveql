# GraphQL Stack for Liveql

Date: 2026-03-20

## Context

Liveql is a local-only GraphQL server running inside Node for Max, exposing Ableton Live's LOM (Live Object Model) over GraphQL. No auth, no federation, no public API surface. The current implementation uses `apollo-server@^2.21.1` and `graphql@^15.5.0`, both significantly outdated.

## Server: GraphQL Yoga v5

GraphQL Yoga is the chosen server. It is actively maintained by The Guild, provides GraphiQL out of the box, and runs directly on Node's built-in HTTP server.

- Source: https://the-guild.dev/graphql/yoga-server
- GitHub: https://github.com/graphql-hive/graphql-yoga
- Built-in GraphiQL, CORS, SSE subscriptions, request batching — all configurable.
- Fetch API–based handler, runs on any JS runtime.
- Replaces both `apollo-server` and its transitive dependencies.

Alternatives considered and rejected:
- **graphql-http**: Smaller, but no built-in GraphiQL. Would require a separate UI dependency.
- **Apollo Server v4–v5**: Larger footprint, Apollo-specific tooling we don't need.
- **express-graphql**, **graphql-helix**: Both archived/deprecated.

## The `graphql` package

The [`graphql`](https://github.com/graphql/graphql-js) npm package is the JavaScript reference implementation of the GraphQL spec. It is the core engine that every GraphQL server in the JS ecosystem depends on. It provides:

- **Schema definition** — `GraphQLSchema`, `GraphQLObjectType`, etc., plus the `buildSchema` / SDL parser.
- **Query parsing and validation** — turns a query string into an AST, validates it against the schema.
- **Execution** — resolves a validated query against your resolvers.

GraphQL Yoga requires `graphql` as a **peer dependency** (`^15.2.0 || ^16.0.0`). It does not bundle its own copy — you install `graphql` alongside it. This is standard across the ecosystem; the peer-dep model prevents version conflicts that cause "Cannot use GraphQLSchema from another module" errors.

### Current usage in liveql

The existing code (`liveql-n4m.js:3`) imports only `gql` from `apollo-server`, which is just a re-export of `graphql-tag` — a tagged template literal that parses SDL strings into AST documents. The actual `graphql` package is used transitively by Apollo for schema building and query execution. We never import from `graphql` directly.

### Should we replace `graphql` with something else?

**No.** The `graphql` package is not a choice among alternatives — it *is* the GraphQL runtime for JavaScript. Every JS server (Yoga, Apollo, graphql-http) uses it under the hood. There is no competing implementation of the spec in JS.

The real question is: **how do you define your schema on top of `graphql`?**

### Schema definition: SDL-first

The codebase is plain JavaScript with no TypeScript compilation step — this is a constraint of the Max for Live / Node for Max environment. Code-first schema builders (Pothos, Nexus, Grats, TypeGraphQL) are all TypeScript-oriented and not a fit here.

**Decision: stay SDL-first.** Write SDL strings, wire up resolvers separately. This is the simplest approach, works well for our small fixed schema (~8 types, ~15 mutations), and requires no build tooling. Yoga's `createSchema` helper accepts SDL + resolvers directly — no need for a separate `graphql-tag` dependency.

### graphql version: upgrade to v16

**Decision: upgrade to `graphql@^16`.** v15 is in maintenance mode. v16 has been current since 2021, is actively maintained, and is required for the latest Yoga features. The migration from v15 is mostly painless (no breaking changes for typical SDL-first usage).
