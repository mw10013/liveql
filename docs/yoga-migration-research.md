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
const { createServer } = require("node:http");
const { createYoga, createSchema } = require("graphql-yoga");

const typeDefs = /* GraphQL */ `
  type Song { ... }
  ...
`;

const yoga = createYoga({
  schema: createSchema({ typeDefs, resolvers }),
  logging: true,
  graphiql: true,
});

const server = createServer(yoga);
server.listen(4000, () => {
  console.log(`Server ready at http://localhost:4000/graphql`);
});
```

### Key details

1. **`createSchema({ typeDefs, resolvers })`** — accepts SDL string + resolver map. Uses `@graphql-tools/schema.makeExecutableSchema` internally. No need for `graphql-tag` or `gql`.

2. **`createYoga(options)`** — returns a Fetch API–compatible handler that doubles as a Node `http.RequestListener`. Pass it directly to `http.createServer()`.

3. **Default endpoint is `/graphql`** — configurable via `graphqlEndpoint` option. Apollo defaulted to `/` (root). This will change the URL clients use. Options:
   - Accept the new `/graphql` default (cleaner)
   - Set `graphqlEndpoint: "/"` to preserve the old behavior
   - **Decision needed: which endpoint path?**

4. **Default port** — Apollo's `server.listen()` defaulted to port 4000. We should keep 4000 for continuity. Yoga doesn't pick a default port; you pass it to `server.listen(port)`.

5. **GraphiQL** — built in, enabled by default. Accessible at the `graphqlEndpoint` via browser GET request. No extra config needed.

6. **CORS** — enabled by default with permissive settings. For local-only use this is fine.

7. **Error masking** — Yoga masks unexpected errors by default (`maskedErrors: true`). For local dev, we may want to disable this so resolver errors surface clearly:
   - **Decision needed: `maskedErrors: false` for local dev?**

8. **Parser/validation caching** — enabled by default (LRU cache). Free performance win.

## Open Questions

1. **Endpoint path**: Keep Apollo's `/` or adopt Yoga's `/graphql` default? Any downstream consumers (Max patches, scripts) that hardcode the URL?

`/`

2. **Error masking**: Disable for local dev (`maskedErrors: false`) so LOM errors propagate clearly to GraphiQL? There's no production deployment, so masking provides no security benefit.

disable

3. **Port**: Confirm port 4000. Is anything else using it on the dev machine?

confirmed

4. **`node:http` availability**: Node for Max bundles a specific Node version. `node:http` (with the `node:` prefix) requires Node 16+. If the bundled Node is older, use `require("http")` instead. Need to confirm Node for Max's Node version.
   - Fallback: `require("http")` works on all Node versions.

check docs/m4l-amxd-research.md about node version.   

5. **Logging**: Yoga accepts `logging: true | false | LogLevel | YogaLogger`. The current code logs to Max console via `Max.post()`. Should we wire Yoga's logger to `Max.post()` instead of default `console.*`?
   - Option: `logging: { debug: Max.post, info: Max.post, warn: Max.post, error: Max.post }`
   - Or just leave default (`console.*`) since Node for Max routes stdout to Max console anyway.

   leave default

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
