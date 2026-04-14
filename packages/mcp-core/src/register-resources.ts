import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { CATALOG } from './catalog.js';
import { QUICKSTART } from './scaffolds.js';
import { docsCount, docsGeneratedAt, listDocs } from './docs.js';

export function registerResources(server: Server): void {
  server.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: [
      {
        uri: 'uploadkit://catalog',
        name: 'UploadKit component catalog',
        description: 'Full JSON catalog of every @uploadkitdev/react component.',
        mimeType: 'application/json',
      },
      {
        uri: 'uploadkit://quickstart',
        name: 'UploadKit quickstart',
        description: 'End-to-end Next.js quickstart for UploadKit.',
        mimeType: 'text/markdown',
      },
      {
        uri: 'uploadkit://docs',
        name: 'UploadKit docs index',
        description: `Full index of ${docsCount()} docs pages with titles, descriptions, URLs, and paths. Use search_docs / get_doc tools to fetch content.`,
        mimeType: 'application/json',
      },
    ],
  }));

  server.setRequestHandler(ReadResourceRequestSchema, async (req) => {
    const { uri } = req.params;
    if (uri === 'uploadkit://catalog') {
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(CATALOG, null, 2),
          },
        ],
      };
    }
    if (uri === 'uploadkit://quickstart') {
      return {
        contents: [{ uri, mimeType: 'text/markdown', text: QUICKSTART }],
      };
    }
    if (uri === 'uploadkit://docs') {
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(
              { count: docsCount(), generatedAt: docsGeneratedAt(), pages: listDocs() },
              null,
              2,
            ),
          },
        ],
      };
    }
    throw new Error(`Unknown resource: ${uri}`);
  });
}
