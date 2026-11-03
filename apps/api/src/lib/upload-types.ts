/** Empty lists, exact MIME types, MIME families and the all-types wildcard. */
export function isTypeAllowed(allowedTypes: readonly string[], contentType: string): boolean {
  return allowedTypes.length === 0 || allowedTypes.some((type) =>
    type === '*/*' || (type.endsWith('/*')
      ? contentType.startsWith(type.slice(0, -1))
      : type === contentType));
}
