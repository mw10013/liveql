# GraphQL Server Options (Reboot)

Date: 2026-03-20

This note focuses on simplicity of implementation for a local Max for Live + Node for Max GraphQL server. It compares modern, actively maintained options and ties the choice to this project's actual needs.

## Project needs (from current behavior)
- Local-only GraphQL endpoint inside Node for Max.
- Small, fixed operation set (notes, clip control, transport). No public API surface.
- No auth, no federation, no gateway, no uploads, no multi-tenant requirements.

Given this, the most important driver is **implementation simplicity**: smallest dependency set, minimal setup, minimal configuration, and easy embedding in Node's built-in HTTP server.

## What "convenience" means here
Convenience is the set of features that you would otherwise need to implement or wire up yourself, such as:

- Built-in GraphiQL / landing page for testing.
- CORS and CSRF handling.
- Request parsing and validation caching.
- Persisted operations or request batching.
- Subscriptions (SSE or WebSocket) if you later want Live change events.

If none of these are required now, convenience is optional and not a reason to choose a larger server.

## Options

### 1) graphql-http (minimal, spec-compliant)
Source: https://github.com/graphql/graphql-http

What it is:
- Official GraphQL-over-HTTP reference implementation.
- Zero dependencies and a small surface area.

Why it is simplest:
- Minimal packages: `graphql` + `graphql-http`.
- Integrates directly with Node's `http` server (no framework).
- No extra server abstractions to learn or configure.

What you must add yourself if needed:
- GraphiQL UI (recommended add-on: `ruru`).
- CORS/CSRF policy if you want anything beyond same-origin local use.
- Subscriptions, file uploads, persisted ops, batching, etc.

### 2) GraphQL Yoga v5 (batteries-included, still framework-light)
Source: https://the-guild.dev/graphql/yoga-server

What it is:
- Fully featured server with a fetch-compatible handler.
- Built-in GraphiQL and a large set of optional features.

Why it is convenient:
- GraphiQL, CORS, CSRF prevention, persisted ops, request batching, response caching, SSE subscriptions are built-in and configurable.
- Runs on Node's HTTP server or any Fetch-compatible runtime.

Cost to simplicity:
- More dependencies and feature surface than `graphql-http`.
- More configuration options to understand (even if you leave them at defaults).

### 3) Apollo Server v4–v5 (ecosystem-heavy)
Source: https://www.apollographql.com/docs/apollo-server/

What it is:
- Full-featured server with integrations and Apollo-specific tooling.

Why it is not the simplest:
- Larger dependency footprint and more abstraction layers.
- Best when you want Apollo tooling (GraphOS, plugins, gateway features).

## Not recommended (maintenance status)
- `express-graphql` is archived/deprecated. https://github.com/graphql/express-graphql
- `graphql-helix` is archived. https://github.com/contra/graphql-helix

## Recommendation (based on simplicity)

### Primary recommendation: **GraphQL Yoga v5**
Given the desire for a built-in IDE and long-term maintenance, Yoga is the best fit. It is actively maintained, provides GraphiQL out of the box, and avoids adding a separate IDE dependency.

### Secondary option: **graphql-http**
Choose `graphql-http` only if you want the smallest possible dependency footprint and are comfortable adding a separate GraphiQL package or building a custom IDE page.

## Decision summary
- If **built-in UX and active maintenance** are important: **GraphQL Yoga v5**.
- If **minimal dependencies** are the top driver and you can live without built-in GraphiQL: **graphql-http**.
- Apollo Server is overkill for the current scope.
