import { changeMonth, formatDate, makeDateRange } from "npm:web-utility";
import { $, YAML } from "npm:zx";

import { Reward } from "./type.ts";

$.verbose = true;

const rawTags =
  await $`git tag --list "reward-*" --format="%(refname:short) %(creatordate:short)"`;

const [startDate, endDate] = makeDateRange(
  formatDate(changeMonth(Date.now(), -1), "YYYY-MM"),
);
const rewardTags = rawTags.stdout
  .split("\n")
  .filter((line) => {
    const thisDate = new Date(line.split(/\s+/)[1]);

    return startDate <= thisDate && thisDate < endDate;
  })
  .map((line) => line.split(/\s+/)[0]);

let rawYAML = "";

for (const tag of rewardTags)
  rawYAML += (await $`git tag -l --format="%(contents)" ${tag}`) + "\n";

if (!rawYAML.trim()) {
  console.warn("No reward data is found for the last month.");

  process.exit(0);
}

const rewards = YAML.parse(rawYAML) as Reward[];

const groupedRewards = Object.groupBy(rewards, ({ payee }) => payee);

const summaryList = Object.entries(groupedRewards).map(([payee, rewards]) => {
  const reward = rewards!.reduce(
    (acc, { currency, reward }) => {
      acc[currency] ??= 0;
      acc[currency] += reward;
      return acc;
    },
    {} as Record<string, number>,
  );

  return {
    payee,
    reward,
    accounts: rewards!.map(({ payee: _, ...account }) => account),
  };
});

const summaryText = YAML.stringify(summaryList);

console.log(summaryText);

const tagName = `statistic-${new Date().toJSON().slice(0, 7)}`;

await $`git config user.name "github-actions[bot]"`;
await $`git config user.email "github-actions[bot]@users.noreply.github.com"`;

await $`git tag -a ${tagName} $(git rev-parse HEAD) -m ${summaryText}`;
await $`git push origin ${tagName} --no-verify`;

await $`git config unset user.name`;
await $`git config unset user.email`;

await $`gh release create ${tagName} --notes ${summaryText}`;
