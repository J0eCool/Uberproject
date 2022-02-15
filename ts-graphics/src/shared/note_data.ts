// shared/ folder is for code shared between client and server

/** A single note in the dataset */
export class Note {
    id: number;
    /** Data associated with this note */
    text: string;
    /** Sub-notes that make up the body of this note */
    contains: Note[] = [];
    /** Notes that this note points to */
    repliesTo: Note[] = [];

    constructor(id: number, text: string) {
        this.id = id;
        this.text = text;
    }
}

interface NoteJson {
    text: string;
    contains: number[];
    repliesTo: number[];
}
interface NoteDataJson {
    nextId: number;
    notes: Record<string, NoteJson>;
}

/** A collection of notes */
export class NoteData {
    nextId: number = 0;
    notes: Record<number, Note> = {};

    public static fromJson(json: NoteDataJson): NoteData {
        const data = new NoteData();
        data.nextId = json['nextId'];

        // First pass: initialize all the notes
        for (const [id, jNote] of Object.entries(json['notes'])) {
            data.notes[+id] = new Note(+id, jNote['text']);
        }

        // Second pass: convert ids to references
        for (const [id, jNote] of Object.entries(json['notes'])) {
            const note: Note = data.notes[+id];
            for (const otherId of jNote['contains']) {
                note.contains.push(data.notes[otherId]);
            }
            for (const otherId of jNote['repliesTo']) {
                note.repliesTo.push(data.notes[otherId]);
            }
        }

        
        return data;
    }

    toJson(): NoteDataJson {
        const json: NoteDataJson = {
            nextId: this.nextId,
            notes: {},
        };
        for (const note of Object.values(this.notes)) {
            json.notes[note.id] = {
                text: note.text,
                contains: note.contains.map(n => n.id),
                repliesTo: note.repliesTo.map(n => n.id),
            };
        }
        return json;
    }
}
