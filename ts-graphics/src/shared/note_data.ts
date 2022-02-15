// shared/ folder is for code shared between client and server

/** A single note in the dataset */
export class Note {
    id: number;
    /** Data associated with this note */
    text: string;
    /** Sub-notes that make up the body of this note */
    contains: Array<Note> = [];
    /** Notes that this note points to */
    repliesTo: Array<Note> = [];

    constructor(id: number, text: string) {
        this.id = id;
        this.text = text;
    }
}

interface NoteJson {
    text: string;
    contains: Array<number>;
    repliesTo: Array<number>;
}
interface NoteDataJson {
    nextId: number;
    notes: Record<string, NoteJson>;
}

/** A collection of notes */
export class NoteData {
    nextId: number = 0;
    notes: Record<number, Note> = {};

    public static fromJson(raw: NoteDataJson): NoteData {
        const data = new NoteData();
        data.nextId = raw['nextId'];

        // First pass: initialize all the notes
        for (const [id, rawNote] of Object.entries(raw['notes'])) {
            data.notes[+id] = new Note(+id, rawNote['text']);
        }

        // Second pass: convert ids to references
        for (const [id, rawNote] of Object.entries(raw['notes'])) {
            const note: Note = data.notes[+id];
            for (const otherId of rawNote['contains']) {
                note.contains.push(data.notes[otherId]);
            }
            for (const otherId of rawNote['repliesTo']) {
                note.repliesTo.push(data.notes[otherId]);
            }
        }

        return data;
    }
}
