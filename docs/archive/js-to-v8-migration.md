# Migrating from `js` to `v8` in Max for Live

Date: 2026-03-21

## Summary

The `v8` object is a modern JavaScript runtime introduced in **Max 9.0.0 (October 2024)**. It uses **Google's V8 engine** (same as Chrome/Node.js), replacing the legacy `js` object's **Mozilla SpiderMonkey JS 1.8.5 (ES5-only)** engine. The `v8` object supports ES6+ syntax and has improved Max data type interop, while retaining full LiveAPI support. The legacy `js` object is maintained only for backward compatibility and receives no new features. Cycling '74 has stated that eventually `js` will automatically use the V8 engine. [4]

Our `liveql.amxd` currently uses `js liveql-m4l.js`. We are switching to `v8 liveql-m4l.js`.

## Plan

1. **Switch `js` → `v8` in the AMXD** — no code changes required, existing ES5 is valid ES6+
2. **Test** — load device in Live 12.2+, verify LiveAPI calls and GraphQL server work
3. **Modernize `liveql-m4l.js`** to ES6+ syntax after confirming the swap works
4. **Keep JSON string serialization** between `v8` and `node.script` (see rationale below)

We are dropping Live 11 support — the `v8` object requires Max 9, meaning **Live 12.2+** (or Live 12.0–12.1 with standalone Max 9 configured). [2]

## AMXD Change

The `.amxd` patcher needs the object text changed from `js liveql-m4l.js` to `v8 liveql-m4l.js`. This must be done **inside the Max editor** (the AMXD has a binary header with checksums):

1. Load `liveql.amxd` in Live → open Max editor (wrench icon)
2. Unlock the patcher (Cmd+E)
3. Double-click the `js liveql-m4l.js` object box → change to `v8 liveql-m4l.js`
4. Click outside to confirm, re-lock (Cmd+E), save (Cmd+S)
5. Verify patch cables remain connected — the `v8` object should maintain the same inlet/outlet count

## What We Gain

ES6+ language features: `let`/`const`, arrow functions, template literals, classes, destructuring, spread/rest, `Map`/`Set`, promises (no event loop — use Task API). [4] [5]

v8-exclusive Max interop: `msg_array()`, `msg_dictionary()`, `outlet_array()`, `outlet_dictionary()`, `outlettypes` property, embed code in patcher. [10]

## Attribute Variable Caveat

**Top-level variables used as Max attributes MUST remain `var`.** Using `let` or `const` silently breaks them. [1] Our `inlets` and `outlets` (lines 1–2) are bare global assignments without `var`, which is fine and should continue to work.

## ES6+ Modernization

After confirming the `v8` swap works, we will modernize `liveql-m4l.js`. Logic stays identical — only syntax changes: `var` → `const`/`let`, template literals, shorthand object properties, `for...of` instead of `.forEach`, arrow functions.

```javascript
inlets = 1;
outlets = 1;

function getLive(idOrPath) {
  const live = new LiveAPI(
    typeof idOrPath === "string" ? idOrPath : `id ${idOrPath}`,
  );
  if (live.path === "") {
    throw `Invalid live id or path: ${idOrPath}`;
  }
  return live;
}
getLive.local = 1;

function outletSuccessfulResult(actionId, data) {
  outlet(
    0,
    "result",
    JSON.stringify({
      status: "succeeded",
      actionId,
      data,
    }),
  );
}
outletSuccessfulResult.local = 1;

function outletFailedResult(actionId, message) {
  outlet(
    0,
    "result",
    JSON.stringify({
      status: "failed",
      actionId,
      message: message.toString(),
    }),
  );
}
outletFailedResult.local = 1;

function get(json) {
  let actionId = null;
  try {
    const params = JSON.parse(json);
    actionId = params.actionId;
    const live = getLive(params.idOrPath);

    const o = {
      id: parseInt(live.id),
      path: live.unquotedpath,
      type: live.type,
    };

    for (const k of params.propertyKeysSingle || []) {
      const propertyArr = live.get(k);
      if (propertyArr.length === 1) {
        o[k] = propertyArr[0];
      }
    }

    for (const k of params.propertyKeysMultiple || []) {
      o[k] = live.get(k);
    }

    for (const k of params.childKeysSingle || []) {
      const id = live.get(k)[1];
      o[k] = id === 0 ? null : id;
    }

    for (const k of params.childKeysMultiple || []) {
      o[k] = live.get(k).filter((v) => v !== "id");
    }

    outletSuccessfulResult(actionId, o);
  } catch (err) {
    outletFailedResult(actionId, err);
  }
}

function set(json) {
  let actionId = null;
  try {
    const params = JSON.parse(json);
    actionId = params.actionId;
    const live = getLive(params.idOrPath);
    const data = live.set(params.property, params.value);
    outletSuccessfulResult(actionId, data);
  } catch (err) {
    outletFailedResult(actionId, err);
  }
}

function call(json) {
  let actionId = null;
  try {
    const params = JSON.parse(json);
    actionId = params.actionId;
    const live = getLive(params.idOrPath);
    const data = live.call(params.args);
    outletSuccessfulResult(actionId, data);
  } catch (err) {
    outletFailedResult(actionId, err);
  }
}
```

## Keeping JSON String Serialization

The `v8` object adds `outlet_dictionary()` / `msg_dictionary()` which could replace manual `JSON.stringify`/`JSON.parse` between `v8` and `node.script`. However, when dictionaries cross the `node.script` IPC boundary, they get serialized to JSON anyway — so the dictionary path does double serialization (JS → Max dict → JSON → JS) vs single with direct JSON strings. [10] [11] [12]

Staying with JSON strings also keeps the protocol explicit in code, avoids changing both sides simultaneously, and preserves the ability to fall back to the `js` object if needed. We can revisit if we hit the Max symbol size limit (~32KB) or need patcher-level dictionary inspection.

## Sources

1. Cycling '74 Forums "v8 and box.rect behavior changed compared to js — what else?" (attribute `var` caveat).
   https://cycling74.com/forums/v8-and-boxrect-behavior-changed-compared-to-js-what-else
2. Ableton "Recommended Max versions" (Live/Max version mapping).
   https://help.ableton.com/hc/en-us/articles/209772305-Recommended-Max-versions
3. Cycling '74 Forums "Migrating to Max 9 — how to find all js Max objects."
   https://cycling74.com/forums/migrating-to-max-9-how-to-find-all-js-max-objects
4. Cycling '74 v8 Object Reference.
   https://docs.cycling74.com/reference/v8/
5. Cycling '74 JavaScript in Max User Guide.
   https://docs.cycling74.com/userguide/javascript/
6. Cycling '74 LiveAPI Reference.
   https://docs.cycling74.com/apiref/js/liveapi/
7. Adam Murray "Updated JavaScript Live API Tutorials" (v8-specific Live API examples).
   https://cycling74.com/forums/updated-javascript-live-api-tutorials
8. Max 9.0.0 Release Notes.
   https://cycling74.com/releases/max/9.0.0
9. Max 9.1.0 Release Notes.
   https://cycling74.com/releases/max/9.1.0
10. Cycling '74 jsthis API Reference (msg_dictionary, outlet_dictionary).
    https://docs.cycling74.com/apiref/js/jsthis/
11. Cycling '74 Forums "Latency of copying a dict between node and max."
    https://cycling74.com/forums/latency-of-copying-a-dict-between-a-node-process-and-max
12. Cycling '74 node.script Reference (dictionary handling, IPC).
    https://docs.cycling74.com/reference/node.script
