const NODE_ENV = import.meta.env.MODE;
const envUrl =
  NODE_ENV === 'production'
    ? ''
    : NODE_ENV === 'development' || NODE_ENV === 'test'
      ? 'test.'
      : 'pre.';

export const COMBOCONFIG = [
  {
    key: 'combo1',
    themeColor: null,
    titleName: '个人免费版',
    desc: '个人用户，尝鲜使用',
    monthPrice: '0',
    range: null,
    jumpBtnName: '免费',
    // NOTE: 根据环境来判断
    jumpBtnUrl: null,
    ComboIntrolist: [
      '模型并发QPS：2',
      '每个模型500万Tokens',
      '知识库空间：1GB',
      '空间数量1，人数上限50',
      // "500次工作流API调用量",
      // "2次工作流QPS并发量",
      '保留近5天对话记录日志',
      '10次人工测评',
      '10次智能测评',
    ],
  },
  {
    key: 'combo2',
    themeColor: '#278BFF',
    titleName: '个人专业版',
    desc: '个人用户，权益升级',
    monthPrice: '9.9',
    range: '/月',
    jumpBtnName: '升级套餐',
    // NOTE: 不同套餐的 packageId 不同
    jumpBtnUrl: `http://${envUrl}console.xfyun.cn/sale/buy?wareId=9178&packageId=9178001&serviceName=%E6%98%9F%E8%BE%B0Agent%E5%A5%97%E9%A4%90`,
    ComboIntrolist: [
      '模型并发QPS：4',
      '每个模型2000万Tokens',
      '知识库空间：10GB',
      '空间数量10，人数上限100',
      // "1500次工作流API调用量",
      // "4次工作流QPS并发量",
      '保留近15天对话记录日志',
      '30次人工测评',
      '10次智能测评',
    ],
  },
  {
    key: 'combo3',
    // themeColor: "#EDC674",
    themeColor: '#D89509',
    titleName: '团队版（公有云）',
    desc: '中小型企业，团队提效',
    monthPrice: '128',
    range: '/月',
    jumpBtnName: '升级套餐',
    jumpBtnUrl: `http://${envUrl}console.xfyun.cn/sale/buy?wareId=9178&packageId=9178002&serviceName=%E6%98%9F%E8%BE%B0Agent%E5%A5%97%E9%A4%90`,
    ComboIntrolist: [
      '模型并发QPS：10',
      '每个模型1亿Tokens',
      '知识库空间：100GB',
      '无限空间数，人数上限100',
      // "3000次工作流API调用量",
      // "8次工作流QPS并发量",
      '保留近3个月对话记录日志',
      '无限次免费人工测评',
      '无限次智能测评',
      '企业认证标识',
      '定制化开发',
      '人工客服，工作日10点-19点',
    ],
  },
  {
    key: 'combo4',
    themeColor: '#303030',
    titleName: '企业版（专有云）',
    desc: '中大型企业，资源独享',
    monthPrice: '3999',
    range: '/月',
    jumpBtnName: '升级套餐',
    jumpBtnUrl: `http://${envUrl}console.xfyun.cn/sale/buy?wareId=9178&packageId=9178003&serviceName=%E6%98%9F%E8%BE%B0Agent%E5%A5%97%E9%A4%90`,
    ComboIntrolist: [
      '模型并发QPS：50',
      '模型资源不限',
      '支持接入企业自有模型',
      '知识库空间：2T',
      '无限空间数，人数上限500',
      // "5000次工作流API调用量",
      // "无限次工作流QPS并发量",
      '保留近12个月对话记录日志',
      '无限次免费人工测评',
      '无限次智能测评',
      '企业认证标识',
      '定制化开发',
      '人工客服，7*24小时全天候',
    ],
  },
  {
    key: 'combo5',
    themeColor: '#925EFF',
    titleName: '商业化定制（专有云）',
    desc: '中大型企业，效果定制',
    monthPrice: '自定义',
    range: '（联系我们）',
    jumpBtnName: '立即咨询',
    jumpBtnUrl: ``,
    hasQrcode: true,
    ComboIntrolist: [
      '更高额度的模型资源和并发QPS',
      '支持接入企业自有模型',
      '私有知识库调用无上限',
      '无限制对话记录日志',
      '无限次免费人工测评',
      '无限次智能测评',
      '企业专属品牌标识',
      '企业级定制扩展方案',
      '定制企业智能体广场',
      '登录系统对接，企业組织架构绑定',
      '自定义企业BI看板，提供原始数据',
      '企业级数据隔离，安全保障',
      '1v1专属技术支特，7x24H快速响应',
    ],
  },
];

/* NOTE: title为表格标题, resource为表格每一列数据, name为每一列的标题, nameDesc为每一列的描述
    Items中(为null则显示'-', itemTitle为每一行的内容为空则必须写为‘’, icon为是否有图标, 有则显示对号, 无则必须为false)
 */
export const MODELRESOURCE = [
  {
    title: '模型与资源',
    resource: [
      {
        name: '模型定制',
        nameDesc: null,
        Items: [
          null,
          null,
          {
            itemTitle: '',
            icon: true,
          },
          {
            itemTitle: '',
            icon: true,
          },
        ],
      },
      {
        name: '并发QPS',
        nameDesc: null,
        Items: [
          {
            itemTitle: '2',
            icon: false,
          },
          {
            itemTitle: '4',
            icon: false,
          },
          {
            itemTitle: '10',
            icon: false,
          },
          {
            itemTitle: '50',
            icon: false,
          },
        ],
      },
      {
        name: '模型赠送资源',
        nameDesc: '发布成API以后的模型资源限制',
        Items: [
          {
            itemTitle: '任意单个模型500万\nTokens',
            icon: false,
          },
          {
            itemTitle: '任意单个模型2000万\nTokens',
            icon: false,
          },
          {
            itemTitle: '1亿',
            icon: false,
          },
          {
            itemTitle: '不限',
            icon: false,
          },
        ],
      },
      {
        name: '新模型尝鲜',
        nameDesc: null,
        Items: [
          {
            itemTitle: '',
            icon: true,
          },
          {
            itemTitle: '',
            icon: true,
          },
          {
            itemTitle: '',
            icon: true,
          },
          {
            itemTitle: '',
            icon: true,
          },
        ],
      },
      {
        name: '接入企业自有模型',
        nameDesc: null,
        Items: [
          {
            itemTitle: null,
            icon: false,
          },
          {
            itemTitle: null,
            icon: false,
          },
          {
            itemTitle: null,
            icon: false,
          },
          {
            itemTitle: '',
            icon: true,
          },
        ],
      },
    ],
  },
  {
    title: '智能体开发',
    resource: [
      {
        name: '应用数',
        nameDesc: '同时拥有正式发\n布的Agent和工\n作流数量',
        Items: [
          {
            itemTitle: '50个',
            icon: false,
          },
          {
            itemTitle: '专属定制',
            icon: false,
          },
          {
            itemTitle: '不限',
            icon: false,
          },
          {
            itemTitle: '不限',
            icon: false,
          },
        ],
      },
      {
        name: '知识库容量',
        nameDesc: '矢量数据库文件\n存储大小',
        Items: [
          {
            itemTitle: '1G',
            icon: false,
          },
          {
            itemTitle: '10G',
            icon: false,
          },
          {
            itemTitle: '100G',
            icon: false,
          },
          {
            itemTitle: '2T',
            icon: false,
          },
        ],
      },
      {
        name: '知识库能力',
        nameDesc: null,
        Items: [
          {
            itemTitle: '基础功能',
            icon: false,
          },
          {
            itemTitle: '高阶功能',
            icon: false,
          },
          {
            itemTitle: '高阶功能',
            icon: false,
          },
          {
            itemTitle: '高阶功能',
            icon: false,
          },
        ],
      },
      {
        name: '空间及人数',
        nameDesc: null,
        Items: [
          {
            itemTitle: '空间数1 \n人数上限50',
            icon: false,
          },
          {
            itemTitle: '空间数10 \n人数上限100',
            icon: false,
          },
          {
            itemTitle: '无限空间数 \n人数上限100',
            icon: false,
          },
          {
            itemTitle: '无限空间数 \n人数上限500',
            icon: false,
          },
        ],
      },
      {
        name: 'Agent模板库',
        nameDesc: null,
        Items: [
          {
            itemTitle: '',
            icon: true,
          },
          {
            itemTitle: '',
            icon: true,
          },
          {
            itemTitle: '',
            icon: true,
          },
          {
            itemTitle: '',
            icon: true,
          },
        ],
      },
      {
        name: '插件库(工具、AI\n能力等)',
        nameDesc: null,
        Items: [
          {
            itemTitle: '',
            icon: true,
          },
          {
            itemTitle: '',
            icon: true,
          },
          {
            itemTitle: '',
            icon: true,
          },
          {
            itemTitle: '',
            icon: true,
          },
        ],
      },
      {
        name: '自定义插件',
        nameDesc: null,
        Items: [
          {
            itemTitle: '',
            icon: true,
          },
          {
            itemTitle: '',
            icon: true,
          },
          {
            itemTitle: '',
            icon: true,
          },
          {
            itemTitle: '',
            icon: true,
          },
        ],
      },
      {
        name: '自定义MCP',
        nameDesc: null,
        Items: [
          {
            itemTitle: '',
            icon: true,
          },
          {
            itemTitle: '',
            icon: true,
          },
          {
            itemTitle: '（支持云托管）',
            icon: true,
          },
          {
            itemTitle: '（支持云托管）',
            icon: true,
          },
        ],
      },
      {
        name: '一句话声音复刻',
        nameDesc: '发音个数限制',
        Items: [
          {
            itemTitle: '10个',
            icon: false,
          },
          {
            itemTitle: '50个',
            icon: false,
          },
          {
            itemTitle: '不限',
            icon: false,
          },
          {
            itemTitle: '不限',
            icon: false,
          },
        ],
      },
    ],
  },
  {
    title: '智能体发布',
    resource: [
      {
        name: '发布为API/SDK',
        nameDesc: null,
        Items: [
          {
            itemTitle: '',
            icon: true,
          },
          {
            itemTitle: '',
            icon: true,
          },
          {
            itemTitle: '',
            icon: true,
          },
          {
            itemTitle: '',
            icon: true,
          },
        ],
      },
      // {
      //   name: "API调用量",
      //   nameDesc: null,
      //   Items: [
      //     {
      //       itemTitle: "累计500次调用量",
      //       icon: false,
      //     },
      //     {
      //       itemTitle: "累计1500次调用量",
      //       icon: false,
      //     },
      //     {
      //       itemTitle: "累计3000次调用量，\n超额按API收费",
      //       icon: false,
      //     },
      //     {
      //       itemTitle: "累计5000次调用量，\n超额按API收费",
      //       icon: false,
      //     },
      //   ],
      // },
      // {
      //   name: "智能体QPS",
      //   nameDesc: null,
      //   Items: [
      //     {
      //       itemTitle: "2",
      //       icon: false,
      //     },
      //     {
      //       itemTitle: "4",
      //       icon: false,
      //     },
      //     {
      //       itemTitle: "8",
      //       icon: false,
      //     },
      //     {
      //       itemTitle: "不限",
      //       icon: false,
      //     },
      //   ],
      // },
      {
        name: '发布为小程序',
        nameDesc: null,
        Items: [
          {
            itemTitle: '',
            icon: true,
          },
          {
            itemTitle: '',
            icon: true,
          },
          {
            itemTitle: '',
            icon: true,
          },
          {
            itemTitle: '',
            icon: true,
          },
        ],
      },
      {
        name: '发布为MCP',
        nameDesc: null,
        Items: [
          {
            itemTitle: '',
            icon: true,
          },
          {
            itemTitle: '',
            icon: true,
          },
          {
            itemTitle: '',
            icon: true,
          },
          {
            itemTitle: '',
            icon: true,
          },
        ],
      },
    ],
  },
  {
    title: 'Prompt管理与测评',
    resource: [
      {
        name: 'Prompt管理',
        nameDesc: null,
        Items: [
          {
            itemTitle: '',
            icon: true,
          },
          {
            itemTitle: '',
            icon: true,
          },
          {
            itemTitle: '',
            icon: true,
          },
          {
            itemTitle: '',
            icon: true,
          },
        ],
      },
      {
        name: 'Prompt调试对比',
        nameDesc: null,
        Items: [
          {
            itemTitle: '',
            icon: true,
          },
          {
            itemTitle: '',
            icon: true,
          },
          {
            itemTitle: '',
            icon: true,
          },
          {
            itemTitle: '',
            icon: true,
          },
        ],
      },
      {
        name: 'Prompt评测调优',
        nameDesc: null,
        Items: [
          {
            itemTitle: null,
            icon: false,
          },
          {
            itemTitle: '',
            icon: true,
          },
          {
            itemTitle: '',
            icon: true,
          },
          {
            itemTitle: '',
            icon: true,
          },
        ],
      },
    ],
  },
  {
    title: '运营管理',
    resource: [
      {
        name: '数据追踪、基本报表生成',
        nameDesc: null,
        Items: [
          {
            itemTitle: '',
            icon: true,
          },
          {
            itemTitle: '',
            icon: true,
          },
          {
            itemTitle: '',
            icon: true,
          },
          {
            itemTitle: '',
            icon: true,
          },
        ],
      },
      {
        name: 'Trace记录日志保留天数',
        nameDesc: null,
        Items: [
          {
            itemTitle: '近5天',
            icon: false,
          },
          {
            itemTitle: '近15天',
            icon: false,
          },
          {
            itemTitle: '近3个月',
            icon: false,
          },
          {
            itemTitle: '近12个月',
            icon: false,
          },
        ],
      },
    ],
  },
  {
    title: '效果评测',
    resource: [
      {
        name: '人工测评使用次数',
        nameDesc: null,
        Items: [
          {
            itemTitle: '10次',
            icon: false,
          },
          {
            itemTitle: '30次',
            icon: false,
          },
          {
            itemTitle: '不限',
            icon: false,
          },
          {
            itemTitle: '不限',
            icon: false,
          },
        ],
      },
      {
        name: '智能测评使用次数',
        nameDesc: null,
        Items: [
          {
            itemTitle: '10次',
            icon: false,
          },
          {
            itemTitle: '30次',
            icon: false,
          },
          {
            itemTitle: '不限',
            icon: false,
          },
          {
            itemTitle: '不限',
            icon: false,
          },
        ],
      },
      {
        name: '全链路优化',
        nameDesc: null,
        Items: [
          {
            itemTitle: null,
            icon: false,
          },
          {
            itemTitle: null,
            icon: false,
          },
          {
            itemTitle: '',
            icon: true,
          },
          {
            itemTitle: '',
            icon: true,
          },
        ],
      },
    ],
  },
  {
    title: '认证与客服',
    resource: [
      // {
      //   name: "Agent交流社群",
      //   nameDesc: null,
      //   Items: [
      //     {
      //       itemTitle: "",
      //       icon: true,
      //     },
      //     {
      //       itemTitle: "",
      //       icon: true,
      //     },
      //     {
      //       itemTitle: "",
      //       icon: true,
      //     },
      //     {
      //       itemTitle: "",
      //       icon: true,
      //     },
      //   ],
      // },
      {
        name: '专属客服',
        nameDesc: null,
        Items: [
          {
            itemTitle: null,
            icon: false,
          },
          {
            itemTitle: '社区',
            icon: false,
          },
          {
            itemTitle: '人工客服\n工作日10点-19点',
            icon: false,
          },
          {
            itemTitle: '人工客服\n7*24小时全天候',
            icon: false,
          },
        ],
      },
      {
        name: '企业认证标识',
        nameDesc: null,
        Items: [
          {
            itemTitle: null,
            icon: false,
          },
          {
            itemTitle: null,
            icon: false,
          },
          {
            itemTitle: '',
            icon: true,
          },
          {
            itemTitle: '',
            icon: true,
          },
        ],
      },
    ],
  },
  {
    title: '定制化开发',
    resource: [
      {
        name: 'Agent场景定制化交付',
        nameDesc: null,
        Items: [
          {
            itemTitle: null,
            icon: false,
          },
          {
            itemTitle: null,
            icon: false,
          },
          {
            itemTitle: '',
            icon: true,
          },
          {
            itemTitle: '',
            icon: true,
          },
        ],
      },
      {
        name: '模型定制化微调',
        nameDesc: null,
        Items: [
          {
            itemTitle: null,
            icon: false,
          },
          {
            itemTitle: null,
            icon: false,
          },
          {
            itemTitle: '',
            icon: true,
          },
          {
            itemTitle: '',
            icon: true,
          },
        ],
      },
      {
        name: 'Agent效果优化',
        nameDesc: null,
        Items: [
          {
            itemTitle: null,
            icon: false,
          },
          {
            itemTitle: null,
            icon: false,
          },
          {
            itemTitle: '',
            icon: true,
          },
          {
            itemTitle: '',
            icon: true,
          },
        ],
      },
    ],
  },
];

export const COMBOCONFIG_EN = [
  {
    key: 'combo1',
    themeColor: null,
    titleName: 'Personal Free Edition',
    desc: 'For individual users to try out',
    monthPrice: '0',
    range: null,
    jumpBtnName: 'Free',
    // NOTE: 根据环境来判断
    jumpBtnUrl: null,
    ComboIntrolist: [
      'Model concurrent QPS: 2',
      '5 million Tokens per model',
      'Knowledge base space: 1GB',
      '1 space, 50 users',
      // "500次工作流API调用量",
      // "2次工作流QPS并发量",
      'Keep conversation logs for the last 5 days',
      '10 manual evaluations',
      '10 intelligent evaluations',
    ],
  },
  {
    key: 'combo2',
    themeColor: '#278BFF',
    titleName: 'Personal Professional Edition',
    desc: 'Upgraded rights for individual users',
    monthPrice: '9.9',
    range: '/month',
    jumpBtnName: 'Upgrade Package',
    jumpBtnUrl: `http://${envUrl}console.xfyun.cn/sale/buy?wareId=9178&packageId=9178001&serviceName=%E6%98%9F%E8%BE%B0Agent%E5%A5%97%E9%A4%90&businessId=agent`,
    ComboIntrolist: [
      'Model concurrent QPS: 4',
      '20 million tokens per model',
      'Knowledge base space: 10GB',
      '1 space, 100 users',
      // "1500次工作流API调用量",
      // "4次工作流QPS并发量",
      'Keep conversation logs for the last 15 days',
      '30 manual evaluations',
      '10 intelligent evaluations',
    ],
  },
  {
    key: 'combo3',
    // themeColor: "#EDC674",
    themeColor: '#D89509',
    titleName: 'Team Edition (Public Cloud)',
    desc: 'For small and medium-sized enterprises to improve team efficiency',
    monthPrice: '128',
    range: '/month',
    jumpBtnName: 'Upgrade Package',
    jumpBtnUrl: `http://${envUrl}console.xfyun.cn/sale/buy?wareId=9178&packageId=9178002&serviceName=%E6%98%9F%E8%BE%B0Agent%E5%A5%97%E9%A4%90&businessId=agent`,
    ComboIntrolist: [
      'Model concurrent QPS: 10',
      '100 million tokens per model',
      'Knowledge base space: 100GB',
      'Unlimited spaces, 100 users',
      // "3000次工作流API调用量",
      // "8次工作流QPS并发量",
      'Keep conversation logs for the last 3 months',
      'Unlimited free manual evaluations',
      'Unlimited intelligent evaluations',
      'Enterprise certification mark',
      'Customized development',
      'Manual customer service, weekdays 10:00 - 19:00',
    ],
  },
  {
    key: 'combo4',
    themeColor: '#303030',
    titleName: 'Enterprise Edition (Dedicated Cloud)',
    desc: 'For large and medium-sized enterprises with exclusive resources',
    monthPrice: '3999',
    range: '/month',
    jumpBtnName: 'Upgrade Package',
    jumpBtnUrl: `http://${envUrl}console.xfyun.cn/sale/buy?wareId=9178&packageId=9178003&serviceName=%E6%98%9F%E8%BE%B0Agent%E5%A5%97%E9%A4%90&businessId=agent`,
    ComboIntrolist: [
      'Model concurrent QPS: 50',
      'Unlimited model resources',
      'Support access to enterprise-owned models',
      'Knowledge base space: 2TB',
      'Unlimited spaces, 500 users',
      // "5000次工作流API调用量",
      // "无限次工作流QPS并发量",
      'Keep conversation logs for the last 12 months',
      'Unlimited free manual evaluations',
      'Unlimited intelligent evaluations',
      'Enterprise certification mark',
      'Customized development',
      'Manual customer service, 24/7',
    ],
  },
  {
    key: 'combo5',
    themeColor: '#925EFF',
    titleName: 'Custom Commercial (Dedicated Cloud)',
    desc: 'For large and medium-sized enterprises, effect customization',
    monthPrice: 'Custom',
    range: '(Contact)',
    jumpBtnName: 'Consult Now',
    jumpBtnUrl: ``,
    hasQrcode: true,
    ComboIntrolist: [
      'Higher quota of model resources and concurrent QPS',
      'Support for accessing enterprise-owned models',
      'Unlimited private knowledge base calls',
      'Unlimited conversation history logs',
      'Unlimited free manual evaluations',
      'Unlimited intelligent evaluations',
      'Exclusive enterprise brand logo',
      'Enterprise-level customized expansion solutions',
      'Custom enterprise intelligent agent plaza',
      'Login system integration, enterprise organizational structure binding',
      'Custom enterprise BI dashboard, providing raw data',
      'Enterprise-level data isolation and security assurance',
      '1v1 dedicated technical support, 7x24H rapid response',
    ],
  },
];
export const MODELRESOURCE_EN = [
  {
    title: 'Models and Resources',
    resource: [
      {
        name: 'Model Customization',
        nameDesc: null,
        Items: [
          null,
          null,
          {
            itemTitle: '',
            icon: true,
          },
          {
            itemTitle: '',
            icon: true,
          },
        ],
      },
      {
        name: 'Concurrent QPS',
        nameDesc: null,
        Items: [
          {
            itemTitle: '2',
            icon: false,
          },
          {
            itemTitle: '4',
            icon: false,
          },
          {
            itemTitle: '10',
            icon: false,
          },
          {
            itemTitle: '50',
            icon: false,
          },
        ],
      },
      {
        name: 'Free Model Resources',
        nameDesc: 'Model resource limits after publishing as API',
        Items: [
          {
            itemTitle: '5 million tokens per model',
            icon: false,
          },
          {
            itemTitle: '20 million tokens per model',
            icon: false,
          },
          {
            itemTitle: '100 million',
            icon: false,
          },
          {
            itemTitle: 'Unlimited',
            icon: false,
          },
        ],
      },
      {
        name: 'New Model Preview',
        nameDesc: null,
        Items: [
          {
            itemTitle: '',
            icon: true,
          },
          {
            itemTitle: '',
            icon: true,
          },
          {
            itemTitle: '',
            icon: true,
          },
          {
            itemTitle: '',
            icon: true,
          },
        ],
      },
      {
        name: 'Access to Enterprise-owned Models',
        nameDesc: null,
        Items: [
          {
            itemTitle: null,
            icon: false,
          },
          {
            itemTitle: null,
            icon: false,
          },
          {
            itemTitle: null,
            icon: false,
          },
          {
            itemTitle: '',
            icon: true,
          },
        ],
      },
    ],
  },
  {
    title: 'Agent Development',
    resource: [
      {
        name: 'Number of Applications',
        nameDesc:
          'Number of officially published Agents and workflows simultaneously',
        Items: [
          {
            itemTitle: '50',
            icon: false,
          },
          {
            itemTitle: 'Exclusive Customization',
            icon: false,
          },
          {
            itemTitle: 'Unlimited',
            icon: false,
          },
          {
            itemTitle: 'Unlimited',
            icon: false,
          },
        ],
      },
      {
        name: 'Knowledge Base Capacity',
        nameDesc: 'Vector database file storage size',
        Items: [
          {
            itemTitle: '1GB',
            icon: false,
          },
          {
            itemTitle: '10GB',
            icon: false,
          },
          {
            itemTitle: '100GB',
            icon: false,
          },
          {
            itemTitle: '2TB',
            icon: false,
          },
        ],
      },
      {
        name: 'Knowledge Base Capabilities',
        nameDesc: null,
        Items: [
          {
            itemTitle: 'Basic Functions',
            icon: false,
          },
          {
            itemTitle: 'Advanced Functions',
            icon: false,
          },
          {
            itemTitle: 'Advanced Functions',
            icon: false,
          },
          {
            itemTitle: 'Advanced Functions',
            icon: false,
          },
        ],
      },
      {
        name: 'Spaces and Users',
        nameDesc: null,
        Items: [
          {
            itemTitle: '1 space \n50 users',
            icon: false,
          },
          {
            itemTitle: '10 spaces \n100 users',
            icon: false,
          },
          {
            itemTitle: 'Unlimited spaces \n100 users',
            icon: false,
          },
          {
            itemTitle: 'Unlimited spaces \n500 users',
            icon: false,
          },
        ],
      },
      {
        name: 'Agent Template Library',
        nameDesc: null,
        Items: [
          {
            itemTitle: '',
            icon: true,
          },
          {
            itemTitle: '',
            icon: true,
          },
          {
            itemTitle: '',
            icon: true,
          },
          {
            itemTitle: '',
            icon: true,
          },
        ],
      },
      {
        name: 'Plugin Library (Tools, AI Capabilities, etc.)',
        nameDesc: null,
        Items: [
          {
            itemTitle: '',
            icon: true,
          },
          {
            itemTitle: '',
            icon: true,
          },
          {
            itemTitle: '',
            icon: true,
          },
          {
            itemTitle: '',
            icon: true,
          },
        ],
      },
      {
        name: 'Custom Plugins',
        nameDesc: null,
        Items: [
          {
            itemTitle: '',
            icon: true,
          },
          {
            itemTitle: '',
            icon: true,
          },
          {
            itemTitle: '',
            icon: true,
          },
          {
            itemTitle: '',
            icon: true,
          },
        ],
      },
      {
        name: 'Custom MCP',
        nameDesc: null,
        Items: [
          {
            itemTitle: '',
            icon: true,
          },
          {
            itemTitle: '',
            icon: true,
          },
          {
            itemTitle: '(Supports Cloud Hosting)',
            icon: true,
          },
          {
            itemTitle: '(Supports Cloud Hosting)',
            icon: true,
          },
        ],
      },
      {
        name: 'One-sentence Voice Replication',
        nameDesc: 'Limit on the number of voices',
        Items: [
          {
            itemTitle: '10',
            icon: false,
          },
          {
            itemTitle: '50',
            icon: false,
          },
          {
            itemTitle: 'Unlimited',
            icon: false,
          },
          {
            itemTitle: 'Unlimited',
            icon: false,
          },
        ],
      },
    ],
  },
  {
    title: 'Agent Publishing',
    resource: [
      {
        name: 'Publish as API/SDK',
        nameDesc: null,
        Items: [
          {
            itemTitle: '',
            icon: true,
          },
          {
            itemTitle: '',
            icon: true,
          },
          {
            itemTitle: '',
            icon: true,
          },
          {
            itemTitle: '',
            icon: true,
          },
        ],
      },
      // {
      //   name: "API Call Volume",
      //   nameDesc: null,
      //   Items: [
      //     {
      //       itemTitle: "Cumulative 500 calls",
      //       icon: false,
      //     },
      //     {
      //       itemTitle: "Cumulative 1500 calls",
      //       icon: false,
      //     },
      //     {
      //       itemTitle: "Cumulative 3000 calls, excess charged by API",
      //       icon: false,
      //     },
      //     {
      //       itemTitle: "Cumulative 5000 calls, excess charged by API",
      //       icon: false,
      //     },
      //   ],
      // },
      // {
      //   name: "Agent QPS",
      //   nameDesc: null,
      //   Items: [
      //     {
      //       itemTitle: "2",
      //       icon: false,
      //     },
      //     {
      //       itemTitle: "4",
      //       icon: false,
      //     },
      //     {
      //       itemTitle: "8",
      //       icon: false,
      //     },
      //     {
      //       itemTitle: "Unlimited",
      //       icon: false,
      //     },
      //   ],
      // },
      {
        name: 'Publish as Mini Program',
        nameDesc: null,
        Items: [
          {
            itemTitle: '',
            icon: true,
          },
          {
            itemTitle: '',
            icon: true,
          },
          {
            itemTitle: '',
            icon: true,
          },
          {
            itemTitle: '',
            icon: true,
          },
        ],
      },
      {
        name: 'Publish as MCP',
        nameDesc: null,
        Items: [
          {
            itemTitle: '',
            icon: true,
          },
          {
            itemTitle: '',
            icon: true,
          },
          {
            itemTitle: '',
            icon: true,
          },
          {
            itemTitle: '',
            icon: true,
          },
        ],
      },
    ],
  },
  {
    title: 'Prompt Management and Evaluation',
    resource: [
      {
        name: 'Prompt Management',
        nameDesc: null,
        Items: [
          {
            itemTitle: '',
            icon: true,
          },
          {
            itemTitle: '',
            icon: true,
          },
          {
            itemTitle: '',
            icon: true,
          },
          {
            itemTitle: '',
            icon: true,
          },
        ],
      },
      {
        name: 'Prompt Debugging Comparison',
        nameDesc: null,
        Items: [
          {
            itemTitle: '',
            icon: true,
          },
          {
            itemTitle: '',
            icon: true,
          },
          {
            itemTitle: '',
            icon: true,
          },
          {
            itemTitle: '',
            icon: true,
          },
        ],
      },
      {
        name: 'Prompt Evaluation and Tuning',
        nameDesc: null,
        Items: [
          {
            itemTitle: null,
            icon: false,
          },
          {
            itemTitle: '',
            icon: true,
          },
          {
            itemTitle: '',
            icon: true,
          },
          {
            itemTitle: '',
            icon: true,
          },
        ],
      },
    ],
  },
  {
    title: 'Operation Management',
    resource: [
      {
        name: 'Data Tracking, Basic Report Generation',
        nameDesc: null,
        Items: [
          {
            itemTitle: '',
            icon: true,
          },
          {
            itemTitle: '',
            icon: true,
          },
          {
            itemTitle: '',
            icon: true,
          },
          {
            itemTitle: '',
            icon: true,
          },
        ],
      },
      {
        name: 'Trace Log Retention Days',
        nameDesc: null,
        Items: [
          {
            itemTitle: 'Last 5 days',
            icon: false,
          },
          {
            itemTitle: 'Last 15 days',
            icon: false,
          },
          {
            itemTitle: 'Last 3 months',
            icon: false,
          },
          {
            itemTitle: 'Last 12 months',
            icon: false,
          },
        ],
      },
    ],
  },
  {
    title: 'Effect Evaluation',
    resource: [
      {
        name: 'Number of Manual Evaluation Uses',
        nameDesc: null,
        Items: [
          {
            itemTitle: '10 times',
            icon: false,
          },
          {
            itemTitle: '30 times',
            icon: false,
          },
          {
            itemTitle: 'Unlimited',
            icon: false,
          },
          {
            itemTitle: 'Unlimited',
            icon: false,
          },
        ],
      },
      {
        name: 'Number of Intelligent Evaluation Uses',
        nameDesc: null,
        Items: [
          {
            itemTitle: '10 times',
            icon: false,
          },
          {
            itemTitle: '30 times',
            icon: false,
          },
          {
            itemTitle: 'Unlimited',
            icon: false,
          },
          {
            itemTitle: 'Unlimited',
            icon: false,
          },
        ],
      },
      {
        name: 'End-to-end Optimization',
        nameDesc: null,
        Items: [
          {
            itemTitle: null,
            icon: false,
          },
          {
            itemTitle: null,
            icon: false,
          },
          {
            itemTitle: '',
            icon: true,
          },
          {
            itemTitle: '',
            icon: true,
          },
        ],
      },
    ],
  },
  {
    title: 'Certification and Customer Service',
    resource: [
      // {
      //   name: "Agent Communication Community",
      //   nameDesc: null,
      //   Items: [
      //     {
      //       itemTitle: "",
      //       icon: true,
      //     },
      //     {
      //       itemTitle: "",
      //       icon: true,
      //     },
      //     {
      //       itemTitle: "",
      //       icon: true,
      //     },
      //     {
      //       itemTitle: "",
      //       icon: true,
      //     },
      //   ],
      // },
      {
        name: 'Dedicated Customer Service',
        nameDesc: null,
        Items: [
          {
            itemTitle: null,
            icon: false,
          },
          {
            itemTitle: 'Community',
            icon: false,
          },
          {
            itemTitle: 'Manual Customer Service\nWeekdays 10:00 - 19:00',
            icon: false,
          },
          {
            itemTitle: 'Manual Customer Service\n24/7',
            icon: false,
          },
        ],
      },
      {
        name: 'Enterprise Certification Mark',
        nameDesc: null,
        Items: [
          {
            itemTitle: null,
            icon: false,
          },
          {
            itemTitle: null,
            icon: false,
          },
          {
            itemTitle: '',
            icon: true,
          },
          {
            itemTitle: '',
            icon: true,
          },
        ],
      },
    ],
  },
  {
    title: 'Customized Development',
    resource: [
      {
        name: 'Customized Agent Scenario Delivery',
        nameDesc: null,
        Items: [
          {
            itemTitle: null,
            icon: false,
          },
          {
            itemTitle: null,
            icon: false,
          },
          {
            itemTitle: '',
            icon: true,
          },
          {
            itemTitle: '',
            icon: true,
          },
        ],
      },
      {
        name: 'Agent Effect Optimization',
        nameDesc: null,
        Items: [
          {
            itemTitle: null,
            icon: false,
          },
          {
            itemTitle: null,
            icon: false,
          },
          {
            itemTitle: '',
            icon: true,
          },
          {
            itemTitle: '',
            icon: true,
          },
        ],
      },
    ],
  },
];
