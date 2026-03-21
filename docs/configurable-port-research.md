# Configurable Port Research

Date: 2026-03-21

## Current State

Port is hard-coded to 4000 in `liveql-n4m.js` (line 353).

## Approach: `script start` With Port Argument

`script start` passes additional arguments to the Node script via `process.argv`. The patcher formats the start message with the port included.

### Patcher

```
[live.text "Start" @mode 0]    ← labeled button, outputs bang on click
    |
[live.numbox: 4000]            ← banged, re-outputs its current value
    |
[prepend script start]         ← turns 4000 into "script start 4000"
    |
[node.script liveql-n4m.js @autostart 0 @watch 1]
```

#### Step-by-step: building this in the Max editor

Prerequisites: open the device in Live, click the wrench icon to open the Max editor, and make sure you're in **edit mode** (Cmd+E or click the lock icon in the bottom-left — unlocked = edit mode).

1. **Create the `live.text` button.** Double-click on an empty area of the patcher canvas. Type `live.text` and press Enter. Select the object, open the Inspector (Cmd+I or click the Inspector icon in the sidebar). Set:
   - **Mode** → `Button` (so it outputs a bang on click, not a toggle)
   - **Short Name** → `Start` (this is the text displayed on the button)

2. **Create a "Port" label.** Double-click on the canvas. Type `comment Port` and press Enter. Position it next to where the numbox will go.

3. **Create the `live.numbox`.** Double-click on the canvas below the button. Type `live.numbox` and press Enter. Open the Inspector and set:
   - **Type** → `Float` (Int type is capped at 256 values, too small for port numbers)
   - **Unit Style** → `Int` (displays as whole numbers despite Float type)
   - **Range/Enum** → `1024 65535`
   - **Initial Enable** → on, **Initial Value** → `4000` (default port on fresh load)

4. **Create the `prepend` object.** Double-click below the numbox. Type `prepend script start` and press Enter.

5. **Wire them together.** Click the outlet (bottom) of `live.text` and drag to the inlet (top) of `live.numbox`. Then click the outlet of `live.numbox` and drag to the inlet of `prepend`. Finally, wire the outlet of `prepend` to an inlet of the existing `node.script` object.

6. **Remove the old `script start` message box.** Click the old `script start` message box, press Delete. If it was wired to `node.script`, that connection is removed automatically.

7. **Save the device.** Cmd+S in the Max editor.

### Node side

```js
const port = parseInt(process.argv[2]) || 4000;

const server = http.createServer(yoga);
server.listen(port, () => {
  console.log(`Server ready at http://localhost:${port}`);
});
```

### Changing the port

Change the number, click start again. `script start` while already running terminates the running script and starts a new one automatically.

### Persisting the port value

There are two kinds of persistence in Max for Live:

- **Saving the .amxd** (Cmd+S in Max editor) saves the device implementation — shared by all instances everywhere. This is for changing the device itself, not for per-user settings.
- **Saving the Live Set** (.als) saves per-instance parameter values. The same device can be on multiple tracks in multiple Live Sets, each with a different port number. Live recalls each instance's value when the Set is reopened.

To get per-Live-Set persistence, the number box needs to participate in Live's parameter system. Use `live.numbox` (which has parameter support built in) or a regular number box bound to a `pattr` with `@parameter_enable 1`. `autopattr` does NOT work here — it saves into the .amxd, not the .als.

### Known issue: bpatcher position lost after save (n4m.monitor)

The `n4m.monitor` bpatcher (node.script debug tool) disappears from the device UI after editing and saving in the Max editor. It works on first load but its `presentation_rect` is not persisted reliably across save/load cycles. This is a known Max bug — the bpatcher's presentation position gets reset or lost when the device is saved.

References:
- https://cycling74.com/forums/presentation-rectangle-attributes-of-bpatcher
- https://cycling74.com/forums/bpatcher-and-rect
- https://cycling74.com/forums/max-for-live-device-width-and-created-objects-forgotten

**Workaround:** Use `loadbang` + `thispatcher` to force the bpatcher's position on every device load.

```
[loadbang]
    |
[message: script sendbox monitor presentation_rect <x> <y> <width> <height>]
    |
[thispatcher]
```

#### Step-by-step fix

1. **Switch to patching mode** (Cmd+E if you're in presentation mode).
2. **Give the n4m.monitor bpatcher a scripting name.** Select it, open the Inspector (Cmd+I), set **Scripting Name** to `monitor`.
3. **Get its presentation_rect values.** In the same Inspector, find **Presentation Rectangle** — note the four values: x, y, width, height.
4. **Create a `loadbang` object.** Double-click on the canvas, type `loadbang`, press Enter.
5. **Create a `message` box.** Double-click on the canvas, type `script sendbox monitor presentation_rect <x> <y> <width> <height>` using the values from step 3. Press Enter.
6. **Create a `thispatcher` object.** Double-click on the canvas, type `thispatcher`, press Enter.
7. **Wire them together.** `loadbang` outlet → `message` inlet → `thispatcher` inlet.
8. **Save the device.** Cmd+S.

These three objects are internal plumbing — do NOT add them to presentation mode. They run silently on load and force the monitor bpatcher to its correct position every time.

### Validation

The `live.numbox` constrains input to 1024–65535. The Node script handles runtime errors — if the port is already in use, `server.listen` emits an error that routes to the Max Console via stderr.
