const path = require("path");
const Max = require("max-api");
const { ApolloServer, gql } = require("apollo-server");

// This will be printed directly to the Max console
Max.post(`Loaded the ${path.basename(__filename)} script`);

async function get(
  idOrPath,
  propertyKeysSingle = null,
  propertyKeysMultiple = null,
  childKeysSingle = null,
  childKeysMultiple = null
) {
  return exec({
    action: "get",
    idOrPath,
    propertyKeysSingle,
    propertyKeysMultiple,
    childKeysSingle,
    childKeysMultiple,
  });
}

async function set(id, property, value) {
  return exec({
    action: "set",
    idOrPath: id,
    property,
    value,
  });
}

async function call(id, ...args) {
  return exec({
    action: "call",
    idOrPath: id,
    args,
  });
}

let actionId = 0;
let actionResultHandlers = new Map();

async function exec(params) {
  actionId += 1;

  const p = new Promise((resolve, reject) => {
    actionResultHandlers.set(actionId, { resolve, reject });
    resolveResult = resolve;
    rejectResult = reject;
  });
  const action = { actionId, ...params };
  await Max.outlet(action.action, JSON.stringify(action));
  return p;
}

Max.addHandler("result", async (json) => {
  const result = JSON.parse(json);
  const { resolve, reject } = actionResultHandlers.get(result.actionId);
  actionResultHandlers.delete(result.actionId);
  try {
    if (result.status !== "succeeded") {
      await Max.post("failed result: " + json);
      throw result.message;
    }
    if (resolve) {
      resolve(result.data);
    }
  } catch (err) {
    if (reject) {
      reject(err);
    }
  }
});

Max.addHandler("fee", async () => {
  try {
    // await Max.post("n4m:fee: 3");
    var o = await get("live_set view detail_clip", [
      "length",
      "is_midi_clip",
      "name",
    ]);
    // await Max.post(JSON.stringify(o));
  } catch (err) {
    await Max.post("caught exception: " + err.toString());
  }
});

Max.addHandler("fi", async () => {
  try {
    // await Max.post("fi: 4");
    var clip1 = await exec({
      action: "get",
      idOrPath: "live_set tracks 0 clip_slots 0 clip",
    });

    var clip2 = await exec({
      action: "get",
      idOrPath: "live_set tracks 1 clip_slots 0 clip",
    });
  } catch (err) {
    await Max.post("caught exception: " + err.toString());
  }
});

Max.addHandler("fo", async () => {
  try {
    await call(17, "remove_notes_by_id", 88, 89);
  } catch (err) {
    await Max.post("caught exception: " + err.toString());
  }
});

Max.addHandler("fum", async () => {
  try {
    var o = await get("live_set view detail_clip", ["name"]);
    await call(o.id, "select_all_notes");
    var json = await call(o.id, "get_selected_notes_extended");
    var data = JSON.parse(json);
    if (data.notes && data.notes.length > 0) {
      data.notes[0].pitch = data.notes[0].pitch === 60 ? 67 : 60;
      await call(o.id, "apply_note_modifications", data);
    }
  } catch (err) {
    await Max.post("caught exception: " + err.toString());
  }
});

const typeDefs = gql`
  type Song {
    id: Int!
    path: String!
    is_playing: Int!
    view: SongView!
    tracks: [Track!]!
  }

  type SongView {
    id: Int!
    path: String!
    selected_track: Track
    detail_clip: Clip
  }

  type Track {
    id: Int!
    path: String!
    clip_slots: [ClipSlot!]!
    has_midi_input: Int!
    name: String
  }

  type ClipSlot {
    id: Int!
    path: String!
    clip: Clip
    has_clip: Int!
  }

  type Clip {
    id: Int!
    path: String!
    end_time: Float
    is_arrangement_clip: Int
    is_midi_clip: Int
    length: Float
    name: String
    signature_denominator: Int
    signature_numerator: Int
    start_time: Float
    notes: [Note!]
  }

  input ClipPropertiesInput {
    name: String
    signature_denominator: Int
    signature_numerator: Int
  }

  type Note {
    note_id: Int
    pitch: Int!
    start_time: Float
    duration: Float
    velocity: Float
    mute: Int
    probability: Float
    velocity_deviation: Float
    release_velocity: Float
  }

  type NotesDictionary {
    notes: [Note!]!
  }

  input NoteInput {
    note_id: Int
    pitch: Int!
    start_time: Float
    duration: Float
    velocity: Float
    mute: Int
    probability: Float
    velocity_deviation: Float
    release_velocity: Float
  }

  input NotesDictionaryInput {
    notes: [NoteInput!]!
  }

  type Query {
    live_set: Song!
  }

  type Mutation {
    song_start_playing(id: Int!): Song
    song_stop_playing(id: Int!): Song
    track_set_name(id: Int!, name: String!): Track
    clip_set_properties(id: Int!, properties: ClipPropertiesInput!): Clip
    clip_add_new_notes(id: Int!, notes_dictionary: NotesDictionaryInput!): Clip
    clip_apply_note_modifications(
      id: Int!
      notes_dictionary: NotesDictionaryInput!
    ): Clip
    clip_get_notes_extended(
      id: Int!
      from_pitch: Int!
      pitch_span: Int!
      from_time: Float!
      time_span: Float!
    ): NotesDictionary!
    clip_get_selected_notes_extended(id: Int!): NotesDictionary!
    clip_select_all_notes(id: Int!): Clip
    clip_remove_notes_by_id(id: Int!, ids: [Int!]!): Clip
  }
`;

function getSong() {
  return get("live_set", ["is_playing"], null, ["view"], ["tracks"]);  
}

function getTrack(id) {
  return get(id, ["has_midi_input", "name"], null, null, ["clip_slots"]);
}

function getClipSlot(id) {
  return get(id, ["has_clip"], null, ["clip"]);
}

function getClip(id) {
  return get(id, [
    "end_time",
    "is_arrangement_clip",
    "is_midi_clip",
    "length",
    "name",
    "signature_denominator",
    "signature_numerator",
    "start_time",
  ]);
}

function compareNotes(a, b) {
  // start_time ascending, pitch ascending
  if (a.start_time < b.start_time) return -1;
  if (a.start_time > b.start_time) return 1;
  return a.pitch - b.pitch;
}

function sortJsonNotesDictionary(json) {
  const data = JSON.parse(json);
  return { notes: [...data.notes].sort(compareNotes) };
}

async function getNotesExtended(parent, args) {
  // resolver interface with parent arg unused
  var json = await call(
    args.id,
    "get_notes_extended",
    args.from_pitch,
    args.pitch_span,
    args.from_time,
    args.time_span
  );
  return sortJsonNotesDictionary(json);
}

const resolvers = {
  Query: {
    live_set: getSong,
  },
  Mutation: {
    song_start_playing: async (parent, args) => {
      await call(args.id, "start_playing");
      return getSong();
    },
    song_stop_playing: async (parent, args) => {
      await call(args.id, "stop_playing");
      return getSong();
    },
    track_set_name: async (parent, args) => {
      await set(args.id, "name", args.name);
      return getTrack(args.id);
    },
    clip_set_properties: async (parent, args) => {
      const promises = ["name", "signature_denominator", "signature_numerator"]
        .map((s) =>
          args.properties[s] === undefined
            ? null
            : set(args.id, s, args.properties[s])
        )
        .filter((x) => x !== null);
      await Promise.all(promises);
      return getClip(args.id);
    },
    clip_add_new_notes: async (parent, args) => {
      await call(args.id, "add_new_notes", args.notes_dictionary);
      return getClip(args.id);
    },
    clip_apply_note_modifications: async (parent, args) => {
      await call(args.id, "apply_note_modifications", args.notes_dictionary);
      return getClip(args.id);
    },
    clip_get_notes_extended: getNotesExtended,
    clip_get_selected_notes_extended: async (parent, args) => {
      var json = await call(args.id, "get_selected_notes_extended");
      return sortJsonNotesDictionary(json);
    },
    clip_select_all_notes: async (parent, args) => {
      await call(args.id, "select_all_notes");
      return getClip(args.id);
    },
    clip_remove_notes_by_id: async (parent, args) => {
      await call(args.id, "remove_notes_by_id", ...args.ids);
      return getClip(args.id);
    },
  },
  Song: {
    view: (parent) => {
      return get(parent.view, null, null, ["detail_clip", "selected_track"]);
    },
    tracks: (parent) => {
      return parent.tracks.map((id) => getTrack(id));
    },
  },
  SongView: {
    detail_clip: (parent) =>
      parent.detail_clip ? getClip(parent.detail_clip) : null,
    selected_track: (parent) =>
      parent.selected_track ? getTrack(parent.selected_track) : null,
  },
  Track: {
    clip_slots: (parent) => parent.clip_slots.map((id) => getClipSlot(id)),
  },
  ClipSlot: {
    clip: (parent) => (parent.clip ? getClip(parent.clip) : null),
  },
  Clip: {
    notes: async (parent) => {
      if (parent.is_midi_clip) {
        const data = await getNotesExtended(parent, {
          id: parent.id,
          from_pitch: 0,
          pitch_span: 128,
          from_time: 0,
          time_span: parent.length,
        });
        return data.notes;
      }
      return null;
    },
  },
};

const server = new ApolloServer({ typeDefs, resolvers });

// The `listen` method launches a web server.
server.listen().then(({ url }) => {
  console.log(`🚀  Server ready at ${url}`);
});
