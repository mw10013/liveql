Liveql

Liveql provides a qraphql schema on a subset of the Ableton Live LOM.

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
