export const PART_SIZE = 5 * 1024 * 1024; // 5 MiB
export const MIN_MULTIPART_SIZE = 10 * 1024 * 1024; // 10 MiB
/** S3/R2 hard limit on the number of parts of one upload. */
export const MAX_PARTS = 10_000;

export function expectedPartCount(fileSize: number): number {
  return Math.ceil(fileSize / PART_SIZE);
}

/** Exact byte length of part `partNumber` (1-based): full parts, then the remainder. */
export function partLength(fileSize: number, partNumber: number): number {
  return Math.min(PART_SIZE, fileSize - (partNumber - 1) * PART_SIZE);
}
