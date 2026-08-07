const getSevenDay = () => {
  const date = new Date();
  const arr: any = [];
  for (let i = 0; i < 7; i++) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate() - i;
    arr.push(`${year}-${month}-${day}`);
  }
  return arr.reverse();
};

//不同平台用户数
export const mutiUserOption = {
  tooltip: {
    trigger: 'axis',
  },
  legend: {
    left: 'center',
    bottom: '5%',
    icon: 'rect',
    itemWidth: 20, // 调整图标宽度
    itemHeight: 4, // 调整图标高度为细线效果
    data: [
      {
        name: '星火Desk',
        textStyle: {
          color: '#7F7F7F',
          fontWeight: 500,
          fontSize: 14,
        },
      },
      {
        name: '星火App',
        textStyle: {
          color: '#7F7F7F',
          fontWeight: 500,
          fontSize: 14,
        },
      },
      {
        name: '星辰广场',
        textStyle: {
          color: '#7F7F7F',
          fontWeight: 500,
          fontSize: 14,
        },
      },
      {
        name: 'H5',
        textStyle: {
          color: '#F57977',
          fontWeight: 500,
          fontSize: 14,
        },
      },
      {
        name: '小程序',
        textStyle: {
          color: '#77B4FF',
          fontWeight: 500,
          fontSize: 14,
        },
      },
    ],
  },
  grid: {
    left: '3%',
    right: '4%',
    bottom: '20%',
    containLabel: true,
  },
  xAxis: {
    boundaryGap: ['20%', '20%'],
    type: 'category',
    data: getSevenDay(),
    axisLine: {
      show: true, // 显示x轴线
      lineStyle: {
        color: '#BFBFBF',
        width: 1,
        type: 'solid', // 设置x轴线为实线
      },
    },
    axisTick: {
      show: true, // 显示刻度线
      alignWithLabel: true,
      lineStyle: {
        color: '#BFBFBF', // 刻度线颜色
        width: 1,
      },
    },
  },

  yAxis: {
    type: 'value',
    splitLine: {
      show: true,
      lineStyle: {
        type: 'dashed',
        color: '#e8e8e8',
      },
    },
  },

  series: [
    {
      name: '星火Desk',
      type: 'line',
      stack: '总量',
      showSymbol: false,
      lineStyle: {
        color: '#6356EA', // 设置线的颜色
        width: 2, // 可选：设置线宽
      },
      areaStyle: null,
      data: [0, 0, 0, 0, 0, 0, 0],
    },
    {
      name: '星火App',
      type: 'line',
      stack: '总量',
      showSymbol: false,
      lineStyle: {
        color: '#A074FF', // 设置线的颜色
        width: 2, // 可选：设置线宽
      },
      areaStyle: null,
      data: [0, 0, 0, 0, 0, 0, 0],
    },
    {
      name: '星辰广场',
      type: 'line',
      stack: '总量',
      showSymbol: false,
      lineStyle: {
        color: '#FDA775', // 设置线的颜色
        width: 2, // 可选：设置线宽
      },
      areaStyle: null,
      data: [0, 0, 0, 0, 0, 0, 0],
    },
    {
      name: 'H5',
      type: 'line',
      stack: '总量',
      showSymbol: false,
      lineStyle: {
        color: '#F57977', // 设置线的颜色
        width: 2, // 可选：设置线宽
      },
      areaStyle: null,
      data: [0, 0, 0, 0, 0, 0, 0],
    },
    {
      name: '小程序',
      type: 'line',
      stack: '总量',
      showSymbol: false,
      lineStyle: {
        color: '#77B4FF', // 设置线的颜色
        width: 2, // 可选：设置线宽
      },
      areaStyle: null,
      data: [0, 0, 0, 0, 0, 0, 0],
    },
  ],
};
//不同平台会话数
export const mutiSessionOption = {
  tooltip: {
    trigger: 'axis',
  },
  legend: {
    left: 'center',
    bottom: '5%',
    icon: 'rect',
    itemWidth: 20, // 调整图标宽度
    itemHeight: 4, // 调整图标高度为细线效果
    data: [
      {
        name: '星火Desk',
        textStyle: {
          color: '#7F7F7F',
          fontWeight: 500,
          fontSize: 14,
        },
      },
      {
        name: '星火App',
        textStyle: {
          color: '#7F7F7F',
          fontWeight: 500,
          fontSize: 14,
        },
      },
      {
        name: '星辰广场',
        textStyle: {
          color: '#7F7F7F',
          fontWeight: 500,
          fontSize: 14,
        },
      },
      {
        name: 'H5',
        textStyle: {
          color: '#F57977',
          fontWeight: 500,
          fontSize: 14,
        },
      },
      {
        name: '小程序',
        textStyle: {
          color: '#77B4FF',
          fontWeight: 500,
          fontSize: 14,
        },
      },
    ],
  },
  grid: {
    left: '3%',
    right: '4%',
    bottom: '20%',
    containLabel: true,
  },
  xAxis: {
    boundaryGap: ['20%', '20%'],
    type: 'category',
    data: getSevenDay(),
    axisLine: {
      show: true, // 显示x轴线
      lineStyle: {
        color: '#BFBFBF',
        width: 1,
        type: 'solid', // 设置x轴线为实线
      },
    },
    axisTick: {
      show: true, // 显示刻度线
      alignWithLabel: true,
      lineStyle: {
        color: '#BFBFBF', // 刻度线颜色
        width: 1,
      },
    },
  },

  yAxis: {
    type: 'value',
    splitLine: {
      show: true,
      lineStyle: {
        type: 'dashed',
        color: '#e8e8e8',
      },
    },
  },

  series: [
    {
      name: '星火Desk',
      type: 'line',
      stack: '总量',
      showSymbol: false,
      lineStyle: {
        color: '#6356EA', // 设置线的颜色
        width: 2, // 可选：设置线宽
      },
      areaStyle: null,
      data: [0, 0, 0, 0, 0, 0, 0],
    },
    {
      name: '星火App',
      type: 'line',
      stack: '总量',
      showSymbol: false,
      lineStyle: {
        color: '#A074FF', // 设置线的颜色
        width: 2, // 可选：设置线宽
      },
      areaStyle: null,
      data: [0, 0, 0, 0, 0, 0, 0],
    },
    {
      name: '星辰广场',
      type: 'line',
      stack: '总量',
      showSymbol: false,
      lineStyle: {
        color: '#FDA775', // 设置线的颜色
        width: 2, // 可选：设置线宽
      },
      areaStyle: null,
      data: [0, 0, 0, 0, 0, 0, 0],
    },
    {
      name: 'H5',
      type: 'line',
      stack: '总量',
      showSymbol: false,
      lineStyle: {
        color: '#F57977', // 设置线的颜色
        width: 2, // 可选：设置线宽
      },
      areaStyle: null,
      data: [0, 0, 0, 0, 0, 0, 0],
    },
    {
      name: '小程序',
      type: 'line',
      stack: '总量',
      showSymbol: false,
      lineStyle: {
        color: '#77B4FF', // 设置线的颜色
        width: 2, // 可选：设置线宽
      },
      areaStyle: null,
      data: [0, 0, 0, 0, 0, 0, 0],
    },
  ],
};
//单线会话数
export const sessionOption = {
  tooltip: {
    show: true,
  },
  grid: {
    top: 30,
    bottom: 30,
    left: 50,
    right: 40,
  },
  xAxis: {
    boundaryGap: ['20%', '20%'],
    data: getSevenDay(),
    type: 'category',
    axisLine: {
      show: true, // 显示x轴线
      lineStyle: {
        color: '#BFBFBF',
        width: 1,
        type: 'solid', // 设置x轴线为实线
      },
    },

    axisTick: {
      show: true, // 显示刻度线
      alignWithLabel: true,
      lineStyle: {
        color: '#BFBFBF', // 刻度线颜色
        width: 1,
      },
    },
  },
  yAxis: {
    type: 'value',
    splitLine: {
      show: true,
      lineStyle: {
        type: 'dashed',
        color: '#e8e8e8',
      },
    },
  },
  series: [
    {
      type: 'line',
      smooth: true,
      data: [0, 0, 0, 0, 0, 0, 0],
      lineStyle: {
        color: '#405DF9',
      },
      areaStyle: {
        color: '#405DF9',
        opacity: 0.25,
      },
      itemStyle: {
        color: '#405DF9',
      },
    },
  ],
};
//活跃用户数
export const userOption = {
  tooltip: {
    show: true,
  },
  grid: {
    top: 30,
    bottom: 30,
    left: 50,
    right: 40,
  },
  xAxis: {
    boundaryGap: ['20%', '20%'],
    data: getSevenDay(),
    type: 'category',
    axisLine: {
      show: true, // 显示x轴线
      lineStyle: {
        color: '#BFBFBF',
        width: 1,
        type: 'solid', // 设置x轴线为实线
      },
    },

    axisTick: {
      show: true, // 显示刻度线
      alignWithLabel: true,
      lineStyle: {
        color: '#BFBFBF', // 刻度线颜色
        width: 1,
      },
    },
  },
  yAxis: {
    type: 'value',
    splitLine: {
      show: true,
      lineStyle: {
        type: 'dashed',
        color: '#e8e8e8',
      },
    },
  },
  series: [
    {
      type: 'line',
      smooth: true,
      data: [0, 0, 0, 0, 0, 0, 0],
      lineStyle: {
        color: '#FF9A2E',
      },
      areaStyle: {
        color: '#FF9A2E',
        opacity: 0.25,
      },
      itemStyle: {
        color: '#FF9A2E',
      },
    },
  ],
};
//平均会话互动数
export const interactionOption = {
  tooltip: {
    show: true,
  },
  grid: {
    top: 30,
    bottom: 30,
    left: 50,
    right: 40,
  },
  xAxis: {
    boundaryGap: ['20%', '20%'],
    data: getSevenDay(),
    type: 'category',
    axisLine: {
      show: true, // 显示x轴线
      lineStyle: {
        color: '#BFBFBF',
        width: 1,
        type: 'solid', // 设置x轴线为实线
      },
    },

    axisTick: {
      show: true, // 显示刻度线
      alignWithLabel: true,
      lineStyle: {
        color: '#BFBFBF', // 刻度线颜色
        width: 1,
      },
    },
  },
  yAxis: {
    type: 'value',
    splitLine: {
      show: true,
      lineStyle: {
        type: 'dashed',
        color: '#e8e8e8',
      },
    },
  },
  series: [
    {
      type: 'line',
      smooth: true,
      data: [0, 0, 0, 0, 0, 0, 0],
      lineStyle: {
        color: '#405DF9',
      },
      areaStyle: {
        color: '#405DF9',
        opacity: 0.25,
      },
      itemStyle: {
        color: '#405DF9',
      },
    },
  ],
};
//Token消耗量
export const TokenOption = {
  tooltip: {
    show: true,
  },
  grid: {
    top: 30,
    bottom: 30,
    left: 50,
    right: 40,
  },
  xAxis: {
    boundaryGap: ['20%', '20%'],
    data: getSevenDay(),
    type: 'category',
    axisLine: {
      show: true, // 显示x轴线
      lineStyle: {
        color: '#BFBFBF',
        width: 1,
        type: 'solid', // 设置x轴线为实线
      },
    },

    axisTick: {
      show: true, // 显示刻度线
      alignWithLabel: true,
      lineStyle: {
        color: '#BFBFBF', // 刻度线颜色
        width: 1,
      },
    },
  },
  yAxis: {
    type: 'value',
    splitLine: {
      show: true,
      lineStyle: {
        type: 'dashed',
        color: '#e8e8e8',
      },
    },
  },
  series: [
    {
      type: 'line',
      smooth: true,
      data: [0, 0, 0, 0, 0, 0, 0],
      lineStyle: {
        color: '#405DF9',
      },
      areaStyle: {
        color: '#405DF9',
        opacity: 0.25,
      },
      itemStyle: {
        color: '#405DF9',
      },
    },
  ],
};

//数据处理
export const processChannelData = (data: any) => {
  // 1. 提取唯一日期
  const uniqueDates = Array.from(
    new Set(data.map((item: any) => item.date))
  ).sort();

  // 2. 初始化各渠道数据对象
  const channelData = {
    desk: new Array(uniqueDates.length).fill(0), // 星火Desk (channel=1)
    h5: new Array(uniqueDates.length).fill(0), // H5 (channel=2)
    mini: new Array(uniqueDates.length).fill(0), // 小程序 (channel=3)
    app: new Array(uniqueDates.length).fill(0), // 星火App (channel=4,5,6)
    plaza: new Array(uniqueDates.length).fill(0), // 星辰广场 (channel=11)
  };

  // 3. 填充数据
  data.forEach((item: { date: string; channel: number; count: number }) => {
    const dateIndex = uniqueDates.indexOf(item.date);
    if (dateIndex === -1) return;

    switch (item.channel) {
      case 1:
        channelData.desk[dateIndex] += item.count;
        break;
      case 2:
        channelData.h5[dateIndex] += item.count;
        break;
      case 3:
        channelData.mini[dateIndex] += item.count;
        break;
      case 11:
        channelData.plaza[dateIndex] += item.count;
        break;
      case 4:
      case 5:
      case 6:
        channelData.app[dateIndex] += item.count;
        break;
    }
  });

  // 4. 返回处理好的数据
  return {
    dates: uniqueDates,
    channelData,
  };
};
