const transition = {
  shareOriginModal: {
    shareTitle: '分享智能体',
    copyLink: '复制链接',
    shareToWechat: '分享到微信',
    successCopyLink: '分享链接复制成功',
    cannotShareWechat: '无法分享到微信，换一个试试~',
    serverError: '服务器开小差了~请稍后再试',
    successCopyWechatLink: '复制链接成功，快发给你的微信好友分享吧~',
    shareText:
      '我发现了{{botName}}，快试试和ta对话吧！{{origin}}/chat/{{botId}}?sharekey={{shareKey}}',
  },
  shareNewModal: {
    copyLinkText: '我发现了{{botName}}，快试试和ta对话吧！{{shareUrl}}',
    successCopyLink: '分享链接复制成功',
    avatarConverting: '转换中...',
    saveCard: '保存名片分享',
    copyLink: '复制链接分享',
    avatarConvertingTip: '头像还在转换中，请稍后再试',
    savingImage: '图片正在保存中...',
    saveSuccess: '名片已保存：{{fileName}}',
    saveError: '保存图片失败: {{errorMessage}}',
    fromText: '来自：{{creator}}',
    defaultBotName: '智能体',
    getElementError: '无法获取渲染元素',
  },
};

export default transition;
