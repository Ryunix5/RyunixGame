import * as fs from 'fs';
import * as path from 'path';

export interface WordPackage {
    id: string;
    name: string;
    description?: string;
    difficulty?: 'easy' | 'medium' | 'hard';
    topics: string[];
}

class PackageLoader {
    private cache = new Map<string, WordPackage[]>();
    private contentDir: string;

    constructor() {
        // Point to content directory
        this.contentDir = path.join(__dirname, '../../content');
    }

    /**
     * Loads all packages for a specific game
     */
    loadPackages(game: string): WordPackage[] {
        // Return cached if available
        if (this.cache.has(game)) {
            return this.cache.get(game)!;
        }

        const gameDir = path.join(this.contentDir, game);
        const packages: WordPackage[] = [];

        // Check if directory exists
        if (!fs.existsSync(gameDir)) {
            console.warn(`[PackageLoader] No content directory for: ${game}`);
            return [];
        }

        // Read all .json files
        try {
            const files = fs.readdirSync(gameDir).filter(f => f.endsWith('.json'));

            for (const file of files) {
                try {
                    const filePath = path.join(gameDir, file);
                    const content = fs.readFileSync(filePath, 'utf-8');
                    const pkg = JSON.parse(content) as WordPackage;
                    packages.push(pkg);
                } catch (error) {
                    console.error(`[PackageLoader] Error loading ${file}:`, error);
                }
            }

            // Cache the results
            this.cache.set(game, packages);
            console.log(`[PackageLoader] Loaded ${packages.length} packages for ${game}`);
        } catch (error) {
            console.error(`[PackageLoader] Error reading directory ${gameDir}:`, error);
        }

        return packages;
    }

    /**
     * Gets all topics from all packages (combined)
     */
    getAllTopics(game: string): string[] {
        const packages = this.loadPackages(game);
        const allTopics = packages.flatMap(p => p.topics || []);
        return allTopics;
    }

    /**
     * Gets topics filtered by difficulty
     */
    getTopicsByDifficulty(game: string, difficulty: 'easy' | 'medium' | 'hard'): string[] {
        const packages = this.loadPackages(game);
        const filtered = packages.filter(p => p.difficulty === difficulty);
        return filtered.flatMap(p => p.topics || []);
    }

    /**
     * Gets topics from specific package IDs
     */
    getTopicsFromPackages(game: string, packageIds: string[]): string[] {
        const packages = this.loadPackages(game);
        const filtered = packages.filter(p => packageIds.includes(p.id));
        return filtered.flatMap(p => p.topics || []);
    }

    /**
     * Clears the cache (useful for development/testing)
     */
    clearCache(): void {
        this.cache.clear();
        console.log('[PackageLoader] Cache cleared');
    }
}

// Export singleton instance
export const packageLoader = new PackageLoader();
