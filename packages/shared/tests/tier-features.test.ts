import { describe, it, expect } from 'vitest';
import {
  TIER_FEATURES,
  formatImageTransformLimit,
  formatTeamMemberLimit,
  tierHasFeature,
} from '../src/tier-features';
import { TIER_LIMITS } from '../src/constants';

describe('TIER_FEATURES', () => {
  it('aligns Pro storage with TIER_LIMITS', () => {
    expect(TIER_LIMITS.PRO.maxStorageBytes).toBe(100 * 1024 * 1024 * 1024);
  });

  it('gates team collaboration to Team+', () => {
    expect(tierHasFeature('FREE', 'teamCollaboration')).toBe(false);
    expect(tierHasFeature('PRO', 'teamCollaboration')).toBe(false);
    expect(tierHasFeature('TEAM', 'teamCollaboration')).toBe(true);
  });

  it('gates webhooks to Pro+', () => {
    expect(TIER_FEATURES.FREE.webhooks).toBe(false);
    expect(TIER_FEATURES.PRO.webhooks).toBe(true);
  });

  it('formats image transform limits', () => {
    expect(formatImageTransformLimit('FREE')).toBe('x');
    expect(formatImageTransformLimit('PRO')).toBe('5,000');
  });

  it('formats team member limits', () => {
    expect(formatTeamMemberLimit('TEAM')).toBe('5');
    expect(formatTeamMemberLimit('ENTERPRISE')).toBe('Custom');
  });
});
