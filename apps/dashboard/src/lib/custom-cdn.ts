import type { IProject } from '@uploadkitdev/db';
import type { CustomHostnameState } from '@uploadkitdev/cloudflare';
import {
  createCustomHostname,
  deleteCustomHostname,
  getCloudflareConfig,
  getCustomHostname,
} from '@uploadkitdev/cloudflare';

export async function applyCustomHostnameToProject(
  project: IProject,
  hostname: string,
): Promise<CustomHostnameState> {
  const config = getCloudflareConfig();
  if (!config) {
    throw new Error('Cloudflare CDN is not configured on the server');
  }

  const oldId = project.customCdnHostnameId;
  const sameHostname = project.customCdnDomain?.toLowerCase() === hostname.toLowerCase();

  // Re-registering the SAME hostname (retry) cannot coexist with the old record: replace in place.
  if (oldId && sameHostname) {
    try {
      await deleteCustomHostname(config, oldId);
    } catch {
      // stale hostname — continue with fresh registration
    }
    return createCustomHostname(config, hostname);
  }

  // Different hostname: create the new one FIRST so a failure leaves the old one (and the DB
  // reference to it) intact, then retire the old one best-effort.
  const created = await createCustomHostname(config, hostname);
  if (oldId) {
    try {
      await deleteCustomHostname(config, oldId);
    } catch {
      // old hostname already gone or undeletable; the new one is registered
    }
  }
  return created;
}

export async function syncProjectCustomHostname(
  project: IProject,
): Promise<CustomHostnameState | null> {
  const config = getCloudflareConfig();
  if (!config || !project.customCdnHostnameId) return null;

  return getCustomHostname(config, project.customCdnHostnameId);
}

export async function removeProjectCustomHostname(project: IProject): Promise<void> {
  const config = getCloudflareConfig();
  if (!config || !project.customCdnHostnameId) return;

  try {
    await deleteCustomHostname(config, project.customCdnHostnameId);
  } catch {
    // already removed in Cloudflare
  }
}

export function persistCustomHostnameState(
  project: IProject,
  state: CustomHostnameState,
  domain?: string,
): void {
  project.customCdnDomain = domain ?? state.hostname;
  project.customCdnHostnameId = state.id;
  project.customCdnStatus = state.status;
  project.customCdnValidationRecords = state.validationRecords;
  if (state.error !== undefined) {
    project.customCdnLastError = state.error;
  } else {
    void project.set('customCdnLastError', undefined, { strict: false });
  }
  project.customCdnVerified = state.status === 'active';
  if (state.status === 'active') {
    project.customCdnVerifiedAt = new Date();
  } else {
    void project.set('customCdnVerifiedAt', undefined, { strict: false });
  }
}

export function clearCustomHostnameFields(project: IProject): void {
  void project.set('customCdnDomain', undefined, { strict: false });
  void project.set('customCdnHostnameId', undefined, { strict: false });
  project.customCdnStatus = 'none';
  project.customCdnValidationRecords = [];
  void project.set('customCdnLastError', undefined, { strict: false });
  project.customCdnVerified = false;
  void project.set('customCdnVerifiedAt', undefined, { strict: false });
}
