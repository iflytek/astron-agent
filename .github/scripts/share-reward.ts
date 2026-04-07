import "npm:array-unique-proposal";

import { components } from "npm:@octokit/openapi-types";
import { $, argv, YAML } from "npm:zx";

import { Reward } from "./type.ts";

$.verbose = true;

const [
  repositoryOwner,
  repositoryName,
  issueNumber,
  payer, // GitHub username of the payer (provided by workflow, defaults to issue creator)
  currency,
  reward,
  source,
] = argv._;

interface PRMeta {
  author: components["schemas"]["simple-user"];
  assignees: components["schemas"]["simple-user"][];
}

const graphqlQuery = `
  query($owner: String!, $name: String!, $number: Int!) {
    repository(owner: $owner, name: $name) {
      issue(number: $number) {
        closedByPullRequestsReferences(first: 10) {
          nodes {
            url
            merged
            mergeCommit {
              oid
            }
          }
        }
      }
    }
  }
`;
const PR_DATA = await $`gh api graphql \
  -f query=${graphqlQuery} \
  -f owner=${repositoryOwner} \
  -f name=${repositoryName} \
  -F number=${issueNumber} \
  --jq '.data.repository.issue.closedByPullRequestsReferences.nodes[] | select(.merged == true) | {url: .url, mergeCommitSha: .mergeCommit.oid}' | head -n 1`;

const prData = PR_DATA.text().trim();

if (!prData)
  throw new ReferenceError("No merged PR is found for the given issue number.");

const { url: PR_URL, mergeCommitSha } = JSON.parse(prData);

if (!PR_URL || !mergeCommitSha)
  throw new Error("Missing required fields in PR data");

console.table({ PR_URL, mergeCommitSha });

const { author, assignees }: PRMeta = await (
  await $`gh pr view ${PR_URL} --json author,assignees`
).json();

function isBotUser(login: string) {
  const lowerLogin = login.toLowerCase();
  return (
    lowerLogin.includes("copilot") ||
    lowerLogin.includes("[bot]") ||
    lowerLogin === "github-actions[bot]" ||
    lowerLogin.endsWith("[bot]")
  );
}

// Filter out Bot users from the list
const allUsers = [
  author.login,
  ...assignees.map(({ login }) => login),
].uniqueBy();

const users = allUsers.filter((login) => !isBotUser(login));

console.log(`All users: ${allUsers.join(", ")}`);
console.log(`Filtered users (excluding bots): ${users.join(", ")}`);

if (!users[0])
  throw new ReferenceError(
    "No real users found (all users are bots). Skipping reward distribution.",
  );

const rewardNumber = parseFloat(reward);

if (isNaN(rewardNumber) || rewardNumber <= 0)
  throw new RangeError(
    `Reward amount is not a valid number, can not proceed with reward distribution. Received reward value: ${reward}`,
  );

const averageReward = (rewardNumber / users.length).toFixed(2);

const list: Reward[] = users.map((login) => ({
  issue: `#${issueNumber}`,
  payer: `@${payer}`,
  payee: `@${login}`,
  currency,
  reward: parseFloat(averageReward),
  source,
}));
const listText = YAML.stringify(list);

console.log(listText);

const tagName = `reward-${issueNumber}`;

await $`git config user.name "github-actions[bot]"`;
await $`git config user.email "github-actions[bot]@users.noreply.github.com"`;

await $`git tag -a ${tagName} ${mergeCommitSha} -m ${listText}`;
await $`git push origin ${tagName} --no-verify`;

await $`git config unset user.name`;
await $`git config unset user.email`;

const commentBody = `## Reward data

\`\`\`yml
${listText}
\`\`\`
`;
await $`gh issue comment ${issueNumber} --body ${commentBody}`;
