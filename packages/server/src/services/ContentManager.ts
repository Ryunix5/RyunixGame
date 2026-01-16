import Database from 'better-sqlite3';
import path from 'path';

export interface GameContent {
    id: number;
    gameType: string;
    packName: string;
    data: any;
    version: number;
}

export class ContentManager {
    private db: Database.Database;

    constructor() {
        const dataDir = process.env.DATA_DIR || path.join(process.cwd(), 'data');

        // Ensure data directory exists
        const fs = require('fs');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        const dbPath = path.join(dataDir, 'content.db');
        console.log('[ContentManager] Initializing DB at:', dbPath);
        this.db = new Database(dbPath, { verbose: console.log });
        this.initialize();
    }

    private initialize() {
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS game_content (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                game_type TEXT NOT NULL,
                pack_name TEXT NOT NULL,
                data TEXT NOT NULL, -- JSON String
                version INTEGER DEFAULT 1,
                UNIQUE(game_type, pack_name)
            );
        `);

        // Seed default content if missing
        console.log('[ContentManager] Verifying default content...');
        this.seedDefaults();
    }

    private seedDefaults() {
        const seed = (id: string, name: string, data: any) => {
            const exists = this.db.prepare('SELECT 1 FROM game_content WHERE game_type = ? AND pack_name = ?').get(id, name);
            if (!exists) {
                console.log(`[ContentManager] Seeding default: ${id} - ${name}`);
                this.saveContent(id, name, data);
            }
        };

        const defaultWords = [
            'APPLE', 'BANANA', 'CHERRY', 'DOG', 'ELEPHANT', 'FROG', 'GRAPE', 'HOUSE',
            'IGLOO', 'JUNGLE', 'KITE', 'LION', 'MOUSE', 'NEST', 'ORANGE', 'PIZZA',
            'QUEEN', 'ROBOT', 'SNAKE', 'TIGER', 'UMBRELLA', 'VIOLIN', 'WHALE', 'XYLOPHONE', 'YACHT', 'ZEBRA'
        ];
        seed('the-last-word', 'Default Pack', { words: defaultWords });

        const mindReaderWords = [
            'Apple', 'Banana', 'Carrot', 'Dog', 'Elephant', 'Ferrari', 'Guitar', 'House',
            'Ice Cream', 'Jungle', 'Kangaroo', 'Lemon', 'Moon', 'Ninja', 'Octopus',
            'Pizza', 'Queen', 'Robot', 'Sun', 'Tiger', 'Umbrella', 'Violin', 'Watermelon',
            'Xylophone', 'Yacht', 'Zebra'
        ];
        seed('mind-reader', 'Standard Deck', { words: mindReaderWords });

        const unknownToOneWords = [
            'The Eiffel Tower', 'Pizza', 'Super Mario', 'The Moon', 'Toilet Paper',
            'Bitcoin', 'Harry Potter', 'COVID-19', 'T-Rex', 'Mount Everest',
            'Mona Lisa', 'Star Wars', 'Facebook', 'iPhone', 'Vegetarian'
        ];
        seed('unknown-to-one', 'Standard Secrets', { words: unknownToOneWords });
    }

    public getContent(gameType: string): GameContent[] {
        const rows = this.db.prepare('SELECT * FROM game_content WHERE game_type = ?').all(gameType);
        return rows.map((row: any) => ({
            id: row.id,
            gameType: row.game_type,
            packName: row.pack_name,
            data: JSON.parse(row.data),
            version: row.version
        }));
    }

    public saveContent(gameType: string, packName: string, data: any) {
        const stmt = this.db.prepare(`
            INSERT INTO game_content (game_type, pack_name, data)
            VALUES (?, ?, ?)
            ON CONFLICT(game_type, pack_name) DO UPDATE SET
            data = excluded.data,
            version = version + 1
        `);
        stmt.run(gameType, packName, JSON.stringify(data));
    }

    public deleteContent(id: number) {
        this.db.prepare('DELETE FROM game_content WHERE id = ?').run(id);
    }
}
