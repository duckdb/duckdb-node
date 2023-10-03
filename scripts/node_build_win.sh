#!/usr/bin/env bash

set -e

node --version
npm --version
which node

make clean

npm install --build-from-source
npm test
npx node-pre-gyp package testpackage testbinary

# TODO
# if [[ "$GITHUB_REF" =~ ^(refs/heads/main|refs/tags/v.+)$ ]] ; then
#   npx node-pre-gyp publish
#   npx node-pre-gyp info
# fi