#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ToolSchema
} from '@modelcontextprotocol/sdk/types.js';
import fs from 'fs/promises';
import path from 'path';
import { marked } from 'marked';
import matter from 'gray-matter';
import chokidar, { FSWatcher } from 'chokidar';
import Fuse from 'fuse.js';
import natural from 'natural';

interface Document {
  id: string;
  path: string;
  title: string;
  content: string;
  frontmatter: any;
  lastModified: Date;
  tokens?: string[];
}

class MarkdownBrainServer {
  private server: Server;
  private documents: Map<string, Document> = new Map();
  private fuse: Fuse<Document> | null = null;
  private docsPath: string;
  private watcher: FSWatcher | null = null;
  private tokenizer = new natural.WordTokenizer();
  private tfidf = new natural.TfIdf();

  constructor() {
    this.server = new Server(
      {
        name: 'markdown-brain',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.docsPath = process.argv[2] || process.env.MARKDOWN_DOCS_PATH || './docs';
    
    this.setupToolHandlers();
    this.initializeDocuments();
  }

  private async initializeDocuments() {
    console.error(`Initializing markdown documents from: ${this.docsPath}`);
    
    try {
      await fs.access(this.docsPath);
    } catch {
      console.error(`Creating docs directory at: ${this.docsPath}`);
      await fs.mkdir(this.docsPath, { recursive: true });
    }

    await this.loadDocuments();
    this.watchDocuments();
  }

  private async loadDocuments() {
    try {
      const files = await this.getMarkdownFiles(this.docsPath);
      
      this.documents.clear();
      this.tfidf = new natural.TfIdf();
      
      for (const file of files) {
        await this.loadDocument(file);
      }
      
      this.rebuildSearchIndex();
      console.error(`Loaded ${this.documents.size} documents`);
    } catch (error) {
      console.error('Error loading documents:', error);
    }
  }

  private async getMarkdownFiles(dir: string): Promise<string[]> {
    const files: string[] = [];
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...await this.getMarkdownFiles(fullPath));
      } else if (entry.name.endsWith('.md')) {
        files.push(fullPath);
      }
    }
    
    return files;
  }

  private async loadDocument(filePath: string) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const { data: frontmatter, content: markdown } = matter(content);
      const stats = await fs.stat(filePath);
      
      const id = path.relative(this.docsPath, filePath);
      const title = frontmatter.title || 
                   path.basename(filePath, '.md').replace(/-/g, ' ');
      
      const plainText = this.markdownToPlainText(markdown);
      const tokens = this.tokenizer.tokenize(plainText.toLowerCase());
      
      const doc: Document = {
        id,
        path: filePath,
        title,
        content: plainText,
        frontmatter,
        lastModified: stats.mtime,
        tokens
      };
      
      this.documents.set(id, doc);
      this.tfidf.addDocument(plainText);
    } catch (error) {
      console.error(`Error loading document ${filePath}:`, error);
    }
  }

  private markdownToPlainText(markdown: string): string {
    const html = marked.parse(markdown) as string;
    return html.replace(/<[^>]*>/g, '').trim();
  }

  private rebuildSearchIndex() {
    const documents = Array.from(this.documents.values());
    
    this.fuse = new Fuse(documents, {
      keys: [
        { name: 'title', weight: 0.3 },
        { name: 'content', weight: 0.5 },
        { name: 'frontmatter.tags', weight: 0.2 }
      ],
      includeScore: true,
      threshold: 0.4,
      ignoreLocation: true,
      useExtendedSearch: true
    });
  }

  private watchDocuments() {
    this.watcher = chokidar.watch(`${this.docsPath}/**/*.md`, {
      persistent: true,
      ignoreInitial: true
    });

    this.watcher
      .on('add', async (path: string) => {
        console.error(`Document added: ${path}`);
        await this.loadDocument(path);
        this.rebuildSearchIndex();
      })
      .on('change', async (path: string) => {
        console.error(`Document changed: ${path}`);
        await this.loadDocument(path);
        this.rebuildSearchIndex();
      })
      .on('unlink', (filePath: string) => {
        console.error(`Document removed: ${filePath}`);
        const id = path.relative(this.docsPath, filePath);
        this.documents.delete(id);
        this.rebuildSearchIndex();
      });
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'search_documents',
          description: 'Search through markdown documents using semantic search',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Search query'
              },
              limit: {
                type: 'number',
                description: 'Maximum number of results',
                default: 5
              }
            },
            required: ['query']
          }
        },
        {
          name: 'get_document',
          description: 'Get the full content of a specific document',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Document ID (relative path from docs folder)'
              }
            },
            required: ['id']
          }
        },
        {
          name: 'list_documents',
          description: 'List all available documents',
          inputSchema: {
            type: 'object',
            properties: {
              tag: {
                type: 'string',
                description: 'Filter by tag (optional)'
              }
            }
          }
        },
        {
          name: 'find_similar',
          description: 'Find documents similar to a given document',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Document ID to find similar documents for'
              },
              limit: {
                type: 'number',
                description: 'Maximum number of results',
                default: 3
              }
            },
            required: ['id']
          }
        },
        {
          name: 'search_by_date',
          description: 'Search documents by modification date',
          inputSchema: {
            type: 'object',
            properties: {
              after: {
                type: 'string',
                description: 'ISO date string - find documents modified after this date'
              },
              before: {
                type: 'string',
                description: 'ISO date string - find documents modified before this date'
              }
            }
          }
        }
      ]
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      if (!args) {
        throw new Error('No arguments provided');
      }

      switch (name) {
        case 'search_documents':
          return this.searchDocuments(args.query as string, args.limit as number || 5);
        
        case 'get_document':
          return this.getDocument(args.id as string);
        
        case 'list_documents':
          return this.listDocuments(args.tag as string | undefined);
        
        case 'find_similar':
          return this.findSimilarDocuments(args.id as string, args.limit as number || 3);
        
        case 'search_by_date':
          return this.searchByDate(args.after as string, args.before as string);
        
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
  }

  private searchDocuments(query: string, limit: number) {
    if (!this.fuse) {
      return {
        content: [
          {
            type: 'text',
            text: 'No documents loaded yet'
          }
        ]
      };
    }

    const results = this.fuse.search(query, { limit });
    
    const formattedResults = results.map(result => ({
      id: result.item.id,
      title: result.item.title,
      score: result.score,
      excerpt: result.item.content.substring(0, 200) + '...',
      tags: result.item.frontmatter.tags || []
    }));

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(formattedResults, null, 2)
        }
      ]
    };
  }

  private getDocument(id: string) {
    const doc = this.documents.get(id);
    
    if (!doc) {
      return {
        content: [
          {
            type: 'text',
            text: `Document not found: ${id}`
          }
        ]
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            id: doc.id,
            title: doc.title,
            frontmatter: doc.frontmatter,
            content: doc.content,
            lastModified: doc.lastModified
          }, null, 2)
        }
      ]
    };
  }

  private listDocuments(tag?: string) {
    let docs = Array.from(this.documents.values());
    
    if (tag) {
      docs = docs.filter(doc => 
        doc.frontmatter.tags && 
        doc.frontmatter.tags.includes(tag)
      );
    }

    const list = docs.map(doc => ({
      id: doc.id,
      title: doc.title,
      tags: doc.frontmatter.tags || [],
      lastModified: doc.lastModified
    }));

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(list, null, 2)
        }
      ]
    };
  }

  private findSimilarDocuments(id: string, limit: number) {
    const targetDoc = this.documents.get(id);
    
    if (!targetDoc) {
      return {
        content: [
          {
            type: 'text',
            text: `Document not found: ${id}`
          }
        ]
      };
    }

    const scores: { id: string; score: number; title: string }[] = [];
    
    for (const [docId, doc] of this.documents) {
      if (docId === id) continue;
      
      const score = this.calculateSimilarity(targetDoc, doc);
      scores.push({ id: docId, score, title: doc.title });
    }

    scores.sort((a, b) => b.score - a.score);
    const topResults = scores.slice(0, limit);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(topResults, null, 2)
        }
      ]
    };
  }

  private calculateSimilarity(doc1: Document, doc2: Document): number {
    if (!doc1.tokens || !doc2.tokens) return 0;

    const set1 = new Set(doc1.tokens);
    const set2 = new Set(doc2.tokens);
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return intersection.size / union.size;
  }

  private searchByDate(after?: string, before?: string) {
    let docs = Array.from(this.documents.values());
    
    if (after) {
      const afterDate = new Date(after);
      docs = docs.filter(doc => doc.lastModified > afterDate);
    }
    
    if (before) {
      const beforeDate = new Date(before);
      docs = docs.filter(doc => doc.lastModified < beforeDate);
    }

    docs.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());

    const results = docs.map(doc => ({
      id: doc.id,
      title: doc.title,
      lastModified: doc.lastModified,
      excerpt: doc.content.substring(0, 150) + '...'
    }));

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(results, null, 2)
        }
      ]
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Markdown Brain MCP server running');
  }
}

const server = new MarkdownBrainServer();
server.run().catch(console.error);