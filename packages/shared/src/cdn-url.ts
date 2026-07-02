export interface ProjectCdnConfig {
  customCdnDomain?: string;
  customCdnVerified?: boolean;
}

/** Base CDN URL for a project — custom domain when verified, else platform default. */
export function resolveProjectCdnBaseUrl(
  project: ProjectCdnConfig,
  defaultCdnUrl: string,
): string {
  const fallback = defaultCdnUrl.replace(/\/$/, '');
  const domain = project.customCdnDomain?.trim().replace(/^https?:\/\//, '').replace(/\/$/, '');
  if (domain && project.customCdnVerified) {
    return `https://${domain}`;
  }
  return fallback;
}

export function buildFileCdnUrl(
  project: ProjectCdnConfig,
  defaultCdnUrl: string,
  key: string,
): string {
  const normalizedKey = key.replace(/^\//, '');
  return `${resolveProjectCdnBaseUrl(project, defaultCdnUrl)}/${normalizedKey}`;
}
