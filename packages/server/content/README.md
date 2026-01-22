# Game Content Packages

This directory contains content packages that can be used by **all games**.

## Structure

```
content/
  packages/          # Shared content packages for all games
    general.json
    pop-culture.json
    geography.json
    food.json
```

## How It Works

1. Host selects a game
2. Host selects which package to use
3. Game uses content from that package

## Adding New Packages

Create a new JSON file in `packages/`:

```json
{
  "id": "your-package-id",
  "name": "Your Package Name",
  "description": "What this package contains",
  "difficulty": "easy",
  "topics": ["Topic 1", "Topic 2", "Topic 3"]
}
```

## Package Format

Each package should have:
- `id`: Unique identifier
- `name`: Display name
- `description`: What it contains
- `difficulty`: "easy", "medium", or "hard"
- `topics`: Array of content items

All games can use any package!
