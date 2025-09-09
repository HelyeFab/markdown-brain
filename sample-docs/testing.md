---
title: Testing the MCP Server
tags: [testing, development]
---

# Testing Guide

To test the MCP server locally:

1. Build the project: `npm run build`
2. Run with a specific folder: `node dist/index.js /path/to/docs`
3. The server will watch for changes automatically

## Available Commands

The server provides several tools for querying documents:
- search_documents
- get_document
- list_documents
- find_similar
- search_by_date