#!/usr/bin/env bash
set -euo pipefail

if [[ "$#" -ne 2 ]]; then
  echo "usage: publish_oci_aliases.sh <image> <immutable-release-tag>" >&2
  exit 2
fi

image="$1"
release_tag="$2"
if [[ ! "$release_tag" =~ ^v([0-9]+)\.([0-9]+)\.[0-9]+-web\.(0|[1-9][0-9]*)$ ]]; then
  echo "invalid immutable release tag: $release_tag" >&2
  exit 2
fi

minor="${BASH_REMATCH[1]}.${BASH_REMATCH[2]}"
source="$image:$release_tag"

# Require the verified immutable tag to be a two-platform index before copying it.
source_manifest="$(docker buildx imagetools inspect "$source" --format '{{json .Manifest}}')"
source_digest="$(
  jq -er '
    .digest as $digest
    | select(
        ($digest | type == "string" and test("^sha256:[0-9a-f]{64}$"))
        and ([.manifests[]? | select(.platform.os == "linux" and .platform.architecture == "amd64")] | length) == 1
        and ([.manifests[]? | select(.platform.os == "linux" and .platform.architecture == "arm64")] | length) == 1
      )
    | $digest
  ' <<<"$source_manifest"
)"

# One index, two moving aliases; no image rebuild and no change to the release tag.
docker buildx imagetools create \
  --tag "$image:$minor" \
  --tag "$image:latest" \
  "$image@$source_digest"

for alias in "$minor" latest; do
  ref="$image:$alias"
  alias_digest="$(
    docker buildx imagetools inspect "$ref" --format '{{json .Manifest}}' |
      jq -er '.digest | select(type == "string" and test("^sha256:[0-9a-f]{64}$"))'
  )"
  if [[ "$alias_digest" != "$source_digest" ]]; then
    echo "OCI alias digest mismatch: $ref ($alias_digest != $source_digest)" >&2
    exit 1
  fi
done

echo "OCI aliases updated: $image:$minor and $image:latest -> $source_digest"
