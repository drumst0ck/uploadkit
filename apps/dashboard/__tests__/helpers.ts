import { vi } from 'vitest';

/** Minimal in-memory TeamMember model; every method yields so concurrent calls interleave. */
export function makeTeamMemberModel() {
  const docs: Record<string, any>[] = [];
  let seq = 0;
  const tick = () => new Promise((r) => setTimeout(r, 0));
  const matches = (d: Record<string, any>, q: Record<string, any>) =>
    Object.entries(q).every(([k, v]) => {
      if (v && typeof v === 'object' && '$gt' in v) return d[k] != null && d[k] > v.$gt;
      return String(d[k]) === String(v);
    });
  const model = {
    docs,
    find: vi.fn((q: any) => ({
      sort: () => ({
        select: () => ({ lean: async () => docs.filter((d) => matches(d, q)).map(({ inviteTokenHash: _h, ...r }) => r) }),
        lean: async () => docs.filter((d) => matches(d, q)),
      }),
    })),
    countDocuments: vi.fn(async (q: any) => {
      await tick();
      return docs.filter((d) => matches(d, q)).length;
    }),
    findOne: vi.fn(async (q: any) => {
      await tick();
      return docs.find((d) => matches(d, q)) ?? null;
    }),
    create: vi.fn(async (data: any) => {
      await tick();
      const doc = { _id: `m${++seq}`, invitedAt: new Date(), ...data };
      docs.push(doc);
      return doc;
    }),
    deleteOne: vi.fn(async (q: any) => {
      await tick();
      const i = docs.findIndex((d) => matches(d, q));
      if (i >= 0) docs.splice(i, 1);
      return { deletedCount: i >= 0 ? 1 : 0 };
    }),
    findOneAndUpdate: vi.fn(async (q: any, u: any) => {
      await tick();
      const d = docs.find((x) => matches(x, q));
      if (!d) return null;
      Object.assign(d, u.$set ?? {});
      for (const k of Object.keys(u.$unset ?? {})) delete d[k];
      return d;
    }),
  };
  return model;
}
