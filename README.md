# Markdown Brain MCP Server

An MCP server that acts as a "brain" for your markdown documents, providing semantic search and intelligent querying capabilities.

## Features

- **Real-time Document Watching**: Automatically indexes new, modified, or deleted markdown files
- **Semantic Search**: Find documents based on content, not just keywords
- **Similarity Detection**: Find documents similar to a given document
- **Date-based Search**: Search documents by modification date
- **Tag Support**: Organize and filter documents using frontmatter tags
- **TF-IDF Analysis**: Natural language processing for better search relevance

## Installation

1. Build the TypeScript code:
```bash
npm run build
```

2. Configure Claude Code to use this MCP server by adding to your Claude configuration:

```json
{
  "mcpServers": {
    "markdown-brain": {
      "command": "node",
      "args": [
        "/home/helye/Development/Projects/Work/MCPs/markdown-brain/dist/index.js",
        "/path/to/your/markdown/folder"
      ]
    }
  }
}
```

## Usage

Once configured, Claude will have access to these tools:

### `search_documents`
Search through all documents using semantic search
- **query**: Your search query
- **limit**: Maximum number of results (default: 5)

### `get_document`
Retrieve the full content of a specific document
- **id**: Document ID (relative path from docs folder)

### `list_documents`
List all available documents
- **tag**: Optional filter by tag

### `find_similar`
Find documents similar to a given document
- **id**: Document ID to find similar documents for
- **limit**: Maximum number of results (default: 3)

### `search_by_date`
Search documents by modification date
- **after**: ISO date string - find documents modified after this date
- **before**: ISO date string - find documents modified before this date

## Document Format

The server supports markdown files with optional YAML frontmatter:

```markdown
---
title: Document Title
tags: [tag1, tag2, tag3]
---

# Content goes here

Your markdown content...
```

## Example Queries

Ask Claude things like:
- "Search for documents about project planning"
- "Find all documents tagged with 'important'"
- "Show me documents similar to project-overview.md"
- "What documents were modified this week?"
- "Get the content of meeting-notes.md"

## Development

Run in development mode:
```bash
npm run dev /path/to/markdown/folder
```

Build for production:
```bash
npm run build
npm start /path/to/markdown/folder
```