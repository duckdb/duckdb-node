#!/usr/bin/env bash

set -e

node --version
npm --version
which node

make clean

npm install --build-from-source
# no tests on releases
if [[ ! "$GITHUB_REF" =~ ^(refs/tags/v.+)$ ]] ; then
  npm test
fi
npx node-pre-gyp package testpackage testbinary

if [[ "$GITHUB_REF" =~ ^(refs/heads/main|refs/tags/v.+)$ ]] ; then
  npx node-pre-gyp publish
  npx node-pre-gyp info
fi