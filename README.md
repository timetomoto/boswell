# bozzies.org — WordPress

The Boswell Sisters tribute archive, built as a self-contained WordPress block theme.

## What this repo is

- A single WordPress block theme (`theme/bozzies/`) targeting the current stable WordPress release.
- A local development environment powered by [`@wordpress/env`](https://developer.wordpress.org/block-editor/reference-guides/packages/packages-env/) (Docker under the hood).
- No page builder, no parent theme, minimal plugins. The theme is designed to ship as one zip.

## Requirements

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) running
- Node.js (current LTS) and npm
- git

## Start the local site

```sh
npm install
npm start
```

`wp-env` will pull the pinned WordPress core, spin up a container, and print the local URL (typically `http://localhost:8888`, admin at `http://localhost:8888/wp-admin`, default login `admin` / `password`).

## Common commands

```sh
npm start                     # start the local site
npm stop                      # stop the containers
npm run destroy               # tear down containers and volumes
npm run wp -- theme list      # run any WP-CLI command
```

## Layout

```
theme/bozzies/    the block theme
.wp-env.json      pinned WordPress version and theme mount
```
