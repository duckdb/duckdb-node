#!/usr/bin/env bash

set -ex

TARGET_ARCH=${TARGET_ARCH:=x64}
echo targeting arch: $TARGET_ARCH

set +x
source scripts/install_node.sh $1
set -x
make clean

if [ "$(expr substr $(uname -s) 1 5)" == "Linux" ] && [[ "$TARGET_ARCH" == "arm64" ]] ; then
  sudo apt-get install gcc-aarch64-linux-gnu g++-aarch64-linux-gnu --yes
  export CC=aarch64-linux-gnu-gcc
  export CXX=aarch64-linux-gnu-g++
fi

npm install --build-from-source --target_arch="$TARGET_ARCH"

./node_modules/.bin/node-pre-gyp reveal --target_arch="$TARGET_ARCH"

if [[ "$TARGET_ARCH" != "arm64" ]] ; then
  if [[ ! "$GITHUB_REF" =~ ^(refs/tags/v.+)$ ]] ; then
    npm test
  fi
else
  ARCH=$(file lib/binding/duckdb.node | tr '[:upper:]' '[:lower:]')
  if [[ "$ARCH" != *"arm"* ]] ; then
    echo "no arch $ARCH"
    exit 1
  fi
fi

export PATH=$(npm bin):$PATH
./node_modules/.bin/node-pre-gyp package testpackage testbinary --target_arch="$TARGET_ARCH"

LOCAL_BINARY=$(./node_modules/.bin/node-pre-gyp reveal staged_tarball --silent --target_arch="$TARGET_ARCH")
REMOTE_BINARY=$(./node_modules/.bin/node-pre-gyp reveal hosted_tarball --silent --target_arch="$TARGET_ARCH")
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
