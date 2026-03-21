# Migrating from `js` to `v8` in Max for Live

Date: 2026-03-21

## Summary

The `v8` object is a modern JavaScript runtime introduced in **Max 9.0.0 (October 2024)**. It uses **Google's V8 engine** (same as Chrome/Node.js), replacing the legacy `js` object's **Mozilla SpiderMonkey JS 1.8.5 (ES5-only)** engine. The `v8` object supports ES6+ syntax and has improved Max data type interop, while retaining full LiveAPI support.

Our `liveql.amxd` currently uses `js liveql-m4l.js`. We want to switch to `v8 liveql-m4l.js`.

## What Changes in liveql-m4l.js?

### Short Answer: Very Little

The current `liveql-m4l.js` code is simple and uses only standard Max JS APIs (`LiveAPI`, `outlet`, `inlets`, `outlets`, JSON). All of these are supported in `v8`. The code is already valid ES5, which is a subset of ES6+, so it will run as-is.

### Required Changes

**None are strictly required.** The existing code should work by simply swapping `js` → `v8` in the AMXD patcher.

### Recommended Modernization (Optional)

If we want to take advantage of ES6+ while we're at it:

| Current (ES5)                           | Modern (ES6+)                            | Lines affected                    |
| --------------------------------------- | ---------------------------------------- | --------------------------------- |
| `var` declarations                      | `let`/`const`                            | Throughout — but see caveat below |
| `function (k) { ... }`                  | Arrow functions `(k) => { ... }`         | Lines 53, 60, 64, 69–72           |
| String concatenation `"id " + idOrPath` | Template literals `` `id ${idOrPath}` `` | Line 6                            |
| `.forEach(function (k) { ... })`        | `.forEach((k) => { ... })` or `for...of` | Lines 53, 60, 64, 69              |

### Critical Caveat: Attribute Variables

**If any top-level variables are used as Max attributes, they MUST remain `var`.** Using `let` or `const` for attribute variables causes them to silently stop working. [1]

In our case, `inlets` and `outlets` (lines 1–2) are Max-facing declarations. **Keep these as `var` (or leave without a keyword as they are now) to be safe.** The current code doesn't use `var` for these — they're bare global assignments, which is fine and should continue to work.

## What Changes in the AMXD?

The `.amxd` patcher needs the object text changed from:

```
js liveql-m4l.js
```

to:

```
v8 liveql-m4l.js
```

This must be done **inside the Max editor** (the AMXD has a binary header with checksums and cannot be safely text-edited). Steps:

1. Load `liveql.amxd` in Live → open Max editor (wrench icon)
2. Unlock the patcher (Cmd+E)
3. Double-click the `js liveql-m4l.js` object box
4. Change the text to `v8 liveql-m4l.js`
5. Click outside the box to confirm — Max will instantiate a `v8` object
6. Re-lock the patcher (Cmd+E), then save (Cmd+S)

**Note:** Verify that all patch cables remain connected after the swap. The `v8` object should maintain the same inlet/outlet count (`inlets = 1; outlets = 1;`), but visually confirm.

## What We Gain

| Feature                | `js` (SpiderMonkey ES5)           | `v8` (V8 ES6+)                             |
| ---------------------- | --------------------------------- | ------------------------------------------ |
| `let` / `const`        | No                                | Yes                                        |
| Arrow functions        | No                                | Yes                                        |
| Template literals      | No                                | Yes                                        |
| Classes                | No                                | Yes                                        |
| Destructuring          | No                                | Yes                                        |
| Spread / rest          | No                                | Yes                                        |
| `Map` / `Set`          | No                                | Yes                                        |
| Promises               | No                                | Yes (but no event loop — use Task API)     |
| `msg_array()`          | No                                | Yes — auto-converts Max arrays → JS arrays |
| `msg_dictionary()`     | No                                | Yes — auto-converts Max dicts → JS objects |
| `outlet_array()`       | No                                | Yes — sends JS arrays as Max arrays        |
| `outlet_dictionary()`  | No                                | Yes — sends JS objects as Max dicts        |
| `outlettypes` property | No                                | Yes — declare outlet types                 |
| Embed code in patcher  | No                                | Yes (via embed attribute)                  |
| Actively maintained    | No (legacy, backward-compat only) | Yes                                        |

The new `msg_array()` / `msg_dictionary()` / `outlet_dictionary()` methods could simplify future data exchange between the `v8` object and `node.script`, but the current code uses JSON string serialization which works fine in both runtimes.

## What We Lose / Risk

- **Live 11 compatibility**: Live 11 bundles Max 8, which has no `v8` object. If we switch, the device only works in **Live 12.2+** (ships with Max 9) or Live 12.0–12.1 with standalone Max 9 configured. [2]
- **No formal migration guide yet**: Cycling '74 acknowledged the need but hasn't published one. Community experience is the primary source. [1]
- **`box.rect` behavior change** (v8ui only): Not relevant to us since we use `v8`, not `v8ui`. [3]
- **No `setTimeout`/`setInterval`**: Same limitation as `js` — use Max's `Task` API. Not relevant since our code doesn't use timers.

## Compatibility Matrix

| Ableton Live   | Max Version     | `js` object  | `v8` object                                 |
| -------------- | --------------- | ------------ | ------------------------------------------- |
| Live 11        | Max 8           | Yes          | **No**                                      |
| Live 12.0–12.1 | Max 8 (default) | Yes          | **No** (unless standalone Max 9 configured) |
| Live 12.2+     | Max 9           | Yes (legacy) | **Yes**                                     |

## Cycling '74's Long-Term Direction

Cycling '74 has stated that eventually the `js` object will automatically use the V8 engine, making the migration a "drop-in replacement." Until then, `js` and `v8` are separate objects. The legacy `js`/`jsui` objects are maintained only for backward compatibility and receive no new features. [4]

## Recommendation

1. **Switch `js` → `v8` in the AMXD** — low risk, no code changes required
2. **Optionally modernize `liveql-m4l.js`** — use `const`/`let` (except for Max attribute globals), arrow functions, template literals. This is cosmetic but keeps the code consistent with the Node.js side (`liveql-n4m.js`)
3. **Accept dropping Live 11 support** — if that's acceptable for this project
4. **Test**: Load device in Live 12.2+, click `script start`, verify the GraphQL server starts and LiveAPI calls work

## Proposed Modernized liveql-m4l.js

Below is what the file would look like with ES6+ syntax. The logic is identical — only syntax changes.

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

Key changes: `var` → `const`/`let`, template literals, shorthand object properties, `for...of` instead of `.forEach`, arrow in filter. `inlets`/`outlets` left as bare globals (safe).

## Open Questions

- Do we care about Live 11 compatibility?

No

- Should we modernize the JS syntax now or just do the minimal `js` → `v8` swap?

We will modernize after switching js -> v8 and confirming the existing code works.

- Should we explore `msg_dictionary()` / `outlet_dictionary()` to replace JSON string serialization between `v8` and `node.script`? (Could simplify the protocol but would change both sides.)

See analysis below.

## Dictionary vs JSON String Serialization (v8 ↔ node.script)

### How It Works Today

Currently `v8` (formerly `js`) and `node.script` communicate via JSON strings over patch cords:

```
v8 → outlet(0, "result", JSON.stringify(obj))  →  node.script receives string  →  JSON.parse()
node.script → maxApi.outlet(JSON.stringify(obj))  →  v8 receives string  →  JSON.parse()
```

Both sides manually stringify and parse. The data travels as a Max symbol (string) through the patch cord.

### How Dictionary Communication Would Work

With `outlet_dictionary()` (v8-only) and `node.script`'s automatic dictionary conversion:

```
v8 → outlet_dictionary(0, obj)  →  Max dictionary  →  node.script auto-converts to JSON  →  JS object
node.script → maxApi.outlet(obj)  →  Max dictionary  →  v8 msg_dictionary(obj)  →  JS object
```

No manual `JSON.stringify()` / `JSON.parse()` on either side. Max handles the conversion.

### Trade-Off Analysis

| Factor | JSON Strings (current) | Dictionary Messages |
|---|---|---|
| **Code simplicity** | Manual stringify/parse on both sides | No manual serialization — cleaner code |
| **Serialization cost** | Single: JS → JSON string → JS | Double: JS → Max dict → JSON (IPC) → JS. The `outlet_dictionary` docs say conversion is "similar to JSON serialization" so you pay it twice [10] |
| **Max patcher visibility** | Opaque strings in message debugger | Structured dicts — inspectable with `dict.view` or print objects |
| **Type fidelity** | Exact — you control the format | Near-exact — JSON-compatible types only (same practical set) |
| **Both-sides change** | N/A (status quo) | Yes — `liveql-m4l.js` changes `outlet()` → `outlet_dictionary()` and adds `msg_dictionary()`; `liveql-n4m.js` changes message handlers |
| **Coupling** | Protocol is explicit in code | Protocol relies on Max's auto-conversion behavior |
| **Debugging** | `post(jsonString)` in Max console | Can inspect with `dict.view`, `dict.print`, or route through `dict.serialize` |
| **Data size limits** | Max symbol limit (~32KB in some contexts) | No documented hard limit on dict size [11] |

### What Changes in Code

**liveql-m4l.js** — replace `outlet()` string calls:
```javascript
// Before
outlet(0, "result", JSON.stringify({ status: "succeeded", actionId, data }));

// After
outlet_dictionary(0, { type: "result", status: "succeeded", actionId, data });
```

And add a receiver for incoming dictionaries:
```javascript
// Before: function get(json) { const params = JSON.parse(json); ... }

// After: function msg_dictionary(params) { ... } // no JSON.parse needed
```

**liveql-n4m.js** — replace string handling with object handling:
```javascript
// Before: sending
maxApi.outlet(JSON.stringify(result));

// After: sending (maxApi.outlet with an object auto-creates a Max dictionary)
maxApi.outlet(result);

// Before: receiving
maxApi.addHandler("get", (jsonString) => { const params = JSON.parse(jsonString); ... });

// After: receiving (dictionary auto-converted to object)
maxApi.addHandler("dictionary", (params) => { ... });
```

### Recommendation

**Stay with JSON strings for now.** Rationale:

1. **Performance**: The dictionary path does double serialization when crossing the `node.script` IPC boundary. JSON strings do single serialization. For our use case (LiveAPI queries), the difference is negligible, but there's no performance win from switching.
2. **Scope**: Switching changes the communication protocol on both sides — a separate task from the `js` → `v8` migration. Better to do one thing at a time.
3. **Debugging**: JSON strings are already readable in the Max console via `post()`. Dictionary inspection requires additional patcher objects.
4. **Stability**: The JSON string approach works identically in `js` and `v8`. If we ever need to fall back to `js` for any reason, strings still work.

**Revisit if**: We need to pass large structured data (where the symbol size limit matters), or if we add features where patcher-level dictionary inspection would aid debugging.

## Sources

1. Cycling '74 Forums "v8 and box.rect behavior changed compared to js — what else?" (attribute `var` caveat, known differences).
   https://cycling74.com/forums/v8-and-boxrect-behavior-changed-compared-to-js-what-else
2. Ableton "Recommended Max versions" (Live/Max version mapping).
   https://help.ableton.com/hc/en-us/articles/209772305-Recommended-Max-versions
3. Cycling '74 Forums "Migrating to Max 9 — how to find all js Max objects" (migration strategies).
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
13. Cycling '74 Node for Max API — max-api module (getDict, setDict, outlet).
    https://docs.cycling74.com/nodeformax/api/module-max-api.html
