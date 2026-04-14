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
      'List every React upload component shipped by @uploadkitdev/react with its name, category, one-line description, and design inspiration.\n\nWhen to use: before recommending or scaffolding any UploadKit component, to confirm the exact name exists and to pick the right variant for the user\'s context (e.g. browse all "dropzone" variants when the user wants a drag-and-drop area).\n\nReturns: JSON { count, components: [{ name, category, description, inspiration }] }. Read-only, no side effects, idempotent.',
    inputSchema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          enum: ['classic', 'dropzone', 'button', 'progress', 'motion', 'specialty', 'gallery'],
          description:
            'Optional filter. Narrows the list to one category. Omit to get every component. Values: "classic" (the original 5 primitives like UploadButton/UploadDropzone), "dropzone" (styled drag-and-drop variants), "button" (styled button variants with motion), "progress" (upload progress indicators), "motion" (motion-forward visualizations like data streams, particles), "specialty" (avatars, chat composers, wizards, envelopes), "gallery" (multi-file layouts like grid, timeline, kanban).',
        },
      },
    },
  },
  {
    name: 'get_component',
    description:
      'Fetch full metadata plus a ready-to-paste React usage example for one specific UploadKit component.\n\nWhen to use: once you know the exact component name (from list_components or search_components) and need to show the user how to drop it into their code. The returned "usage" field is copy-pasteable TSX including the correct import line and the styles.css import.\n\nReturns: JSON { name, category, description, inspiration, usage }. If the name does not match any component, returns a suggestion message with the 5 closest matches. Read-only, idempotent.',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description:
            'Exact PascalCase component name. Case-sensitive. Examples: "UploadDropzone", "UploadDropzoneAurora", "UploadProgressRadial", "UploadDataStream". Must match one of the names returned by list_components.',
        },
      },
      required: ['name'],
    },
  },
  {
    name: 'search_components',
    description:
      'Fuzzy-search the UploadKit component catalog by any free-text keyword — component name, category, description, or design inspiration (e.g. "apple", "stripe", "vercel", "terminal", "progress ring", "kanban board", "matrix").\n\nWhen to use: the user describes the vibe or use case but does not know the component name yet ("I want something like Stripe Checkout", "show me Apple-style uploaders"). Prefer this over list_components when the goal is discovery rather than enumeration.\n\nReturns: JSON { query, count, matches: [{ name, category, description, inspiration }] }. Read-only, idempotent, case-insensitive.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description:
            'Free-text search string. Case-insensitive substring match against name, category, description, and inspiration fields. Examples: "terminal", "apple", "progress ring", "kanban", "vercel", "matrix".',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_install_command',
    description:
      'Return the exact shell command to install UploadKit packages for a given package manager.\n\nWhen to use: before asking the user to add dependencies — match their package manager (detect from the presence of pnpm-lock.yaml / package-lock.json / yarn.lock / bun.lockb if you can, otherwise ask or default to pnpm). Saves you from guessing pnpm vs npm vs yarn vs bun syntax.\n\nReturns: a plain-text shell command as a single string (e.g. "pnpm add @uploadkitdev/react @uploadkitdev/next"). Read-only, idempotent, never modifies anything.',
    inputSchema: {
      type: 'object',
      properties: {
        packageManager: {
          type: 'string',
          enum: ['pnpm', 'npm', 'yarn', 'bun'],
          default: 'pnpm',
          description:
            'Which package manager\'s syntax to output. Default: "pnpm". Pick the one the user\'s project actually uses — check their lockfile.',
        },
        packages: {
          type: 'array',
          items: { type: 'string' },
          description:
            'Which UploadKit packages to install. Omit to get the default full-stack set: ["@uploadkitdev/react", "@uploadkitdev/next"]. Pass a subset to scope the command, e.g. ["@uploadkitdev/core"] for a framework-agnostic project, or ["@uploadkitdev/react"] for a React app without Next.js.',
        },
      },
    },
  },
  {
    name: 'scaffold_route_handler',
    description:
      'Generate the complete file content for a Next.js App Router upload route handler — typed file router, handler export, correct path comment.\n\nWhen to use: when the user is setting up UploadKit server-side in a Next.js App Router project and needs the `app/api/uploadkit/[...uploadkit]/route.ts` file created. The returned string is a complete, compilable TypeScript file — write it to disk as-is.\n\nReturns: a markdown-formatted string containing the target path and the complete TS source inside a fenced code block. You must create the file at the literal path `app/api/uploadkit/[...uploadkit]/route.ts`. Read-only — generates text, never touches the filesystem itself.',
    inputSchema: {
      type: 'object',
      properties: {
        routeName: {
          type: 'string',
          description:
            'The key for this file route in the `FileRouter` object. This exact string is what consumers pass as the `route` prop on components (e.g. `<UploadDropzone route="media" />`). Use a short lowercase identifier matching the file-category — examples: "media" for a general images+videos endpoint, "avatar" for user profile pictures, "attachments" for message/ticket attachments, "documents" for PDFs.',
        },
        maxFileSize: {
          type: 'string',
          description:
            'Maximum allowed size per uploaded file, expressed with a unit suffix. Examples: "4MB" (default), "512KB", "1GB", "100MB". Omit to use the default of "4MB". Rejects uploads larger than this value with a 413 response.',
        },
        allowedTypes: {
          type: 'array',
          items: { type: 'string' },
          description:
            'MIME types (or wildcard patterns) that this route accepts. Examples: ["image/*"] (default — any image), ["image/jpeg", "image/png"] (two specific types), ["application/pdf"] (PDF only), ["image/*", "video/mp4"] (images plus MP4). Omit for the default of ["image/*"]. Rejects mismatched uploads with a 415 response.',
        },
        maxFileCount: {
          type: 'number',
          description:
            'Maximum number of files per single upload request. Default: 1. Set to a larger number to enable multi-file drag-and-drop (e.g. 10 for gallery uploaders). Must be >= 1.',
        },
      },
      required: ['routeName'],
    },
  },
  {
    name: 'scaffold_provider',
    description:
      'Return a ready-to-paste snippet that wraps the Next.js root layout with `<UploadKitProvider>` so React components can talk to the upload route handler.\n\nWhen to use: right after scaffold_route_handler, to complete the wiring. The snippet goes in `app/layout.tsx`. Without the provider, UploadKit React components throw at runtime.\n\nReturns: a plain-text string containing a short explanatory note followed by a fenced tsx code block. Takes no parameters — the endpoint path is always `/api/uploadkit` since that is what scaffold_route_handler produces. Read-only, deterministic, idempotent.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'get_byos_config',
    description:
      'Generate Bring-Your-Own-Storage (BYOS) configuration for an UploadKit Next.js handler — environment variables, handler code, and setup notes for a specific storage provider.\n\nWhen to use: the user wants to store uploads in their own cloud bucket instead of UploadKit\'s managed R2. Typical triggers: compliance/data-residency requirements, existing bucket infra, desire to avoid vendor lock-in.\n\nReturns: a plain-text string with three sections — provider-specific notes, the .env variable block, and the TypeScript handler code. Credentials are always server-side; the browser never sees them. Read-only, deterministic. No network calls, no secrets exposed.',
    inputSchema: {
      type: 'object',
      properties: {
        provider: {
          type: 'string',
          enum: ['s3', 'r2', 'gcs', 'b2'],
          description:
            'The storage provider to configure. "s3" = AWS S3 (watch egress costs). "r2" = Cloudflare R2 (recommended — zero egress fees). "gcs" = Google Cloud Storage via HMAC interop. "b2" = Backblaze B2 (S3-compatible, cheap egress). Choose based on where the user\'s bucket already lives.',
        },
      },
      required: ['provider'],
    },
  },
  {
    name: 'get_quickstart',
    description:
      'Return the complete UploadKit quickstart walkthrough for Next.js — install, API key env, route handler, provider, first component, optional BYOS — in one markdown document.\n\nWhen to use: the user is brand new to UploadKit and asks "how do I get started?", "set this up for me", or any variation that signals zero prior context. Prefer scaffold_route_handler + scaffold_provider + get_install_command when you already know which specific step they need.\n\nReturns: a plain-text markdown document. Takes no parameters. Read-only, static content, idempotent.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'search_docs',
    description:
      'Full-text search across every UploadKit docs page (88+ pages — getting-started, core-concepts, SDK reference, API reference, dashboard, guides). Ranks matches by keyword frequency in title, description, and body.\n\nWhen to use: any question about UploadKit behaviour, configuration, or integration that the component tools do not answer — middleware, onUploadComplete callbacks, REST API endpoints, webhooks, presigned URLs, CSS theming variables, type-safety setup, migration from UploadThing, rate limits, etc.\n\nReturns: JSON { query, count, indexGeneratedAt, matches: [{ path, url, title, description, snippet, score }] }. Sorted by score descending. Read-only. Bundled index (no network call) — results reflect docs at build time.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description:
            'Free-text search query. Multiple words are ANDed with per-field weighting (title matches score highest). Examples: "middleware onUploadComplete", "theming css variables", "presigned url", "migration uploadthing".',
        },
        limit: {
          type: 'number',
          description:
            'Maximum number of matches to return. Default: 8. Range 1-50. Use smaller values (3-5) when you already have a narrow query; use larger values (15-20) for exploratory scans across the whole docs site.',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_doc',
    description:
      'Fetch the full markdown content of a single UploadKit docs page by its path, formatted with title, description, source URL, and the body.\n\nWhen to use: after search_docs identifies a relevant page and you need its full contents to answer a deep question — prefer search_docs first, then get_doc on the top result. Reading the full page avoids relying on snippets that may omit critical context (callbacks, env vars, edge cases).\n\nReturns: a plain-text string — "# {title}\\n\\n> {description}\\n\\nSource: {url}\\n\\n---\\n\\n{content}". If the path is unknown, returns a not-found message suggesting list_docs. Read-only, idempotent.',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description:
            'Docs page path relative to /docs, WITHOUT leading slash and WITHOUT .mdx extension. Examples: "core-concepts/byos", "sdk/next/middleware", "api-reference/rest-api", "guides/avatar-upload". Get valid paths from search_docs results (the "path" field) or list_docs.',
        },
      },
      required: ['path'],
    },
  },
  {
    name: 'list_docs',
    description:
      'Enumerate every available UploadKit docs page with title, description, URL, and path.\n\nWhen to use: to discover what documentation exists before targeted searching, or to orient yourself around the shape of the docs site. Prefer search_docs when you already have a concrete question.\n\nReturns: JSON { count, generatedAt, pages: [{ path, url, title, description }] }. Pages are sorted alphabetically by path. Read-only, static at bundle time, idempotent.',
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
