// auth.ts lives at the dashboard root (apps/dashboard/auth.ts).
// The @/ alias maps to ./src/, so we use a relative path here.
import { handlers } from '../../../../../auth';

export const { GET, POST } = handlers;
