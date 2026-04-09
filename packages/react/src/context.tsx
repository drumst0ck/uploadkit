import { createContext, useContext, useRef } from 'react';
import type { ReactNode } from 'react';
import { createProxyClient, ProxyUploadKitClient } from '@uploadkitdev/core';

export type UploadKitProviderProps = {
  /** Local endpoint URL for the uploadkit handler, e.g. "/api/uploadkit" */
  endpoint: string;
  children: ReactNode;
};

type UploadKitContextValue = {
  client: ProxyUploadKitClient;
};

const UploadKitContext = createContext<UploadKitContextValue | null>(null);

/**
 * UploadKitProvider — wraps your upload UI and provides the proxy client.
 * The API key NEVER touches the browser. All requests go through your
 * Next.js server endpoint which holds the secret key server-side.
 *
 * Usage:
 * ```tsx
 * <UploadKitProvider endpoint="/api/uploadkit">
 *   <UploadButton route="avatars" />
 * </UploadKitProvider>
 * ```
 */
export function UploadKitProvider({ endpoint, children }: UploadKitProviderProps) {
  // useRef ensures the client is created exactly once per provider mount,
  // regardless of how many times the parent re-renders (prevents duplicate
  // upload state machines from re-instantiation on Strict Mode double-invoke).
  const clientRef = useRef<ProxyUploadKitClient | null>(null);

  if (clientRef.current === null) {
    clientRef.current = createProxyClient({ endpoint });
  }

  return (
    <UploadKitContext.Provider value={{ client: clientRef.current }}>
      {children}
    </UploadKitContext.Provider>
  );
}

/**
 * useUploadKitContext — internal hook used by all @uploadkitdev/react components.
 * Throws a descriptive error if called outside <UploadKitProvider>.
 */
export function useUploadKitContext(): UploadKitContextValue {
  const ctx = useContext(UploadKitContext);
  if (ctx === null) {
    throw new Error(
      'useUploadKit must be used inside <UploadKitProvider>. ' +
        'Wrap your upload UI with <UploadKitProvider endpoint="/api/uploadkit">.',
    );
  }
  return ctx;
}
