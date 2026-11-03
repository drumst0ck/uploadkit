import { afterEach, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useThumbnail } from '../src/hooks/use-thumbnail';
afterEach(() => vi.restoreAllMocks());
it('revokes a video object URL when unmounted before seeked/error', () => {
  const create = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:video');
  const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  const file = new File(['video'], 'clip.mp4', { type: 'video/mp4' });
  const { unmount } = renderHook(() => useThumbnail(file));
  expect(create).toHaveBeenCalledOnce();
  unmount();
  expect(revoke).toHaveBeenCalledWith('blob:video');
});
