Liveql

Liveql provides a qraphql schema on a subset of the Ableton Live LOM.

```bash
# get all tracks and their names
curl -s http://localhost:4000 \
  -H 'Content-Type: application/json' \
  -d '{"query":"{ live_set { tracks { id name } } }"}' | jq .

# get notes from the first clip slot of the first track
curl -s http://localhost:4000 \
  -H 'Content-Type: application/json' \
  -d '{"query":"{ live_set { tracks { clip_slots { clip { name notes { pitch start_time duration velocity } } } } } }"}' | jq .
  
```
