// Static server identity shared by stdio bin and remote HTTP endpoint.
// Version is sourced from the consumer-facing npm package (@uploadkitdev/mcp)
// via its pinned version constant so both transports always report the same
// version string without risking cross-workspace JSON import drops in
// Next.js standalone tracing.

export const SERVER_INFO = {
  name: 'uploadkit',
  version: '0.4.0',
} as const;

export const SERVER_CAPABILITIES = {
  capabilities: { tools: {}, resources: {} },
} as const;
