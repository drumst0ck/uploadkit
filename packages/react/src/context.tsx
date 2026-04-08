import { createContext, useContext, useRef } from 'react';
import type { ReactNode } from 'react';
import { createUploadKit, UploadKitClient } from '@uploadkit/core';

// Security (T-05-01): apiKey is held inside UploadKitClient's private class field
// (#apiKey). The client ref is not exposed in DOM attributes or serialized state.

export type UploadKitProviderProps = {
  apiKey: string;
  baseUrl?: string;
  children: ReactNode;
};

type UploadKitContextValue = {
  client: UploadKitClient;
};

const UploadKitContext = createContext<UploadKitContextValue | null>(null);

/**
 * UploadKitProvider — wraps your app (or upload UI) and provides the SDK client
 * to all child components and hooks.
 *
 * Usage:
 * ```tsx
 * <UploadKitProvider apiKey="uk_live_...">
 *   <UploadButton route="avatars" />
 * </UploadKitProvider>
 * ```
 */
export function UploadKitProvider({ apiKey, baseUrl, children }: UploadKitProviderProps) {
  // useRef ensures the client is created exactly once per provider mount,
  // regardless of how many times the parent re-renders (T-05-03: prevents
  // duplicate upload state machines from re-instantiation).
  const clientRef = useRef<UploadKitClient | null>(null);

  if (clientRef.current === null) {
    clientRef.current = createUploadKit({
      apiKey,
      // exactOptionalPropertyTypes: omit baseUrl entirely when undefined
      ...(baseUrl !== undefined ? { baseUrl } : {}),
    });
  }

  return (
    <UploadKitContext.Provider value={{ client: clientRef.current }}>
      {children}
    </UploadKitContext.Provider>
  );
}

/**
 * useUploadKitContext — internal hook used by all @uploadkit/react components.
 * Throws a descriptive error if called outside <UploadKitProvider>.
 */
export function useUploadKitContext(): UploadKitContextValue {
  const ctx = useContext(UploadKitContext);
  if (ctx === null) {
    throw new Error(
      'useUploadKit must be used inside <UploadKitProvider>. ' +
        'Wrap your upload UI with <UploadKitProvider apiKey="uk_live_...">.',
    );
  }
  return ctx;
}
