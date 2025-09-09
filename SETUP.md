# 🚀 Markdown Brain Setup Guide

This guide will help you set up the Markdown Brain MCP server on other machines with automatic indexing and convenient aliases.

## Prerequisites

- Node.js 18+ and npm
- Python 3.8+
- Git
- Claude Desktop application

## Installation Steps

### 1. Clone the Repository

```bash
git clone https://github.com/HelyeFab/markdown-brain.git
cd markdown-brain
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Build the MCP Server

```bash
npm run build
```

### 4. Configure Claude Desktop

Add the following to your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Linux**: `~/.config/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "markdown-brain": {
      "command": "node",
      "args": ["/path/to/markdown-brain/dist/index.js"],
      "env": {
        "DOCS_PATH": "/path/to/your/docs"
      }
    }
  }
}
```

### 5. Set Up the Update Script

Create the update script for automatic indexing:

```bash
mkdir -p ~/scripts
cp scripts/update-index.py ~/scripts/brain-update.py
chmod +x ~/scripts/brain-update.py
```

Edit `~/scripts/brain-update.py` and update the `DOCS_DIR` path to your documents directory:

```python
DOCS_DIR = "/path/to/your/docs"
```

### 6. Add Shell Aliases

Add these aliases to your shell configuration file (`~/.bashrc`, `~/.zshrc`, or `~/.bash_aliases`):

```bash
# Markdown Brain Aliases
alias brain-update='python3 ~/scripts/brain-update.py'
alias brain-index='cat ~/Documents/INDEX.md'
alias brain-ref='cat ~/Documents/QUICK_REFERENCE.md'
```

Then reload your shell configuration:

```bash
source ~/.bashrc  # or ~/.zshrc
```

### 7. Set Up Automatic Updates (Cron Job)

To automatically update the index every hour, add a cron job:

```bash
crontab -e
```

Add the following line:

```bash
0 * * * * /usr/bin/python3 ~/scripts/brain-update.py > /dev/null 2>&1
```

For different update frequencies:
- Every 30 minutes: `*/30 * * * *`
- Every 6 hours: `0 */6 * * *`
- Daily at 2 AM: `0 2 * * *`
- Every Monday at 8 AM: `0 8 * * 1`

### 8. Initial Index Generation

Run the update script to generate your first index:

```bash
brain-update
```

This will create:
- `INDEX.md` - Document index with categories and recent files
- `metadata.json` - JSON metadata for programmatic access
- `QUICK_REFERENCE.md` - Quick reference guide (if configured)

## Usage

### Command Line

After setup, you can use these commands:

- `brain-update` - Update the document index
- `brain-index` - View the current index
- `brain-ref` - View the quick reference

### In Claude Desktop

Once configured, you can use these MCP commands in Claude:

- Search documents: "Search for authentication in my docs"
- Get specific document: "Show me the API documentation"
- List all documents: "List all available documents"
- Find similar documents: "Find documents similar to the auth guide"
- Search by date: "Show documents modified this week"

## Directory Structure

Your documents directory should follow this structure:

```
docs/
├── INDEX.md           (auto-generated)
├── QUICK_REFERENCE.md (optional)
├── metadata.json      (auto-generated)
├── category1/
│   ├── doc1.md
│   └── doc2.md
└── category2/
    ├── doc3.md
    └── doc4.md
```

## Customization

### Categories

Edit the `CATEGORY_PATTERNS` in `update-index.py` to customize document categorization:

```python
CATEGORY_PATTERNS = {
    "Your Category": ["keyword1", "keyword2"],
    # Add more categories as needed
}
```

### Index Format

Modify the `generate_index()` function in `update-index.py` to customize the index format.

## Troubleshooting

### MCP Server Not Connecting

1. Check Claude Desktop logs
2. Verify the path in `claude_desktop_config.json`
3. Ensure Node.js is installed: `node --version`

### Index Not Updating

1. Check cron job: `crontab -l`
2. Test script manually: `python3 ~/scripts/brain-update.py`
3. Check permissions on documents directory

### Aliases Not Working

1. Ensure aliases are in the correct shell config file
2. Reload shell: `source ~/.bashrc` or `source ~/.zshrc`
3. Check alias is set: `alias | grep brain`

## Additional Features

### Watch Mode (Optional)

For real-time updates, you can use a file watcher:

```bash
# Install inotify-tools (Linux)
sudo apt-get install inotify-tools

# Create watch script
cat > ~/scripts/brain-watch.sh << 'EOF'
#!/bin/bash
while inotifywait -r -e modify,create,delete ~/Documents/*.md; do
    python3 ~/scripts/brain-update.py
done
EOF

chmod +x ~/scripts/brain-watch.sh

# Run in background
nohup ~/scripts/brain-watch.sh &
```

## Support

For issues or questions:
- GitHub Issues: https://github.com/HelyeFab/markdown-brain/issues
- Documentation: See README.md

---

*Last Updated: 2025-01-09*