import { describe, expect, it } from 'vitest';
import { resultMarkdown } from './result-markdown';
import type { UploadedImage } from './uploadkit';

const image = (name: string) => ({
  id: 'id', key: 'image', name, size: 1024, type: 'image/png',
  url: 'https://cdn.uploadkit.dev/image.png', status: 'UPLOADED',
}) as UploadedImage;

describe('upload result Markdown', () => {
  it('renders punctuation in file names as literal text in both locations', () => {
    const output = resultMarkdown(image('a]*_[link](url)`<tag>\\.png'));
    const escaped = 'a\\]\\*\\_\\[link\\]\\(url\\)\\`\\<tag\\>\\\\.png';
    expect(output).toContain(`![${escaped}](https://cdn.uploadkit.dev/image.png)`);
    expect(output).toContain(`**${escaped}**`);
  });
  it('does not let newlines in names create Markdown blocks', () => {
    expect(resultMarkdown(image('photo\n# heading.png'))).toContain('**photo \\# heading.png**');
  });
  it('preserves plain names, size and the original URL', () => {
    const output = resultMarkdown(image('photo.png'));
    expect(output).toContain('![photo.png](https://cdn.uploadkit.dev/image.png)');
    expect(output).toContain('**photo.png** · 1.0 KB · image/png');
  });
});
