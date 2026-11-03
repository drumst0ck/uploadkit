import type { IByosConfig } from '@uploadkitdev/db';

/** API responses must never include storage credentials, including ciphertext. */
export function projectResponse<T extends { byosConfig?: IByosConfig }>(project: T) {
  if (!project.byosConfig) return project;
  const { accessKeyId: _accessKeyId, secretAccessKeyEncrypted: _secret, ...config } = project.byosConfig;
  return { ...project, byosConfig: config };
}
