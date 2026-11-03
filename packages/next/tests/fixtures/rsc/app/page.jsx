import { createUploadKitHandler, parseFileSize } from '../../../../dist/index.mjs';
import Upload from './upload';

export default function Page() {
  const handler = createUploadKitHandler({ router: { media: {} }, apiKey: 'fixture-only' });
  if (typeof handler.POST !== 'function') throw new Error('Missing server handler');
  return <main><p>Server route limit: {parseFileSize('4MB')}</p><Upload /></main>;
}
