# Game Content Packages

This directory contains game content organized by game type.

## Structure

```
content/
├── last-word/          # Topics for "The Last Word" game
│   ├── general.json
│   ├── pop-culture.json
│   ├── geography.json
│   └── food.json
├── unknown-to-one/     # Words for "Unknown to One" (future)
└── mind-reader/        # Prompts for "Mind Reader" (future)
```

## Adding Topics to "The Last Word"

### Edit Existing Package

Edit any `.json` file in `last-word/`:

```json
{
  "id": "general",
  "name": "General Topics",
  "difficulty": "easy",
  "topics": [
    "Fruits",
    "Countries",
    "Your New Topic Here"
  ]
}
```

### Create New Package

Create a new `.json` file (e.g., `sports.json`):

```json
{
  "id": "sports",
  "name": "Sports Topics",
  "description": "Sports and athletics",
  "difficulty": "medium",
  "topics": [
    "NBA Teams",
    "Olympic Sports",
    "Famous Athletes"
  ]
}
```

## Deploying Changes

```bash
git add content/
git commit -m "Added new topics"
git push
```

Topics will be loaded automatically on server restart!
