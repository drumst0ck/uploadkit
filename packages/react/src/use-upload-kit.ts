import { useReducer, useCallback } from 'react';
import type { UploadResult, ProgressGranularity } from '@uploadkitdev/core';
import { useUploadKitContext } from './context';

type UploadExtraOptions = {
  progressGranularity?: ProgressGranularity;
};

// Upload lifecycle states
type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

type UploadState = {
  status: UploadStatus;
  progress: number;
  error: Error | null;
  result: UploadResult | null;
  abortController: AbortController | null;
};

type UploadAction =
  | { type: 'START'; controller: AbortController }
  | { type: 'PROGRESS'; percent: number }
  | { type: 'SUCCESS'; result: UploadResult }
  | { type: 'ERROR'; error: Error }
  | { type: 'RESET' };

const initialState: UploadState = {
  status: 'idle',
  progress: 0,
  error: null,
  result: null,
  abortController: null,
};

function uploadReducer(state: UploadState, action: UploadAction): UploadState {
  switch (action.type) {
    case 'START':
      return {
        status: 'uploading',
        progress: 0,
        error: null,
        result: null,
        abortController: action.controller,
      };
    case 'PROGRESS':
      return {
        ...state,
        progress: action.percent,
      };
    case 'SUCCESS':
      return {
        status: 'success',
        progress: 100,
        error: null,
        result: action.result,
        abortController: null,
      };
    case 'ERROR':
      return {
        status: 'error',
        progress: 0,
        error: action.error,
        result: null,
        abortController: null,
      };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

/**
 * useUploadKit — headless upload state machine hook.
 *
 * Returns upload state and actions. Pair with any UI component.
 *
 * Security (T-05-03): AbortController prevents runaway uploads.
 * The state machine guards against concurrent uploads from the same hook instance —
 * calling upload() while uploading replaces the previous controller.
 *
 * Usage:
 * ```ts
 * const { upload, status, progress, error, result, abort, reset, isUploading } =
 *   useUploadKit('profile-pictures');
 * ```
 */
export function useUploadKit(route: string) {
  const { client } = useUploadKitContext();
  const [state, dispatch] = useReducer(uploadReducer, initialState);

  const upload = useCallback(
    async (file: File, metadata?: Record<string, unknown>, extraOpts?: UploadExtraOptions) => {
      // Abort any in-progress upload before starting a new one
      state.abortController?.abort();

      const controller = new AbortController();
      dispatch({ type: 'START', controller });

      try {
        const result = await client.upload({
          file,
          route,
          // exactOptionalPropertyTypes: metadata must be omitted (not undefined) when absent
          ...(metadata !== undefined ? { metadata } : {}),
          ...(extraOpts?.progressGranularity !== undefined ? { progressGranularity: extraOpts.progressGranularity } : {}),
          onProgress: (percent) => dispatch({ type: 'PROGRESS', percent }),
          signal: controller.signal,
        });
        dispatch({ type: 'SUCCESS', result });
      } catch (err) {
        // AbortError means the user cancelled — reset cleanly instead of showing error
        if (err instanceof Error && err.name === 'AbortError') {
          dispatch({ type: 'RESET' });
          return;
        }
        dispatch({ type: 'ERROR', error: err instanceof Error ? err : new Error(String(err)) });
      }
    },
    // route is intentionally included — if route changes, upload fn should update
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [client, route],
  );

  const abort = useCallback(() => {
    state.abortController?.abort();
    dispatch({ type: 'RESET' });
  }, [state.abortController]);

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  return {
    upload,
    abort,
    reset,
    status: state.status,
    progress: state.progress,
    error: state.error,
    result: state.result,
    isUploading: state.status === 'uploading',
  };
}
