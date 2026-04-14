// Root flat config for ESLint 9+.
// Each package's `lint` script runs eslint in its own directory; ESLint walks
// up the directory tree to find this file, so a single root config is enough
// for every workspace package.
import sharedConfig from './packages/config/eslint/index.js';

export default sharedConfig;
