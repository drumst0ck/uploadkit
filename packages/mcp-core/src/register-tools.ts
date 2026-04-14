import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { CATALOG, type Category } from './catalog.js';
import {
  installCommand,
  routeHandlerFile,
  providerSnippet,
  byosConfig,
  QUICKSTART,
  type PackageManager,
} from './scaffolds.js';
import {
  searchDocs,
  getDoc,
  listDocs,
  docsCount,
  docsGeneratedAt,
} from './docs.js';

const TOOLS = [
  {
    name: 'list_components',
    description:
      'List every component available in @uploadkitdev/react. Optionally filter by category (classic, dropzone, button, progress, motion, specialty, gallery). Use this before suggesting a component so you pick one that actually exists.',
    inputSchema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          enum: ['classic', 'dropzone', 'button', 'progress', 'motion', 'specialty', 'gallery'],
          description: 'Optional filter.',
        },
      },
    },
  },
  {
    name: 'get_component',
    description:
      'Return full metadata + a ready-to-paste usage example for a specific UploadKit component.',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Exact component name, e.g. "UploadDropzoneAurora".',
        },
      },
      required: ['name'],
    },
  },
  {
    name: 'search_components',
    description:
      'Fuzzy-search components by keyword, inspiration, or use case (e.g. "terminal", "apple", "progress ring", "kanban").',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Free-text search.' },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_install_command',
    description:
      'Return the install command for UploadKit packages. Defaults to pnpm + the full stack (react + next).',
    inputSchema: {
      type: 'object',
      properties: {
        packageManager: {
          type: 'string',
          enum: ['pnpm', 'npm', 'yarn', 'bun'],
          default: 'pnpm',
        },
        packages: {
          type: 'array',
          items: { type: 'string' },
          description: 'Which UploadKit packages to install. Default: ["@uploadkitdev/react", "@uploadkitdev/next"].',
        },
      },
    },
  },
  {
    name: 'scaffold_route_handler',
    description:
      'Generate the file content for a Next.js App Router route handler at app/api/uploadkit/[...uploadkit]/route.ts — with a file router typed to your route name.',
    inputSchema: {
      type: 'object',
      properties: {
        routeName: {
          type: 'string',
          description: 'Name of the file route, e.g. "media", "avatar", "attachments". This is the value you pass as the `route` prop on components.',
        },
        maxFileSize: {
          type: 'string',
          description: 'Max file size, e.g. "4MB", "1GB". Default: "4MB".',
        },
        allowedTypes: {
          type: 'array',
          items: { type: 'string' },
          description: 'MIME types allowed. Default: ["image/*"].',
        },
        maxFileCount: {
          type: 'number',
          description: 'Default: 1.',
        },
      },
      required: ['routeName'],
    },
  },
  {
    name: 'scaffold_provider',
    description:
      'Return a ready-to-paste snippet that adds <UploadKitProvider> to the Next.js root layout.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'get_byos_config',
    description:
      'Return environment + handler configuration for Bring-Your-Own-Storage mode with S3, R2, GCS, or Backblaze B2. Credentials never reach the browser.',
    inputSchema: {
      type: 'object',
      properties: {
        provider: {
          type: 'string',
          enum: ['s3', 'r2', 'gcs', 'b2'],
        },
      },
      required: ['provider'],
    },
  },
  {
    name: 'get_quickstart',
    description: 'Full end-to-end quickstart guide for UploadKit on Next.js.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'search_docs',
    description:
      'Full-text search across every UploadKit docs page (88+ pages: getting-started, core-concepts, SDK reference, API reference, dashboard, guides). Use this whenever the user asks about UploadKit behaviour, APIs, middleware, webhooks, theming, BYOS, type safety, or any topic not covered by the component tools. Returns ranked matches with title, URL, snippet, and path.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Free-text query.' },
        limit: {
          type: 'number',
          description: 'Max results. Default: 8.',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_doc',
    description:
      'Return the full content of a docs page by path (e.g. "core-concepts/byos", "sdk/next/middleware", "api-reference/rest-api"). Use this after search_docs to read a specific page in depth.',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description:
            'Page path relative to /docs (no leading slash, no .mdx extension).',
        },
      },
      required: ['path'],
    },
  },
  {
    name: 'list_docs',
    description:
      'List every docs page with title, description, URL, and path. Use this to discover what documentation is available before searching.',
    inputSchema: { type: 'object', properties: {} },
  },
];

type JsonObj = Record<string, unknown>;

function textResult(text: string) {
  return { content: [{ type: 'text' as const, text }] };
}

function jsonResult(value: unknown) {
  return textResult(JSON.stringify(value, null, 2));
}

export function registerTools(server: Server): void {
  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const name = req.params.name;
    const args = (req.params.arguments ?? {}) as JsonObj;

    switch (name) {
      case 'list_components': {
        const cat = args.category as Category | undefined;
        const entries = cat ? CATALOG.filter((c) => c.category === cat) : CATALOG;
        const rows = entries.map(({ name, category, description, inspiration }) => ({
          name,
          category,
          description,
          inspiration,
        }));
        return jsonResult({ count: rows.length, components: rows });
      }

      case 'get_component': {
        const target = String(args.name ?? '');
        const found = CATALOG.find((c) => c.name === target);
        if (!found) {
          const near = CATALOG.filter((c) =>
            c.name.toLowerCase().includes(target.toLowerCase()),
          ).map((c) => c.name);
          return textResult(
            `Component "${target}" not found. Did you mean: ${near.slice(0, 5).join(', ') || '(no close matches)'}?\n\nUse list_components to see all options.`,
          );
        }
        return jsonResult(found);
      }

      case 'search_components': {
        const q = String(args.query ?? '').toLowerCase();
        const hits = CATALOG.filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            c.description.toLowerCase().includes(q) ||
            c.inspiration.toLowerCase().includes(q) ||
            c.category.toLowerCase().includes(q),
        ).map(({ name, category, description, inspiration }) => ({
          name,
          category,
          description,
          inspiration,
        }));
        return jsonResult({ query: q, count: hits.length, matches: hits });
      }

      case 'get_install_command': {
        const pm = (args.packageManager as PackageManager | undefined) ?? 'pnpm';
        const pkgs =
          (args.packages as string[] | undefined) ?? [
            '@uploadkitdev/react',
            '@uploadkitdev/next',
          ];
        return textResult(installCommand(pm, pkgs));
      }

      case 'scaffold_route_handler': {
        const routeName = String(args.routeName ?? 'media');
        const opts: {
          maxFileSize?: string;
          allowedTypes?: string[];
          maxFileCount?: number;
        } = {};
        if (typeof args.maxFileSize === 'string') opts.maxFileSize = args.maxFileSize;
        if (Array.isArray(args.allowedTypes))
          opts.allowedTypes = args.allowedTypes as string[];
        if (typeof args.maxFileCount === 'number') opts.maxFileCount = args.maxFileCount;
        const file = routeHandlerFile(routeName, opts);
        return textResult(
          `Create this file at app/api/uploadkit/[...uploadkit]/route.ts:\n\n\`\`\`ts\n${file}\`\`\``,
        );
      }

      case 'scaffold_provider': {
        const { layoutPatch, notes } = providerSnippet();
        return textResult(`${notes}\n\n\`\`\`tsx\n${layoutPatch}\n\`\`\``);
      }

      case 'get_byos_config': {
        const provider = args.provider as 's3' | 'r2' | 'gcs' | 'b2';
        if (!['s3', 'r2', 'gcs', 'b2'].includes(provider)) {
          return textResult('provider must be one of: s3, r2, gcs, b2');
        }
        const { env, handler, notes } = byosConfig(provider);
        return textResult(
          `BYOS setup for ${provider.toUpperCase()}\n\n${notes}\n\n--- .env ---\n${env}\n\n--- route.ts ---\n${handler}`,
        );
      }

      case 'get_quickstart': {
        return textResult(QUICKSTART);
      }

      case 'search_docs': {
        const q = String(args.query ?? '');
        const limit = typeof args.limit === 'number' ? args.limit : 8;
        const matches = searchDocs(q, limit);
        return jsonResult({
          query: q,
          count: matches.length,
          indexGeneratedAt: docsGeneratedAt(),
          matches,
        });
      }

      case 'get_doc': {
        const p = String(args.path ?? '');
        const doc = getDoc(p);
        if (!doc) {
          return textResult(
            `Doc "${p}" not found. Use list_docs to see all ${docsCount()} available paths.`,
          );
        }
        return textResult(
          `# ${doc.title}\n\n> ${doc.description}\n\nSource: ${doc.url}\n\n---\n\n${doc.content}`,
        );
      }

      case 'list_docs': {
        return jsonResult({
          count: docsCount(),
          generatedAt: docsGeneratedAt(),
          pages: listDocs(),
        });
      }

      default:
        return textResult(`Unknown tool: ${name}`);
    }
  });
}
