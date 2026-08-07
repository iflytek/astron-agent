const transition = {
  shareOriginModal: {
    shareTitle: 'Share Agent',
    copyLink: 'Copy Link',
    shareToWechat: 'Share to WeChat',
    successCopyLink: 'Share link copied successfully',
    cannotShareWechat: 'Cannot share to WeChat, try another one~',
    serverError: 'Server is busy~ Please try again later',
    successCopyWechatLink:
      'Link copied successfully, share it with your WeChat friends now~',
    shareText:
      'I found {{botName}}, try chatting with it! {{origin}}/chat/{{botId}}?sharekey={{shareKey}}',
  },
  shareNewModal: {
    copyLinkText: 'I found {{botName}}, try chatting with it! {{shareUrl}}',
    successCopyLink: 'Share link copied successfully',
    avatarConverting: 'Converting...',
    saveCard: 'Save card',
    copyLink: 'Copy link',
    avatarConvertingTip: 'Avatar is still converting, please try again later',
    savingImage: 'Image is being saved...',
    saveSuccess: 'Card saved: {{fileName}}',
    saveError: 'Failed to save image: {{errorMessage}}',
    fromText: 'From: {{creator}}',
    defaultBotName: 'Agent',
    getElementError: 'Unable to get rendered element',
  },
};

export default transition;
