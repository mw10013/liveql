Liveql

Liveql provides a qraphql schema on a subset of the Ableton Live LOM.

```bash
# get whether the song is playing
curl -s http://localhost:4000 \
  -H 'Content-Type: application/json' \
  -d '{"query":"{ live_set { is_playing } }"}' | jq .

# get clips with their ids and looping state
curl -s http://localhost:4000 \
  -H 'Content-Type: application/json' \
  -d '{"query":"{ live_set { tracks { clip_slots { has_clip clip { id name looping } } } } }"}' | jq .

# get all tracks and their names
curl -s http://localhost:4000 \
  -H 'Content-Type: application/json' \
  -d '{"query":"{ live_set { tracks { id name } } }"}' | jq .

# get notes from the first clip slot of the first track
curl -s http://localhost:4000 \
  -H 'Content-Type: application/json' \
  -d '{"query":"{ live_set { tracks { clip_slots { clip { name notes { pitch start_time duration velocity } } } } } }"}' | jq .

# set clip looping off for clip id 39
curl -s http://localhost:4000 \
  -H 'Content-Type: application/json' \
  -d '{"query":"mutation { clip_set_looping(id: 39, looping: false) { id looping } }"}' | jq .
  
```
