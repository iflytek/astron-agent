import { BotMarketItem } from '@/types/agent-create';

export const getRandom3 = (
  arr: (BotMarketItem | undefined)[]
): BotMarketItem[] => {
  // 过滤掉 undefined 值
  const validItems = arr.filter(
    (item): item is BotMarketItem => item !== undefined
  );

  // 如果数组长度不足3，直接返回过滤后的数组
  if (validItems.length <= 3) {
    return validItems.slice().sort(() => Math.random() - 0.5);
  }

  // 创建副本避免修改原数组
  const copy = [...validItems];

  // Fisher-Yates 洗牌算法的前3步
  for (let i = 0; i < 3; i++) {
    const randomIndex = Math.floor(Math.random() * (copy.length - i)) + i;

    // 使用非空断言操作符明确告诉TypeScript这些值不会是undefined
    const temp = copy[i] as BotMarketItem;
    const randomItem = copy[randomIndex] as BotMarketItem;

    copy[i] = randomItem;
    copy[randomIndex] = temp;
  }

  // 返回前3个元素
  return copy.slice(0, 3);
};
