#!/usr/bin/env bash

set -ex

git config --global user.email "quack@duckdb.org"
git config --global user.name "DuckDB Admin"


export TAG=''
# for main do prereleases
if [[ "$GITHUB_REF" =~ ^refs/tags/v.+$ ]] ; then
	# proper release
	npm version --no-git-tag-version `echo $GITHUB_REF | sed 's|refs/tags/v||'`
else
	git describe --tags --long || exit

	export VER=`git describe --tags --abbrev=0 | tr -d "v"`
	export DIST=`git describe --tags --long | cut -f2 -d-`

	# set version to lastver
	npm version --no-git-tag-version $VER
	npm version --no-git-tag-version prerelease --preid="dev"$DIST
	export TAG='--tag next'
fi

npm pack --dry-run

# upload to npm, maybe
if [[ "$GITHUB_REF" =~ ^(refs/heads/main|refs/tags/v.+)$ && "$1" = "upload" ]] ; then
	npm version
	npm config set //registry.npmjs.org/:_authToken $NODE_AUTH_TOKEN
	npm publish --access public $TAG
fi
