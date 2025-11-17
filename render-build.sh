#!/usr/bin/env bash

# exit on error
set -o errexit

# 1) Install dependencies
npm install

# 2) (Optional) build step if you ever need it
# npm run build

# 3) Ensure the Puppeteer cache directory exists
PUPPETEER_CACHE_DIR=/opt/render/.cache/puppeteer
mkdir -p $PUPPETEER_CACHE_DIR

# 4) Install Puppeteer browser (Chrome) into cache
npx puppeteer browsers install chrome

# 5) Sync Puppeteer cache between build env and runtime env
if [[ ! -d $PUPPETEER_CACHE_DIR ]]; then
  echo "...Copying Puppeteer Cache from Build Cache"
  # Copy from project cache to Render cache
  cp -R /opt/render/project/src/.cache/puppeteer/chrome/ $PUPPETEER_CACHE_DIR
else
  echo "...Storing Puppeteer Cache in Build Cache"
  # Copy from Render cache back into project for next build
  cp -R $PUPPETEER_CACHE_DIR /opt/render/project/src/.cache/puppeteer/chrome/
fi
