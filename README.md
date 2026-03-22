LiveQL

A GraphQL API for Ableton Live. LiveQL exposes a subset of Live's Object Model (LOM) through a local GraphQL server, letting you query and control your Live Set from any HTTP client, script, or web app.

## How it works

LiveQL runs as a Max for Live device with two components:

- A **Max JS script** that talks directly to the LOM via LiveAPI
- A **Node.js server** (via Node for Max) that serves a GraphQL API on `http://localhost:4000`

External clients send GraphQL queries and mutations over HTTP. The Node server translates these into LOM operations, executes them through the Max layer, and returns the results as JSON.

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Drop `liveql.amxd` onto any track in your Live Set.

3. Click the start button on the device to launch the server.

4. The GraphQL API is now available at `http://localhost:4000`. The server also serves GraphiQL, an interactive query editor you can open in your browser at the same address.

## What you can query

**Song state** — Check whether the song is playing, get the song view, see which track is selected or which clip is in the detail view.

**Tracks** — List all tracks or access a specific track by index. Read properties like name and whether a track has MIDI input.

**Clip slots and clips** — Navigate the session grid. Check if a clip slot contains a clip, then read clip properties like name, length, time signature, and looping state.

**MIDI notes** — Read the full list of notes from a MIDI clip, including pitch, start time, duration, velocity, probability, and mute state.

## What you can mutate

**Playback** — Start and stop the song.

**Tracks** — Rename tracks.

**Clips** — Toggle looping, set clip properties (name, time signature), and fire clips.

**MIDI notes** — Add new notes, modify existing notes, select notes, and remove notes by ID or by pitch/time range.

## Examples

```bash
# get whether the song is playing
curl -s http://localhost:4000 \
  -H 'Content-Type: application/json' \
  -d '{"query":"{ live_set { is_playing } }"}' | jq .

# get the first track by index
curl -s http://localhost:4000 \
  -H 'Content-Type: application/json' \
  -d '{"query":"{ live_set { track(index: 0) { id name has_midi_input } } }"}' | jq .

# get the first clip slot from the first track by index
curl -s http://localhost:4000 \
  -H 'Content-Type: application/json' \
  -d '{"query":"{ live_set { track(index: 0) { clip_slot(index: 0) { has_clip clip { id name looping } } } } }"}' | jq .

# get all tracks and their names
curl -s http://localhost:4000 \
  -H 'Content-Type: application/json' \
  -d '{"query":"{ live_set { tracks { id name } } }"}' | jq .

# get clips with their ids and looping state
curl -s http://localhost:4000 \
  -H 'Content-Type: application/json' \
  -d '{"query":"{ live_set { tracks { clip_slots { has_clip clip { id name looping } } } } }"}' | jq .

# get notes from the first clip slot of the first track
curl -s http://localhost:4000 \
  -H 'Content-Type: application/json' \
  -d '{"query":"{ live_set { track(index: 0) { clip_slot(index: 0) { clip { name notes { pitch start_time duration velocity } } } } } }"}' | jq .

# set looping off using the clip id looked up via indexes
# first query:
# { live_set { track(index: 0) { clip_slot(index: 0) { clip { id } } } } }
# then use that id here
curl -s http://localhost:4000 \
  -H 'Content-Type: application/json' \
  -d '{"query":"mutation { clip_set_looping(id: 39, looping: false) { id looping } }"}' | jq .
  
```
