import { $ } from "npm:zx";

/**
 * Create a parentless commit with an empty tree to carry reward/statistic tags.
 *
 * Tags pointing at product commits become the nearest tag in `git describe`,
 * so downstream builds would report versions like `reward-1575-3-gabc1234`
 * instead of `v1.1.2-3-gabc1234`. Tags on a detached commit are never
 * reachable from any branch and keep the vX.Y.Z tags authoritative.
 */
export async function createDetachedCommit(message: string) {
  const emptyTree = (await $`git hash-object -w -t tree /dev/null`).stdout.trim();

  return (await $`git commit-tree ${emptyTree} -m ${message}`).stdout.trim();
}
