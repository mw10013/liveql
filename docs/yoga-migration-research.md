# Yoga Migration Research: liveql-n4m.js

Date: 2026-03-20

## Current State

`liveql-n4m.js` uses `apollo-server@^2.21.1` with a single import:

```js
const { ApolloServer, gql } = require("apollo-server");
```

- `gql` — tagged template literal that parses SDL into an AST (re-export of `graphql-tag`)
- `ApolloServer` — wraps schema + resolvers, starts an HTTP server with `server.listen()`

The entire file is plain JS (no TypeScript, no build step). Schema is SDL-first with a `typeDefs` string and a `resolvers` object.

## Target Stack

| Package | Version | Role |
|---------|---------|------|
| `graphql` | 16.13.1 | GraphQL spec engine (peer dep of Yoga) |
| `graphql-yoga` | 5.18.1 | HTTP server with GraphiQL, CORS, caching |

Both are already in `package.json`. Apollo can be removed entirely.

## Migration Map

### What changes

| Apollo | Yoga | Notes |
|--------|------|-------|
| `require("apollo-server")` | `require("graphql-yoga")` | Single import source |
| `gql\`...\`` tagged template | Plain string literal | `createSchema` accepts raw SDL strings; no `gql` tag needed |
| `new ApolloServer({ typeDefs, resolvers })` | `createYoga({ schema: createSchema({ typeDefs, resolvers }) })` | Two-step: build schema, then create server |
| `server.listen()` → Promise `{ url }` | `http.createServer(yoga).listen(port, cb)` | Uses Node's built-in `http` module |

### What stays the same

- The `typeDefs` SDL string (unchanged, just drop the `gql` tag)
- The entire `resolvers` object (identical resolver signatures: `(parent, args) => ...`)
- All `get()`, `set()`, `call()`, `exec()` helpers and Max handler code (untouched)

## Concrete Diff

### Before (lines 1-3, 345-350)

```js
const { ApolloServer, gql } = require("apollo-server");

const typeDefs = gql`
  type Song { ... }
  ...
`;

const server = new ApolloServer({ typeDefs, resolvers });
server.listen().then(({ url }) => {
  console.log(`🚀  Server ready at ${url}`);
});
```

### After

```js
const http = require("http");
const { createYoga, createSchema } = require("graphql-yoga");

const typeDefs = /* GraphQL */ `
  type Song { ... }
  ...
`;

const yoga = createYoga({
  schema: createSchema({ typeDefs, resolvers }),
  graphqlEndpoint: "/",
  maskedErrors: false,
});

const server = http.createServer(yoga);
server.listen(4000, () => {
  console.log(`Server ready at http://localhost:4000`);
});
```

### Key details

1. **`createSchema({ typeDefs, resolvers })`** — accepts SDL string + resolver map. Uses `@graphql-tools/schema.makeExecutableSchema` internally. No need for `graphql-tag` or `gql`.

2. **`createYoga(options)`** — returns a Fetch API–compatible handler that doubles as a Node `http.RequestListener`. Pass it directly to `http.createServer()`.

3. **Endpoint**: `graphqlEndpoint: "/"` to preserve Apollo's root path.

4. **Port**: 4000, passed explicitly to `server.listen(4000)`.

5. **GraphiQL** — built in, enabled by default. Accessible at the endpoint via browser GET request.

6. **CORS** — enabled by default with permissive settings. Fine for local-only use.

7. **Error masking** — disabled (`maskedErrors: false`). Local-only, no security benefit.

8. **Parser/validation caching** — enabled by default (LRU cache). Free performance win.

## Resolved Decisions

1. **Endpoint path**: `graphqlEndpoint: "/"` — preserve Apollo's root path for existing consumers.
2. **Error masking**: `maskedErrors: false` — local-only, no security benefit from masking.
3. **Port**: 4000 (confirmed).
4. **`http` import**: `require("http")` (no `node:` prefix) — Node for Max bundles v16 (Max 8.0–8.5) or v20 (Max 8.6+/Live 12). Both support `node:` prefix, but plain `require("http")` is safer across all versions.
5. **Logging**: Default (`console.*`) — Node for Max routes stdout/stderr to Max console already.

## Risk Assessment

**Low risk.** The migration is mechanical:
- SDL string is identical (drop `gql` tag)
- Resolver signatures are identical (`(parent, args) => result`)
- No Apollo-specific plugins, context factories, or middleware in use
- No subscriptions, no auth, no federation
- The only behavioral difference is the server bootstrap code (3-5 lines)

## Files Modified

| File | Change |
|------|--------|
| `liveql-n4m.js` | Replace Apollo import/boot with Yoga import/boot. Drop `gql` tag from typeDefs. Everything between is untouched. |
| `package.json` | Remove `apollo-server` from dependencies (already has `graphql` + `graphql-yoga`). |
