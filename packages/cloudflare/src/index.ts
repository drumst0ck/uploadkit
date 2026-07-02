export {
  createCustomHostname,
  deleteCustomHostname,
  getCloudflareConfig,
  getCustomHostname,
  isCloudflareCdnConfigured,
  mapCustomHostnameState,
} from './custom-hostnames';
export type {
  CdnValidationRecord,
  CloudflareApiError,
  CloudflareConfig,
  CustomCdnStatus,
  CustomHostnameState,
} from './custom-hostnames';
