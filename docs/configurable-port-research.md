# Configurable Port Research

Date: 2026-03-21

## Current State

Port is hard-coded to 4000 in `liveql-n4m.js` (line 353).

## Approach: `script start` With Port Argument

`script start` passes additional arguments to the Node script via `process.argv`. The patcher formats the start message with the port included.

### Patcher

```
[number box: 4000]
       |
[message: script start $1]   ← click to start; becomes "script start 4000"
       |
[node.script liveql-n4m.js @autostart 0 @watch 1]
```

User sets the port in the number box, clicks the message box to start. One click, port is baked into the start command.

Note: changing the number box value updates `$1` in the message box but **does not fire it**. The message only sends when the user clicks it. So changing the port number won't accidentally restart the server.

### Node side

```js
const port = parseInt(process.argv[2]) || 4000;

const server = http.createServer(yoga);
server.listen(port, () => {
  console.log(`Server ready at http://localhost:${port}`);
});
```

### Changing the port

Just change the number and click start again. Tested: sending `script start` while the script is already running terminates the running script and starts a new one. No need to manually stop first — the restart is handled automatically by `node.script`.

### Persisting the port value

Give the number box a scripting name (e.g., `port`) and drop an `autopattr` object in the patcher. Max saves/recalls the value automatically when the device is saved.

## Open Questions

- Should we keep the old `script start` message box as-is (starts on default 4000), or replace it with the parameterized version?
- Do we want to validate the port / show an error if it's already in use? Node's `server.listen` will emit an error event that routes to the Max Console via stderr, so we get that for free.
- ~~**What happens if you click `script start` while the script is already running?**~~ **Tested:** it terminates the running script and starts a new one. This simplifies the port-change flow — no stop needed.
- **Message box initialization problem:** On first device load, the number box has a value (e.g., 4000) but the `message` box with `script start $1` hasn't received it yet — `$1` is unset until the number box outputs. The user sees "4000" in the number box but the message box doesn't reflect it. This could be confusing, and clicking start before the number box has fired would send the wrong value. Need a pattern where clicking "Start" always reads the current number box value — e.g., a `button` that bangs the number box through `prepend script start`, so the value is always fresh.
