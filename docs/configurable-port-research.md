# Configurable Port Research

Date: 2026-03-21

## Current State

Port is hard-coded to 4000 in `liveql-n4m.js` (line 353).

## Approach: `script start` With Port Argument

`script start` passes additional arguments to the Node script via `process.argv`. The patcher formats the start message with the port included.

### Patcher

```
[button]                        ← user clicks to start
    |
[number box: 4000]             ← banged, re-outputs its current value
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

Give the number box a scripting name (e.g., `port`) and drop an `autopattr` object in the patcher. Max saves/recalls the value automatically when the device is saved.

## Open Questions

- Should we keep the old `script start` message box as-is (starts on default 4000), or replace it with the parameterized version?
- Do we want to validate the port / show an error if it's already in use? Node's `server.listen` will emit an error event that routes to the Max Console via stderr, so we get that for free.
