import { useCallback, useRef } from 'react';
import { UploadKitError } from '@uploadkitdev/core';
import type { ProxyUploadKitClient } from '@uploadkitdev/core';
import { useUploadKitContext } from '../context';

/** Error reported when a selection holds more files than the route's maxFileCount. */
export function tooManyFilesError(max: number, selected: number): Error {
  return new UploadKitError(
    'TOO_MANY_FILES',
    `You selected ${selected} files but this route allows at most ${max} per selection (maxFileCount: ${max}). No files were uploaded.`,
    400,
  );
}

/**
 * Returns the error for a selection that exceeds the route's maxFileCount,
 * or null when the selection is allowed. The limit is read from the handler
 * GET route config; when absent (or unreadable) there is no limit.
 * This is a client-side, per-selection check (UX), not a server quota.
 */
export async function checkMaxFileCount(
  client: ProxyUploadKitClient,
  route: string,
  selected: number,
): Promise<Error | null> {
  const config = await client.getRouteConfig?.(route);
  const max = config?.maxFileCount;
  if (max === undefined || selected <= max) return null;
  return tooManyFilesError(max, selected);
}

/**
 * Hook for components that accept multi-file selections. Returns a stable
 * `guardSelection(files)` that reports TOO_MANY_FILES through `onError` and
 * resolves to false (caller must then upload nothing).
 */
export function useSelectionGuard(route: string, onError?: (error: Error) => void) {
  const { client } = useUploadKitContext();
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;
  return useCallback(
    async (files: File[]): Promise<boolean> => {
      const error = await checkMaxFileCount(client, route, files.length);
      if (!error) return true;
      onErrorRef.current?.(error);
      return false;
    },
    [client, route],
  );
}
