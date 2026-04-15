import { type RouteConfig, index, route } from '@react-router/dev/routes';

export default [
  index('./routes/_index.tsx'),
  route('api/sign', './routes/api.sign.ts'),
] satisfies RouteConfig;
