import { GAME_CATALOG } from '@ryunix/shared';
import { SplitStealGame } from '../impl/SplitStealGame';
import { TheLastWordGame } from '../impl/TheLastWordGame';
import { UnknownToOneGame } from '../impl/UnknownToOneGame';
import { PrisonersLetterGame } from '../impl/PrisonersLetterGame';
import { MatchingMindsGame } from '../impl/MatchingMindsGame';
import { BlindShapesGame } from '../impl/BlindShapesGame';
import { MindReaderGame } from '../impl/MindReaderGame';

// The lobby shows GAME_CATALOG while the server enforces the plugins' limits; they must agree.
describe('GAME_CATALOG', () => {
    const plugins = [new SplitStealGame(), new TheLastWordGame(), new UnknownToOneGame(), new PrisonersLetterGame(),
        new MatchingMindsGame(), new BlindShapesGame(), new MindReaderGame()];

    it('lists exactly the implemented games', () => {
        expect(GAME_CATALOG.map(g => g.id).sort()).toEqual(plugins.map(p => p.id).sort());
    });

    it.each(plugins.map(p => [p.id, p] as const))('%s has matching name and player limits', (id, plugin) => {
        const info = GAME_CATALOG.find(g => g.id === id)!;
        expect({ min: info.minPlayers, max: info.maxPlayers }).toEqual({ min: plugin.minPlayers, max: plugin.maxPlayers });
    });

    it.each(GAME_CATALOG.map(g => [g.id, g] as const))('%s explains how to play', (_id, info) => {
        expect(info.howToPlay.length).toBeGreaterThan(0);
        info.howToPlay.forEach(step => expect(step.trim()).not.toBe(''));
    });
});
