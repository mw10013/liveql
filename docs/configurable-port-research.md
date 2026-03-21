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

2. **Create the `live.numbox`.** Double-click on the canvas below the button. Type `live.numbox` and press Enter. Open the Inspector and set:
   - **Type** → `Float` (Int type is capped at 256 values, too small for port numbers)
   - **Unit Style** → `Int` (displays as whole numbers despite Float type)
   - **Range/Enum** → `1024 65535`
   - **Initial Enable** → on, **Initial Value** → `4000` (default port on fresh load)

3. **Create the `prepend` object.** Double-click below the numbox. Type `prepend script start` and press Enter.

4. **Wire them together.** Click the outlet (bottom) of `live.text` and drag to the inlet (top) of `live.numbox`. Then click the outlet of `live.numbox` and drag to the inlet of `prepend`. Finally, wire the outlet of `prepend` to an inlet of the existing `node.script` object.

5. **Remove the old `script start` message box.** Click the old `script start` message box, press Delete. If it was wired to `node.script`, that connection is removed automatically.

6. **Save the device.** Cmd+S in the Max editor.

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

### Validation

The `live.numbox` constrains input to 1024–65535. The Node script handles runtime errors — if the port is already in use, `server.listen` emits an error that routes to the Max Console via stderr.
