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
  "kind": "things",
  "topics": ["Item 1", "Item 2", "Item 3"]
}
```

## Package Format

Each package should have:
- `id`: Unique identifier
- `name`: Display name
- `description`: What it contains
- `difficulty`: "easy", "medium", or "hard"
- `kind`: what the items are (required):
  - `"categories"`: groups to name things in, like "Fruits" or "Marvel Movies". Used by The Last Word.
  - `"things"`: specific things to describe or guess, like "Pizza" or "Volcano". Used by Unknown to One and Mind Reader.
- `topics`: Array of content items, all of that kind

A game only offers packs of the kind it needs (`contentKind` in the shared `GAME_CATALOG`), and the server
never hands a game the other kind, even if a client asks for it. `everyday` and `general` are the defaults.
