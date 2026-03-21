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

The number box constrains the range to valid port numbers (e.g., `@minimum 1024 @maximum 65535`). The Node script handles runtime errors — if the port is already in use, `server.listen` emits an error that routes to the Max Console via stderr.
