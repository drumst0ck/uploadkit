import type { FileRouter } from './types';
import { parseFileSize, getRouteConfig } from './router';

type ExtractedRouteConfig = {
  maxFileSize?: number;
  maxFileCount?: number;
  allowedTypes?: string[];
};

/**
 * Extracts static config from a FileRouter for client-side hydration.
 * Call this server-side and pass the result to NextSSRPlugin.
 */
export function extractRouterConfig<TRouter extends FileRouter>(
  router: TRouter
): Record<string, ExtractedRouteConfig> {
  return Object.fromEntries(
    Object.entries(router).map(([key, route]) => [
      key,
      {
        ...(route.maxFileSize !== undefined
          ? { maxFileSize: parseFileSize(route.maxFileSize) }
          : {}),
        ...(route.maxFileCount !== undefined
          ? { maxFileCount: route.maxFileCount }
          : {}),
        ...(route.allowedTypes !== undefined
          ? { allowedTypes: route.allowedTypes }
          : {}),
      },
    ])
  );
}

type NextSSRPluginProps = {
  routerConfig: Record<string, ExtractedRouteConfig>;
};

/**
 * NextSSRPlugin — renders a hidden <script> tag with serialized router config
 * so the client can hydrate without an extra round-trip to fetch route limits.
 *
 * Usage (app/layout.tsx):
 * ```tsx
 * import { NextSSRPlugin, extractRouterConfig } from '@uploadkit/next/ssr';
 * import { uploadRouter } from './api/uploadkit/[...uploadkit]/route';
 *
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         <NextSSRPlugin routerConfig={extractRouterConfig(uploadRouter)} />
 *         {children}
 *       </body>
 *     </html>
 *   );
 * }
 * ```
 */
export function NextSSRPlugin({ routerConfig }: NextSSRPluginProps) {
  return (
    <script
      type="application/json"
      id="__uploadkit-ssr"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(routerConfig),
      }}
    />
  );
}
