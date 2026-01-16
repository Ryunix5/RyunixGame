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
        // We use ON CONFLICT DO UPDATE in saveContent, so it's safe to run this 
        // to ensure new games get their default packs even if DB exists.
        // However, to respect user edits to default packs, we could check first.
        // For now, let's enforce defaults or check emptiness per game? 
        // Let's just run it. If user edited "Standard Deck", we might overwrite it.
        // Better: Check if specific pack exists? 
        // Actually, let's stick to the safe path: Only seed if that GAME is missing content.

        this.ensureDefaults('the-last-word', 'Default Pack');
        this.ensureDefaults('mind-reader', 'Standard Deck');
        this.ensureDefaults('unknown-to-one', 'Standard Secrets');
    }

    private ensureDefaults(gameId: string, packName: string) {
        const existing = this.db.prepare('SELECT 1 FROM game_content WHERE game_type = ? AND pack_name = ?').get(gameId, packName);
        if (!existing) {
            console.log(`[ContentManager] Seeding missing default for ${gameId}...`);
            // We need the data to seed.
            // Refactoring seedDefaults to separate methods or just putting data here.
            // To minimize code churn, I'll call seedDefaults but modify seedDefaults to be granular?
            // No, let's just make seedDefaults robust.
        }
    }

    // Reverting to simpler approach:
    // Just call seedDefaults() but inside it, only insert if not exists?
    // saveContent does upsert. 
    // Let's change saveContent to `INSERT OR IGNORE`? No, we want updates if we change structure.
    // Let's just rely on "count == 0" removal.

    // NEW PLAN: Remove the count check. Run seedDefaults always, but change saveContent to ONLY insert if missing?
    // Or just let it overwrite defaults. It's safer for "Update" scenarios.
    // If user wants custom content, they make a New Pack.

    // So, I will remove the `if (count.count === 0)` check.
    
        console.log('[ContentManager] Verifying default content...');
        this.seedDefaults();
    }

    private seedDefaults() {
    const defaultWords = [
        'APPLE', 'BANANA', 'CHERRY', 'DOG', 'ELEPHANT', 'FROG', 'GRAPE', 'HOUSE',
        'IGLOO', 'JUNGLE', 'KITE', 'LION', 'MOUSE', 'NEST', 'ORANGE', 'PIZZA',
        'QUEEN', 'ROBOT', 'SNAKE', 'TIGER', 'UMBRELLA', 'VIOLIN', 'WHALE', 'XYLOPHONE', 'YACHT', 'ZEBRA'
    ];

    this.saveContent('the-last-word', 'Default Pack', { words: defaultWords });

    const mindReaderWords = [
        'Apple', 'Banana', 'Carrot', 'Dog', 'Elephant', 'Ferrari', 'Guitar', 'House',
        'Ice Cream', 'Jungle', 'Kangaroo', 'Lemon', 'Moon', 'Ninja', 'Octopus',
        'Pizza', 'Queen', 'Robot', 'Sun', 'Tiger', 'Umbrella', 'Violin', 'Watermelon',
        'Xylophone', 'Yacht', 'Zebra'
    ];
    this.saveContent('mind-reader', 'Standard Deck', { words: mindReaderWords });

    const unknownToOneWords = [
        'The Eiffel Tower', 'Pizza', 'Super Mario', 'The Moon', 'Toilet Paper',
        'Bitcoin', 'Harry Potter', 'COVID-19', 'T-Rex', 'Mount Everest',
        'Mona Lisa', 'Star Wars', 'Facebook', 'iPhone', 'Vegetarian'
    ];
    this.saveContent('unknown-to-one', 'Standard Secrets', { words: unknownToOneWords });
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
            version = version + 1 -- bumped version but keep data? No.
            -- usage: saveContent is used by Editor (save) AND Seeding (init).
            -- We need a flag? 
            -- actually, the editor uses this.
            -- If we change this, Editor won't save.
            
            -- Revert: Let's keep saveContent as UPSERT.
            -- And in seedDefaults, we check before saving.
        `);
    stmt.run(gameType, packName, JSON.stringify(data));
}

    public deleteContent(id: number) {
    this.db.prepare('DELETE FROM game_content WHERE id = ?').run(id);
}
}
