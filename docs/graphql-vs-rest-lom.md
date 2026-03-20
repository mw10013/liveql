# GraphQL vs REST for Ableton Live LOM

Date: 2026-03-20

This note summarizes the Live Object Model (LOM) structure, the implications for API design, and a recommendation for this project.

## LOM structure (why it matters)
The LOM is a deep, wide, nested object graph, not a flat resource list. The root object (`live_set`) fans out into tracks, scenes, view state, groove pool, tuning system, etc. From there:

- `live_set` (Song) -> `tracks`, `return_tracks`, `scenes`, `view`, `groove_pool`, `tuning_system`.
- `Track` -> `clip_slots`, `arrangement_clips`, `devices`, `mixer_device`, `view`.
- `ClipSlot` -> `clip`.
- `Clip` -> dozens of properties plus note APIs like `get_notes_extended`, `add_new_notes`, `apply_note_modifications`.
- `Device` -> `parameters` and (if a rack) `RackDevice` -> `chains` -> `devices` -> `parameters` (and those chains can nest further).

Sources:
- LOM overview: https://docs.cycling74.com/apiref/lom/
- Song: https://docs.cycling74.com/apiref/lom/song/
- Track: https://docs.cycling74.com/apiref/lom/track/
- ClipSlot: https://docs.cycling74.com/apiref/lom/clipslot/
- Clip: https://docs.cycling74.com/apiref/lom/clip/
- Device: https://docs.cycling74.com/apiref/lom/device/
- RackDevice: https://docs.cycling74.com/apiref/lom/rackdevice/
- Chain: https://docs.cycling74.com/apiref/lom/chain/
- DeviceParameter: https://docs.cycling74.com/apiref/lom/deviceparameter/

## Design implications
Because the LOM is a graph, the API needs to handle:

- Variable depth (tracks -> devices -> chains -> devices -> parameters).
- Selective fetching (clients rarely need every property).
- Bulk reads and writes (notes, parameters, clip state).
- Cross-object joins (e.g., "get selected clip notes + device params for the same track").

REST can do this, but it typically becomes either:

- A large, bespoke endpoint surface for each data shape, or
- A generic "path query" endpoint that is effectively a hand-rolled graph query API.

GraphQL is designed for this shape: it lets the client ask for exactly the subtree it needs with a single request and a stable schema.

## Recommendation

**If the API will remain general-purpose across the LOM, use GraphQL.**
The LOM is a graph and GraphQL matches that structure well. It reduces endpoint sprawl and supports variable, nested queries without inventing ad hoc REST patterns.

**If the API is intentionally narrow and stable, use REST.**
For a small surface area (e.g., "current clip notes", "apply notes", "transport control"), REST is simpler to implement and debug, and may be easier to maintain long-term.

### Project-specific guidance
Given this project's history of exposing LOM access (e.g., clips, tracks, notes, transport) and the likelihood of expanding beyond a single narrow feature, GraphQL is the better long-term fit. If you decide to keep the scope tightly constrained and do not plan to expand beyond a few actions, REST is appropriate.

## Practical note on runtime
The Max `js` object is legacy (ES5). For modern JS in Max patches, use the `v8` object. For full Node.js (networking, npm libraries, etc.), use `node.script`.

- js (legacy engine): https://docs.cycling74.com/reference/js
- v8 (modern engine): https://docs.cycling74.com/reference/v8
- node.script (Node for Max): https://docs.cycling74.com/reference/node.script
