# bpatcher Presentation Position Bug (n4m.monitor)

Date: 2026-03-21 (updated with web research)

## The Problem

The `n4m.monitor` bpatcher (node.script debug tool) disappears from the device UI in Ableton Live after editing and saving the device in the Max editor. It appears correctly on first load but its position is lost after every edit/save cycle.

## Current State of liveql.amxd

The device already has a partial fix wired up:
- `live.thisdevice` (`obj-20`) → message `script sendbox monitor presentation_rect 93. 7.5 400. 220.` (`obj-25`) → `thispatcher` (`obj-23`)
- **But the bpatcher (`obj-17`) has no `varname`**, so `script sendbox monitor` has nothing to target. The fix can't work.

## What We Tried

### 1. Setting scripting name in Inspector + thispatcher repositioning

The idea: give the bpatcher a scripting name (`monitor`), then use `live.thisdevice` → message → `thispatcher` to send `script sendbox monitor presentation_rect <x> <y> <w> <h>` on every load.

**Result: Failed.** The scripting name set via the Inspector does not persist after save. Every time the device is saved and reopened, the scripting name reverts to blank. Without the scripting name, `script sendbox` has nothing to target.

### 2. Embed Patcher in Parent

The idea: checking "Embed Patcher in Parent" in the bpatcher's Inspector copies the patcher content into the .amxd, breaking the external file reference. A forum post suggested this fixes scripting name persistence.

Reference: https://cycling74.com/forums/renaming-a-bpatchers-script-name

**Result: Failed.** The scripting name still did not persist after save, even with the patcher embedded.

### 3. Setting @varname in the object box

The idea: the bpatcher docs list `@varname` as a supported attribute. Setting it directly in the object box text (e.g., `bpatcher @name n4m.monitor.maxpat @varname monitor`) should make it part of the object definition and persist across saves.

Reference: https://docs.cycling74.com/reference/bpatcher/

**Result: Not tested.** Unclear how to edit the bpatcher's object box text in the Max editor — the bpatcher UI doesn't expose an editable text field the way regular objects do.

### 4. v8/JS workaround (fix-monitor-position.js)

The idea: a `v8` object wired to `live.thisdevice` that iterates through all patcher objects using `Patcher.firstobject` / `Maxobj.nextobject`, finds the bpatcher by `maxclass`, assigns `varname` at runtime, then calls `script sendbox` to force its `presentation_rect`.

References:
- Patcher JS API: https://docs.cycling74.com/apiref/js/patcher/
- Maxobj JS API: https://docs.cycling74.com/apiref/js/maxobj/

**Result: Not tested, but proven pattern.** See "Working Pattern" below.

## Root Cause

bpatcher `presentation_rect` and `varname` do not persist reliably across save/load cycles in Max for Live. This is a known issue reported in multiple Cycling '74 forum threads:

- https://cycling74.com/forums/presentation-rectangle-attributes-of-bpatcher
- https://cycling74.com/forums/bpatcher-and-rect
- https://cycling74.com/forums/max-for-live-device-width-and-created-objects-forgotten
- https://cycling74.com/forums/renaming-a-bpatchers-script-name
- https://cycling74.com/forums/changing-bpacher-sizeposition-in-presentation-mode-with-max-scripting-or-js
- https://cycling74.com/forums/change-default-bpatcher-presentation-dimensions-of-128-square

## Working Pattern (Proven)

The v8/JS workaround is NOT a hack — **Cycling '74's own `node.debug` package ships with this exact pattern** (confirmed by 11OLSEN in the forums). Multiple users report it working.

The key insight: you can't persist `varname` on a bpatcher, but you CAN set it at runtime via `this.patcher.box.varname` and immediately use it with `script sendbox`. The varname is temporary — just long enough to send the reposition command.

### Pattern for JS INSIDE a bpatcher (repositioning itself)

From the 2023 thread (diatom confirmed working — "The js resize version worked like a dream!"):
https://cycling74.com/forums/change-default-bpatcher-presentation-dimensions-of-128-square

```javascript
// resize_this_patcher.js — runs inside the bpatcher
function resize() {
    this.patcher.box.varname = "bp_" + Math.random()*10000;
    this.patcher.parentpatcher.message("script", "sendbox", this.patcher.box.varname, "presentation_rect", 0, 0, 400, 220);
    this.patcher.box.varname = "";
}
```

Wire it up inside the bpatcher: `loadbang` (or `live.thisdevice`) → `defer` → `js resize_this_patcher.js`

**Note:** `defer` is preferred over `deferlow` — `deferlow` causes a visible flash (renders at 128×128 then resizes), while `defer` resizes immediately.

### Pattern for JS in the PARENT patcher (finding + repositioning a bpatcher)

For our case (repositioning n4m.monitor from the main device), the v8 object runs in the parent patcher and iterates objects to find the bpatcher:

```javascript
// fix-monitor-position.js — runs in the main patcher
inlets = 1;
outlets = 0;

function bang() {
    var obj = this.patcher.firstobject;
    while (obj) {
        if (obj.maxclass == "bpatcher") {
            // Set a temporary varname so script sendbox can target it
            obj.varname = "monitor_fix";
            this.patcher.message("script", "sendbox", "monitor_fix", "presentation_rect", 93, 7.5, 400, 220);
            obj.varname = "";
            break;
        }
        obj = obj.nextobject;
    }
}
```

Wire it up in the main patcher: `live.thisdevice` → `v8 fix-monitor-position.js` → (bang triggers the reposition)

Alternative approach from the "Bpatcher and rect" thread (tyler mazaika / Mattijs Kneppers confirmed):
https://cycling74.com/forums/bpatcher-and-rect

```javascript
// Using this.patcher.message instead of this.patcher.script
this.patcher.message("script", "sendbox", "varname", "presentation_rect", 0, 0, 100, 100);
```

Also: `obj.getboxattr("presentation_rect")` works for reading bpatcher presentation rect (normal `getattr` returns null for bpatchers).

## Other Context

- The device height in Ableton Live is fixed at 169 pixels. The n4m.monitor bpatcher is taller than this, but partially visible if positioned near the top.
- `live.thisdevice` fires both on first load and after returning from the Max editor (unlike `loadbang` which only fires once). Reference: https://docs.cycling74.com/reference/live.thisdevice/
- The Max editor has two modes: **patching mode** (for wiring) and **presentation mode** (what Live shows). Objects must be explicitly added to presentation (right-click → "Add to Presentation"). The patcher itself must have "Open in Presentation" enabled (deselect all objects → Inspector → check "Open in Presentation") or Live shows patch cords.
- `liveql-.amxd` is deprecated. We use `liveql.amxd` which uses `v8` objects (not `js`).

## Status

**The JS workaround is the answer.** It's not a hack — it's the same pattern Cycling '74 uses in their own `node.debug` package. Options:

1. **Add a small v8 script** (`fix-monitor-position.js`) in the main patcher that finds the bpatcher by `maxclass` at runtime, assigns a temp `varname`, and sends `script sendbox` to reposition it. Wire `live.thisdevice` → `v8 fix-monitor-position.js`.

2. **Modify the existing wiring.** The device already has `live.thisdevice` → `script sendbox monitor presentation_rect ...` → `thispatcher`. It just can't work because the bpatcher has no varname. Option 1 above bypasses this by assigning the varname at runtime.

3. **File a bug with Cycling '74.** The scripting name not persisting on a bpatcher seems like a genuine bug, but there's a proven workaround so this is low priority.

4. **Try @varname in the object box.** Needs more investigation on how to actually edit a bpatcher's object box text.
