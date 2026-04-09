# Changesets

Hello and welcome! This folder has been created automatically as part of Changesets.

We have a quick list of things for you, the maintainer:

1. You'll need to add a `NPM_TOKEN` to your GitHub Secrets. Learn more about this step [here](https://github.com/changesets/action#with-publishing).

2. You should run `pnpm changeset` when you want to release a new version of an SDK package (`@uploadkitdev/core`, `@uploadkitdev/react`, `@uploadkitdev/next`).

3. If you need to release a one-off changeset without going through CI, you can run `pnpm changeset publish` locally.

**Note:** Private packages (apps and internal packages) are listed in the `ignore` array in `config.json` and will never be published to npm.
