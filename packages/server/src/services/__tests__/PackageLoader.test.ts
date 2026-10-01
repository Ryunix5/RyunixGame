import { GAME_CATALOG } from '@ryunix/shared';
import { packageLoader } from '../PackageLoader';

describe('content packages', () => {
    const packages = packageLoader.loadPackages();

    it('every pack declares what kind of content it holds', () => {
        expect(packages.length).toBeGreaterThan(0);
        packages.forEach(p => expect(['categories', 'things']).toContain(p.kind));
    });

    it.each(GAME_CATALOG.filter(g => g.contentKind).map(g => [g.id, g.contentKind!] as const))(
        '%s has packs of the kind it needs (%s)',
        (_id, kind) => {
            expect(packages.some(p => p.kind === kind && (p.topics?.length ?? 0) > 0)).toBe(true);
        }
    );

    describe('getWords', () => {
        const things = packages.find(p => p.kind === 'things')!;
        const categories = packages.find(p => p.kind === 'categories')!;

        it('uses the chosen pack when it is the right kind', () => {
            expect(packageLoader.getWords('things', things.id)).toEqual(things.topics);
        });

        it('never hands a game the wrong kind, even if that pack was chosen', () => {
            const words = packageLoader.getWords('things', categories.id);
            expect(words).not.toContain(categories.topics![0]);
            expect(words).toContain(things.topics![0]);
        });

        it('falls back to every pack of the kind when none or an unknown one is chosen', () => {
            const allThings = packages.filter(p => p.kind === 'things').flatMap(p => p.topics || []);
            expect(packageLoader.getWords('things')).toEqual(allThings);
            expect(packageLoader.getWords('things', 'no-such-pack')).toEqual(allThings);
        });
    });
});
