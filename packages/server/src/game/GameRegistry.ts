import { GamePlugin } from './GamePlugin';

export class GameRegistry {
    private games: Map<string, GamePlugin> = new Map();

    register(game: GamePlugin) {
        this.games.set(game.id, game);
    }

    get(id: string): GamePlugin | undefined {
        return this.games.get(id);
    }

    getAll(): GamePlugin[] {
        return Array.from(this.games.values());
    }
}
