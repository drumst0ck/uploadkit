import type { UploadedImage } from './uploadkit';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** unitIndex).toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function escapeMarkdown(value: string): string {
  return value.replace(/[\r\n]+/g, ' ').replace(/[\\`*_{}[\]()#+!<>|]/g, '\\$&');
}

export function resultMarkdown(image: UploadedImage): string {
  const name = escapeMarkdown(image.name);
  return `# Upload complete

![${name}](${image.url})

\`${image.url}\`

**${name}** · ${formatBytes(image.size)} · ${image.type}`;
}
