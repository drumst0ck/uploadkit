/** Short, human label for a MIME type: image/png -> PNG, application/pdf -> PDF. */
export function fileKind(mime: string): string {
  const sub = (mime.split('/')[1] ?? mime).split(';')[0] ?? mime;
  const known: Record<string, string> = {
    jpeg: 'JPG',
    'svg+xml': 'SVG',
    msword: 'DOC',
    'vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
    'vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
    'vnd.ms-excel': 'XLS',
    plain: 'TXT',
    'octet-stream': 'BIN',
    quicktime: 'MOV',
    mpeg: 'MP3',
  };
  const label = known[sub] ?? (sub.length > 6 ? (mime.split('/')[0] ?? sub) : sub);
  return label.toUpperCase();
}
