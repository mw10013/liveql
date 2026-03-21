# bpatcher Presentation Position Bug (n4m.monitor)

Date: 2026-03-21

## The Problem

The `n4m.monitor` bpatcher (node.script debug tool) disappears from the device UI in Ableton Live after editing and saving the device in the Max editor. It appears correctly on first load but its position is lost after every edit/save cycle.

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

### 4. JavaScript workaround (fix-monitor-position.js)

The idea: a `js` object wired to `live.thisdevice` that iterates through all patcher objects using `Patcher.firstobject` / `Maxobj.nextobject`, finds the bpatcher by `maxclass`, assigns `varname` at runtime, then calls `script sendbox` to force its `presentation_rect`.

References:
- Patcher JS API: https://docs.cycling74.com/apiref/js/patcher/
- Maxobj JS API: https://docs.cycling74.com/apiref/js/maxobj/

**Result: Not tested.** Rejected as too hacky — adds a separate JS file as a workaround for a Max bug.

## Root Cause

bpatcher `presentation_rect` and `varname` do not persist reliably across save/load cycles in Max for Live. This is a known issue reported in multiple Cycling '74 forum threads:

- https://cycling74.com/forums/presentation-rectangle-attributes-of-bpatcher
- https://cycling74.com/forums/bpatcher-and-rect
- https://cycling74.com/forums/max-for-live-device-width-and-created-objects-forgotten
- https://cycling74.com/forums/renaming-a-bpatchers-script-name

## Other Context

- The device height in Ableton Live is fixed at 169 pixels. The n4m.monitor bpatcher is taller than this, but partially visible if positioned near the top.
- `live.thisdevice` fires both on first load and after returning from the Max editor (unlike `loadbang` which only fires once). Reference: https://docs.cycling74.com/reference/live.thisdevice/
- The Max editor has two modes: **patching mode** (for wiring) and **presentation mode** (what Live shows). Objects must be explicitly added to presentation (right-click → "Add to Presentation"). The patcher itself must have "Open in Presentation" enabled (deselect all objects → Inspector → check "Open in Presentation") or Live shows patch cords.

## Status

**Unresolved.** No clean fix found. Options going forward:

1. **Accept the bug.** Keep the monitor in the patcher for development use (visible in the Max editor) but don't rely on it appearing in Live's device view after edits. Use the Max Console for debugging output instead.
2. **Revisit the JS workaround.** It's hacky but the API supports it — `Patcher.firstobject` / `Maxobj.nextobject` iteration, settable `varname`, and `script sendbox` for repositioning.
3. **File a bug with Cycling '74.** The scripting name not persisting on a bpatcher seems like a genuine bug.
4. **Try @varname in the object box.** Needs more investigation on how to actually edit a bpatcher's object box text.
