#!/usr/bin/env bash
# Publish the committed Codex source tree to the existing Pages site's codex/ directory.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
source_branch=codex/4d-space-edition
base=1ab6188bc451cc8585cb9799e32c87a95e152d15
[[ $(git branch --show-current) == "$source_branch" ]]
git merge-base --is-ancestor "$base" HEAD
[[ -z $(git status --porcelain -- apps/fps-demo/dist scripts/build-codex.mjs) ]]
source_commit=$(git rev-parse HEAD)
npm run build:codex
git fetch --no-tags origin refs/heads/gh-pages:refs/remotes/origin/gh-pages
pages_base=$(git rev-parse refs/remotes/origin/gh-pages)
stage_dir=$(mktemp -d)
deploy_dir=$stage_dir/pages
git worktree add --detach "$deploy_dir" "$pages_base"
cleanup() { git worktree remove --force "$deploy_dir" && rmdir "$stage_dir"; }
trap cleanup EXIT
rm -rf -- "$deploy_dir/codex"
mkdir "$deploy_dir/codex"
cp -a _site_codex/. "$deploy_dir/codex/"
git -C "$deploy_dir" add -A -- codex/
git -C "$deploy_dir" diff --cached --exit-code -- . ':(exclude)codex' > /dev/null
if ! git -C "$deploy_dir" diff --cached --quiet; then
  git -C "$deploy_dir" commit -m "deploy(codex): publish independent Codex Edition under /codex/" -m "Source: $source_commit"
  git -C "$deploy_dir" diff --exit-code "$pages_base" HEAD -- . ':(exclude)codex' > /dev/null
  # A concurrent gh-pages push causes a normal fast-forward rejection. Rerun on the new tip.
  git -C "$deploy_dir" push origin HEAD:refs/heads/gh-pages
fi
pages_commit=$(git -C "$deploy_dir" rev-parse HEAD)
artifact_tree=$(git -C "$deploy_dir" rev-parse HEAD:codex)
archive_ref=refs/heads/gh-pages-codex
archive_parent=()
existing=$(git ls-remote origin "$archive_ref")
if [[ -n $existing ]]; then
  git fetch --no-tags origin "$archive_ref"
  archive_parent=(-p "$(git rev-parse FETCH_HEAD)")
fi
if [[ -z $existing || $(git rev-parse "${existing%%$'\t'*}^{tree}") != "$artifact_tree" ]]; then
  archive_commit=$(git commit-tree "$artifact_tree" "${archive_parent[@]}" -m "Archive Codex Edition from $source_commit")
  git push origin "$archive_commit:$archive_ref"
fi
printf 'Source %s\nPages  %s\nTree   %s\n' "$source_commit" "$pages_commit" "$artifact_tree"
