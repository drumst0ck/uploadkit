'use client';

import { File, FileText, FileSpreadsheet, Music, Video } from 'lucide-react';

interface FilePreviewCellProps {
  file: {
    name: string;
    type: string;
    url?: string;
  };
}

export function FilePreviewCell({ file }: FilePreviewCellProps) {
  if (file.type.startsWith('image/')) {
    return (
      <img
        src={file.url ?? ''}
        alt={file.name}
        className="h-8 w-8 rounded object-cover"
        loading="lazy"
      />
    );
  }

  // Map MIME type prefix to lucide icon
  const iconClass = 'h-5 w-5 text-zinc-400';

  if (file.type.startsWith('text/')) {
    return <FileText className={iconClass} />;
  }

  if (file.type.startsWith('video/')) {
    return <Video className={iconClass} />;
  }

  if (file.type.startsWith('audio/')) {
    return <Music className={iconClass} />;
  }

  if (file.type === 'application/pdf') {
    return <FileSpreadsheet className={iconClass} />;
  }

  return <File className={iconClass} />;
}
