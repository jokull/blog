#!/usr/bin/env bash
#
# Repoint the blog at a locally-built result-rpc.
#
# This exists to smoke-test an unreleased result-rpc against a real consumer
# before the version is tagged and published. It builds the sibling checkout,
# packs the tarball npm would publish, and installs *that* — not a symlink.
# The tarball is the point: it exercises the `files` allowlist, the `exports`
# map and the shipped `.d.ts`, which a `file:` symlink to a source tree does
# not. A packaging mistake that only a published artifact would show up in is
# exactly the class of bug this catches.
#
#   scripts/link-result-rpc.sh                        # current branch of the checkout
#   scripts/link-result-rpc.sh feat/better-result-0.3 # check out a branch first
#
# To go back to the published package: bun add result-rpc@<version>
set -euo pipefail

RESULT_RPC_DIR="${RESULT_RPC_DIR:-$HOME/Code/result-rpc}"
BRANCH="${1:-}"

if [ ! -d "$RESULT_RPC_DIR" ]; then
	echo "No checkout at $RESULT_RPC_DIR." >&2
	echo "  git clone https://github.com/jokull/result-rpc.git $RESULT_RPC_DIR" >&2
	exit 1
fi

cd "$RESULT_RPC_DIR"

if [ -n "$BRANCH" ]; then
	git fetch --quiet origin "$BRANCH"
	git checkout --quiet "$BRANCH"
	git pull --quiet --ff-only origin "$BRANCH"
fi

echo "result-rpc: $(git branch --show-current) @ $(git rev-parse --short HEAD)"

pnpm install --frozen-lockfile
# `build` runs attw + publint, so a broken exports map fails here rather than
# surfacing as a confusing resolution error in the consumer.
pnpm build

VERSION=$(node -p 'require("./package.json").version')

# Pack somewhere else on purpose: the checkout tracks a result-rpc-*.tgz of its
# own, and packing in place would dirty a committed file in someone's PR branch.
OUT="${TMPDIR:-/tmp}/result-rpc-smoke"
mkdir -p "$OUT"
npm pack --silent --pack-destination "$OUT" >/dev/null

# Stamp the filename with the tarball's own hash. bun keys its cache on path +
# version, so rebuilding to a stable filename installs the *previous* contents
# and the migration appears to fail against changes that are actually present.
# Deleting node_modules/result-rpc does not help; only a new path does.
HASH=$(shasum -a 256 "$OUT/result-rpc-$VERSION.tgz" | cut -c1-8)
TARBALL="$OUT/result-rpc-$VERSION-$HASH.tgz"
mv "$OUT/result-rpc-$VERSION.tgz" "$TARBALL"

cd - >/dev/null
# `bun add <tarball>` while `package.json` already names `result-rpc` fails with
# a DependencyLoop, so write the spec and let a plain install resolve it.
node -e '
	const fs = require("fs");
	const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
	pkg.dependencies["result-rpc"] = "file:" + process.argv[1];
	fs.writeFileSync("package.json", JSON.stringify(pkg, null, "\t") + "\n");
' "$TARBALL"
rm -rf node_modules/result-rpc
bun install

echo
echo "Installed result-rpc $VERSION from $TARBALL"
echo "Re-run after every push to the PR. better-result is a REQUIRED peer since"
echo "0.3 — keep it in dependencies or resolution fails."
