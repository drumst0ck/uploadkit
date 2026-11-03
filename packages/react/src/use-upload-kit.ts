import { useReducer, useCallback, useRef, useEffect } from 'react';
import type { UploadResult, ProgressGranularity } from '@uploadkitdev/core';
import { useUploadKitContext } from './context';
import { checkMaxFileCount } from './utils/selection-guard';

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
  const activeController = useRef<AbortController | null>(null);

  useEffect(() => () => {
    const controller = activeController.current;
    activeController.current = null;
    controller?.abort();
  }, []);

  const upload = useCallback(
    async (file: File, metadata?: Record<string, unknown>, extraOpts?: UploadExtraOptions) => {
      // Abort any in-progress upload before starting a new one
      activeController.current?.abort();

      const controller = new AbortController();
      activeController.current = controller;
      dispatch({ type: 'START', controller });

      try {
        const result = await client.upload({
          file,
          route,
          // exactOptionalPropertyTypes: metadata must be omitted (not undefined) when absent
          ...(metadata !== undefined ? { metadata } : {}),
          ...(extraOpts?.progressGranularity !== undefined ? { progressGranularity: extraOpts.progressGranularity } : {}),
          onProgress: (percent) => {
            if (activeController.current === controller) dispatch({ type: 'PROGRESS', percent });
          },
          signal: controller.signal,
        });
        if (activeController.current !== controller) return;
        dispatch({ type: 'SUCCESS', result });
      } catch (err) {
        if (activeController.current !== controller) return;
        // Core reports cancellation as UPLOAD_ABORTED, while fetch uses AbortError.
        if (err instanceof Error && (err.name === 'AbortError' ||
            ('code' in err && err.code === 'UPLOAD_ABORTED'))) {
          dispatch({ type: 'RESET' });
          return;
        }
        dispatch({ type: 'ERROR', error: err instanceof Error ? err : new Error(String(err)) });
      } finally {
        if (activeController.current === controller) activeController.current = null;
      }
    },
    [client, route],
  );

  /**
   * Validates a multi-file selection against the route's maxFileCount
   * (per-selection, client-side). Over the limit: sets the error state with
   * code TOO_MANY_FILES and resolves false; call it before upload() and upload
   * nothing when it resolves false. No limit configured: resolves true.
   */
  const checkSelection = useCallback(
    async (files: File[]): Promise<boolean> => {
      const error = await checkMaxFileCount(client, route, files.length);
      if (!error) return true;
      activeController.current?.abort();
      activeController.current = null;
      dispatch({ type: 'ERROR', error });
      return false;
    },
    [client, route],
  );

  const abort = useCallback(() => {
    const controller = activeController.current;
    activeController.current = null;
    controller?.abort();
    dispatch({ type: 'RESET' });
  }, []);

  const reset = abort;

  return {
    upload,
    checkSelection,
    abort,
    reset,
    status: state.status,
    progress: state.progress,
    error: state.error,
    result: state.result,
    isUploading: state.status === 'uploading',
  };
}
