import * as fs from 'fs';
import * as path from 'path';
import { ContentKind } from '@ryunix/shared';

export interface ContentPackage {
    id: string;
    name: string;
    description?: string;
    difficulty?: 'easy' | 'medium' | 'hard';
    kind: ContentKind;
    topics?: string[];
    prompts?: string[];
    wordPairs?: Array<{ common: string; unique: string }>;
    [key: string]: any; // Allow any additional properties
}

class PackageLoader {
    private cache = new Map<string, ContentPackage[]>();
    private contentDir: string;

    constructor() {
        // Point to shared packages directory
        this.contentDir = path.join(__dirname, '../../content/packages');
    }

    /**
     * Loads all available packages (shared across all games)
     */
    loadPackages(): ContentPackage[] {
        // Return cached if available
        const cacheKey = 'all-packages';
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey)!;
        }

        const packages: ContentPackage[] = [];

        // Check if directory exists
        if (!fs.existsSync(this.contentDir)) {
            console.warn(`[PackageLoader] No packages directory found`);
            return [];
        }

        // Read all .json files
        try {
            const files = fs.readdirSync(this.contentDir).filter(f => f.endsWith('.json'));

            for (const file of files) {
                try {
                    const filePath = path.join(this.contentDir, file);
                    const content = fs.readFileSync(filePath, 'utf-8');
                    const pkg = JSON.parse(content) as ContentPackage;
                    packages.push(pkg);
                } catch (error) {
                    console.error(`[PackageLoader] Error loading ${file}:`, error);
                }
            }

            // Cache the results
            this.cache.set(cacheKey, packages);
            console.log(`[PackageLoader] Loaded ${packages.length} packages`);
        } catch (error) {
            console.error(`[PackageLoader] Error reading packages directory:`, error);
        }

        return packages;
    }

    /**
     * Gets a specific package by ID
     */
    getPackage(packageId: string): ContentPackage | undefined {
        const packages = this.loadPackages();
        return packages.find(p => p.id === packageId);
    }

    /**
     * Words of one kind for a game. Uses the chosen package if it is that kind; otherwise (none
     * chosen, unknown, or the wrong kind) falls back to every package of that kind.
     */
    getWords(kind: ContentKind, packageId?: string): string[] {
        const chosen = packageId ? this.getPackage(packageId) : undefined;
        if (chosen?.kind === kind && chosen.topics?.length) return chosen.topics;
        return this.loadPackages().filter(p => p.kind === kind).flatMap(p => p.topics || []);
    }

    /**
     * Gets topics filtered by difficulty
     */
    getTopicsByDifficulty(difficulty: 'easy' | 'medium' | 'hard'): string[] {
        const packages = this.loadPackages();
        const filtered = packages.filter(p => p.difficulty === difficulty);
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
