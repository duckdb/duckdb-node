#!/usr/bin/env bash

set -e

node --version
npm --version
which node

make clean

if [ -n "$ELECTRON_VERSION" ] ; then
    # Electron's version.
    export npm_config_target="$ELECTRON_VERSION"
    if [ -n "$TARGET_ARCH" ] ; then
        # The architecture of your machine
        export npm_config_arch="$TARGET_ARCH"
        export npm_config_target_arch="$TARGET_ARCH"
    fi
    # Download headers for Electron.
    export npm_config_disturl=https://electronjs.org/headers
    # Tell node-pre-gyp that we are building for Electron.
    export npm_config_runtime=electron
fi

npm install --build-from-source
# no tests on releases
if [[ ! "$GITHUB_REF" =~ ^(refs/tags/v.+)$ ]] ; then
  npm test
fi
npx node-pre-gyp package testpackage testbinary

LOCAL_BINARY=$(./node_modules/.bin/node-pre-gyp reveal staged_tarball --silent)
REMOTE_BINARY=$(./node_modules/.bin/node-pre-gyp reveal hosted_tarball --silent)
S3_ENDPOINT_BINARY="s3://duckdb-npm/"${REMOTE_BINARY:23}

pip install awscli

echo "local binary at  $LOCAL_BINARY"
echo "remote binary at $REMOTE_BINARY"
echo "served from      $S3_ENDPOINT_BINARY"

if [[ "$GITHUB_REF" =~ ^(refs/heads/main|refs/tags/v.+)$ ]] ; then
  aws s3 cp $LOCAL_BINARY $S3_ENDPOINT_BINARY --acl public-read
else
  aws s3 cp $LOCAL_BINARY $S3_ENDPOINT_BINARY --acl public-read --dryrun
fi
