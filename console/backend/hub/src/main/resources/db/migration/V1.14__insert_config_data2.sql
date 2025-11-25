
-- ----------------------------
-- Records of config_info_en
-- ----------------------------
INSERT INTO config_info_en (id,category,code,name,value,is_valid,remarks,create_time,update_time) VALUES
	 (1019,'DOCUMENT_LINK','1','SparkBotHelpDoc','https://experience.pro.iflyaicloud.com/aicloud-sparkbot-doc/',1,'你好','2023-08-17 00:00:00','2024-09-03 11:51:23'),
	 (1021,'COMPRESSED_FOLDER','1','SparkBotSDK','https://oss-beijing-m8.openstorage.cn/pro-bucket/sparkBot/sdk%E6%8E%A5%E5%85%A5%E8%AF%B4%E6%98%8E.zip',1,'','2000-01-01 00:00:00','2024-06-27 10:35:15'),
	 (1023,'SPARKBOT_CONFIG','1','SparkBotApi','{"sdkHtml":"<div className=\\"sdk-content\\">\\n      <p className=\\"title\\">Sparkbot接入文档</p>\\n      <h1>JS SDK</h1>\\n      <p>\\n        安装之前，请确保您已通过我们的平台注册或我们已为您提供了<b>AppId</b>。\\n        如果没有密钥，您将无法使用该SDK。\\n      </p>\\n      <hr></hr>\\n      <h2>JS SDK</h2>\\n      <p>\\n        要将 Sparkbot 与 JS SDK 一起使用，您需要在 HTML 文件中包含脚本标签。\\n      </p>\\n      <h3>浮动机器人</h3>\\n      <p style={{ margin: ''20px 0'' }}>\\n        浮动机器人非常简单。 只需将这 2 个脚本标签添加到您的 HTML 中即可。\\n      </p>\\n      <div className=\\"code-content\\">\\n        <div className=\\"code-container\\">\\n          <span className=\\"normal\\">&lt;</span>\\n          <span className=\\"tagColor\\">script&nbsp;</span>\\n          <span className=\\"light\\" style={{ whiteSpace: ''nowrap'' }}>\\n            src=''https://oss-beijing-m8.openstorage.cn/pro-bucket/sparkBot/Sparkbot.js''\\n            <span className=\\"normal\\">&gt;</span>\\n            <span className=\\"normal\\">&lt;/</span>\\n            <span className=\\"tagColor\\">script</span>\\n            <span className=\\"normal\\"> &gt;</span>\\n          </span>\\n          <br></br>\\n          <span className=\\"normal\\">&lt;</span>\\n          <span className=\\"tagColor\\">script</span>\\n          <span className=\\"normal\\"> &gt;</span>\\n          <br></br>\\n          <span style={{ marginLeft: 10 }}>Sparkbot</span>\\n          <span className=\\"normal\\">.</span>\\n          <span className=\\"tagColor\\">init</span>\\n          <span className=\\"normal\\">(&#123;</span>\\n          <br></br>\\n          <span className=\\"light\\" style={{ marginLeft: 20 }}>\\n            appId: ''您的appId'',\\n            <br></br>\\n            <span style={{ marginLeft: 20 }}>apiKey: ''您的apiKey'',</span>\\n            <br></br>\\n            <span style={{ marginLeft: 20 }}>apiSecret: ''您的apiSecret''</span>\\n            <br></br>\\n          </span>\\n          <span className=\\"normal\\" style={{ marginLeft: 10 }}>\\n            &#125;)\\n          </span>\\n          <br></br>\\n          <span className=\\"normal\\">&lt;/</span>\\n          <span className=\\"tagColor\\">script</span>\\n          <span className=\\"normal\\"> &gt;</span>\\n        </div>\\n      </div>\\n    </div>","sdkMd":"/pro-bucket/sparkBot/README.md"}',1,'','2000-01-01 00:00:00','2024-06-27 10:35:15'),
	 (1027,'FILE_MANAGE_CONFIG','','MAX_FOLDER_DEEP','5',1,'用于控制文件目录树的最大层级','2000-01-01 00:00:00','2024-06-27 10:35:15'),
	 (1029,'SPARKBOT_DEFAULT_APP','1','sparkbot默认应用','{
  "name": "SparkBot Default Application",
  "description": "Application created by default for SparkBot",
  "businessInfo": {
    "applyUserSource": 1,
    "applyUserCode": "system",
    "applyUserDepart": "AI Application Platform R&D Department",
    "groupName": "Core R&D Platform",
    "groupId": 1003,
    "productName": "AI Application Platform R&D Department",
    "productId": 10213
  },
  "isLocalAuth": 0
}',1,'','2000-01-01 00:00:00','2025-07-23 14:24:43'),
	 (1031,'SPARKBOT_DEFAULT_RELATION_CAPACITY','1','sparkbot应用默认关联的能力','{
  "largeModelId": 99,
  "name": "General Large Model",
  "type": 1
}',1,'','2000-01-01 00:00:00','2025-07-23 14:25:39'),
	 (1033,'SPARKBOT_DEFAULT_APPLY_INFO','1','外部用户Spartbot平台默认申请','{"account":"xxzhang23","accountName":"张想信","departmentInfo":"AI工程院飞云平台产品部","describe":"外部用户Spartbot平台默认申请","superiorInfo":"xxzhang23","largeModel":"通用大模型","domain":"general"}',1,'','2000-01-01 00:00:00','2023-12-05 20:32:40'),
	 (1035,'BOT_COUNT_LIMIT','1','10','The number of bots created by the user has reached the limit.',1,'','2000-01-01 00:00:00','2025-07-23 14:25:39'),
	 (1037,'TEXT_GENERATION_MODELS','1','spark','讯飞星火',1,'','2000-01-01 00:00:00','2023-12-10 14:40:57'),
	 (1039,'MODEL_DEFAULT_CONFIGS','spark','spark模型默认配置','[{"key":"temperature","nmae":"Randomness","min":0,"max":2,"default":1,"enabled":true},{"key":"max_tokens","nmae":"Response Token Limit","min":10,"max":1000,"default":256,"enabled":true}]',1,'','2000-01-01 00:00:00','2025-07-23 14:27:10'),
	 (1041,'DEFAULT_SLICE_RULES','1','默认切片规则','{"type":0,"seperator":["\\n"],"lengthRange":[16,1024]}',1,'','2000-01-01 00:00:00','2024-06-20 20:09:51'),
	 (1043,'CUSTOM_SLICE_RULES','1','自定义切片模板','{"type":1,"seperator":["\\n"],"lengthRange":[16,1024]}',1,'','2000-01-01 00:00:00','2024-06-20 20:09:54'),
	 (1045,'ICON','common','http://oss-beijing-m8.openstorage.cn/SparkBotProd/','icon/common/emojiitem_00_10@2x.png',1,'','2000-01-01 00:00:00','2023-12-26 20:02:14'),
	 (1047,'ICON','common','http://oss-beijing-m8.openstorage.cn/SparkBotProd/','icon/common/emojiitem_00_11@2x.png',1,'','2000-01-01 00:00:00','2023-12-26 20:02:14'),
	 (1049,'ICON','common','http://oss-beijing-m8.openstorage.cn/SparkBotProd/','icon/common/emojiitem_00_12@2x.png',1,'','2000-01-01 00:00:00','2023-12-26 20:02:14'),
	 (1051,'ICON','common','http://oss-beijing-m8.openstorage.cn/SparkBotProd/','icon/common/emojiitem_00_13@2x.png',1,'','2000-01-01 00:00:00','2023-12-26 20:02:14'),
	 (1053,'ICON','common','http://oss-beijing-m8.openstorage.cn/SparkBotProd/','icon/common/emojiitem_00_14@2x.png',1,'','2000-01-01 00:00:00','2023-12-26 20:02:14'),
	 (1055,'ICON','common','http://oss-beijing-m8.openstorage.cn/SparkBotProd/','icon/common/emojiitem_00_15@2x.png',1,'','2000-01-01 00:00:00','2023-12-26 20:02:15'),
	 (1057,'ICON','common','http://oss-beijing-m8.openstorage.cn/SparkBotProd/','icon/common/emojiitem_00_16@2x.png',1,'','2000-01-01 00:00:00','2023-12-26 20:02:15'),
	 (1059,'ICON','common','http://oss-beijing-m8.openstorage.cn/SparkBotProd/','icon/common/emojiitem_00_17@2x.png',1,'','2000-01-01 00:00:00','2023-12-26 20:02:15'),
	 (1061,'ICON','common','http://oss-beijing-m8.openstorage.cn/SparkBotProd/','icon/common/emojiitem_00_18@2x.png',1,'','2000-01-01 00:00:00','2023-12-26 20:02:15'),
	 (1063,'ICON','common','http://oss-beijing-m8.openstorage.cn/SparkBotProd/','icon/common/emojiitem_00_19@2x.png',1,'','2000-01-01 00:00:00','2023-12-26 20:02:15'),
	 (1065,'ICON','common','http://oss-beijing-m8.openstorage.cn/SparkBotProd/','icon/common/emojiitem_00_1@2x.png',1,'','2000-01-01 00:00:00','2023-12-26 20:02:15'),
	 (1067,'ICON','common','http://oss-beijing-m8.openstorage.cn/SparkBotProd/','icon/common/emojiitem_00_20@2x.png',1,'','2000-01-01 00:00:00','2023-12-26 20:02:15'),
	 (1069,'ICON','common','http://oss-beijing-m8.openstorage.cn/SparkBotProd/','icon/common/emojiitem_00_21@2x.png',1,'','2000-01-01 00:00:00','2023-12-26 20:02:15'),
	 (1071,'ICON','common','http://oss-beijing-m8.openstorage.cn/SparkBotProd/','icon/common/emojiitem_00_22@2x.png',1,'','2000-01-01 00:00:00','2023-12-26 20:02:15'),
	 (1073,'ICON','common','http://oss-beijing-m8.openstorage.cn/SparkBotProd/','icon/common/emojiitem_00_23@2x.png',1,'','2000-01-01 00:00:00','2023-12-26 20:02:15'),
	 (1075,'ICON','common','http://oss-beijing-m8.openstorage.cn/SparkBotProd/','icon/common/emojiitem_00_24@2x.png',1,'','2000-01-01 00:00:00','2023-12-26 20:02:15'),
	 (1077,'ICON','common','http://oss-beijing-m8.openstorage.cn/SparkBotProd/','icon/common/emojiitem_00_25@2x.png',1,'','2000-01-01 00:00:00','2023-12-26 20:02:15'),
	 (1079,'ICON','common','http://oss-beijing-m8.openstorage.cn/SparkBotProd/','icon/common/emojiitem_00_26@2x.png',1,'','2000-01-01 00:00:00','2023-12-26 20:02:15'),
	 (1081,'ICON','common','http://oss-beijing-m8.openstorage.cn/SparkBotProd/','icon/common/emojiitem_00_27@2x.png',1,'','2000-01-01 00:00:00','2023-12-26 20:02:15'),
	 (1083,'ICON','common','http://oss-beijing-m8.openstorage.cn/SparkBotProd/','icon/common/emojiitem_00_28@2x.png',1,'','2000-01-01 00:00:00','2023-12-26 20:02:16'),
	 (1085,'ICON','common','http://oss-beijing-m8.openstorage.cn/SparkBotProd/','icon/common/emojiitem_00_29@2x.png',1,'','2000-01-01 00:00:00','2023-12-26 20:02:16'),
	 (1087,'ICON','common','http://oss-beijing-m8.openstorage.cn/SparkBotProd/','icon/common/emojiitem_00_2@2x.png',1,'','2000-01-01 00:00:00','2023-12-26 20:02:16'),
	 (1089,'ICON','common','http://oss-beijing-m8.openstorage.cn/SparkBotProd/','icon/common/emojiitem_00_30@2x.png',1,'','2000-01-01 00:00:00','2023-12-26 20:02:16'),
	 (1091,'ICON','common','http://oss-beijing-m8.openstorage.cn/SparkBotProd/','icon/common/emojiitem_00_31@2x.png',1,'','2000-01-01 00:00:00','2023-12-26 20:02:16'),
	 (1093,'ICON','common','http://oss-beijing-m8.openstorage.cn/SparkBotProd/','icon/common/emojiitem_00_32@2x.png',1,'','2000-01-01 00:00:00','2023-12-26 20:02:16'),
	 (1095,'ICON','common','http://oss-beijing-m8.openstorage.cn/SparkBotProd/','icon/common/emojiitem_00_33@2x.png',1,'','2000-01-01 00:00:00','2023-12-26 20:02:16'),
	 (1097,'ICON','common','http://oss-beijing-m8.openstorage.cn/SparkBotProd/','icon/common/emojiitem_00_34@2x.png',1,'','2000-01-01 00:00:00','2023-12-26 20:02:16'),
	 (1099,'ICON','common','http://oss-beijing-m8.openstorage.cn/SparkBotProd/','icon/common/emojiitem_00_35@2x.png',1,'','2000-01-01 00:00:00','2023-12-26 20:02:16'),
	 (1101,'ICON','common','http://oss-beijing-m8.openstorage.cn/SparkBotProd/','icon/common/emojiitem_00_36@2x.png',1,'','2000-01-01 00:00:00','2023-12-26 20:02:16'),
	 (1103,'ICON','common','http://oss-beijing-m8.openstorage.cn/SparkBotProd/','icon/common/emojiitem_00_37@2x.png',1,'','2000-01-01 00:00:00','2023-12-26 20:02:16'),
	 (1105,'ICON','common','http://oss-beijing-m8.openstorage.cn/SparkBotProd/','icon/common/emojiitem_00_38@2x.png',1,'','2000-01-01 00:00:00','2023-12-26 20:02:16'),
	 (1107,'ICON','common','http://oss-beijing-m8.openstorage.cn/SparkBotProd/','icon/common/emojiitem_00_39@2x.png',1,'','2000-01-01 00:00:00','2023-12-26 20:02:16'),
	 (1109,'ICON','common','http://oss-beijing-m8.openstorage.cn/SparkBotProd/','icon/common/emojiitem_00_3@2x.png',1,'','2000-01-01 00:00:00','2023-12-26 20:02:17'),
	 (1111,'ICON','common','http://oss-beijing-m8.openstorage.cn/SparkBotProd/','icon/common/emojiitem_00_40@2x.png',1,'','2000-01-01 00:00:00','2023-12-26 20:02:17'),
	 (1113,'ICON','common','http://oss-beijing-m8.openstorage.cn/SparkBotProd/','icon/common/emojiitem_00_41@2x.png',1,'','2000-01-01 00:00:00','2023-12-26 20:02:17'),
	 (1115,'ICON','common','http://oss-beijing-m8.openstorage.cn/SparkBotProd/','icon/common/emojiitem_00_42@2x.png',1,'','2000-01-01 00:00:00','2023-12-26 20:02:17'),
	 (1117,'ICON','common','http://oss-beijing-m8.openstorage.cn/SparkBotProd/','icon/common/emojiitem_00_4@2x.png',1,'','2000-01-01 00:00:00','2023-12-26 20:02:17'),
	 (1119,'ICON','common','http://oss-beijing-m8.openstorage.cn/SparkBotProd/','icon/common/emojiitem_00_5@2x.png',1,'','2000-01-01 00:00:00','2023-12-26 20:02:17'),
	 (1121,'ICON','common','http://oss-beijing-m8.openstorage.cn/SparkBotProd/','icon/common/emojiitem_00_6@2x.png',1,'','2000-01-01 00:00:00','2023-12-26 20:02:17'),
	 (1123,'ICON','common','http://oss-beijing-m8.openstorage.cn/SparkBotProd/','icon/common/emojiitem_00_7@2x.png',1,'','2000-01-01 00:00:00','2023-12-26 20:02:17'),
	 (1125,'ICON','common','http://oss-beijing-m8.openstorage.cn/SparkBotProd/','icon/common/emojiitem_00_8@2x.png',1,'','2000-01-01 00:00:00','2023-12-26 20:02:17'),
	 (1127,'ICON','common','http://oss-beijing-m8.openstorage.cn/SparkBotProd/','icon/common/emojiitem_00_9@2x.png',1,'','2000-01-01 00:00:00','2023-12-26 20:02:17'),
	 (1133,'ICON','sport','http://oss-beijing-m8.openstorage.cn/SparkBotProd/','icon/sport/emojiiteam_01_10@2x.png',1,'','2000-01-01 00:00:00','2023-12-26 20:02:17'),
	 (1135,'ICON','sport','http://oss-beijing-m8.openstorage.cn/SparkBotProd/','icon/sport/emojiiteam_01_11@2x.png',1,'','2000-01-01 00:00:00','2023-12-26 20:02:17'),
	 (1137,'ICON','sport','http://oss-beijing-m8.openstorage.cn/SparkBotProd/','icon/sport/emojiiteam_01_12@2x.png',1,'','2000-01-01 00:00:00','2023-12-26 20:02:17'),
	 (1139,'ICON','sport','http://oss-beijing-m8.openstorage.cn/SparkBotProd/','icon/sport/emojiiteam_01_13@2x.png',1,'','2000-01-01 00:00:00','2023-12-26 20:02:18'),
	 (1141,'ICON','sport','http://oss-beijing-m8.openstorage.cn/SparkBotProd/','icon/sport/emojiiteam_01_14@2x.png',1,'','2000-01-01 00:00:00','2023-12-26 20:02:18'),
	 (1143,'ICON','sport','http://oss-beijing-m8.openstorage.cn/SparkBotProd/','icon/sport/emojiiteam_01_15@2x.png',1,'','2000-01-01 00:00:00','2023-12-26 20:02:18'),
	 (1145,'ICON','sport','http://oss-beijing-m8.openstorage.cn/SparkBotProd/','icon/sport/emojiiteam_01_1@2x.png',1,'','2000-01-01 00:00:00','2023-12-26 20:02:18'),
	 (1147,'ICON','sport','http://oss-beijing-m8.openstorage.cn/SparkBotProd/','icon/sport/emojiiteam_01_2@2x.png',1,'','2000-01-01 00:00:00','2023-12-26 20:02:18'),
	 (1149,'ICON','sport','http://oss-beijing-m8.openstorage.cn/SparkBotProd/','icon/sport/emojiiteam_01_3@2x.png',1,'','2000-01-01 00:00:00','2023-12-26 20:02:18'),
	 (1151,'ICON','sport','http://oss-beijing-m8.openstorage.cn/SparkBotProd/','icon/sport/emojiiteam_01_4@2x.png',1,'','2000-01-01 00:00:00','2023-12-26 20:02:18'),
	 (1153,'ICON','sport','http://oss-beijing-m8.openstorage.cn/SparkBotProd/','icon/sport/emojiiteam_01_5@2x.png',1,'','2000-01-01 00:00:00','2023-12-26 20:02:18'),
	 (1155,'ICON','sport','http://oss-beijing-m8.openstorage.cn/SparkBotProd/','icon/sport/emojiiteam_01_6@2x.png',1,'','2000-01-01 00:00:00','2023-12-26 20:02:18'),
	 (1157,'ICON','sport','http://oss-beijing-m8.openstorage.cn/SparkBotProd/','icon/sport/emojiiteam_01_7@2x.png',1,'','2000-01-01 00:00:00','2023-12-26 20:02:18'),
	 (1159,'ICON','sport','http://oss-beijing-m8.openstorage.cn/SparkBotProd/','icon/sport/emojiiteam_01_8@2x.png',1,'','2000-01-01 00:00:00','2023-12-26 20:02:18'),
	 (1161,'ICON','sport','http://oss-beijing-m8.openstorage.cn/SparkBotProd/','icon/sport/emojiiteam_01_9@2x.png',1,'','2000-01-01 00:00:00','2023-12-26 20:02:18'),
	 (1163,'ICON','plant','http://oss-beijing-m8.openstorage.cn/SparkBotProd/','icon/plant/emojiiteam_02_10@2x.png',1,'','2000-01-01 00:00:00','2023-12-26 20:02:18'),
	 (1165,'ICON','plant','http://oss-beijing-m8.openstorage.cn/SparkBotProd/','icon/plant/emojiiteam_02_11@2x.png',1,'','2000-01-01 00:00:00','2023-12-26 20:02:19'),
	 (1167,'ICON','plant','http://oss-beijing-m8.openstorage.cn/SparkBotProd/','icon/plant/emojiiteam_02_12@2x.png',1,'','2000-01-01 00:00:00','2023-12-26 20:02:19'),
	 (1169,'ICON','plant','http://oss-beijing-m8.openstorage.cn/SparkBotProd/','icon/plant/emojiiteam_02_13@2x.png',1,'','2000-01-01 00:00:00','2023-12-26 20:02:19'),
	 (1171,'ICON','plant','http://oss-beijing-m8.openstorage.cn/SparkBotProd/','icon/plant/emojiiteam_02_14@2x.png',1,'','2000-01-01 00:00:00','2023-12-26 20:02:19'),
	 (1173,'ICON','plant','http://oss-beijing-m8.openstorage.cn/SparkBotProd/','icon/plant/emojiiteam_02_15@2x.png',1,'','2000-01-01 00:00:00','2023-12-26 20:02:19'),
	 (1175,'ICON','plant','http://oss-beijing-m8.openstorage.cn/SparkBotProd/','icon/plant/emojiiteam_02_1@2x.png',1,'','2000-01-01 00:00:00','2023-12-26 20:02:19'),
	 (1177,'ICON','plant','http://oss-beijing-m8.openstorage.cn/SparkBotProd/','icon/plant/emojiiteam_02_2@2x.png',1,'','2000-01-01 00:00:00','2023-12-26 20:02:19'),
	 (1179,'ICON','plant','http://oss-beijing-m8.openstorage.cn/SparkBotProd/','icon/plant/emojiiteam_02_3@2x.png',1,'','2000-01-01 00:00:00','2023-12-26 20:02:19'),
	 (1181,'ICON','plant','http://oss-beijing-m8.openstorage.cn/SparkBotProd/','icon/plant/emojiiteam_02_4@2x.png',1,'','2000-01-01 00:00:00','2023-12-26 20:02:19'),
	 (1183,'ICON','plant','http://oss-beijing-m8.openstorage.cn/SparkBotProd/','icon/plant/emojiiteam_02_5@2x.png',1,'','2000-01-01 00:00:00','2023-12-26 20:02:19'),
	 (1185,'ICON','plant','http://oss-beijing-m8.openstorage.cn/SparkBotProd/','icon/plant/emojiiteam_02_6@2x.png',1,'','2000-01-01 00:00:00','2023-12-26 20:02:19'),
	 (1187,'ICON','plant','http://oss-beijing-m8.openstorage.cn/SparkBotProd/','icon/plant/emojiiteam_02_7@2x.png',1,'','2000-01-01 00:00:00','2023-12-26 20:02:19'),
	 (1189,'ICON','plant','http://oss-beijing-m8.openstorage.cn/SparkBotProd/','icon/plant/emojiiteam_02_8@2x.png',1,'','2000-01-01 00:00:00','2023-12-26 20:02:19'),
	 (1191,'ICON','plant','http://oss-beijing-m8.openstorage.cn/SparkBotProd/','icon/plant/emojiiteam_02_9@2x.png',1,'','2000-01-01 00:00:00','2023-12-26 20:02:20'),
	 (1193,'ICON','explore','http://oss-beijing-m8.openstorage.cn/SparkBotProd/','icon/explore/emojiitem_03_10@2x.png',1,'','2000-01-01 00:00:00','2023-12-26 20:02:20'),
	 (1195,'ICON','explore','http://oss-beijing-m8.openstorage.cn/SparkBotProd/','icon/explore/emojiitem_03_11@2x.png',1,'','2000-01-01 00:00:00','2023-12-26 20:02:20'),
	 (1197,'ICON','explore','http://oss-beijing-m8.openstorage.cn/SparkBotProd/','icon/explore/emojiitem_03_12@2x.png',1,'','2000-01-01 00:00:00','2023-12-26 20:02:20'),
	 (1199,'ICON','explore','http://oss-beijing-m8.openstorage.cn/SparkBotProd/','icon/explore/emojiitem_03_13@2x.png',1,'','2000-01-01 00:00:00','2023-12-26 20:02:20'),
	 (1201,'ICON','explore','http://oss-beijing-m8.openstorage.cn/SparkBotProd/','icon/explore/emojiitem_03_14@2x.png',1,'','2000-01-01 00:00:00','2023-12-26 20:02:20'),
	 (1203,'ICON','explore','http://oss-beijing-m8.openstorage.cn/SparkBotProd/','icon/explore/emojiitem_03_15@2x.png',1,'','2000-01-01 00:00:00','2023-12-26 20:02:20'),
	 (1205,'ICON','explore','http://oss-beijing-m8.openstorage.cn/SparkBotProd/','icon/explore/emojiitem_03_1@2x.png',1,'','2000-01-01 00:00:00','2023-12-26 20:02:20'),
	 (1207,'ICON','explore','http://oss-beijing-m8.openstorage.cn/SparkBotProd/','icon/explore/emojiitem_03_2@2x.png',1,'','2000-01-01 00:00:00','2023-12-26 20:02:20'),
	 (1209,'ICON','explore','http://oss-beijing-m8.openstorage.cn/SparkBotProd/','icon/explore/emojiitem_03_3@2x.png',1,'','2000-01-01 00:00:00','2023-12-26 20:02:20'),
	 (1211,'ICON','explore','http://oss-beijing-m8.openstorage.cn/SparkBotProd/','icon/explore/emojiitem_03_4@2x.png',1,'','2000-01-01 00:00:00','2023-12-26 20:02:20'),
	 (1213,'ICON','explore','http://oss-beijing-m8.openstorage.cn/SparkBotProd/','icon/explore/emojiitem_03_5@2x.png',1,'','2000-01-01 00:00:00','2023-12-26 20:02:20'),
	 (1215,'ICON','explore','http://oss-beijing-m8.openstorage.cn/SparkBotProd/','icon/explore/emojiitem_03_6@2x.png',1,'','2000-01-01 00:00:00','2023-12-26 20:02:20'),
	 (1217,'ICON','explore','http://oss-beijing-m8.openstorage.cn/SparkBotProd/','icon/explore/emojiitem_03_7@2x.png',1,'','2000-01-01 00:00:00','2023-12-26 20:02:20'),
	 (1219,'ICON','explore','http://oss-beijing-m8.openstorage.cn/SparkBotProd/','icon/explore/emojiitem_03_8@2x.png',1,'','2000-01-01 00:00:00','2023-12-26 20:02:21'),
	 (1221,'ICON','explore','http://oss-beijing-m8.openstorage.cn/SparkBotProd/','icon/explore/emojiitem_03_9@2x.png',1,'','2000-01-01 00:00:00','2023-12-26 20:02:21'),
	 (1223,'COLOR','1','#FFEAD5','',1,'','2000-01-01 00:00:00','2023-12-14 14:51:37'),
	 (1225,'COLOR','1','#E7FFD5','',1,'','2000-01-01 00:00:00','2023-12-14 14:51:46'),
	 (1227,'COLOR','1','#D5FFED','',1,'','2000-01-01 00:00:00','2023-12-14 14:51:46'),
	 (1229,'COLOR','1','#D5E8FF','',1,'','2000-01-01 00:00:00','2023-12-14 14:51:46'),
	 (1231,'COLOR','1','#DDD5FF','',1,'','2000-01-01 00:00:00','2023-12-14 14:51:46'),
	 (1233,'COLOR','1','#FFD5E2','',1,'','2000-01-01 00:00:00','2023-12-14 14:51:46'),
	 (1235,'COLOR','1','#DCDEE8','',1,'','2000-01-01 00:00:00','2023-12-14 14:51:46'),
	 (1237,'COLOR','1','#ECEEF6','',1,'','2000-01-01 00:00:00','2023-12-14 14:51:46'),
	 (1239,'DEFAULT_BOT_MODEL_CONFIG','1','默认模型配置','{"modelConfig":{"prePrompt":"","userInputForm":[],"speechToText":{"enabled":false},"suggestedQuestionsAfterAnswer":{"enabled":false},"retrieverResource":{"enabled":false},"conversationStarter":{"enabled":false,"openingRemark":""},"feedback":{"enabled":false,"like":{"enabled":false},"dislike":{"enabled":false}},"model":{"name":"spark_V3.5","model":"spark_V3.5","completionParams":{"maxTokens":512,"temperature":0.5}},"repoConfigs":{"topK":3,"scoreThreshold":0.3,"scoreThresholdEnabled":true,"reposet":[]}}}',1,'','2000-01-01 00:00:00','2024-04-25 15:36:43'),
	 (1243,'TOOL_ICON','tool','http://oss-beijing-m8.openstorage.cn/SparkBotProd/','icon/tool/tool01.png',1,'','2000-01-01 00:00:00','2024-01-23 17:42:52'),
	 (1245,'TOOL_ICON','tool','http://oss-beijing-m8.openstorage.cn/SparkBotProd/','icon/tool/tool02.png',1,'','2000-01-01 00:00:00','2024-01-23 17:42:52'),
	 (1247,'OPEN_API_REPO_APPID','1','开发接口过滤知识库ID新增APPID','453f52a2',1,'','2000-01-01 00:00:00','2024-05-21 16:18:27'),
	 (1249,'INNER_BOT','1','就餐助手','{"name":"就餐助手","code":1,"description":"就餐助手","avatarIcon":"http://oss-beijing-m8.openstorage.cn/SparkBotDev/icon/explore/emojiitem_03_9@2x.png","requestData":{"appid":"5d29ff2f","bot_id":"69027824b6eb4558a4e39060967ea87b","question":"","upstream_kwargs":{"432517259949379584":{"callType":"pc","userAccount":"qcliu"}}},"examples":["今天有什么菜？","今天的菜有土豆吗？","明天有什么吃的？"]}',0,'','2000-01-01 00:00:00','2024-05-13 16:17:28'),
	 (1251,'MODEL_LIST','spark_V3','星火大模型3.0','',1,'','2000-01-01 00:00:00','2024-04-18 15:30:31'),
	 (1253,'MODEL_LIST','spark_V3.5','星火大模型3.5','',1,'','2000-01-01 00:00:00','2024-04-18 15:30:23'),
	 (1255,'INNER_BOT','2','生活助手','{
  "name": "Life Assistant",
  "code": 2,
  "description": "Life Assistant",
  "avatarIcon": "http://oss-beijing-m8.openstorage.cn/SparkBotDev/icon/explore/emojiitem_03_9@2x.png",
  "requestData": {
    "appid": "5d29ff2f",
    "bot_id": "ae43a8b628d343d89f1cef5c4c0248a7",
    "question": "",
    "upstream_kwargs": {
      "420914424866541568": {
        "callType": "pc",
        "userAccount": "qcliu"
      }
    }
  },
  "examples": [
    "Help me find scenic spots in Anhui",
    "Check the weather for tomorrow",
    "How much is the high-speed train to Nanjing"
  ]
}',1,'','2000-01-01 00:00:00','2025-07-23 14:28:22'),
	 (1257,'INNER_BOT','3','工作助手','{"name":"工作助手","code":3,"description":"工作助手","avatarIcon":"http://oss-beijing-m8.openstorage.cn/SparkBotDev/icon/explore/emojiitem_03_9@2x.png","requestData":{"appid":"5d29ff2f","bot_id":"1075c67f3cfb4bb58df09dc7475851b8","question":"","upstream_kwargs":{"420914424866541568":{"callType":"pc","userAccount":"qcliu"}}},"examples":["帮我生成一个ppt","帮我生成一份简历 ","帮我生成一个思维导图"]}',0,'','2000-01-01 00:00:00','2024-05-13 16:19:28'),
	 (1259,'AUTH_APPLY','RECEIVER_EMAIL','','yachen11@iflytek.com',1,NULL,'2023-06-12 18:15:53','2024-05-12 16:06:57'),
	 (1261,'AUTH_APPLY','COPE_USER_EMAIL',NULL,'yxyan@iflytek.com,leifang10@iflytek.com',1,NULL,'2023-06-12 18:15:53','2025-03-27 16:28:38'),
	 (1263,'AUTH_APPLY','RECEIVER_ERROR_EMAIL',NULL,'tctan@iflytek.com',1,NULL,'2023-06-28 10:50:48','2024-04-29 17:35:39'),
	 (1265,'LLM','domain-open','开源模型domain','xscnllama38bi,llama3-70b-instruct,qwen-7b-instruct',1,NULL,'2000-01-01 00:00:00','2024-07-25 10:36:06'),
	 (1267,'LLM','domain','Spark3.5 Max','generalv3.5',1,'bm3.5','2000-01-01 00:00:00','2024-07-03 16:23:39'),
	 (1269,'LLM','domain','Spark Pro','generalv3',1,'bm3','2000-01-01 00:00:00','2024-07-03 16:23:35'),
	 (1271,'LLM','domain','Spark Lite','general',1,'cbm','2000-01-01 00:00:00','2024-07-03 16:23:26'),
	 (1273,'LLM_CHANNEL_DOMAIN','cbm','Spark Lite','general',1,NULL,'2000-01-01 00:00:00','2024-07-03 18:01:57'),
	 (1275,'LLM_CHANNEL_DOMAIN','bm3','Spark Pro','generalv3',1,NULL,'2000-01-01 00:00:00','2024-07-03 18:01:57'),
	 (1277,'LLM_CHANNEL_DOMAIN','bm3.5','Spark3.5 Max','generalv3.5',1,NULL,'2000-01-01 00:00:00','2024-07-03 18:01:57'),
	 (1279,'LLM_DOMAIN_CHANNEL','general','Spark Lite','cbm',1,NULL,'2000-01-01 00:00:00','2024-07-03 18:01:58'),
	 (1281,'LLM_DOMAIN_CHANNEL','generalv3','Spark Pro','bm3',1,NULL,'2000-01-01 00:00:00','2024-07-03 18:01:58'),
	 (1283,'LLM_DOMAIN_CHANNEL','generalv3.5','Spark3.5 Max','bm3.5',1,NULL,'2000-01-01 00:00:00','2024-07-03 18:01:58'),
	 (1285,'DEFAULT_BOT_MODEL_CONFIG','generalv3','默认模型配置','{
    "modelConfig": {
        "prePrompt": "",
        "userInputForm": [],
        "speechToText": {
            "enabled": false
        },
        "suggestedQuestionsAfterAnswer": {
            "enabled": false
        },
        "retrieverResource": {
            "enabled": false
        },
        "conversationStarter": {
            "enabled": false,
            "openingRemark": ""
        },
        "feedback": {
            "enabled": false,
            "like": {
                "enabled": false
            },
            "dislike": {
                "enabled": false
            }
        },
        "model": {
            "domain": "generalv3",
            "model": "generalv3",
            "completionParams": {
                "maxTokens": 512,
                "temperature": 0.5,
                "topK": 1
            },
            "api": "wss://spark-api.xf-yun.com/v3.1/chat",
            "llmId": 3,
            "llmSource": 1,
            "patchId": [
                "0"
            ]
        },
        "repoConfigs": {
            "topK": 3,
            "scoreThreshold": 0.3,
            "scoreThresholdEnabled": true,
            "reposet": []
        }
    }
}',0,'','2000-01-01 00:00:00','2024-06-26 17:54:40'),
	 (1287,'DEFAULT_BOT_MODEL_CONFIG','generalv3.5','默认模型配置','{
    "modelConfig": {
        "prePrompt": "",
        "userInputForm": [],
        "speechToText": {
            "enabled": false
        },
        "suggestedQuestionsAfterAnswer": {
            "enabled": false
        },
        "retrieverResource": {
            "enabled": true
        },
        "conversationStarter": {
            "enabled": false,
            "openingRemark": ""
        },
        "feedback": {
            "enabled": true,
            "like": {
                "enabled": true
            },
            "dislike": {
                "enabled": true
            }
        },
        "model": {
            "domain": "generalv3.5",
            "model": "generalv3.5",
            "completionParams": {
                "maxTokens": 512,
                "temperature": 0.5,
                "topK": 1
            },
            "api": "wss://spark-api.xf-yun.com/v3.5/chat",
            "llmId": 5,
            "llmSource": 1,
            "patchId": [
                "0"
            ]
        },
        "repoConfigs": {
            "topK": 3,
            "scoreThreshold": 0.4,
            "scoreThresholdEnabled": true,
            "reposet": []
        }
    }
}',0,'','2000-01-01 00:00:00','2024-06-26 17:54:40'),
	 (1289,'DEFAULT_BOT_MODEL_CONFIG','general','默认模型配置','{
    "modelConfig": {
        "prePrompt": "",
        "userInputForm": [],
        "speechToText": {
            "enabled": false
        },
        "suggestedQuestionsAfterAnswer": {
            "enabled": false
        },
        "retrieverResource": {
            "enabled": false
        },
        "conversationStarter": {
            "enabled": false,
            "openingRemark": ""
        },
        "feedback": {
            "enabled": false,
            "like": {
                "enabled": false
            },
            "dislike": {
                "enabled": false
            }
        },
        "model": {
            "domain": "general",
            "model": "general",
            "completionParams": {
                "maxTokens": 512,
                "temperature": 0.5,
                "topK": 1
            },
            "api": "wss://spark-api.xf-yun.com/v1.1/chat",
            "llmId": 1,
            "llmSource": 1,
            "patchId": [
                "0"
            ]
        },
        "repoConfigs": {
            "topK": 3,
            "scoreThreshold": 0.3,
            "scoreThresholdEnabled": true,
            "reposet": []
        }
    }
}',0,'','2000-01-01 00:00:00','2024-06-26 17:54:40'),
	 (1291,'TEMPLATE','prompt-enhance','1','You are a prompt optimization expert. You will be given the name and a brief description of an assistant. Based on this information, you need to generate an appropriate role description, detailed skill explanation, and related constraints for the assistant, outputting in Markdown format.

You should organize the output using the following structure:
````````````````````````````````````````````````markdown
## Role
You are a [assistant''s role], [assistant''s role description].

## Skills
1. [Skill 1 description]:
  - [Specific detail about skill 1].
  - [Specific detail about skill 1].
2. [Skill 2 description]:
  - [Specific detail about skill 2].
  - [Specific detail about skill 2].

## Limitations
- [Limitation 1 description].
- [Limitation 2 description].
````````````````````````````````````````````````

Here are some examples:

Example 1:
Input:
Assistant Name: Financial Analysis Assistant
Assistant Description: 1. Analyze the latest annual financial reports of listed companies; 2. Fetch the latest news of listed companies;

Output:
````````````````````````````````````````````````markdown
## Role
You are a financial analyst who leverages the latest information and data to analyze the financial health, market trends, and industry dynamics of companies to help clients make informed investment decisions.

## Skills
1. Analyze the latest annual financial reports of listed companies:
  - Use financial analysis tools and techniques to examine and interpret company financial statements in detail.
  - Assess the company’s financial health, including revenue, profit, balance sheet, cash flow, etc.
  - Analyze financial indicators such as profitability, solvency, turnover rates to evaluate performance and risk.
  - Compare the company’s performance with industry peers to gauge relative competitiveness.
2. Fetch the latest news of listed companies:
  - Use news sources and databases to regularly gather the latest news and announcements.
  - Analyze potential impacts of news on stock prices and investor sentiment.
  - Track major events like M&A, product launches, executive changes, and their implications on future prospects.
  - Combine financial and news analysis to provide comprehensive evaluations and investment suggestions.

## Limitations
- Only discuss topics related to financial analysis; decline unrelated questions.
- All output must strictly follow the given structure format.
- Analysis content must not exceed 100 words.
````````````````````````````````````````````````

Example 2:
Input:
Assistant Name: Frontend Development Assistant
Assistant Description: Your role is frontend development. You can help convert images into HTML pages, using Tailwind CSS for styling and Ant Design for UI components.

Output:
````````````````````````````````````````````````markdown
## Role
You are a frontend engineer capable of building websites and applications using HTML, CSS, and JavaScript.

## Skills
1. Convert images into HTML pages:
  - When users want to convert an image into an HTML page, you can build the page using HTML and CSS based on the image and user requirements.
  - Use Tailwind CSS to simplify styling, and Ant Design library to offer rich UI components.
  - Provide the completed page code for deployment or local preview.

2. Offer frontend development advice and assistance:
  - Provide helpful suggestions and support based on user inquiries related to frontend development.
  - Support HTML, CSS, JavaScript topics, as well as frontend tools and workflows.

## Limitations
- Only discuss frontend-related content; decline unrelated topics.
- All output must strictly follow the required structure format.
````````````````````````````````````````````````

Input:
Assistant Name: {assistant_name}
Assistant Description: {assistant_description}

Output:
',1,NULL,'2000-01-01 00:00:00','2025-07-23 14:31:33'),
	 (1293,'TEMPLATE','next-question-advice','1','You now need to generate three possible follow-up questions that a user might ask based on the given question. The response format should be a JSON array. Below are some example questions and answers:

Question: I’m hungry
Answer: [‘Are there any restaurants nearby?’, ‘Recommend something delicious.’, ‘Suggest some local snacks.’]

Now, based on the following question, provide an answer:
Question: {q}
Answer:',1,NULL,'2000-01-01 00:00:00','2025-07-23 14:32:21'),
	 (1295,'LLM','domain-filter','货架过滤器-domain维度','general,generalv3,generalv3.5,xscnllama38bi',1,'','2000-01-01 00:00:00','2024-05-29 14:25:52'),
	 (1297,'LLM','function-call','true','generalv3.5',1,'','2000-01-01 00:00:00','2024-06-07 15:30:54'),
	 (1299,'LLM','function-call','false','xscnllama38bi,xsfalcon7b,general,generalv3',1,'','2000-01-01 00:00:00','2024-06-07 15:30:50'),
	 (1301,'DOCUMENT_LINK','SparkBotHelpDoc','1','https://experience.pro.iflyaicloud.com/aicloud-sparkbot-doc/',1,'','2023-08-17 00:00:00','2023-09-19 14:55:17'),
	 (1303,'LLM','serviceId-filter','货架过滤器-serviceId维度','cbm,bm3,bm3.5,xscnllama38bi,xsfalcon7b,xsc4aicr35b',1,'','2000-01-01 00:00:00','2024-06-22 14:43:24'),
	 (1305,'SPECIAL_USER','1','特殊用户，目前包括段明，豪哥，天诚','1909,2229,1695',1,NULL,'2000-01-01 00:00:00','2024-06-27 10:35:20'),
	 (1307,'SPECIAL_MODEL','10000001','llama3-70b-instruct','{"llmSource":1,"llmId":10000001,"name":"llama3-70b-instruct","patchId":"0","domain":"llama3-70b-instruct","serviceId":"llama3-70b-instruct","status":1,"info":"","icon":"","tag":[],"url":"abc","modelId":0}',0,NULL,'2000-01-01 00:00:00','2025-03-24 19:52:28'),
	 (1309,'LLM','question-type','','general,generalv3',1,'','2000-01-01 00:00:00','2024-06-13 19:25:39'),
	 (1311,'PROMPT','judge-is-bot-create','判断是否是创建bot的prompt','system_template = """You are a bot creation decision assistant. Based on the user''s input, you need to determine whether the user intends to create or declare a bot assistant. The output format is as follows:
{
    "isCreateBot": "true/false"
}

Here are some examples:
Example 1:
Input:
You are a poster generation assistant.

Based on the above input, determine whether to create a bot:
{
    "isCreateBot": "true"
}

Example 2:
Input:
Hello

Based on the above input, determine whether to create a bot:
{
    "isCreateBot": "false"
}

Example 3:
Input:
You are a weather query assistant and can help me check the weather.

Based on the above input, determine whether to create a bot:
{
    "isCreateBot": "true"
}

Example 4:
Input:
Help me create a frontend development assistant.

Based on the above input, determine whether to create a bot:
{
    "isCreateBot": "true"
}
"""
human_template = f"""
Input:
{content}

Based on the above input, determine whether to create or declare a bot assistant:
"""',1,NULL,'2000-01-01 00:00:00','2025-07-23 14:33:24'),
	 (1313,'PROMPT','bot-name-desc','','You are a name and description generation assistant. You will receive a user-provided description of an assistant. Based on this information, you need to generate an appropriate name and role description for the assistant. The output format should be a standard JSON structure:
{
  "name": "Assistant''s Name",
  "desc": "Assistant''s Description"
}

Here are some examples:

Example 1:
Input:
You are a poster generation assistant.

Based on the above input, generate a name and role description:
{
  "name": "Poster Generation Assistant",
  "desc": "The Poster Generation Assistant can quickly generate various styles and themes of posters based on user needs and preferences. Whether it''s for business ads, event promotion, or personal use, this assistant provides satisfactory solutions."
}

Example 2:
Input:
You are a weather query assistant that can check the weather for a specified city on a specific date.

Based on the above input, generate a name and role description:
{
  "name": "Weather Query Assistant",
  "desc": "The Weather Query Assistant can accurately retrieve weather information for a specified city and date. Just enter the city name and date, and it will provide detailed weather forecasts."
}


Example 3:
Input:
Create a frontend development assistant.

Based on the above input, generate a name and role description:
{
  "name": "Frontend Development Assistant",
  "desc": "An assistant specialized in supporting frontend development, helping users with issues related to HTML, CSS, JavaScript, and more."
}

Input:
{content}

Based on the above input, generate a name and role description:
',1,NULL,'2000-01-01 00:00:00','2025-07-23 14:35:09'),
	 (1315,'PROMPT','bot-name-desc-prompt','','You are an assistant for name generation, description generation, and prompt optimization. You will receive a user-provided description of an assistant. Based on this information, you need to generate a suitable name, role description, and a Markdown-formatted prompt that includes the role, detailed skills, and related limitations. The output format should be a standard JSON structure:
{
    "name": "Assistant''s Name",
    "desc": "Assistant''s Description",
    "prompt": "````````````````````````````````````````````````markdown
## Role
You are a [assistant''s role], [assistant''s role description].

## Skills
1. [Skill 1 description]:
  - [Specific detail about skill 1].
  - [Specific detail about skill 1].
2. [Skill 2 description]:
  - [Specific detail about skill 2].
  - [Specific detail about skill 2].

## Limitations
- [Limitation 1 description].
- [Limitation 2 description].
````````````````````````````````````````````````"
}

Here are some examples:

Example 1:
Input:
You are a financial analysis assistant, capable of analyzing the latest annual reports of listed companies and retrieving the latest news of listed companies.

Based on the above input, generate name, role description, and prompt:
{
    "name": "Financial Analysis Assistant",
    "desc": "The Financial Analysis Assistant focuses on analyzing the latest annual reports of listed companies and retrieving and organizing the latest news about them. Whether you''re an investor, analyst, or just interested in the financial market, this assistant provides valuable insights and in-depth analysis.",
    "prompt": "````````````````````````````````````````````````markdown
## Role
You are a financial analysis assistant, focused on providing the latest financial report analysis and news tracking of listed companies for investors, analysts, and those interested in financial markets. Through in-depth data analysis and market tracking, you help users make smarter investment decisions.

## Skills
1. Analyze the latest annual reports of listed companies:
  - Use professional financial analysis tools to interpret annual financial statements, including but not limited to income statements, balance sheets, and cash flow statements.
  - Evaluate profitability, capital structure, cash flow status, and financial health to identify potential risks and opportunities.
  - Compare the company’s performance with industry peers to assess its competitive position.
  - Provide development forecasts and suggestions based on financial data.
2. Retrieve and organize the latest news of listed companies:
  - Monitor and collect news from major sources, social media, and corporate announcements in real time.
  - Filter and organize key information, such as major events, management changes, product launches, and assess their impact on stock prices and market sentiment.
  - Combine financial report analysis and news to provide multi-angle insights.
  - Update regularly to ensure users get the latest market developments and company updates.

## Limitations
- Only provides information and analysis related to listed company financials and news; does not cover private companies or specific stock investment advice.
- All analysis is based on publicly available data and information; no insider or undisclosed data involved.
- Results are for reference only; users should make decisions based on their own judgment and risk tolerance.
````````````````````````````````````````````````"
}

Example 2:
Input:
You are a weather query assistant that can query the weather for a specified city on a specified date.

Based on the above input, generate name, role description, and prompt:
{
    "name": "Weather Query Assistant",
    "desc": "The Weather Query Assistant can accurately query the weather of a specified city on a given date. Just input the city and date, and the assistant will return detailed weather forecast information.",
    "prompt": "````````````````````````````````````````````````markdown
## Role
You are a weather query expert capable of providing accurate and detailed weather forecasts.

## Skills
1. Query the weather of a specific city on a specific date:
  - When the user provides a city and a date, you return detailed forecast information for that day.
  - Forecast includes temperature, humidity, wind speed, wind direction, precipitation probability, etc.
  - You can also provide sunrise and sunset times and moon phase info.
2. Analyze weather trends:
  - Analyze and predict the weather trend for the next few days based on historical and real-time data.
  - Provide clothing and travel advice to help users prepare accordingly.

## Limitations
- Only discuss weather-related content and reject unrelated topics.
- All output must follow the required structure and format.
- Can only provide weather forecasts up to a specific date, not beyond that range.
````````````````````````````````````````````````"
}


Example 3:
Input:
You are a frontend development assistant.

Based on the above input, generate name, role description, and prompt:
{
    "name": "Frontend Development Assistant",
    "desc": "An assistant dedicated to helping with frontend development tasks, capable of solving various frontend issues, including but not limited to HTML, CSS, and JavaScript.",
    "prompt": "````````````````````````````````````````````````markdown
## Role
You are a frontend development assistant who provides support and solutions for frontend developers. Whether it’s HTML, CSS, or JavaScript, you can offer professional guidance.

## Skills
1. HTML support:
  - When users encounter HTML issues, you provide detailed explanations and solutions.
  - Help users understand HTML basics such as tags, attributes, and document structure.
  - Offer info on new features in HTML5 and how to use them.
2. CSS support:
  - Provide support for CSS basics such as selectors, box models, and layout strategies.
  - Offer insights on CSS3 features and their usage.
3. JavaScript support:
  - Answer JavaScript-related questions involving variables, functions, objects, arrays, etc.
  - Provide guidance on advanced JavaScript topics such as closures, prototypes, and async programming.
4. Frontend tools support:
  - Offer guidance on using frontend tools like version control systems (e.g., Git), package managers (e.g., npm), and build tools (e.g., Webpack).

## Limitations
- Only discuss frontend development topics and reject unrelated issues.
- All output must strictly follow the given format and structure.
````````````````````````````````````````````````"
}

Input:
{content}

Based on the above input, generate the name, role description, and markdown-formatted prompt:',1,NULL,'2000-01-01 00:00:00','2025-07-23 14:39:26'),
	 (1317,'PROMPT','bot-prologue-question','','You are an assistant for generating opening lines and preset questions. Next, you will receive a description of a task assistant. You need to adopt the role described and, speaking from the assistant’s perspective, generate an appropriate opening line. At the same time, you should generate several likely questions that users might ask, from the user’s perspective. The output format must be a standard JSON structure:

{
    "prologue": "Opening line content",
    "question": ["Question 1", "Question 2", "Question 3"]
}

Below are some examples:

Example 1:
Input description:
# Role
You are a bot that can help users earn money from home by providing various income methods and strategies, helping users achieve financial freedom.

## Skills
### Skill 1: Provide ways to make money
1. When users need ways to make money, you can suggest methods suited to their interests, skills, and available time, such as online freelancing, content creation, and e-commerce.
2. You must explain the process, precautions, and earning potential of each method to help users make informed choices.
3. You can also provide personalized advice and guidance based on users’ needs and situations.

### Skill 2: Provide money-making tips
1. When users need tips, you can offer practical strategies like increasing efficiency, cutting costs, and boosting income.
2. Explain the steps and important points for each tip so users can apply them effectively.
3. Give tailored advice based on user context.

### Skill 3: Provide startup guidance
1. When users seek startup guidance, you can share fundamental knowledge and approaches, such as how to choose a business idea, draft a business plan, and raise funds.
2. Detail the steps and precautions for each method.
3. Provide personalized guidance to help users reach their entrepreneurial goals.

## Limitations
- Only discuss money-making topics. Refuse unrelated questions.
- Output must follow the required format strictly.

Generated based on the above input:
{
    "prologue": "Hi, I’m a bot that can help you make money from home. Nice to meet you.",
    "question": ["How can I use your service to earn money from home?", "What suggestions and tips do you offer for earning money at home?", "How does your service help me achieve financial freedom?"]
}

Example 2:
Input description:
# Role: Excel All-in-One Assistant
## Profile
- Version: 1.0
- Language: Chinese
- Description: I am an Excel all-in-one assistant, specializing in solving Excel-related issues and providing efficient data handling solutions.

## Features
- Data Handling: Proficient in filtering, sorting, merging, splitting, pivot tables, etc., to help users process large amounts of data quickly.
- Formula Application: Expert in Excel formulas and functions to support complex calculations and deliver accurate results.
- Data Visualization: Skilled in charting features to help users present data clearly and beautifully.
- Automation: Familiar with Excel macros and VBA programming to automate tasks and improve efficiency.

## User Guide
1. Data Handling:
   - Use filters to extract specific data quickly.
   - Sort data in ascending or descending order.
   - Merge and split cells.
   - Use pivot tables to summarize and analyze large datasets.

2. Formula Application:
   - Use common formulas like SUM, AVERAGE, MAX, MIN, etc.
   - Use logical functions like IF, AND, OR.
   - Use VLOOKUP and HLOOKUP for data lookup and matching.
   - Use COUNTIF and SUMIF for conditional counting and summation.

3. Data Visualization:
   - Choose suitable chart types like bar, line, pie, etc., to display data.
   - Style and layout charts for better readability.
   - Add labels and legends to enhance chart clarity.

4. Automation:
   - Use macro recording to automate task sequences.
   - Use VBA to write custom macros for more complex tasks.
   - Apply macros and VBA scripts to Excel workbooks for greater productivity and accuracy.

## Tips
- Learn shortcuts to improve efficiency.
- Always back up original data before processing large datasets.
- Master advanced Excel features for complex tasks.
- Save your files regularly to avoid data loss.

Generated based on the above input:
{
    "prologue": "Hello, I’m an Excel all-in-one assistant who can help you solve Excel-related problems and provide efficient data processing solutions.",
    "question": ["How can I quickly handle large datasets?", "How do I perform complex calculations and analysis using Excel?", "How can I display data clearly and create beautiful charts?"]
}

You must follow the format above to output results.

Input description:
{content}

Based on the above input description, generate the opening line and preset questions:',1,NULL,'2000-01-01 00:00:00','2025-07-23 14:42:24'),
	 (1319,'INNER_BOT','interact','交互式创建','{
  "name": "Meal Assistant",
  "code": 1,
  "description": "Meal Assistant",
  "avatarIcon": "http://oss-beijing-m8.openstorage.cn/SparkBotDev/icon/explore/emojiitem_03_9@2x.png",
  "requestData": {
    "appid": "4d2e8665",
    "bot_id": "bedd1e25a11b41d487cc28f5de82695a",
    "question": "",
    "upstream_kwargs": {
      "420914424866541568": {
        "callType": "pc",
        "userAccount": "qcliu"
      }
    }
  },
  "examples": [
    "What dishes are available today?",
    "Are there potatoes on the menu today?",
    "What will be available to eat tomorrow?"
  ]
}',1,'','2000-01-01 00:00:00','2025-07-23 14:42:54'),
	 (1321,'DOCUMENT_LINK','ApiDoc','1','https://in.iflyaicloud.com/aicloud-sparkbot-doc/Docx/04-Sparkbot%20API%EF%BC%88%E4%B8%93%E4%B8%9A%E7%89%88%EF%BC%89/1.2.9_workflow_api.html',1,'','2023-08-17 00:00:00','2025-02-26 14:32:11'),
	 (1323,'CONSULT','RECEIVER_EMAIL','','rfge@iflytek.com',1,NULL,'2023-06-12 18:15:53','2024-06-24 10:04:09'),
	 (1325,'CONSULT','COPE_USER_EMAIL','','mkzhang4@iflytek.com,haojin@iflytek.com',1,NULL,'2023-06-12 18:15:53','2024-06-24 10:04:32'),
	 (1326,'TAG','BOT_TAGS','生活','',1,NULL,'2023-06-12 18:15:53','2024-06-07 16:59:24'),
	 (1327,'TAG','BOT_TAGS','教育','',1,NULL,'2023-06-12 18:15:53','2024-06-07 16:59:24'),
	 (1328,'TAG','TOOL_TAGS','生活','',0,NULL,'2023-06-12 18:15:53','2024-06-13 23:29:11'),
	 (1329,'TAG','TOOL_TAGS','旅行','',0,NULL,'2023-06-12 18:15:53','2024-06-13 23:29:11'),
	 (1331,'PROMPT','bot-name-desc-response','','system_template = """You are a bot creation inquiry assistant. You will receive user instructions for creating a bot. Based on this information, you need to generate the assistant''s name, description, and a reply to the user. The output format is as follows:
{
    "name": "Assistant Name",
    "description": "Description of the assistant",
    "response": "Reply to the user, ask whether the proposed name and description are acceptable, and then ask if the user wants to proceed with creating the bot."
}

Here are some examples:
Example 1:
Input:
Create a PPT generation assistant

Output:
{
    "name": "PPT Magic Assistant",
    "description": "This is a bot that helps you generate PPTs",
    "response": "Sure! I have a suggestion for this new bot.
Name: PPT Magic Assistant
Description: This is a bot that helps you generate PPTs.
If you agree with this name and description, I’ll start creating the bot, which will take about 30 seconds. Would you like to proceed with creating the PPT Magic Assistant?"
}

Example 2:
Input:
Create a weather query assistant

Output:
{
    "name": "Weather Buddy",
    "description": "A bot that provides accurate weather information for you",
    "response": "Sure! How about calling it ''Weather Buddy'', and the description could be ''A bot that provides accurate weather information for you''? Does that name and description work for you? If yes, I’ll begin creating the bot, which takes about 30 seconds. Shall I go ahead and create this ''Weather Buddy'' bot for you?"
}

Example 3:
Input:
Create an article generation assistant

Output:
{
    "name": "Creative Writer Star",
    "description": "An intelligent assistant that can quickly generate various types of articles",
    "response": "We could name it ''Creative Writer Star'', and the description could be ''An intelligent assistant that can quickly generate various types of articles''. Do you think this name and description match your needs? If so, I’ll proceed to create this ''Creative Writer Star'' bot, which will take around 30 seconds. Do you confirm creating this bot?"
}
"""

human_template = f"""
Input:
{content}

Output:
"""',1,NULL,'2000-01-01 00:00:00','2025-07-23 14:43:33'),
	 (1333,'PROMPT','judge-confirm-create-bot','','system_template = """You are a bot creation intent detection assistant. Based on the conversation history, you need to determine whether the user''s latest intent is to create or declare a bot assistant. The output format is as follows:
{
    "isCreateBot": "true/false"
}

Here are some examples:
Example 1:
Input:
history:
{"role": "assistant", "content": "Sure! I have a suggestion for your new bot.
Name: Code Elf
Description: This is a bot that assists you in writing code.
If you agree with this name and description, I''ll start creating the bot. Just note that the process takes about 30 seconds. Do you confirm creating this Code Elf bot?"}
{"role": "user", "content": "Hello"}

Determine from the above input whether to create the bot:
{
    "isCreateBot": "false"
}

Example 2:
Input:
history:
{"role": "assistant", "content": "Sure! How about calling it ''Weather Buddy'', described as ''a bot that provides you with real-time weather information''? Do you like the name and description? If yes, I''ll start creating it. It takes about 30 seconds."}
{"role": "user", "content": "Create"}

Determine from the above input whether to create the bot:
{
    "isCreateBot": "true"
}

Example 3:
Input:
history:
{"role": "assistant", "content": "Sure! I have a suggestion for this new bot.
Name: PPT Creation Elf
Description: This is a bot that helps you generate PPTs.
If you agree with the name and description, I''ll start creating the bot. The process will take about 30 seconds. Do you confirm creating the PPT Creation Elf bot?"}
{"role": "user", "content": "No"}

Determine from the above input whether to create the bot:
{
    "isCreateBot": "false"
}

Example 4:
Input:
history:
{"role": "assistant", "content": "Sure! I have an idea for this bot.
Name: Travel Info Expert
Description: A bot that can help you query all kinds of tourist attraction information.
Do you think the name and description are acceptable? If yes, I’ll begin creating it."}
{"role": "user", "content": "Okay"}

Determine from the above input whether to create the bot:
{
    "isCreateBot": "true"
}
"""

human_template = f"""
Input:
history:
{{"role": "assistant", "content": {assistant_content}}}
{{"role": "user", "content": {user_content}}}

Determine from the above input whether to create or declare a bot assistant:
"""',1,NULL,'2000-01-01 00:00:00','2025-07-23 14:44:13'),
	 (1335,'PROMPT','do-not-create-bot','','system_template = """You are a bot creation decision assistant. Based on the conversation history, you need to determine whether the user''s latest intent is to stop creating the bot assistant or if they are dissatisfied with the proposed name and description. The output format is as follows:
{
    "doNotCreateBot": "true/false",
    "response": "Respond to the user based on their intent"
}

Here are some examples:
Example 1:
Input:
history:
{"role": "assistant", "content": "Sure! I have a suggestion for your new bot.
Name: Code Elf
Description: This is a bot that helps you write code.
If you agree with this name and description, I''ll start creating the bot. Just note that the process takes about 30 seconds. Do you confirm creating this Code Elf bot?"}
{"role": "user", "content": "Hello"}

Output:
{
    "doNotCreateBot": "true",
    "response": "Hello! Is there anything I can help you with?"
}

Example 2:
Input:
history:
{"role": "assistant", "content": "Sure! How about calling it ''Weather Buddy'', described as ''a bot that provides you with real-time weather information''? Do you like the name and description? If yes, I’ll start creating the bot—it’ll take around 30 seconds."}
{"role": "user", "content": "Do not create"}

Output:
{
    "doNotCreateBot": "true",
    "response": "Okay. If you want to create a bot later, feel free to let me know anytime."
}

Example 3:
Input:
history:
{"role": "assistant", "content": "Sure! I have a suggestion for this new bot.
Name: PPT Creation Elf
Description: This is a bot that helps you generate PPTs.
If you agree with this name and description, I''ll start creating the bot. The process will take about 30 seconds. Do you confirm creating the PPT Creation Elf bot?"}
{"role": "user", "content": "Not acceptable"}

Output:
{
    "doNotCreateBot": "false",
    "response": "What are your specific requirements for the bot''s name and description?"
}
"""

human_template = f"""
Input:
history:
{{"role": "assistant", "content": {assistant_content}}}
{{"role": "user", "content": {user_content}}}

Output:
"""',1,NULL,'2000-01-01 00:00:00','2025-07-23 14:51:18'),
	 (1337,'PROMPT','update-name-desc-response','','system_template = """You are a bot creation inquiry assistant. You will receive the original assistant name and description, as well as the user''s modification request. Based on this information, you need to update the assistant''s name and description and generate a reply to the user. The output format is as follows:
{
    "name": "Assistant Name",
    "description": "Description of the assistant",
    "response": "Reply to the user, then ask whether the name and description are acceptable, and finally ask if the user wants to create this bot"
}

Here are some examples:
Example 1:
Input:
{
    "name": "Frontend Helper",
    "description": "This is a bot that can solve frontend-related problems and provide technical support.",
    "requirement": "Change the name to Frontend Master"
}

Output:
{
    "name": "Frontend Master",
    "description": "A master capable of handling all kinds of frontend tasks proficiently",
    "response": "How about changing the description to ''A master capable of handling all kinds of frontend tasks proficiently''? Does that sound good? If so, I’ll create the bot for you."
}

Example 2:
Input:
{
    "name": "Antique Appraiser",
    "description": "This is a bot that can help you identify antiques and provide related knowledge.",
    "requirement": "I want to name it Antique Expert"
}

Output:
{
    "name": "Antique Expert",
    "description": "A bot that professionally appraises antiques and provides detailed analysis",
    "response": "We could go with the description ''A bot that professionally appraises antiques and provides detailed analysis''. Are you happy with this name and description? If so, I’ll go ahead and create the bot."
}

Example 3:
Input:
{
    "name": "Antique Expert",
    "description": "A bot that professionally appraises antiques and provides detailed analysis",
    "requirement": "I want the description to be more detailed"
}

Output:
{
    "name": "Antique Expert",
    "description": "This is a bot that uses professional knowledge and extensive experience to accurately appraise various antiques and provide detailed analysis, offering you reliable evaluation results and comprehensive explanations of antique knowledge.",
    "response": "Name: Antique Expert\\nDescription: This is a bot that uses professional knowledge and extensive experience to accurately appraise various antiques and provide detailed analysis, offering you reliable evaluation results and comprehensive explanations of antique knowledge.\\nAre you satisfied with this name and description? If so, I will create this bot for you."
}
"""

human_template = f"""
Input:
{{
    "name": {name},
    "description": {description},
    "requirement": {content}
}}

Output:
"""',1,NULL,'2000-01-01 00:00:00','2025-07-23 14:51:48'),
	 (1339,'PROMPT','prologue','开场白生成','You are an assistant for generating opening lines. You will receive a description of a task assistant. Based on the role described, you need to generate an opening line as if you are the assistant.

Here are some examples:

Example 1:  
Input Description:  
Name: Work-from-Home Earnings Bot  
Description: A bot that helps users make money from home by providing various earning methods and strategies to achieve financial freedom.

Opening Line Generated Based on the Above:  
Hello, I’m a bot that can help you make money from home. I can offer various ways and strategies to help you achieve financial freedom. Nice to meet you.

Example 2:  
Input Description:  
Name: Excel All-in-One Assistant  
Description: Solves Excel-related issues and provides efficient data processing solutions.

Opening Line Generated Based on the Above:  
Hello, I’m an Excel All-in-One Assistant. I can help you solve Excel-related issues and offer efficient data processing solutions.

You must follow the format above to generate the output.

Input Description:  
Name: {name}  
Description: {desc}

Generate the opening line based on the input description:',1,NULL,'2000-01-01 00:00:00','2025-07-23 14:52:11'),
	 (1341,'LLM_FILTER','plan','大模型过滤器','generalv3,generalv3.5,4.0Ultra,pro-128k',0,'','2000-01-01 00:00:00','2025-04-29 10:04:05'),
	 (1345,'TAG','TOOL_TAGS','Transportation and Travel','',1,NULL,'2024-06-26 09:54:25','2025-07-23 14:54:03'),
	 (1347,'TAG','TOOL_TAGS','Leisure and Entertainment',NULL,1,NULL,'2024-06-26 09:54:25','2025-07-23 14:54:03'),
	 (1349,'TAG','TOOL_TAGS','Medical and Health',NULL,1,NULL,'2024-06-26 09:54:25','2025-07-23 14:54:03'),
	 (1351,'TAG','TOOL_TAGS','Film and Music',NULL,1,NULL,'2024-06-26 09:54:25','2025-07-23 14:54:03'),
	 (1353,'TAG','TOOL_TAGS','Education and Encyclopedia  ',NULL,1,NULL,'2024-06-26 09:54:25','2025-07-23 14:54:03'),
	 (1355,'TAG','TOOL_TAGS','News and Information ',NULL,1,NULL,'2024-06-26 09:54:25','2025-07-23 14:54:03'),
	 (1357,'TAG','TOOL_TAGS','Mother and Child',NULL,1,NULL,'2024-06-26 09:54:25','2025-07-23 14:54:03'),
	 (1359,'TAG','TOOL_TAGS','Daily Life Essentials',NULL,1,NULL,'2024-06-26 09:54:25','2025-07-23 14:54:03'),
	 (1361,'TAG','TOOL_TAGS','Finance and Investment',NULL,1,NULL,'2024-06-26 09:54:25','2025-07-23 14:54:03'),
	 (1363,'SPECIAL_MODEL_CONFIG','10000001','llama3-70b-instruct','{"patchId":null,"domain":"llama3-70b-instruct","appId":null,"name":"llama3-70b-instruct","id":10000001,"source":1,"serviceId":"llama3-70b-instruct","type":1,"serverId":"llama3-70b-instruct","config":{"serviceIdkeys":["bm3.5"],"serviceBlock":{"bm3.5":[{"fields":[{"standard":true,"constraintType":"range","default":2048,"constraintContent":[{"name":1},{"name":8192}],"name":"回答的tokens的最大长度","revealed":true,"support":true,"fieldType":"int","initialValue":2048,"key":"max_tokens","required":true,"desc":"最小值是1, 最大值是8192"},{"standard":true,"constraintContent":[{"name":0},{"name":1}],"precision":0.1,"required":true,"constraintType":"range","default":0.5,"name":"核采样阈值","revealed":true,"support":true,"fieldType":"float","initialValue":0.5,"key":"temperature","desc":"取值范围 (0，1]"},{"standard":true,"constraintType":"range","default":4,"constraintContent":[{"name":1},{"name":6}],"name":"从k个中随机选择一个(非等概率)","revealed":true,"support":true,"fieldType":"int","initialValue":4,"key":"top_k","required":true,"desc":"最小值1，最大值6"},{"constraintType":"enum","default":"default","constraintContent":[{"name":"strict","label":"strict","value":"strict","desc":"严格审核策略"},{"name":"moderate","label":"moderate","value":"moderate","desc":"中等审核策略"},{"name":"show","label":"show","value":"show","desc":"演示场景的审核策略"},{"name":"default","label":"default","value":"default","desc":"默认的审核策略"}],"name":"内容审核的严格程度","fieldType":"string","support":true,"initialValue":"default","required":false,"key":"auditing","desc":"strict表示严格审核策略；moderate表示中等审核策略；show表示演示场景审核策略；default表示默认的审核程度；（需继续下调策略需要申请）"},{"constraintType":"enum","default":"generalv3","constraintContent":[{"name":"generalv3","label":"generalv3","value":"generalv3","desc":"星火3.0"}],"name":"需要使用的领域","fieldType":"string","support":true,"initialValue":"generalv3","required":true,"key":"domain","desc":""}],"key":"generalv3"}]},"featureBlock":{},"payloadBlock":{},"acceptBlock":{},"protocolType":1,"serviceId":"bm3.5"},"url":"llama3-70b-instruct"}',1,NULL,'2000-01-01 00:00:00','2024-11-28 15:55:51'),
	 (1365,'PATCH_ID','0','','generalv3.5',1,'','2000-01-01 00:00:00','2024-06-26 17:24:48'),
	 (1367,'DEFAULT_BOT_MODEL_CONFIG','general','默认模型配置','{"modelConfig":{"prePrompt":"","userInputForm":[],"speechToText":{"enabled":false},"suggestedQuestionsAfterAnswer":{"enabled":false},"retrieverResource":{"enabled":false},"conversationStarter":{"enabled":false,"openingRemark":""},"feedback":{"enabled":false,"like":{"enabled":false},"dislike":{"enabled":false}},"repoConfigs":{"topK":3,"scoreThreshold":0.3,"scoreThresholdEnabled":true,"reposet":[]},"models":{"plan":{"domain":"general","model":"general","completionParams":{"maxTokens":512,"temperature":0.5,"topK":1},"api":"wss://spark-api.xf-yun.com/v1.1/chat","llmId":1,"llmSource":1,"serviceId":"cbm"},"summary":{"domain":"general","model":"general","completionParams":{"maxTokens":512,"temperature":0.5,"topK":1},"api":"wss://spark-api.xf-yun.com/v1.1/chat","llmId":1,"llmSource":1,"serviceId":"cbm"}}}}',1,'','2000-01-01 00:00:00','2024-07-11 14:41:38'),
	 (1369,'DEFAULT_BOT_MODEL_CONFIG','generalv3','默认模型配置','{"modelConfig":{"prePrompt":"","userInputForm":[],"speechToText":{"enabled":false},"suggestedQuestionsAfterAnswer":{"enabled":false},"retrieverResource":{"enabled":false},"conversationStarter":{"enabled":false,"openingRemark":""},"feedback":{"enabled":false,"like":{"enabled":false},"dislike":{"enabled":false}},"models":{"plan":{"domain":"generalv3","model":"generalv3","completionParams":{"maxTokens":512,"temperature":0.5,"topK":1},"api":"wss://spark-api.xf-yun.com/v3.1/chat","llmId":3,"llmSource":1,"serviceId":"bm3"},"summary":{"domain":"generalv3","model":"generalv3","completionParams":{"maxTokens":512,"temperature":0.5,"topK":1},"api":"wss://spark-api.xf-yun.com/v3.1/chat","llmId":3,"llmSource":1,"serviceId":"bm3"}},"repoConfigs":{"topK":3,"scoreThreshold":0.3,"scoreThresholdEnabled":true,"reposet":[]}}}',1,'','2000-01-01 00:00:00','2024-07-11 14:42:08'),
	 (1371,'DEFAULT_BOT_MODEL_CONFIG','generalv3.5','默认模型配置','{"modelConfig":{"prePrompt":"","userInputForm":[],"speechToText":{"enabled":false},"suggestedQuestionsAfterAnswer":{"enabled":false},"retrieverResource":{"enabled":false},"conversationStarter":{"enabled":false,"openingRemark":""},"feedback":{"enabled":false,"like":{"enabled":false},"dislike":{"enabled":false}},"models":{"plan":{"domain":"generalv3.5","model":"generalv3.5","completionParams":{"maxTokens":512,"temperature":0.5,"topK":1},"api":"wss://spark-api.xf-yun.com/v3.5/chat","llmId":5,"llmSource":1,"patchId":["0"],"serviceId":"bm3.5"},"summary":{"domain":"generalv3.5","model":"generalv3.5","completionParams":{"maxTokens":512,"temperature":0.5,"topK":1},"api":"wss://spark-api.xf-yun.com/v3.5/chat","llmId":5,"llmSource":1,"patchId":["0"],"serviceId":"bm3.5"}},"repoConfigs":{"topK":3,"scoreThreshold":0.3,"scoreThresholdEnabled":true,"reposet":[]}}}',1,'','2000-01-01 00:00:00','2024-07-11 14:42:37'),
	 (1373,'LLM','finetune','','cbm,bm3',1,'','2000-01-01 00:00:00','2024-07-01 17:37:13'),
	 (1375,'LLM','domain','Spark4.0 Ultra','4.0Ultra',1,'bm4','2000-01-01 00:00:00','2024-07-03 17:48:23'),
	 (1377,'LLM_CHANNEL_DOMAIN','bm4','Spark4.0 Ultra','4.0Ultra',1,NULL,'2000-01-01 00:00:00','2024-07-03 17:51:58'),
	 (1379,'DEFAULT_BOT_MODEL_CONFIG','4.0Ultra','默认模型配置','{"modelConfig":{"prePrompt":"","userInputForm":[],"speechToText":{"enabled":false},"suggestedQuestionsAfterAnswer":{"enabled":false},"retrieverResource":{"enabled":false},"conversationStarter":{"enabled":false,"openingRemark":""},"feedback":{"enabled":false,"like":{"enabled":false},"dislike":{"enabled":false}},"models":{"plan":{"domain":"4.0Ultra","model":"4.0Ultra","completionParams":{"maxTokens":512,"temperature":0.5,"topK":1},"api":"wss://spark-api.xf-yun.com/v4.0/chat","llmId":110,"llmSource":1,"patchId":["0"],"serviceId":"bm4"},"summary":{"domain":"4.0Ultra","model":"4.0Ultra","completionParams":{"maxTokens":512,"temperature":0.5,"topK":1},"api":"wss://spark-api.xf-yun.com/v4.0/chat","llmId":110,"llmSource":1,"patchId":["0"],"serviceId":"bm4"}},"repoConfigs":{"topK":3,"scoreThreshold":0.3,"scoreThresholdEnabled":true,"reposet":[]}}}',1,'','2000-01-01 00:00:00','2024-07-11 14:43:02'),
	 (1381,'LLM_DOMAIN_CHANNEL','4.0Ultra','Spark4.0 Ultra','bm4',1,NULL,'2000-01-01 00:00:00','2024-07-03 17:52:00'),
	 (1383,'LLM_FILTER','plan','大模型过滤器','xdeepseekr1,xdeepseekv3,x1,xop3qwen30b,xop3qwen235b,bm4',1,'bm3,bm3.5,bm4,pro-128k,xqwen257bchat,xqwen72bchat,xqwen257bchat,xsparkprox,xdeepseekr1,xdeepseekv3','2000-01-01 00:00:00','2025-05-21 15:37:39'),
	 (1385,'LLM_FILTER','summary','大模型过滤器','xdeepseekr1,xdeepseekv3,x1,xop3qwen30b,xop3qwen235b,bm4',1,'bm3,bm3.5,bm4,pro-128k,xqwen257bchat,xqwen72bchat,xqwen257bchat,xsparkprox,xdeepseekr1,xdeepseekv3','2000-01-01 00:00:00','2025-05-21 15:37:40'),
	 (1387,'LLM','base-model','cbm','general',1,'Spark Lite','2000-01-01 00:00:00','2024-07-08 11:05:19'),
	 (1389,'LLM','base-model','bm3','generalv3',1,'Spark Pro','2000-01-01 00:00:00','2024-07-08 11:06:14'),
	 (1391,'LLM','base-model','bm3.5','generalv3.5',1,'Spark Max','2000-01-01 00:00:00','2024-07-08 11:06:19'),
	 (1393,'LLM','base-model','bm4','4.0Ultra',1,'Spark4.0 Ultra','2000-01-01 00:00:00','2024-07-08 11:06:09'),
	 (1395,'SPECIAL_MODEL','10000002','qwen-7b-instruct','{"llmSource":1,"llmId":10000002,"name":"qwen-7b-instruct","patchId":"0","domain":"qwen-7b-instruct","serviceId":"qwen-7b-instruct","status":1,"info":"","icon":"","tag":[],"url":"abc","modelId":0}',0,NULL,'2000-01-01 00:00:00','2025-03-24 19:52:28'),
	 (1397,'SPECIAL_MODEL_CONFIG','10000002','qwen-7b-instruct','{"patchId":null,"domain":"qwen-7b-instruct","appId":null,"name":"qwen-7b-instruct","id":10000002,"source":1,"serviceId":"qwen-7b-instruct","type":1,"serverId":"qwen-7b-instruct","config":{"serviceIdkeys":["bm3.5"],"serviceBlock":{"bm3.5":[{"fields":[{"standard":true,"constraintType":"range","default":2048,"constraintContent":[{"name":1},{"name":8192}],"name":"最大回复长度","revealed":true,"support":true,"fieldType":"int","initialValue":2048,"key":"max_tokens","required":true,"desc":"最小值是1, 最大值是8192。控制模型输出的Tokens 长度上限。通常 100 Tokens 约等于150 个中文汉字。"},{"standard":true,"constraintContent":[{"name":0},{"name":1}],"precision":0.1,"required":true,"constraintType":"range","default":0.5,"name":"核采样阈值","revealed":true,"support":true,"fieldType":"float","initialValue":0.5,"key":"temperature","desc":"取值范围 (0，1]。用于决定结果随机性，取值越高随机性越强即相同的问题得到的不同答案的可能性越高"},{"standard":true,"constraintType":"range","default":4,"constraintContent":[{"name":1},{"name":6}],"name":"生成多样性","revealed":true,"support":true,"fieldType":"int","initialValue":4,"key":"top_k","required":true,"desc":"\\"调高会使得模型的输出更多样性和创新性，反之，降低会使输出内容更加遵循指令要求但减少多样性。最小值1，最大值6"},{"constraintType":"enum","default":"default","constraintContent":[{"name":"strict","label":"strict","value":"strict","desc":"严格审核策略"},{"name":"moderate","label":"moderate","value":"moderate","desc":"中等审核策略"},{"name":"show","label":"show","value":"show","desc":"演示场景的审核策略"},{"name":"default","label":"default","value":"default","desc":"默认的审核策略"}],"name":"内容审核的严格程度","fieldType":"string","support":true,"initialValue":"default","required":false,"key":"auditing","desc":"strict表示严格审核策略；moderate表示中等审核策略；show表示演示场景审核策略；default表示默认的审核程度；（需继续下调策略需要申请）"},{"constraintType":"enum","default":"generalv3","constraintContent":[{"name":"generalv3","label":"generalv3","value":"generalv3","desc":"星火3.0"}],"name":"需要使用的领域","fieldType":"string","support":true,"initialValue":"generalv3","required":true,"key":"domain","desc":""}],"key":"generalv3"}]},"featureBlock":{},"payloadBlock":{},"acceptBlock":{},"protocolType":1,"serviceId":"bm3.5"},"url":"qwen-7b-instruct"}',1,NULL,'2000-01-01 00:00:00','2024-11-28 15:56:36'),
	 (1399,'LLM_SCENE_FILTER','workflow','iflyaicloud','lmg5gtbs0,lmyvosz36,lm0dy3kv0,lm479a5b8,lme990528,lmxa5e22s,lmt4do9o3,lm1evo7j,lmy3b394q,lmt2br78l,lm4rar7p2,lmt2br78l,lm4onxj7h,lme693475,lmbXtIcNp,lm27ebHkj,lm9ze3hwc',1,NULL,'2000-01-01 00:00:00','2025-02-27 19:15:13'),
	 (1401,'gemma','url',NULL,'1',0,NULL,'2000-01-01 00:00:00','2024-11-21 16:48:20'),
	 (1403,'display','0828',NULL,'0',1,NULL,'2000-01-01 00:00:00','2024-08-26 20:34:56'),
	 (1405,'EFFECT_EVAL','base-model-list-filter','1','gemma_2b_chat,gemma2_9b_it',1,NULL,'2000-01-01 00:00:00','2024-09-10 16:09:15'),
	 (1407,'DOCUMENT_LINK','eval-set-template','1','https://oss-beijing-m8.openstorage.cn/pro-bucket/sparkBot/common/%E6%A8%A1%E7%89%88.csv',1,'','2023-08-17 00:00:00','2024-08-27 11:13:38'),
	 (1409,'MODEL_TRAIN_TYPE','2423718913705984','gemma_2b','0',1,NULL,'2000-01-01 00:00:00','2024-09-11 16:41:20'),
	 (1411,'MODEL_TRAIN_TYPE','2425335862888448','gemma_9b','1',1,NULL,'2000-01-01 00:00:00','2024-09-11 16:41:20'),
	 (1413,'SPECIAL_MODEL','10000003','xqwen257bchat','{"llmSource":1,"llmId":10000003,"name":"xqwen257bchat","patchId":"0","domain":"xqwen257bchat","serviceId":"xqwen257bchat","status":1,"info":"","icon":"","tag":[],"url":"wss://xingchen-api.cn-huabei-1.xf-yun.com/v1.1/chat","modelId":0}',0,'','2000-01-01 00:00:00','2025-03-24 19:52:28'),
	 (1415,'SPECIAL_MODEL_CONFIG','10000003','xqwen257bchat','{"patchId":null,"domain":"xqwen257bchat","appId":null,"name":"xqwen257bchat","id":127,"source":1,"serviceId":"xqwen257bchat","type":1,"serverId":"xqwen257bchat","config":{"serviceIdkeys":["xqwen257bchat"],"serviceBlock":{"xqwen257bchat":[{"fields":[{"standard":true,"constraintType":"range","default":2048,"constraintContent":[{"name":1},{"name":8192}],"name":"最大回复长度","revealed":true,"support":true,"fieldType":"int","initialValue":2048,"key":"max_tokens","required":true,"desc":"最小值是1, 最大值是8192。控制模型输出的Tokens 长度上限。通常 100 Tokens 约等于150 个中文汉字。"},{"standard":true,"constraintContent":[{"name":0},{"name":1}],"precision":0.1,"required":true,"constraintType":"range","default":0.5,"name":"核采样阈值","revealed":true,"support":true,"fieldType":"float","initialValue":0.5,"key":"temperature","desc":"取值范围 (0，1]。用于决定结果随机性，取值越高随机性越强即相同的问题得到的不同答案的可能性越高"},{"standard":true,"constraintType":"range","default":4,"constraintContent":[{"name":1},{"name":6}],"name":"生成多样性","revealed":true,"support":true,"fieldType":"int","initialValue":4,"key":"top_k","required":true,"desc":"\\"调高会使得模型的输出更多样性和创新性，反之，降低会使输出内容更加遵循指令要求但减少多样性。最小值1，最大值6"},{"constraintType":"enum","default":"default","constraintContent":[{"name":"strict","label":"strict","value":"strict","desc":"严格审核策略"},{"name":"moderate","label":"moderate","value":"moderate","desc":"中等审核策略"},{"name":"show","label":"show","value":"show","desc":"演示场景的审核策略"},{"name":"default","label":"default","value":"default","desc":"默认的审核策略"}],"name":"内容审核的严格程度","fieldType":"string","support":true,"initialValue":"default","required":false,"key":"auditing","desc":"strict表示严格审核策略；moderate表示中等审核策略；show表示演示场景审核策略；default表示默认的审核程度；（需继续下调策略需要申请）"},{"constraintType":"enum","default":"xqwen257bchat","constraintContent":[{"name":"generalv3","label":"generalv3","value":"generalv3","desc":"星火3.0"}],"name":"需要使用的领域","fieldType":"string","support":true,"initialValue":"xqwen257bchat","required":true,"key":"domain","desc":""}],"key":"xqwen257bchat"}]},"featureBlock":{},"payloadBlock":{},"acceptBlock":{},"protocolType":1,"serviceId":"xqwen257bchat"},"url":"wss://maas-api.cn-huabei-1.xf-yun.com/v1.1/chat"}',1,'','2000-01-01 00:00:00','2024-12-11 11:17:01'),
	 (1417,'SPECIAL_MODEL','10000004','xqwen72bchat','{"llmSource":1,"llmId":10000004,"name":"xqwen72bchat","patchId":"0","domain":"xqwen72bchat","serviceId":"xqwen72bchat","status":1,"info":"","icon":"","tag":[],"url":"wss://xingchen-api.cn-huabei-1.xf-yun.com/v1.1/chat","modelId":0}',0,'','2000-01-01 00:00:00','2024-10-15 15:44:09'),
	 (1419,'SPECIAL_MODEL_CONFIG','10000004','xqwen72bchat','{"patchId":null,"domain":"xqwen72bchat","appId":null,"name":"xqwen72bchat","id":125,"source":1,"serviceId":"xqwen72bchat","type":1,"serverId":"xqwen72bchat","config":{"serviceIdkeys":["xqwen72bchat"],"serviceBlock":{"xqwen72bchat":[{"fields":[{"standard":true,"constraintType":"range","default":2048,"constraintContent":[{"name":1},{"name":8192}],"name":"最大回复长度","revealed":true,"support":true,"fieldType":"int","initialValue":2048,"key":"max_tokens","required":true,"desc":"最小值是1, 最大值是8192。控制模型输出的Tokens 长度上限。通常 100 Tokens 约等于150 个中文汉字。"},{"standard":true,"constraintContent":[{"name":0},{"name":1}],"precision":0.1,"required":true,"constraintType":"range","default":0.5,"name":"核采样阈值","revealed":true,"support":true,"fieldType":"float","initialValue":0.5,"key":"temperature","desc":"取值范围 (0，1]。用于决定结果随机性，取值越高随机性越强即相同的问题得到的不同答案的可能性越高"},{"standard":true,"constraintType":"range","default":4,"constraintContent":[{"name":1},{"name":6}],"name":"生成多样性","revealed":true,"support":true,"fieldType":"int","initialValue":4,"key":"top_k","required":true,"desc":"\\"调高会使得模型的输出更多样性和创新性，反之，降低会使输出内容更加遵循指令要求但减少多样性。最小值1，最大值6"},{"constraintType":"enum","default":"default","constraintContent":[{"name":"strict","label":"strict","value":"strict","desc":"严格审核策略"},{"name":"moderate","label":"moderate","value":"moderate","desc":"中等审核策略"},{"name":"show","label":"show","value":"show","desc":"演示场景的审核策略"},{"name":"default","label":"default","value":"default","desc":"默认的审核策略"}],"name":"内容审核的严格程度","fieldType":"string","support":true,"initialValue":"default","required":false,"key":"auditing","desc":"strict表示严格审核策略；moderate表示中等审核策略；show表示演示场景审核策略；default表示默认的审核程度；（需继续下调策略需要申请）"},{"constraintType":"enum","default":"xqwen72bchat","constraintContent":[{"name":"generalv3","label":"generalv3","value":"generalv3","desc":"星火3.0"}],"name":"需要使用的领域","fieldType":"string","support":true,"initialValue":"xqwen72bchat","required":true,"key":"domain","desc":""}],"key":"xqwen72bchat"}]},"featureBlock":{},"payloadBlock":{},"acceptBlock":{},"protocolType":1,"serviceId":"xqwen72bchat"},"url":"wss://xingchen-api.cn-huabei-1.xf-yun.com/v1.1/chat"}',0,'','2000-01-01 00:00:00','2024-11-28 16:00:00'),
	 (1421,'WORKFLOW_NODE_TEMPLATE','1,2','固定节点','{
    "idType": "node-start",
    "type": "开始节点",
    "position":
    {
        "x": 100,
        "y": 300
    },
    "data":
    {
        "label": "Start",
        "description": "The starting node of the workflow, used to define the business variable information required for process invocation.",
        "nodeMeta":
        {
            "nodeType": "基础节点",
            "aliasName": "开始节点"
        },
        "inputs":
        [],
        "outputs":
        [
            {
                "id": "",
                "name": "AGENT_USER_INPUT",
                "deleteDisabled": true,
                "required": true,
                "schema":
                {
                    "type": "string",
                    "default": "User input of the current conversation round"
                }
            }
        ],
        "nodeParam":
        {},
        "allowInputReference": false,
        "allowOutputReference": true,
        "icon": "https://oss-beijing-m8.openstorage.cn/pro-bucket/sparkBot/common/workflow/icon/start-node-icon.png"
    }
}',1,'开始节点','2000-01-01 00:00:00','2025-07-28 10:25:46'),
	 (1423,'WORKFLOW_NODE_TEMPLATE','1,2','固定节点','{
    "idType": "node-end",
    "type": "结束节点",
    "position":
    {
        "x": 1000,
        "y": 300
    },
    "data":
    {
        "label": "End",
        "description": "The end node of the workflow, used to output the final result after the workflow execution.",
        "nodeMeta":
        {
            "nodeType": "基础节点",
            "aliasName": "结束节点"
        },
        "inputs":
        [
            {
                "id": "",
                "name": "output",
                "schema":
                {
                    "type": "string",
                    "value":
                    {
                        "type": "ref",
                        "content":
                        {}
                    }
                }
            }
        ],
        "outputs":
        [],
        "nodeParam":
        {
            "outputMode": 1,
            "template": "",
            "streamOutput": true
        },
        "references":
        [],
        "allowInputReference": true,
        "allowOutputReference": false,
        "icon": "https://oss-beijing-m8.openstorage.cn/pro-bucket/sparkBot/common/workflow/icon/end-node-icon.png"
    }
}',1,'结束节点','2000-01-01 00:00:00','2025-07-28 10:25:46'),
	 (1425,'WORKFLOW_NODE_TEMPLATE','1,2','Basic Node','{
    "idType": "spark-llm",
    "nodeType": "基础节点",
    "aliasName": "Large Model",
    "description": "Based on the input prompt, the selected large language model will be invoked to respond accordingly.",
    "data": {
        "nodeMeta": {
            "nodeType": "Basic Node",
            "aliasName": "大模型"
        },
        "inputs": [
            {
                "id": "",
                "name": "input",
                "schema": {
                    "type": "string",
                    "value": {
                        "type": "ref",
                        "content": {}
                    }
                }
            }
        ],
        "outputs": [
            {
                "id": "",
                "name": "output",
                "schema": {
                    "type": "string",
                    "default": ""
                }
            }
        ],
        "nodeParam": {
            "maxTokens": 2048,
            "temperature": 0.5,
            "topK": 4,
            "auditing": "default",
            "domain": "4.0Ultra",
            "template": "",
            "model": "spark",
            "serviceId": "bm4",
            "respFormat": 0,
            "llmId": 110,
            "patchId": "0",
            "url": "wss://spark-api.xf-yun.com/v4.0/chat",
            "appId": "d1590f30",
            "uid": "2171",
            "enableChatHistoryV2": {
                "isEnabled": false,
                "rounds": 1
            }
        },
        "references": [],
        "allowInputReference": true,
        "allowOutputReference": true,
        "icon": "https://oss-beijing-m8.openstorage.cn/pro-bucket/sparkBot/common/workflow/icon/largeModelIcon.png"
    }
}',1,'大模型','2000-01-01 00:00:00','2025-07-28 10:18:24'),
	 (1427,'WORKFLOW_NODE_TEMPLATE','1,2','Basic Node','{
    "idType": "ifly-code",
    "nodeType": "Basic Node",
    "aliasName": "Code",
    "description": "Provides code development capability for developers, currently only supports Python language. Allows parameters to be passed in using defined variables, and the return statement is used to output the result of the function.",
    "data": {
        "nodeMeta": {
            "nodeType": "工具",
            "aliasName": "代码"
        },
        "inputs": [
            {
                "id": "",
                "name": "input",
                "schema": {
                    "type": "string",
                    "value": {
                        "type": "ref",
                        "content": {}
                    }
                }
            }
        ],
        "outputs": [
            {
                "id": "",
                "name": "key0",
                "schema": {
                    "type": "string",
                    "default": ""
                }
            },
            {
                "id": "",
                "name": "key1",
                "schema": {
                    "type": "array-string",
                    "default": ""
                }
            },
            {
                "id": "",
                "name": "key2",
                "schema": {
                    "type": "object",
                    "default": "",
                    "properties": [
                        {
                            "id": "",
                            "name": "key21",
                            "type": "string",
                            "default": "",
                            "required": true,
                            "nameErrMsg": ""
                        }
                    ]
                }
            }
        ],
        "nodeParam": {
            "code": "def main(input):\\n    ret = {\\n        \\"key0\\": input + \\"hello\\",\\n        \\"key1\\": [\\"hello\\", \\"world\\"],\\n        \\"key2\\": {\\"key21\\": \\"hi\\"}\\n    }\\n    return ret"
        },
        "references": [],
        "allowInputReference": true,
        "allowOutputReference": true,
        "icon": "https://oss-beijing-m8.openstorage.cn/pro-bucket/sparkBot/common/workflow/icon/codeIcon.png"
    }
}',1,'代码','2000-01-01 00:00:00','2025-07-28 10:18:24'),
	 (1429,'WORKFLOW_NODE_TEMPLATE','1,2','Basic Node','{
    "idType": "knowledge-base",
    "nodeType": "Basic Node",
    "aliasName": "Knowledge Base",
    "description": "Calls the knowledge base and allows specifying a knowledge repository for information retrieval and response.",
    "data": {
        "nodeMeta": {
            "nodeType": "工具",
            "aliasName": "知识库"
        },
        "inputs": [
            {
                "id": "",
                "name": "query",
                "schema": {
                    "type": "string",
                    "value": {
                        "type": "ref",
                        "content": {}
                    }
                }
            }
        ],
        "outputs": [
            {
                "id": "",
                "name": "results",
                "schema": {
                    "type": "array-object",
                    "properties": [
                        {
                            "id": "",
                            "name": "score",
                            "type": "number",
                            "default": "",
                            "required": true,
                            "nameErrMsg": ""
                        },
                        {
                            "id": "",
                            "name": "docId",
                            "type": "string",
                            "default": "",
                            "required": true,
                            "nameErrMsg": ""
                        },
                        {
                            "id": "",
                            "name": "title",
                            "type": "string",
                            "default": "",
                            "required": true,
                            "nameErrMsg": ""
                        },
                        {
                            "id": "",
                            "name": "content",
                            "type": "string",
                            "default": "",
                            "required": true,
                            "nameErrMsg": ""
                        },
                        {
                            "id": "",
                            "name": "context",
                            "type": "string",
                            "default": "",
                            "required": true,
                            "nameErrMsg": ""
                        },
                        {
                            "id": "",
                            "name": "references",
                            "type": "object",
                            "default": "",
                            "required": true,
                            "nameErrMsg": ""
                        }
                    ]
                },
                "required": true,
                "nameErrMsg": ""
            }
        ],
        "nodeParam": {
            "repoId": [],
            "repoList": [],
            "topN": 3
        },
        "references": [],
        "allowInputReference": true,
        "allowOutputReference": true,
        "icon": "https://oss-beijing-m8.openstorage.cn/pro-bucket/sparkBot/common/workflow/icon/knowledgeIcon.png"
    }
}',1,'知识库','2000-01-01 00:00:00','2025-07-28 10:18:24'),
	 (1431,'WORKFLOW_NODE_TEMPLATE','1,2','Tool','{
    "idType": "flow",
    "nodeType": "Tool",
    "aliasName": "Workflow",
    "description": "Quickly integrate published workflows for efficient reuse of existing capabilities.",
    "data": {
        "nodeMeta": {
            "nodeType": "工具",
            "aliasName": "工作流"
        },
        "inputs": [],
        "outputs": [],
        "nodeParam": {
            "appId": "",
            "flowId": "",
            "uid": ""
        },
        "references": [],
        "allowInputReference": true,
        "allowOutputReference": true,
        "icon": "https://oss-beijing-m8.openstorage.cn/pro-bucket/sparkBot/common/workflow/icon/flow-icon.png"
    }
}',1,'工作流','2000-01-01 00:00:00','2025-07-28 10:18:24'),
	 (1433,'WORKFLOW_NODE_TEMPLATE','1,2','Logic','{
    "idType": "decision-making",
    "nodeType": "Basic Node",
    "aliasName": "Decision",
    "description": "Determine the subsequent logic path based on input parameters and the specified intents.",
    "data": {
        "nodeMeta": {
            "nodeType": "基础节点",
            "aliasName": "决策"
        },
        "nodeParam": {
            "maxTokens": 2048,
            "temperature": 0.5,
            "topK": 4,
            "auditing": "default",
            "domain": "4.0Ultra",
            "llmId": 110,
            "enableChatHistoryV2": {
                "isEnabled": false,
                "rounds": 1
            },
            "uid": "2171",
            "intentChains": [
                {
                    "intentType": 2,
                    "name": "",
                    "description": "",
                    "id": "intent-one-of::4724514d-ffc8-4412-bf7f-13cc3375110d"
                },
                {
                    "intentType": 1,
                    "name": "default",
                    "description": "Default intent",
                    "id": "intent-one-of::506841e4-3f6c-40b1-a804-dc5ffe723b34"
                }
            ],
            "reasonMode": 1,
            "model": "spark",
            "useFunctionCall": true,
            "serviceId": "bm4",
            "promptPrefix": "",
            "patchId": "0",
            "url": "wss://spark-api.xf-yun.com/v4.0/chat",
            "appId": "d1590f30"
        },
        "inputs": [
            {
                "id": "",
                "name": "Query",
                "schema": {
                    "type": "string",
                    "value": {
                        "type": "ref",
                        "content": {}
                    }
                }
            }
        ],
        "outputs": [
            {
                "id": "",
                "name": "class_name",
                "schema": {
                    "type": "string",
                    "default": ""
                }
            }
        ],
        "references": [],
        "allowInputReference": true,
        "allowOutputReference": true,
        "icon": "https://oss-beijing-m8.openstorage.cn/pro-bucket/sparkBot/common/workflow/icon/designMakeIcon.png"
    }
}',1,'决策','2000-01-01 00:00:00','2025-07-28 10:18:24'),
	 (1435,'WORKFLOW_NODE_TEMPLATE','1,2','Logic','{
    "idType": "if-else",
    "nodeType": "Branch",
    "aliasName": "Branch",
    "description": "Determine the branch path based on the defined conditions",
    "data": {
        "nodeMeta": {
            "nodeType": "分支器",
            "aliasName": "分支器"
        },
        "nodeParam": {
            "cases": [
                {
                    "id": "branch_one_of::",
                    "level": 1,
                    "logicalOperator": "and",
                    "conditions": [
                        {
                            "id": "",
                            "leftVarIndex": null,
                            "rightVarIndex": null,
                            "compareOperator": null
                        }
                    ]
                },
                {
                    "id": "branch_one_of::",
                    "level": 999,
                    "logicalOperator": "and",
                    "conditions": []
                }
            ]
        },
        "inputs": [
            {
                "id": "",
                "name": "input",
                "schema": {
                    "type": "string",
                    "value": {
                        "type": "ref",
                        "content": {
                            "nodeId": "",
                            "name": ""
                        }
                    }
                }
            },
            {
                "id": "",
                "name": "input1",
                "schema": {
                    "type": "string",
                    "value": {
                        "type": "ref",
                        "content": {
                            "nodeId": "",
                            "name": ""
                        }
                    }
                }
            }
        ],
        "outputs": [],
        "references": [],
        "allowInputReference": true,
        "allowOutputReference": false,
        "icon": "https://oss-beijing-m8.openstorage.cn/pro-bucket/sparkBot/common/workflow/icon/if-else-node-icon.png"
    }
}',1,'分支器','2000-01-01 00:00:00','2025-07-28 10:18:24'),
	 (1437,'WORKFLOW_NODE_TEMPLATE','1,2','Logic','{
    "idType": "iteration",
    "nodeType": "Basic Node",
    "aliasName": "Iteration",
    "description": "This node is used to handle loop logic and supports only one level of nesting",
    "data": {
        "nodeMeta": {
            "nodeType": "Basic Node",
            "aliasName": "Iteration"
        },
        "nodeParam": {},
        "inputs": [
            {
                "id": "",
                "name": "input",
                "schema": {
                    "type": "",
                    "value": {
                        "type": "ref",
                        "content": {}
                    }
                }
            }
        ],
        "outputs": [
            {
                "id": "",
                "name": "output",
                "schema": {
                    "type": "array-string",
                    "default": ""
                }
            }
        ],
        "iteratorNodes": [],
        "iteratorEdges": [],
        "references": [],
        "allowInputReference": true,
        "allowOutputReference": true,
        "icon": "https://oss-beijing-m8.openstorage.cn/pro-bucket/sparkBot/common/workflow/icon/iteration-icon.png"
    }
}',1,'迭代','2000-01-01 00:00:00','2025-07-28 10:18:24'),
	 (1439,'WORKFLOW_NODE_TEMPLATE','1,2','Transformation','{
    "idType": "node-variable",
    "nodeType": "Basic Node",
    "aliasName": "Variable Storage",
    "description": "Allows setting multiple variables for long-term data storage, which remains effective and updates persistently",
    "data": {
        "nodeMeta": {
            "nodeType": "基础节点",
            "aliasName": "变量存储器"
        },
        "nodeParam": {
            "method": "set"
        },
        "inputs": [
            {
                "id": "",
                "name": "input",
                "schema": {
                    "type": "string",
                    "value": {
                        "type": "ref",
                        "content": {}
                    }
                }
            }
        ],
        "outputs": [],
        "references": [],
        "allowInputReference": true,
        "allowOutputReference": true,
        "icon": "https://oss-beijing-m8.openstorage.cn/pro-bucket/sparkBot/common/workflow/icon/variable-memory-icon.png"
    }
}',1,'变量存储器','2000-01-01 00:00:00','2025-07-28 10:18:24'),
	 (1441,'WORKFLOW_NODE_TEMPLATE','1,2','Transformation','{
    "idType": "extractor-parameter",
    "nodeType": "Basic Node",
    "aliasName": "Variable Extractor",
    "description": "Extracts natural language content from the output of the previous node based on variable extraction descriptions",
    "data": {
        "nodeMeta": {
            "nodeType": "基础节点",
            "aliasName": "变量提取器"
        },
        "nodeParam": {
            "maxTokens": 2048,
            "temperature": 0.5,
            "topK": 4,
            "auditing": "default",
            "domain": "4.0Ultra",
            "llmId": 110,
            "model": "spark",
            "serviceId": "bm4",
            "patchId": "0",
            "url": "wss://spark-api.xf-yun.com/v4.0/chat",
            "appId": "d1590f30",
            "uid": "2171",
            "reasonMode": 1
        },
        "inputs": [
            {
                "id": "",
                "name": "input",
                "schema": {
                    "type": "string",
                    "value": {
                        "type": "ref",
                        "content": {}
                    }
                }
            }
        ],
        "outputs": [
            {
                "id": "",
                "name": "output",
                "schema": {
                    "type": "string",
                    "description": ""
                },
                "required": true
            }
        ],
        "references": [],
        "allowInputReference": true,
        "allowOutputReference": true,
        "icon": "https://oss-beijing-m8.openstorage.cn/pro-bucket/sparkBot/common/workflow/icon/variable-extractor-icon.png"
    }
}',1,'变量提取器','2000-01-01 00:00:00','2025-07-28 10:18:24'),
	 (1443,'WORKFLOW_NODE_TEMPLATE','1,2','Transformation','{
    "idType": "text-joiner",
    "nodeType": "Tool",
    "aliasName": "Text Processing Node",
    "description": "Used to process multiple string variables according to specified formatting rules",
    "data": {
        "nodeMeta": 
        {
            "nodeType": "工具",
            "aliasName": "文本拼接"
        },
        "nodeParam": {
            "prompt": ""
        },
        "inputs": [
            {
                "id": "",
                "name": "input",
                "schema": {
                    "type": "string",
                    "value": {
                        "type": "ref",
                        "content": {}
                    }
                }
            }
        ],
        "outputs": [
            {
                "id": "",
                "name": "output",
                "schema": {
                    "type": "string"
                }
            }
        ],
        "references": [],
        "allowInputReference": true,
        "allowOutputReference": true,
        "icon": "https://oss-beijing-m8.openstorage.cn/pro-bucket/sparkBot/common/workflow/icon/text-splicing-icon.png"
    }
}',1,'文本处理节点','2000-01-01 00:00:00','2025-07-28 10:18:24'),
	 (1445,'WORKFLOW_NODE_TEMPLATE','1,2','Other','{
    "idType": "message",
    "nodeType": "Basic Node",
    "aliasName": "Message",
    "description": "Used to output intermediate results during workflow execution",
    "data": {
        "nodeMeta": {
            "nodeType": "基础节点",
            "aliasName": "消息"
        },
        "nodeParam": {
            "template": "",
            "startFrameEnabled": false
        },
        "inputs": [
            {
                "id": "",
                "name": "input",
                "schema": {
                    "type": "string",
                    "value": {
                        "type": "ref",
                        "content": {}
                    }
                }
            }
        ],
        "outputs": [
            {
                "id": "",
                "name": "output_m",
                "schema": {
                    "type": "string"
                }
            }
        ],
        "references": [],
        "allowInputReference": true,
        "allowOutputReference": false,
        "icon": "https://oss-beijing-m8.openstorage.cn/pro-bucket/sparkBot/common/workflow/icon/message-node-icon.png"
    }
}',1,'消息','2000-01-01 00:00:00','2025-07-28 10:18:24'),
	 (1447,'WORKFLOW_NODE_TEMPLATE','1,2','Tool','{
    "idType": "plugin",
    "nodeType": "Tool",
    "aliasName": "Tool",
    "description": "Quickly acquire skills by integrating external tools to meet user needs",
    "data": {
        "nodeMeta": {
            "nodeType": "工具",
            "aliasName": "工具"
        },
        "inputs": [],
        "outputs": [],
        "nodeParam": {
            "appId": "4eea957b",
            "code": ""
        },
        "references": [],
        "allowInputReference": true,
        "allowOutputReference": true,
        "icon": "https://oss-beijing-m8.openstorage.cn/pro-bucket/sparkBot/common/workflow/icon/tool-icon.png"
    }
}',1,'工具','2000-01-01 00:00:00','2025-07-28 10:18:24'),
	 (1449,'LLM_SCENE_FILTER','workflow','xfyun','lmg5gtbs0,lmyvosz36,lm0dy3kv0,lme990528,lm4onxj7h,lmbXtIcNp,lm27ebHkj,lm9ze3hwc',1,'','2000-01-01 00:00:00','2025-02-27 19:15:13'),
	 (1451,'PROMPT','ai-code','create','## Role
You are a Python engineer. Based on the user''s requirements and the rules and constraints below, generate a complete Python code snippet.

## Dependency Constraints
The following are unsupported Python dependencies. Do not use packages outside of this list.

[List remains the same...]

## Rules
1. The user''s original code must strictly comply with the provided list of parameter variables (parameter names, types, and quantity), and the required function name.
2. Input parameters must match the names and types in the provided list;
3. The output return value must be of type dict. If the user defines specific return field names, use them strictly. Otherwise, the default field name should be ````````output````````.
4. Add comments after imports to describe the function''s purpose and parameter definitions. Only provide the code.

## Function Name:
main

## Parameter Variable List (name: variable name, type: data type):
{var}

## User Requirement:
{prompt}

## Notes
1. Only implement the function logic; generate the code only.
2. Do not include test code, example code, or ````````__main__```````` blocks.

## Please return a code block directly without using markdown format.',1,'','2000-01-01 00:00:00','2025-07-23 14:54:52'),
	 (1453,'PROMPT','ai-code','update','## Role
You are a Python engineer. Based on the user''s code and the rules and constraints below, optimize the user''s code.

## Dependency Constraints
The following are unsupported Python dependencies. Do not use packages outside of this list.

[List remains unchanged...]

## Rules
1. The user''s original code must strictly comply with the provided parameter variable list (parameter names, types, and quantity), and the required function name.
2. Input parameters must match the names and types in the provided list;
3. The return type of the output must be a dict. If the user defines specific return field names, follow them exactly. Otherwise, the default return field should be named ````````output````````.
4. Add comments after import statements describing the function purpose and parameter definitions. Please provide the code directly.

## Function Name:
main

## Parameter Variable List (name: noun, type: data type):
{var}

## User Original Code:
{code}

## User Requirement:
{prompt}

## Notes
1. Optimize the user-provided code according to the conditions above;
2. Do not include test code, sample code, or ````````__main__```````` block;

## Please return a code block directly, do not return markdown format.',1,'','2000-01-01 00:00:00','2025-07-23 14:55:38'),
	 (1455,'PROMPT','ai-code','fix','## Role
You are a Python engineer. Based on the user''s original code and the error message, return a corrected code block.

## Function Name:
main

## Parameter Variable List (name: variable name, type: data type, value: value):
{var}

## User Original Code:
{code}

## Error Message from User''s Code Execution:
{errMsg}

## Notes
Only modify the part indicated in the error message; do not change other parts of the code.

## Please return a code block directly.',1,'','2000-01-01 00:00:00','2025-07-23 14:55:38'),
	 (1457,'WORKFLOW','python-dependency','代码执行器py依赖','{
    "anyio": "3.7.1",
    "argon2-cffi": "23.1.0",
    "argon2-cffi-bindings": "21.2.0",
    "asttokens": "2.4.1",
    "attrs": "23.1.0",
    "Babel": "2.13.1",
    "backcall": "0.2.0",
    "beautifulsoup4": "4.12.2",
    "bleach": "6.1.0",
    "boltons": "23.0.0",
    "Brotli": "1.1.0",
    "certifi": "2023.11.17",
    "cffi": "1.16.0",
    "charset-normalizer": "3.3.2",
    "colorama": "0.4.6",
    "comm": "0.1.4",
    "conda": "23.3.1",
    "conda-package-handling": "2.2.0",
    "conda_package_streaming": "0.9.0",
    "cryptography": "39.0.0",
    "cycler": "0.12.1",
    "debugpy": "1.8.0",
    "decorator": "5.1.1",
    "defusedxml": "0.7.1",
    "dill": "0.3.5",
    "entrypoints": "0.4",
    "et-xmlfile": "1.1.0",
    "exceptiongroup": "1.2.0",
    "executing": "2.0.1",
    "fastjsonschema": "2.19.0",
    "gensim": "4.1.0",
    "gmpy2": "2.1.2",
    "idna": "3.4",
    "importlib-metadata": "6.8.0",
    "importlib-resources": "6.1.1",
    "ipykernel": "6.26.0",
    "ipython": "8.12.2",
    "ipython-genutils": "0.2.0",
    "jedi": "0.19.1",
    "Jinja2": "3.1.2",
    "joblib": "1.3.2",
    "json5": "0.9.14",
    "jsonpatch": "1.33",
    "jsonpointer": "2.4",
    "jsonschema": "4.20.0",
    "jsonschema-specifications": "2023.11.1",
    "jupyter_client": "8.6.0",
    "jupyter_core": "5.1.3",
    "jupyter-server": "1.24.0",
    "jupyterlab": "3.4.8",
    "jupyterlab_pygments": "0.3.0",
    "jupyterlab_server": "2.25.2",
    "kiwisolver": "1.4.5",
    "libmambapy": "1.2.0",
    "lxml": "4.9.2",
    "mamba": "1.2.0",
    "MarkupSafe": "2.1.3",
    "matplotlib": "3.4.3",
    "matplotlib-inline": "0.1.6",
    "matplotlib-venn": "0.11.6",
    "mistune": "3.0.2",
    "mpmath": "1.3.0",
    "nbclassic": "0.4.5",
    "nbclient": "0.8.0",
    "nbconvert": "7.11.0",
    "nbformat": "5.9.2",
    "nest-asyncio": "1.5.8",
    "notebook": "6.5.1",
    "notebook_shim": "0.2.3",
    "numpy": "1.21.2",
    "numpy-financial": "1.0.0",
    "olefile": "0.46",
    "openpyxl": "3.0.10",
    "packaging": "23.2",
    "pandas": "1.3.2",
    "pandocfilters": "1.5.0",
    "parso": "0.8.3",
    "patsy": "0.5.4",
    "pexpect": "4.8.0",
    "pickleshare": "0.7.5",
    "Pillow": "8.4.0",
    "pip": "23.3.1",
    "pkgutil_resolve_name": "1.3.10",
    "platformdirs": "4.0.0",
    "pluggy": "1.3.0",
    "prometheus-client": "0.19.0",
    "prompt-toolkit": "3.0.41",
    "psutil": "5.9.5",
    "ptyprocess": "0.7.0",
    "pure-eval": "0.2.2",
    "pycosat": "0.6.6",
    "pycparser": "2.21",
    "Pygments": "2.17.2",
    "pyOpenSSL": "23.2.0",
    "pyparsing": "3.1.1",
    "PyPDF2": "1.28.6",
    "PyQt5": "5.15.4",
    "PyQt5-sip": "12.9.0",
    "PySocks": "1.7.1",
    "python-dateutil": "2.8.2",
    "python-docx": "0.8.11",
    "python-pptx": "1.0.2",
    "pytz": "2023.3.post1",
    "pyzmq": "25.1.1",
    "referencing": "0.31.0",
    "requests": "2.31.0",
    "rpds-py": "0.13.1",
    "ruamel.yaml": "0.17.40",
    "ruamel.yaml.clib": "0.2.7",
    "scikit-learn": "1.0",
    "scipy": "1.7.1",
    "seaborn": "0.11.2",
    "Send2Trash": "1.8.2",
    "setuptools": "59.8.0",
    "sip": "6.5.1",
    "six": "1.16.0",
    "smart-open": "6.4.0",
    "sniffio": "1.3.0",
    "soupsieve": "2.5",
    "stack-data": "0.6.2",
    "statsmodels": "0.13.5",
    "sympy": "1.8",
    "terminado": "0.18.0",
    "threadpoolctl": "3.2.0",
    "tinycss2": "1.2.1",
    "toml": "0.10.2",
    "tomli": "2.0.1",
    "toolz": "0.12.0",
    "tornado": "6.3.3",
    "tqdm": "4.66.1",
    "traitlets": "5.9.0",
    "typing_extensions": "4.8.0",
    "urllib3": "2.1.0",
    "wcwidth": "0.2.12",
    "webencodings": "0.5.1",
    "websocket-client": "1.6.4",
    "wheel": "0.41.3",
    "zipp": "3.17.0",
    "zstandard": "0.22.0"
}',1,'','2000-01-01 00:00:00','2025-07-10 15:47:31'),
	 (1458,'TEMPLATE','node','','[
    {
        "idType": "spark-llm",
        "icon": "https://oss-beijing-m8.openstorage.cn/pro-bucket/sparkBot/common/workflow/icon/largeModelIcon.png",
        "name": "Large Model",
        "markdown": "## Purpose\\nBased on the input prompt, invoke the selected large model to respond accordingly.\\n## Example\\n### Input\\n| Parameter Name | Parameter Value |\\n|----------------|----------------------|\\n| input (reference) | Start-query |\\n## Prompt\\nYou are a super-intelligent travel planner who is very good at identifying various travel needs from the user''s input information and organizing and outputting them. Your task now is to carefully analyze and understand the user''s input information strictly according to the following definitions and rules, and output a user travel requirement profile that includes: [Destination], [Number of Days], [Travel Companions], [Preferences], and [Travel Date]\\n### Output\\n| Variable Name | Variable Value |\\n|--------------|----------------|\\n| output (String) | 🌟Dear friend, I got your travel request! I understand you are planning an exciting 3-day trip to Hefei 😃. Please wait a moment while I generate your itinerary. Let me briefly introduce the destination: Hefei, with many must-visit attractions... (rest omitted for brevity)."
    },
    {
        "idType": "ifly-code",
        "icon": "https://oss-beijing-m8.openstorage.cn/pro-bucket/sparkBot/common/workflow/icon/codeIcon.png",
        "name": "Code",
        "markdown": "## Purpose\\nProvides code capabilities for developers, currently only supports Python. Allows passing variables defined in the node as parameters, and returns a result via return statement.\\n## Example\\n### Input\\n| Parameter Name | Parameter Value |\\n|----------------|----------------------|\\n| location (reference) | Code-location |\\n| person (reference) | Code-person |\\n| day (reference) | Code-day |\\n## Code\\nasync def main(args: Args) -> Output: \\n    params = args.params\\n    ret: Output = {\\"ret\\": params[''location''] + params[''person''] + params[''day''] + '' travel guide''}\\n    return ret\\n### Output\\n| Variable Name | Variable Value |\\n|----------------|----------------|\\n| ret (String) | Hefei 5 people 3 days travel guide |"
    },
    {
        "idType": "knowledge-base",
        "icon": "https://oss-beijing-m8.openstorage.cn/pro-bucket/sparkBot/common/workflow/icon/knowledgeIcon.png",
        "name": "Knowledge Base",
        "markdown": "## Purpose\\nCalls a knowledge base, and can specify the base for retrieval and response.\\n## Example\\n### Input\\n| Parameter Name | Parameter Value |\\n|----------------|----------------------|\\n| Query (String) (reference) | Large Model-output |\\n## Knowledge Base\\nNational Gourmet Encyclopedia\\n### Output\\n| Variable Name | Variable Value |\\n|----------------|----------------|\\n| OutputList (Array<Object>) | Top 10 Hefei dishes: Cao Cao Chicken, Luzhou Roast Duck, Feidong Mudfish Pot, Sesame Cakes, Twisted Dough, Sesame Cookies, Duck Oil Biscuits, Feixi Old Hen Soup, Feixi Intestine Pot, Zhipengshan Stewed Goose |"
    },
    {
        "idType": "plugin",
        "icon": "https://oss-beijing-m8.openstorage.cn/pro-bucket/sparkBot/common/workflow/icon/tool-icon.png",
        "name": "Tool",
        "image": "https://oss-beijing-m8.openstorage.cn/pro-bucket/sparkBot/common/workflow/template/node-tool.png",
        "markdown": "## Purpose\\nQuickly access external tools to meet user needs.\\n## Example\\n### Input\\n| Parameter Name | Parameter Value |\\n|----------------|----------------------|\\n| query (reference) [e.g., for Bing search tool, ''query'' is required] | Code-Food-result |\\n### Output\\n| Variable Name | Variable Value |\\n|----------------|----------------|\\n| result (String) | Hefei food, Hefei food guide, Hefei food recommendation - MFW Luzhou Roast Duck restaurant, Old Xiang Chicken, Liu Hongsheng Wonton in Chicken Broth... |"
    },
    {
        "idType": "flow",
        "icon": "https://oss-beijing-m8.openstorage.cn/pro-bucket/sparkBot/common/workflow/icon/flow-icon.png",
        "name": "Workflow",
        "markdown": "## Purpose\\nThe large model decides the subsequent flow direction based on node input and prompt content.\\n## Example\\n### Input\\n| Parameter Name | Parameter Value |\\n|----------------|----------------------|\\n| location (reference) [required] | Variable Extractor-location |\\n| data (reference) [required] | Variable Extractor-data |\\n### Output\\n| Variable Name | Variable Value |\\n|----------------|----------------|\\n| output (String) | Weather in Hefei today is cloudy, 27℃~33℃, northeast wind force 5-6... |"
    },
    {
        "idType": "decision-making",
        "icon": "https://oss-beijing-m8.openstorage.cn/pro-bucket/sparkBot/common/workflow/icon/designMakeIcon.png",
        "name": "Decision",
        "markdown": "## Purpose\\nThe large model decides which branch to take based on input and prompt.\\n## Example\\n### Input\\n| Parameter Name | Parameter Value |\\n|----------------|----------------------|\\n| guide (reference) | Code-guide |\\n| food (reference) | Code-food |\\n| hotel (reference) | Code-hotel |\\n## Prompt\\nBased on guide {{guide}}, food preference {{food}}, and hotel location {{hotel}}, decide which intent to follow\\n## Intents\\n- Travel guide\\n- Food recommendation\\n- Hotel recommendation\\n- Other"
    },
    {
        "idType": "if-else",
        "icon": "https://oss-beijing-m8.openstorage.cn/pro-bucket/sparkBot/common/workflow/icon/if-else-node-icon.png",
        "name": "Branch",
        "markdown": "## Purpose\\nDirect flow based on specified conditions\\n## Example\\n### Input\\n| Condition |\\n|-----------|\\n| Condition 1: ''Start-query'' contains travel or guide. Otherwise: default branch |"
    },
    {
        "idType": "iteration",
        "icon": "https://oss-beijing-m8.openstorage.cn/pro-bucket/sparkBot/common/workflow/icon/iteration-icon.png",
        "name": "Iteration",
        "image": "https://oss-beijing-m8.openstorage.cn/pro-bucket/sparkBot/common/workflow/template/node-iteration.png",
        "markdown": "## Purpose\\nHandle loop logic, supports only one level of nesting\\n## Example\\n### Input\\n| Parameter Name | Parameter Value |\\n|----------------|----------------------|\\n| locations (Array) | Code-locations |\\n### Output\\n| Variable Name | Variable Value |\\n|----------------|----------------|\\n| outputList (Array) | [{\\"Hefei Travel Guide\\"}, {\\"Nanjing Travel Guide\\"}, {\\"Shanghai Travel Guide\\"}] |"
    },
    {
        "idType": "node-variable",
        "icon": "https://oss-beijing-m8.openstorage.cn/pro-bucket/sparkBot/common/workflow/icon/variable-memory-icon.png",
        "name": "Variable Storage",
        "image": "https://oss-beijing-m8.openstorage.cn/pro-bucket/sparkBot/common/workflow/template/node-var-storage.png",
        "markdown": "## Purpose\\nDefine multiple variables that persist during multi-turn conversations. Cleared on new chat or chat history deletion.\\n## Example\\n### Input\\n| Parameter Name | Parameter Value |\\n|----------------|----------------------|\\n| question | Start-query |"
    },
    {
        "idType": "extractor-parameter",
        "icon": "https://oss-beijing-m8.openstorage.cn/pro-bucket/sparkBot/common/workflow/icon/variable-extractor-icon.png",
        "name": "Variable Extractor",
        "image": "https://oss-beijing-m8.openstorage.cn/pro-bucket/sparkBot/common/workflow/template/node-var-extractor.png",
        "markdown": "## Purpose\\nExtract variables from natural language based on defined descriptions\\n## Example\\n### Input\\n| Parameter Name | Parameter Value |\\n|----------------|----------------------|\\n| location | Extract location from question |\\n| day | Extract number of days from question |\\n| person | Extract number of people from question |\\n| data | Extract date from question |"
    },
    {
        "idType": "message",
        "icon": "https://oss-beijing-m8.openstorage.cn/pro-bucket/sparkBot/common/workflow/icon/message-node-icon.png",
        "name": "Message",
        "image": "https://oss-beijing-m8.openstorage.cn/pro-bucket/sparkBot/common/workflow/template/node-message.png",
        "markdown": "## Purpose\\nOutput intermediate results during workflow\\n## Example\\n### Input\\n| Parameter Name | Parameter Value |\\n|----------------|----------------------|\\n| result (reference) | Large Model-output |\\n| result1 (reference) | Large Model-output1 |\\n### Output\\n| Variable Name | Variable Value |\\n|----------------|----------------|\\n| Large Model-output | Response: Two solutions for your question: Option 1: {{result}}, Option 2: {{result1}} |"
    },
    {
        "idType": "text-joiner",
        "icon": "https://oss-beijing-m8.openstorage.cn/pro-bucket/sparkBot/common/workflow/icon/text-splicing-icon.png",
        "name": "Text Joiner",
        "image": "https://oss-beijing-m8.openstorage.cn/pro-bucket/sparkBot/common/workflow/template/node-text-joiner.png",
        "markdown": "## Purpose\\nUse {{variableName}} to reference defined variables, concatenate according to rules\\n## Example\\n### Input\\n| Parameter Name | Parameter Value |\\n|----------------|----------------------|\\n| age (input) | 18 |\\n| name (input) | Xiaoming |\\n## Rule\\nI am {{name}}, I am {{age}} years old.\\n### Output\\n| Variable Name | Variable Value |\\n|----------------|----------------|\\n| output (String) | I am Xiaoming, I am 18 years old. |"
    },
    {
        "idType": "agent",
        "name": "Agent Intelligent Decision",
        "icon": "https://oss-beijing-m8.openstorage.cn/SparkBotProd/icon/common/agent.png",
        "markdown": "## Purpose\\nIntelligently dispatch tools based on selected strategy. Also invokes large model with prompt to generate output.\\n## Example\\n### Input\\n| Parameter Name | Parameter Value |\\n|----------------|----------------------|\\n| Input | Start/AGENT_USER_INPUT |\\n## Agent Strategy\\nReAct strategy helps large models perform structured reasoning and decision-making.\\n## Tool List\\nSupports up to 30 published tools or MCPs.\\n## Custom MCP Server\\nAllows setting up to 3 custom MCP servers.\\n## Prompt Sections\\n- Role Setting (optional)\\n- Thought Process (optional)\\n- User Query (required)\\n## Max Rounds\\nMaximum is 100, default is 10.\\n### Output\\n| Parameter Name | Parameter Value | Description |\\n|----------------|------------------|-------------|\\n| Reasoning | String | Model''s thought process |\\n| Output | String | Model''s final response |"
    },
    {
        "idType": "knowledge-pro-base",
        "name": "Knowledge Base Pro",
        "icon": "https://oss-beijing-m8.openstorage.cn/pro-bucket/sparkBot/common/workflow/icon/knowledgeIcon.png",
        "markdown": "## Purpose\\nIn complex scenarios, use intelligent strategy to query knowledge base and generate summaries.\\n## Answer Mode\\nSelect large model to split queries and summarize results.\\n## Strategies\\nAgentic RAG – decomposes complex questions into sub-questions.\\nLong RAG – handles long document understanding.\\n### Input\\n| Parameter Name | Parameter Value | Description |\\n|----------------|------------------|-------------|\\n| query | String | User input |\\n## Knowledge Base\\nSelect database and set parameters. When split into multiple sub-questions, final recall count = top k ✖ number of sub-questions.\\n## Answer Rules\\nOptional. e.g., “If no answer found, say ''I don''t know.''”\\n### Output\\n| Parameter Name | Parameter Value | Description |\\n|----------------|------------------|-------------|\\n| Reasoning | String | Model''s thought process |\\n| Output | String | Final answer |\\n| result | Array<Object> | Retrieved results |"
    },
    {
        "idType": "question-answer",
        "name": "Q&A",
        "icon": "https://oss-beijing-m8.openstorage.cn/SparkBot/test4/answer-new2.png",
        "markdown": "## Purpose\\nAsk the user a question mid-workflow. Supports both predefined options and open-ended replies.\\n## Example 1 (Option Reply)\\n| Parameter Name | Parameter Value |\\n|----------------|------------------|\\n| Input | Start/AGENT_USER_INPUT |\\n| Question | Traveling is a great idea! Do you have a destination in mind? |\\n| Answer Mode | Option Reply |\\n| Options | A: Nature B: Culture C: Urban |\\n### Output\\n| Parameter Name | Parameter Value | Description |\\n|----------------|------------------|-------------|\\n| query | String | Question asked |\\n| id | String | Option ID |\\n| content | String | User''s response |\\n---\\n## Example 2 (Direct Reply)\\n| Parameter Name | Parameter Value |\\n|----------------|------------------|\\n| Input | Start/AGENT_USER_INPUT |\\n| Question | Where would you like to go? Type? Time? Budget? |\\n| Answer Mode | Direct Reply |\\n### Output\\n| Parameter Name | Parameter Value | Description |\\n|----------------|------------------|-------------|\\n| query | String | Question asked |\\n| content | String | User''s response |\\n### Parameter Extraction\\n| Parameter Name | Parameter Value | Description | Default | Required |\\n|----------------|------------------|-------------|---------|----------|\\n| city | String | Location | -- | Yes |\\n| type | String | Destination type | -- | Yes |\\n| time | Number | Duration | -- | Yes |\\n| budget | String | Budget | -- | Yes |"
    },
    {
        "idType": "database",
        "name": "Database",
        "icon": "https://oss-beijing-m8.openstorage.cn/SparkBotDev/icon/user/sparkBot_1752568522509_database_icon.svg",
        "markdown": "## Purpose\\nThis node can connect to a specified database and perform common operations such as insert, query, update, and delete, enabling dynamic data management.\\n\\n## Example\\n\\n### Input\\n\\n| Parameter Name | Value |\\n|----------------|--------------------------------------------------|\\n| Input          | Start/AGENT_USER_INPUT                          |\\n\\n### Output\\n\\n| Parameter Name | Value   | Description                                  |\\n|----------------|---------|----------------------------------------------|\\n| isSuccess      | Boolean | SQL execution status, true if successful, false otherwise |\\n| message        | String  | Reason for failure                           |\\n| outputList     | (Array<Object>) | Execution result                      |\\n"
    }
]',1,'','2000-01-01 00:00:00','2025-07-30 17:59:02'),
	 (1459,'WORKFLOW_CHANNEL','api','API','发布为API',1,'完成配置后，即可接入到个人应用中使用。','2000-01-01 00:00:00','2025-01-06 17:02:30'),
	 (1460,'SPECIAL_USER','workflow-all-view',NULL,'100000039012',1,NULL,'2000-01-01 00:00:00','2024-12-03 19:16:07'),
	 (1461,'WORKFLOW_CHANNEL','ixf-personal','i讯飞-个人版','发布至新版本i讯飞中',0,'无需审核，个人版本仅供个人使用和对话，无法分享给他人，也无法拉入群内。','2000-01-01 00:00:00','2024-12-19 11:10:51'),
	 (1463,'WORKFLOW_CHANNEL','ixf-team','i讯飞-团队版','发布至新版本i讯飞中',0,'需要经过审核，团队版本支持分享给他人使用，支持拉入群内使用。','2000-01-01 00:00:00','2024-12-19 11:10:51'),
	 (1465,'WORKFLOW_CHANNEL','aiui','交互链路','发布至AIUI智能体平台',1,'发布并审核通过后，即可在aiui平台进行配置。','2000-01-01 00:00:00','2024-12-13 10:15:09'),
	 (1467,'WORKFLOW_CHANNEL','sparkdesk','星火Desk/APP','发布至讯飞星火desk，以及星火app（App、网页版）',0,'发布并审核通过后，即可在星火desk和星火App体验该智能体。','2000-01-01 00:00:00','2024-12-19 11:10:51'),
	 (1469,'WORKFLOW_CHANNEL','square','工作流广场','发布至星辰工作流广场',1,'发布成功后，用户即可在广场使用。','2000-01-01 00:00:00','2025-03-24 17:50:37'),
	 (1470,'SWITCH','EvalTaskStatusGetJob','0','0',1,'1','2000-01-01 00:00:00','2025-01-08 11:41:09'),
	 (1472,'PROMPT','new-intent','','### Job Responsibility Description
You are a text classification engine. You need to analyze text data and, based on the user input and the category descriptions, carefully determine the appropriate category.

### Task
Your task is to assign only one category to the input text, and the output should contain only that one category. In addition, you should extract keywords related to the classification from the text. If there is no relevance at all, the keyword list can be empty.

### Input Format
The input text is stored in the variable ````````input_text````````. The categories are listed in the variable ````````Categories````````, and each contains the fields ````````category_id````````, ````````category_name````````, and ````````category_desc````````. Think carefully and follow the category descriptions strictly to improve classification accuracy.

### History Memory
This is the conversation history between the human and the assistant, enclosed in <histories></histories> XML tags.
<histories>
</histories>

### Constraints
Do not include anything other than the JSON array in your response.

### Output Format
json{"category_name": ""}

### The following is the text data to be analyzed
$coreText',1,'新决策节点的prompt','2000-01-01 00:00:00','2025-07-23 15:22:26'),
	 (1473,'LLM_WORKFLOW_FILTER','iflyaicloud','null','lmg5gtbs0,lmyvosz36,lm0dy3kv0,lme990528,lm479a5b8,lmt4do9o3',0,'','2000-01-01 00:00:00','2025-03-24 19:39:30'),
	 (1475,'LLM_WORKFLOW_FILTER','xfyun','null','lmg5gtbs0,lmyvosz36,lm0dy3kv0,lm9ze3hwc',0,'','2000-01-01 00:00:00','2025-03-24 19:39:30'),
	 (1477,'LLM_WORKFLOW_FILTER','iflyaicloud','spark-llm','lmg5gtbs0,lmyvosz36,lm0dy3kv0,lme990528,lme693475,lmbXtIcNp,lm27ebHkj,lm9ze3hwc,lm4onxj7h,lmt2br78l,lm4rar7p2',0,'','2000-01-01 00:00:00','2025-03-24 19:39:30'),
	 (1479,'LLM_WORKFLOW_FILTER','iflyaicloud','decision-making','lmg5gtbs0,lmyvosz36,lm0dy3kv0,lme990528,lm479a5b8,lme693475,lmt4do9o3,lmt4do9o3',0,'','2000-01-01 00:00:00','2025-03-24 19:39:29'),
	 (1481,'LLM_WORKFLOW_FILTER','iflyaicloud','extractor-parameter','lmg5gtbs0,lmyvosz36,lm0dy3kv0,lmt4do9o3',0,'','2000-01-01 00:00:00','2025-03-24 19:39:29'),
	 (1483,'LLM_WORKFLOW_FILTER','xfyun','extractor-parameter','lmg5gtbs0,lmyvosz36,lm0dy3kv0,lm9ze3hwc,lmbXtIcNp,lm27ebHkj',0,'','2000-01-01 00:00:00','2025-03-24 19:39:29'),
	 (1485,'LLM_WORKFLOW_FILTER','xfyun','decision-making','lmg5gtbs0,lmyvosz36,lm0dy3kv0,lm9ze3hwc,lmbXtIcNp,lm27ebHkj',0,'','2000-01-01 00:00:00','2025-03-24 19:39:29'),
	 (1487,'LLM_WORKFLOW_FILTER','xfyun','spark-llm','lmg5gtbs0,lmyvosz36,lm0dy3kv0,lm9ze3hwc,lmbXtIcNp,lm27ebHkj,dsv3t128k,xsp8f70988f',0,'','2000-01-01 00:00:00','2025-06-12 09:31:23'),
	 (1488,'WORKFLOW_NODE_TEMPLATE_PRE','1,2','固定节点','{
    "idType": "node-start",
    "type": "开始节点",
    "position":
    {
        "x": 100,
        "y": 300
    },
    "data":
    {
        "label": "Start",
        "description": "The starting node of the workflow, used to define the business variable information required for process invocation.",
        "nodeMeta":
        {
            "nodeType": "基础节点",
            "aliasName": "开始节点"
        },
        "inputs":
        [],
        "outputs":
        [
            {
                "id": "",
                "name": "AGENT_USER_INPUT",
                "deleteDisabled": true,
                "required": true,
                "schema":
                {
                    "type": "string",
                    "default": "User input of the current conversation round"
                }
            }
        ],
        "nodeParam":
        {},
        "allowInputReference": false,
        "allowOutputReference": true,
        "icon": "https://oss-beijing-m8.openstorage.cn/pro-bucket/sparkBot/common/workflow/icon/start-node-icon.png"
    }
}',1,'开始节点','2000-01-01 00:00:00','2025-07-25 17:17:17'),
	 (1490,'WORKFLOW_NODE_TEMPLATE_PRE','1,2','固定节点','{
    "idType": "node-end",
    "type": "结束节点",
    "position":
    {
        "x": 1000,
        "y": 300
    },
    "data":
    {
        "label": "End",
        "description": "The end node of the workflow, used to output the final result after the workflow execution.",
        "nodeMeta":
        {
            "nodeType": "基础节点",
            "aliasName": "结束节点"
        },
        "inputs":
        [
            {
                "id": "",
                "name": "output",
                "schema":
                {
                    "type": "string",
                    "value":
                    {
                        "type": "ref",
                        "content":
                        {}
                    }
                }
            }
        ],
        "outputs":
        [],
        "nodeParam":
        {
            "outputMode": 1,
            "template": "",
            "streamOutput": true
        },
        "references":
        [],
        "allowInputReference": true,
        "allowOutputReference": false,
        "icon": "https://oss-beijing-m8.openstorage.cn/pro-bucket/sparkBot/common/workflow/icon/end-node-icon.png"
    }
}',1,'结束节点','2000-01-01 00:00:00','2025-07-25 17:17:44'),
	 (1492,'WORKFLOW_NODE_TEMPLATE_PRE','1,2','基础节点','{
    "idType": "spark-llm",
    "nodeType": "基础节点",
    "aliasName": "Large Model",
    "description": "Based on the input prompt, the selected large language model will be invoked to respond accordingly.",
    "data": {
        "nodeMeta": {
            "nodeType": "Basic Node",
            "aliasName": "大模型"
        },
        "inputs": [
            {
                "id": "",
                "name": "input",
                "schema": {
                    "type": "string",
                    "value": {
                        "type": "ref",
                        "content": {}
                    }
                }
            }
        ],
        "outputs": [
            {
                "id": "",
                "name": "output",
                "schema": {
                    "type": "string",
                    "default": ""
                }
            }
        ],
        "nodeParam": {
            "maxTokens": 2048,
            "temperature": 0.5,
            "topK": 4,
            "auditing": "default",
            "domain": "4.0Ultra",
            "template": "",
            "model": "spark",
            "serviceId": "bm4",
            "respFormat": 0,
            "llmId": 110,
            "patchId": "0",
            "url": "wss://spark-api.xf-yun.com/v4.0/chat",
            "appId": "d1590f30",
            "uid": "2171",
            "enableChatHistoryV2": {
                "isEnabled": false,
                "rounds": 1
            }
        },
        "references": [],
        "allowInputReference": true,
        "allowOutputReference": true,
        "icon": "https://oss-beijing-m8.openstorage.cn/pro-bucket/sparkBot/common/workflow/icon/largeModelIcon.png"
    }
}',1,'大模型','2000-01-01 00:00:00','2025-07-25 16:57:52'),
	 (1494,'WORKFLOW_NODE_TEMPLATE_PRE','1,2','基础节点','{
    "idType": "ifly-code",
    "nodeType": "Basic Node",
    "aliasName": "Code",
    "description": "Provides code development capability for developers, currently only supports Python language. Allows parameters to be passed in using defined variables, and the return statement is used to output the result of the function.",
    "data": {
        "nodeMeta": {
            "nodeType": "工具",
            "aliasName": "代码"
        },
        "inputs": [
            {
                "id": "",
                "name": "input",
                "schema": {
                    "type": "string",
                    "value": {
                        "type": "ref",
                        "content": {}
                    }
                }
            }
        ],
        "outputs": [
            {
                "id": "",
                "name": "key0",
                "schema": {
                    "type": "string",
                    "default": ""
                }
            },
            {
                "id": "",
                "name": "key1",
                "schema": {
                    "type": "array-string",
                    "default": ""
                }
            },
            {
                "id": "",
                "name": "key2",
                "schema": {
                    "type": "object",
                    "default": "",
                    "properties": [
                        {
                            "id": "",
                            "name": "key21",
                            "type": "string",
                            "default": "",
                            "required": true,
                            "nameErrMsg": ""
                        }
                    ]
                }
            }
        ],
        "nodeParam": {
            "code": "def main(input):\\n    ret = {\\n        \\"key0\\": input + \\"hello\\",\\n        \\"key1\\": [\\"hello\\", \\"world\\"],\\n        \\"key2\\": {\\"key21\\": \\"hi\\"}\\n    }\\n    return ret"
        },
        "references": [],
        "allowInputReference": true,
        "allowOutputReference": true,
        "icon": "https://oss-beijing-m8.openstorage.cn/pro-bucket/sparkBot/common/workflow/icon/codeIcon.png"
    }
}',1,'代码','2000-01-01 00:00:00','2025-07-25 16:57:52'),
	 (1496,'WORKFLOW_NODE_TEMPLATE_PRE','1,2','基础节点','{
    "idType": "knowledge-base",
    "nodeType": "Basic Node",
    "aliasName": "Knowledge Base",
    "description": "Calls the knowledge base and allows specifying a knowledge repository for information retrieval and response.",
    "data": {
        "nodeMeta": {
            "nodeType": "工具",
            "aliasName": "知识库"
        },
        "inputs": [
            {
                "id": "",
                "name": "query",
                "schema": {
                    "type": "string",
                    "value": {
                        "type": "ref",
                        "content": {}
                    }
                }
            }
        ],
        "outputs": [
            {
                "id": "",
                "name": "results",
                "schema": {
                    "type": "array-object",
                    "properties": [
                        {
                            "id": "",
                            "name": "score",
                            "type": "number",
                            "default": "",
                            "required": true,
                            "nameErrMsg": ""
                        },
                        {
                            "id": "",
                            "name": "docId",
                            "type": "string",
                            "default": "",
                            "required": true,
                            "nameErrMsg": ""
                        },
                        {
                            "id": "",
                            "name": "title",
                            "type": "string",
                            "default": "",
                            "required": true,
                            "nameErrMsg": ""
                        },
                        {
                            "id": "",
                            "name": "content",
                            "type": "string",
                            "default": "",
                            "required": true,
                            "nameErrMsg": ""
                        },
                        {
                            "id": "",
                            "name": "context",
                            "type": "string",
                            "default": "",
                            "required": true,
                            "nameErrMsg": ""
                        },
                        {
                            "id": "",
                            "name": "references",
                            "type": "object",
                            "default": "",
                            "required": true,
                            "nameErrMsg": ""
                        }
                    ]
                },
                "required": true,
                "nameErrMsg": ""
            }
        ],
        "nodeParam": {
            "repoId": [],
            "repoList": [],
            "topN": 3
        },
        "references": [],
        "allowInputReference": true,
        "allowOutputReference": true,
        "icon": "https://oss-beijing-m8.openstorage.cn/pro-bucket/sparkBot/common/workflow/icon/knowledgeIcon.png"
    }
}',1,'知识库','2000-01-01 00:00:00','2025-07-25 16:57:52'),
	 (1498,'WORKFLOW_NODE_TEMPLATE_PRE','1,2','工具','{
    "idType": "plugin",
    "nodeType": "Tool",
    "aliasName": "Tool",
    "description": "Quickly acquire skills by integrating external tools to meet user needs",
    "data": {
        "nodeMeta": {
            "nodeType": "工具",
            "aliasName": "工具"
        },
        "inputs": [],
        "outputs": [],
        "nodeParam": {
            "appId": "4eea957b",
            "code": ""
        },
        "references": [],
        "allowInputReference": true,
        "allowOutputReference": true,
        "icon": "https://oss-beijing-m8.openstorage.cn/pro-bucket/sparkBot/common/workflow/icon/tool-icon.png"
    }
}',1,'工具','2000-01-01 00:00:00','2025-07-25 16:57:52'),
	 (1500,'WORKFLOW_NODE_TEMPLATE_PRE','1,2','工具','{
    "idType": "flow",
    "nodeType": "Tool",
    "aliasName": "Workflow",
    "description": "Quickly integrate published workflows for efficient reuse of existing capabilities.",
    "data": {
        "nodeMeta": {
            "nodeType": "工具",
            "aliasName": "工作流"
        },
        "inputs": [],
        "outputs": [],
        "nodeParam": {
            "appId": "",
            "flowId": "",
            "uid": ""
        },
        "references": [],
        "allowInputReference": true,
        "allowOutputReference": true,
        "icon": "https://oss-beijing-m8.openstorage.cn/pro-bucket/sparkBot/common/workflow/icon/flow-icon.png"
    }
}',1,'工作流','2000-01-01 00:00:00','2025-07-25 16:57:52'),
	 (1502,'WORKFLOW_NODE_TEMPLATE_PRE','1,2','逻辑','{
    "idType": "decision-making",
    "nodeType": "Basic Node",
    "aliasName": "Decision",
    "description": "Determine the subsequent logic path based on input parameters and the specified intents.",
    "data": {
        "nodeMeta": {
            "nodeType": "基础节点",
            "aliasName": "决策"
        },
        "nodeParam": {
            "maxTokens": 2048,
            "temperature": 0.5,
            "topK": 4,
            "auditing": "default",
            "domain": "4.0Ultra",
            "llmId": 110,
            "enableChatHistoryV2": {
                "isEnabled": false,
                "rounds": 1
            },
            "uid": "2171",
            "intentChains": [
                {
                    "intentType": 2,
                    "name": "",
                    "description": "",
                    "id": "intent-one-of::4724514d-ffc8-4412-bf7f-13cc3375110d"
                },
                {
                    "intentType": 1,
                    "name": "default",
                    "description": "Default intent",
                    "id": "intent-one-of::506841e4-3f6c-40b1-a804-dc5ffe723b34"
                }
            ],
            "reasonMode": 1,
            "model": "spark",
            "useFunctionCall": true,
            "serviceId": "bm4",
            "promptPrefix": "",
            "patchId": "0",
            "url": "wss://spark-api.xf-yun.com/v4.0/chat",
            "appId": "d1590f30"
        },
        "inputs": [
            {
                "id": "",
                "name": "Query",
                "schema": {
                    "type": "string",
                    "value": {
                        "type": "ref",
                        "content": {}
                    }
                }
            }
        ],
        "outputs": [
            {
                "id": "",
                "name": "class_name",
                "schema": {
                    "type": "string",
                    "default": ""
                }
            }
        ],
        "references": [],
        "allowInputReference": true,
        "allowOutputReference": true,
        "icon": "https://oss-beijing-m8.openstorage.cn/pro-bucket/sparkBot/common/workflow/icon/designMakeIcon.png"
    }
}',1,'决策','2000-01-01 00:00:00','2025-07-25 16:57:52'),
	 (1504,'WORKFLOW_NODE_TEMPLATE_PRE','1,2','逻辑','{
    "idType": "if-else",
    "nodeType": "Branch",
    "aliasName": "Branch",
    "description": "Determine the branch path based on the defined conditions",
    "data": {
        "nodeMeta": {
            "nodeType": "分支器",
            "aliasName": "分支器"
        },
        "nodeParam": {
            "cases": [
                {
                    "id": "branch_one_of::",
                    "level": 1,
                    "logicalOperator": "and",
                    "conditions": [
                        {
                            "id": "",
                            "leftVarIndex": null,
                            "rightVarIndex": null,
                            "compareOperator": null
                        }
                    ]
                },
                {
                    "id": "branch_one_of::",
                    "level": 999,
                    "logicalOperator": "and",
                    "conditions": []
                }
            ]
        },
        "inputs": [
            {
                "id": "",
                "name": "input",
                "schema": {
                    "type": "string",
                    "value": {
                        "type": "ref",
                        "content": {
                            "nodeId": "",
                            "name": ""
                        }
                    }
                }
            },
            {
                "id": "",
                "name": "input1",
                "schema": {
                    "type": "string",
                    "value": {
                        "type": "ref",
                        "content": {
                            "nodeId": "",
                            "name": ""
                        }
                    }
                }
            }
        ],
        "outputs": [],
        "references": [],
        "allowInputReference": true,
        "allowOutputReference": false,
        "icon": "https://oss-beijing-m8.openstorage.cn/pro-bucket/sparkBot/common/workflow/icon/if-else-node-icon.png"
    }
}',1,'分支器','2000-01-01 00:00:00','2025-07-25 16:57:52'),
	 (1506,'WORKFLOW_NODE_TEMPLATE_PRE','1,2','逻辑','{
    "idType": "iteration",
    "nodeType": "Basic Node",
    "aliasName": "Iteration",
    "description": "This node is used to handle loop logic and supports only one level of nesting",
    "data": {
        "nodeMeta": {
            "nodeType": "Basic Node",
            "aliasName": "Iteration"
        },
        "nodeParam": {},
        "inputs": [
            {
                "id": "",
                "name": "input",
                "schema": {
                    "type": "",
                    "value": {
                        "type": "ref",
                        "content": {}
                    }
                }
            }
        ],
        "outputs": [
            {
                "id": "",
                "name": "output",
                "schema": {
                    "type": "array-string",
                    "default": ""
                }
            }
        ],
        "iteratorNodes": [],
        "iteratorEdges": [],
        "references": [],
        "allowInputReference": true,
        "allowOutputReference": true,
        "icon": "https://oss-beijing-m8.openstorage.cn/pro-bucket/sparkBot/common/workflow/icon/iteration-icon.png"
    }
}',1,'迭代','2000-01-01 00:00:00','2025-07-23 15:24:27'),
	 (1508,'WORKFLOW_NODE_TEMPLATE_PRE','1,2','转换','{
    "idType": "node-variable",
    "nodeType": "Basic Node",
    "aliasName": "Variable Storage",
    "description": "Allows setting multiple variables for long-term data storage, which remains effective and updates persistently",
    "data": {
        "nodeMeta": {
            "nodeType": "基础节点",
            "aliasName": "变量存储器"
        },
        "nodeParam": {
            "method": "set"
        },
        "inputs": [
            {
                "id": "",
                "name": "input",
                "schema": {
                    "type": "string",
                    "value": {
                        "type": "ref",
                        "content": {}
                    }
                }
            }
        ],
        "outputs": [],
        "references": [],
        "allowInputReference": true,
        "allowOutputReference": true,
        "icon": "https://oss-beijing-m8.openstorage.cn/pro-bucket/sparkBot/common/workflow/icon/variable-memory-icon.png"
    }
}',1,'变量存储器','2000-01-01 00:00:00','2025-07-25 16:57:52'),
	 (1510,'WORKFLOW_NODE_TEMPLATE_PRE','1,2','转换','{
    "idType": "extractor-parameter",
    "nodeType": "Basic Node",
    "aliasName": "Variable Extractor",
    "description": "Extracts natural language content from the output of the previous node based on variable extraction descriptions",
    "data": {
        "nodeMeta": {
            "nodeType": "基础节点",
            "aliasName": "变量提取器"
        },
        "nodeParam": {
            "maxTokens": 2048,
            "temperature": 0.5,
            "topK": 4,
            "auditing": "default",
            "domain": "4.0Ultra",
            "llmId": 110,
            "model": "spark",
            "serviceId": "bm4",
            "patchId": "0",
            "url": "wss://spark-api.xf-yun.com/v4.0/chat",
            "appId": "d1590f30",
            "uid": "2171",
            "reasonMode": 1
        },
        "inputs": [
            {
                "id": "",
                "name": "input",
                "schema": {
                    "type": "string",
                    "value": {
                        "type": "ref",
                        "content": {}
                    }
                }
            }
        ],
        "outputs": [
            {
                "id": "",
                "name": "output",
                "schema": {
                    "type": "string",
                    "description": ""
                },
                "required": true
            }
        ],
        "references": [],
        "allowInputReference": true,
        "allowOutputReference": true,
        "icon": "https://oss-beijing-m8.openstorage.cn/pro-bucket/sparkBot/common/workflow/icon/variable-extractor-icon.png"
    }
}',1,'变量提取器','2000-01-01 00:00:00','2025-07-25 16:57:52'),
	 (1512,'WORKFLOW_NODE_TEMPLATE_PRE','1,2','转换','{
    "idType": "text-joiner",
    "nodeType": "Tool",
    "aliasName": "Text Processing Node",
    "description": "Used to process multiple string variables according to specified formatting rules",
    "data": {
        "nodeMeta": 
        {
            "nodeType": "工具",
            "aliasName": "文本拼接"
        },
        "nodeParam": {
            "prompt": ""
        },
        "inputs": [
            {
                "id": "",
                "name": "input",
                "schema": {
                    "type": "string",
                    "value": {
                        "type": "ref",
                        "content": {}
                    }
                }
            }
        ],
        "outputs": [
            {
                "id": "",
                "name": "output",
                "schema": {
                    "type": "string"
                }
            }
        ],
        "references": [],
        "allowInputReference": true,
        "allowOutputReference": true,
        "icon": "https://oss-beijing-m8.openstorage.cn/pro-bucket/sparkBot/common/workflow/icon/text-splicing-icon.png"
    }
}',1,'文本处理节点','2000-01-01 00:00:00','2025-07-25 16:57:52'),
	 (1514,'WORKFLOW_NODE_TEMPLATE_PRE','1,2','其他','{
    "idType": "message",
    "nodeType": "Basic Node",
    "aliasName": "Message",
    "description": "Used to output intermediate results during workflow execution",
    "data": {
        "nodeMeta": {
            "nodeType": "基础节点",
            "aliasName": "消息"
        },
        "nodeParam": {
            "template": "",
            "startFrameEnabled": false
        },
        "inputs": [
            {
                "id": "",
                "name": "input",
                "schema": {
                    "type": "string",
                    "value": {
                        "type": "ref",
                        "content": {}
                    }
                }
            }
        ],
        "outputs": [
            {
                "id": "",
                "name": "output_m",
                "schema": {
                    "type": "string"
                }
            }
        ],
        "references": [],
        "allowInputReference": true,
        "allowOutputReference": false,
        "icon": "https://oss-beijing-m8.openstorage.cn/pro-bucket/sparkBot/common/workflow/icon/message-node-icon.png"
    }
}',1,'消息','2000-01-01 00:00:00','2025-07-25 16:57:52'),
	 (1516,'mingduan','1',NULL,'http://maas-api.cn-huabei-1.xf-yun.com/v1',1,'https://spark-api-open.xf-yun.com/v2','2000-01-01 00:00:00','2025-04-18 17:49:46'),
	 (1517,'AI_CODE','DS_V3_domain','1','xdeepseekv3',1,NULL,'2000-01-01 00:00:00','2025-03-13 09:36:01'),
	 (1519,'AI_CODE','DS_V3_url','1','wss://maas-api.cn-huabei-1.xf-yun.com/v1.1/chat',1,NULL,'2000-01-01 00:00:00','2025-03-13 09:36:01'),
	 (1520,'LLM','base-model','xdeepseekr1','xdeepseekr1',1,'DeepSeek-R1','2000-01-01 00:00:00',NULL),
	 (1522,'LLM','base-model','xdeepseekv3','xdeepseekv3',1,'DeepSeek-V3','2000-01-01 00:00:00','2024-07-08 11:06:09'),
	 (1524,'TAG','FLOW_TAGS','交通出行','travel',1,'交通出行','2025-03-10 10:00:00','2025-03-11 10:28:36'),
	 (1526,'TAG','FLOW_TAGS','休闲娱乐','recreation',1,'休闲娱乐','2025-03-10 10:00:00','2025-03-11 10:28:36'),
	 (1528,'TAG','FLOW_TAGS','医药健康','medicine',1,'医药健康','2025-03-10 10:00:00','2025-03-11 10:28:36'),
	 (1530,'TAG','FLOW_TAGS','影视音乐','film-music',1,'影视音乐','2025-03-10 10:00:00','2025-03-11 10:28:36'),
	 (1532,'TAG','FLOW_TAGS','教育百科','educationEncyclopedia',1,'教育百科','2025-03-10 10:00:00','2025-03-11 10:28:36'),
	 (1534,'TAG','FLOW_TAGS','新闻资讯','news',1,'新闻资讯','2025-03-10 10:00:00','2025-03-11 10:28:36'),
	 (1536,'TAG','FLOW_TAGS','母婴儿童','mother-to-child',1,'母婴儿童','2025-03-10 10:00:00','2025-03-11 10:28:36'),
	 (1538,'TAG','FLOW_TAGS','生活常用','daily-life',1,'生活常用','2025-03-10 10:00:00','2025-03-11 10:28:36'),
	 (1540,'TAG','FLOW_TAGS','金融理财','financialPlanning',1,'金融理财','2025-03-10 10:00:00','2025-03-11 10:28:36'),
	 (1542,'LLM_WORKFLOW_FILTER_PRE','xfyun','spark-llm','bm3,bm3.5,bm4,pro-128k,xgemma29bit,xaipersonality,xdeepseekv3,xdeepseekr1,image_understanding,x1,xop3qwen30b,xop3qwen235b,xop3qwen14b,xop3qwen8b',1,'','2000-01-01 00:00:00','2025-06-16 15:29:43'),
	 (1544,'LLM_WORKFLOW_FILTER_PRE','xfyun','decision-making','bm3,bm3.5,bm4',1,'','2000-01-01 00:00:00','2025-03-24 14:54:14'),
	 (1546,'LLM_WORKFLOW_FILTER_PRE','xfyun','extractor-parameter','bm3,bm3.5,bm4',1,'','2000-01-01 00:00:00','2025-03-24 14:54:14'),
	 (1548,'LLM_WORKFLOW_FILTER_PRE','iflyaicloud','extractor-parameter','bm3,bm3.5,bm4,xdeepseekv3,xdeepseekr1',1,'','2000-01-01 00:00:00','2025-03-24 14:54:14'),
	 (1549,'LLM_WORKFLOW_FILTER','iflyaicloud','agent','xdeepseekv3,xdeepseekr1,x1,xop3qwen30b,xop3qwen235b',1,'','2000-01-01 00:00:00','2025-06-10 17:16:48'),
	 (1550,'LLM_WORKFLOW_FILTER_PRE','iflyaicloud','decision-making','bm3,bm3.5,bm4,pro-128k,xgemma29bit,xaipersonality,xqwen257bchat,xdeepseekv3,xdeepseekr1',1,'','2000-01-01 00:00:00','2025-03-24 14:54:13'),
	 (1551,'LLM_WORKFLOW_FILTER','xfyun','agent','xdeepseekv3,xdeepseekr1,x1,xop3qwen30b,xop3qwen235b,xdsv3t128k',1,'','2000-01-01 00:00:00','2025-06-16 10:07:13'),
	 (1552,'LLM_WORKFLOW_FILTER_PRE','iflyaicloud','spark-llm','bm3,bm3.5,bm4,pro-128k,xgemma29bit,xaipersonality,xdeepseekv3,xdeepseekr1,image_understanding,x1,xop3qwen30b,xop3qwen235b',1,'','2000-01-01 00:00:00','2025-04-29 09:44:50'),
	 (1553,'WORKFLOW_NODE_TEMPLATE_PRE','1,2','逻辑','{
    "aliasName": "Agent Intelligent Decision",
    "idType": "agent",
    "data":
    {
        "outputs":
        [
            {
                "id": "",
                "customParameterType": "deepseekr1",
                "name": "REASONING_CONTENT",
                "nameErrMsg": "",
                "schema":
                {
                    "default": "Model reasoning process",
                    "type": "string"
                }
            },
            {
                "id": "",
                "name": "output",
                "nameErrMsg": "",
                "schema":
                {
                    "default": "",
                    "type": "string"
                }
            }
        ],
        "references":
        [],
        "allowInputReference": true,
        "inputs":
        [
            {
                "schema":
                {
                    "type": "string",
                    "value":
                    {
                        "type": "ref",
                        "content":
                        {}
                    }
                },
                "name": "input",
                "id": ""
            }
        ],
        "icon": "https://oss-beijing-m8.openstorage.cn/SparkBotProd/icon/common/agent.png",
        "allowOutputReference": true,
        "nodeMeta":
        {
            "aliasName": "智能体节点",
            "nodeType": "Agent节点"
        },
        "nodeParam":
        {
            "appId": "",
            "serviceId": "xdeepseekv3",
            "enableChatHistoryV2":
            {
                "isEnabled": false,
                "rounds": 1
            },
            "modelConfig":
            {
                "domain": "xdeepseekv3",
                "api": "wss://maas-api.cn-huabei-1.xf-yun.com/v1.1/chat",
                "agentStrategy": 1
            },
            "instruction":
            {
                "reasoning": "",
                "answer": "",
                "query": ""
            },
            "plugin":
            {
                "tools":
                [],
                "toolsList":
                [],
                "mcpServerIds":
                [],
                "mcpServerUrls":
                [],
                "workflowIds":
                []
            },
            "maxLoopCount": 10
        }
    },
    "description": "According to task requirements, realize intelligent scheduling of large models by selecting an appropriate tool list",
    "nodeType": "Basic Node"
}',1,'agent','2000-01-01 00:00:00','2025-07-25 16:57:52'),
	 (1554,'LLM_WORKFLOW_FILTER_PRE','xfyun','null','bm3,bm3.5,bm4,pro-128k,xgemma29bit,xaipersonality,xdeepseekv3,xdeepseekr1,image_understanding',1,'','2000-01-01 00:00:00','2025-03-24 14:54:13'),
	 (1555,'WORKFLOW_CHANNEL','mcp','MCP Server','发布为MCP Server',1,'发布成功后即可在工作流编排时调用，并在agent决策节点工具列表查看','2000-01-01 00:00:00','2025-04-09 14:15:54'),
	 (1556,'LLM_WORKFLOW_FILTER_PRE','iflyaicloud','null','bm3,bm3.5,bm4,pro-128k,xgemma29bit,xaipersonality,xdeepseekv3,xdeepseekr1,image_understanding',1,'','2000-01-01 00:00:00','2025-03-24 14:54:13'),
	 (1557,'WORKFLOW_AGENT_STRATEGY','agentStrategy','ReACT (支持MCP Tools)','Structured reasoning and decision-making process to guide large models in completing complex tasks',1,'1','2000-01-01 00:00:00','2025-07-23 15:26:20'),
	 (1558,'LLM_WORKFLOW_FILTER','iflyaicloud','null','bm3,bm3.5,bm4,pro-128k,xgemma29bit,xaipersonality,xdeepseekv3,xdeepseekr1,image_understanding,image_understandingv3',1,'','2000-01-01 00:00:00','2025-05-21 15:57:20'),
	 (1559,'MCP_MODEL_API_REFLECT','mcp','xdeepseekv3','https://maas-api.cn-huabei-1.xf-yun.com/v2',1,'','2000-01-01 00:00:00','2025-05-29 15:54:10'),
	 (1560,'LLM_WORKFLOW_FILTER','xfyun','null','bm3,bm3.5,bm4,pro-128k,xgemma29bit,xaipersonality,xdeepseekv3,xdeepseekr1,image_understanding,image_understandingv3',1,'','2000-01-01 00:00:00','2025-05-21 15:57:20'),
	 (1561,'MCP_MODEL_API_REFLECT','mcp','xdeepseekr1','https://maas-api.cn-huabei-1.xf-yun.com/v2',1,'','2000-01-01 00:00:00','2025-05-29 15:54:10'),
	 (1562,'LLM_WORKFLOW_FILTER','iflyaicloud','spark-llm','patch,cbm,bm3,bm3.5,bm4,pro-128k,xgemma29bit,xaipersonality,xdeepseekv3,xdeepseekr1,image_understanding,image_understandingv3,xsqwen2d53b,xdeepseekv32,x1,xop3qwen30b,xop3qwen235b,xdeepseekr1qwen14b,xdeepseekr1qwen32b,xsp8f70988f,xqwen257bchat,xdsv3t128k,dsv3t128k',1,'','2000-01-01 00:00:00','2025-06-26 17:53:25'),
	 (1563,'MCP_SERVER_URL_PREFIX','mcp','https://xingchen-api.xf-yun.com/mcp/xingchen/flow/{0}/sse','',1,'','2000-01-01 00:00:00','2025-04-09 15:04:01'),
	 (1564,'LLM_WORKFLOW_FILTER','iflyaicloud','decision-making','patch,cbm,bm3,bm3.5,bm4,pro-128k,xgemma29bit,xaipersonality,xqwen257bchat,xdeepseekv3,xdeepseekr1',1,'','2000-01-01 00:00:00','2025-04-18 16:43:33'),
	 (1566,'LLM_WORKFLOW_FILTER','iflyaicloud','extractor-parameter','bm3,bm3.5,bm4,xdeepseekv3,xdeepseekr1,xsqwen2d53b,pro-128k',1,'','2000-01-01 00:00:00','2025-03-24 20:03:45'),
	 (1568,'LLM_WORKFLOW_FILTER','xfyun','extractor-parameter','bm3,bm3.5,bm4',1,'','2000-01-01 00:00:00','2025-03-24 19:39:29'),
	 (1570,'LLM_WORKFLOW_FILTER','xfyun','decision-making','bm3,bm3.5,bm4,pro-128k,xgemma29bit,xaipersonality,xdeepseekv3,xdeepseekr1,image_understanding,image_understandingv3',1,'','2000-01-01 00:00:00','2025-07-17 11:47:09'),
	 (1571,'LLM_WORKFLOW_FILTER','xingchen','model_square','bm3,bm3.5,bm4,pro-128k,xgemma29bit,xaipersonality,xdeepseekv3,xdeepseekr1,image_understanding,image_understandingv3,xdeepseekv32,x1,xop3qwen30b,xop3qwen235b,,xdeepseekr1qwen14b,xdeepseekr1qwen32b',1,'','2000-01-01 00:00:00','2025-07-09 14:38:46'),
	 (1572,'LLM_WORKFLOW_FILTER','xfyun','spark-llm','bm3,bm3.5,bm4,pro-128k,xgemma29bit,xaipersonality,xdeepseekv3,xdeepseekr1,image_understanding,image_understandingv3,xdeepseekv32,x1,xop3qwen30b,xop3qwen235b,xdeepseekr1qwen14b,xdeepseekr1qwen32b,xsp8f70988f,xqwen257bchat,xop3qwen14b,xop3qwen8b,xdsv3t128k,dsv3t128k',1,'','2000-01-01 00:00:00','2025-06-26 17:49:40'),
	 (1574,'LLM_WORKFLOW_FILTER_PRE','iflyaicloud','agent','xdeepseekv3,xdeepseekr1,x1,xop3qwen30b,xop3qwen235b,xdsv3t128k',1,'','2000-01-01 00:00:00','2025-06-10 17:11:32'),
	 (1576,'LLM_WORKFLOW_FILTER_PRE','xfyun','agent','xdeepseekv3,xdeepseekr1,x1,xop3qwen30b,xop3qwen235b,xdsv3t128k',1,'','2000-01-01 00:00:00','2025-06-10 17:11:32'),
	 (1577,'LLM_WORKFLOW_MODEL_FILTER','think','思考模型','x1,xdeepseekr1,xop3qwen30b,xop3qwen235b',1,'','2000-01-01 00:00:00','2025-04-29 09:46:35'),
	 (1578,'WORKFLOW_NODE_TEMPLATE','1,2','Logic','{
    "aliasName": "Agent Intelligent Decision",
    "idType": "agent",
    "data":
    {
        "outputs":
        [
            {
                "id": "",
                "customParameterType": "deepseekr1",
                "name": "REASONING_CONTENT",
                "nameErrMsg": "",
                "schema":
                {
                    "default": "Model reasoning process",
                    "type": "string"
                }
            },
            {
                "id": "",
                "name": "output",
                "nameErrMsg": "",
                "schema":
                {
                    "default": "",
                    "type": "string"
                }
            }
        ],
        "references":
        [],
        "allowInputReference": true,
        "inputs":
        [
            {
                "schema":
                {
                    "type": "string",
                    "value":
                    {
                        "type": "ref",
                        "content":
                        {}
                    }
                },
                "name": "input",
                "id": ""
            }
        ],
        "icon": "https://oss-beijing-m8.openstorage.cn/SparkBotProd/icon/common/agent.png",
        "allowOutputReference": true,
        "nodeMeta":
        {
            "aliasName": "智能体节点",
            "nodeType": "Agent节点"
        },
        "nodeParam":
        {
            "appId": "",
            "serviceId": "xdeepseekv3",
            "enableChatHistoryV2":
            {
                "isEnabled": false,
                "rounds": 1
            },
            "modelConfig":
            {
                "domain": "xdeepseekv3",
                "api": "wss://maas-api.cn-huabei-1.xf-yun.com/v1.1/chat",
                "agentStrategy": 1
            },
            "instruction":
            {
                "reasoning": "",
                "answer": "",
                "query": ""
            },
            "plugin":
            {
                "tools":
                [],
                "toolsList":
                [],
                "mcpServerIds":
                [],
                "mcpServerUrls":
                [],
                "workflowIds":
                []
            },
            "maxLoopCount": 10
        }
    },
    "description": "According to task requirements, realize intelligent scheduling of large models by selecting an appropriate tool list",
    "nodeType": "Basic Node"
}',1,'agent','2000-01-01 00:00:00','2025-07-28 10:18:24'),
	 (1580,'LLM_FILTER','summary_agent','大模型agent过滤器','xdeepseekr1,xdeepseekv3,x1,xop3qwen30b,xop3qwen235b',1,'bm3,bm3.5,bm4,pro-128k,xqwen257bchat,xqwen72bchat,xqwen257bchat,xsparkprox,xdeepseekr1,xdeepseekv3','2000-01-01 00:00:00','2025-05-12 10:38:48'),
	 (1582,'LLM_FILTER_PRE','summary_agent','大模型agent过滤器','xdeepseekr1,xdeepseekv3,x1,xop3qwen30b,xop3qwen235b,bm4',1,'bm3,bm3.5,bm4,pro-128k,xqwen257bchat,xqwen72bchat,xqwen257bchat,xsparkprox,xdeepseekr1,xdeepseekv3','2000-01-01 00:00:00','2025-05-21 15:34:23'),
	 (1583,'TAG','TOOL_TAGS_V2','Plugin',NULL,1,'1537','2025-04-01 17:51:32','2025-07-28 10:38:59'),
	 (1585,'TAG','TOOL_TAGS_V2','文档处理',NULL,0,NULL,'2025-04-01 17:51:32','2025-04-24 20:52:33'),
	 (1587,'TAG','TOOL_TAGS_V2','信息检索',NULL,0,NULL,'2025-04-01 17:51:32','2025-04-24 20:52:33'),
	 (1589,'TAG','TOOL_TAGS_V2','实用工具',NULL,0,NULL,'2025-04-01 17:51:32','2025-04-24 20:52:33'),
	 (1591,'TAG','TOOL_TAGS_V2','生活娱乐',NULL,0,NULL,'2025-04-01 17:51:32','2025-04-24 20:52:33'),
	 (1593,'TAG','TOOL_TAGS_V2','MCP Tools',NULL,1,'','2025-04-01 17:51:32','2025-07-31 11:45:28'),
	 (1595,'LLM_WORKFLOW_FILTER_PRE','xingchen','model_square','bm3,bm3.5,bm4,pro-128k,xgemma29bit,xaipersonality,xdeepseekv3,xdeepseekr1,image_understanding,xopqwenqwq32b,xdeepseekv32,x1,xop3qwen30b,xop3qwen235b',1,'','2000-01-01 00:00:00','2025-04-29 09:44:50'),
	 (1597,'LLM_WORKFLOW_FILTER','self-model','控制自定义模型适配节点','spark-llm,decision-making',1,'','2000-01-01 00:00:00','2025-06-05 16:31:53'),
	 (1599,'MULTI_ROUNDS_ALIAS_NAME','MUTI_ROUNDS_ALIAS_NAME','多轮对话支持节点','decision-making,spark-llm,agent',1,'','2000-01-01 00:00:00','2025-07-23 15:32:21'),
	 (1601,'MODEL_SECRET_KEY','public_key','公钥','MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAh3iFD+BIGlCY083ItUwJFscMyept2dVl3Zs7/S6V+NnreiUJtjkAsok++eL5BYr9Jz5KULnpQv47tPhqAJd+xxzWZRfNVABHnox61GWlqqgWogbcPZWP/rzGt6c2jOkgbUVdCU7gc+EfKKZ5Fq99A5c6vDQi5u9GozElf2VnLKrH+u0tRpmrQDNSSfW0ifxUNGTvat6cJOIGRC4iUqdI+S3d3BSJEZ9VOAuAs1xmLTZciVkmSM+/bCEfdhChAh1wfpBMOb8Lu2JUXf3tfjZtNOXWRRw70NQu9Xmn3RE0ajZDODLg+xqJ3AR3fgAhunHT8W6d/PVHSM1cFUFap4P4IQIDAQAB',1,'','2000-01-01 00:00:00','2025-04-15 11:57:22'),
	 (1603,'MODEL_SECRET_KEY','private_key','私钥','MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCHeIUP4EgaUJjTzci1TAkWxwzJ6m3Z1WXdmzv9LpX42et6JQm2OQCyiT754vkFiv0nPkpQuelC/ju0+GoAl37HHNZlF81UAEeejHrUZaWqqBaiBtw9lY/+vMa3pzaM6SBtRV0JTuBz4R8opnkWr30Dlzq8NCLm70ajMSV/ZWcsqsf67S1GmatAM1JJ9bSJ/FQ0ZO9q3pwk4gZELiJSp0j5Ld3cFIkRn1U4C4CzXGYtNlyJWSZIz79sIR92EKECHXB+kEw5vwu7YlRd/e1+Nm005dZFHDvQ1C71eafdETRqNkM4MuD7GoncBHd+ACG6cdPxbp389UdIzVwVQVqng/ghAgMBAAECggEAVF/Z8ENuZQVhyjlXEqPi3U7oRjI+bPgeU+HFgTEssyt3IEJFRDtIleopURXup2cjuPdw7cp83/7cTSCTVP8GNRle5uPmPLVX5gX00qjkf9/lCNFhBvJKFwyYb/YzYZwpWCVlhtCbt1C1SWo17M0r/bqJGIMYYeERi76mbixIEGb60mCOPyj3tZfTCXzeSaZqgEV+9SjpgBcUj0/NSn1nxOZ8SeESQHrkz+ZfUZ/VDxdICW2Hy0hGJfaR9VZHGlVnabbtreUni5JDMf7o6xSPKvThp2rIIQd4H1PLRMFeWprigQ+6vfxeMHnyS5ggag5wGclFAargqAXq0WFO3xxoSQKBgQDbAt+T0jjHvv6d/924JiJf9awoGQ6Xjbu2z2xVNHg32Hew+u+0CiRsmo1nMMS//JxieNjSRWT6SJ482xAXgmGsdBKrSf+G5s3RpBCLDOYAvx67XmxB86CCpXVwomejGCZhdD4Vm2sB68ansbW1/y2Z2UHAG6wbsC7llzrxXvwAbwKBgQCeWbVDqLCSbsHgkn7LMPVCozH0GICQN92d5oyc8veZFa8uXq7fVIpELXv/S1TDVcpwEbIUnQycFRgj/si3QPZyIAAsKf6tx8MKy+BYm81eJqc0AuUc8wrmSJdcEOBDSaZvNMVX+bmqQItDTSJ+rv5fC8+zhv+gNRH+4cuOPxC4bwKBgA4/2ZwciWU1oAtXom1gzcvAiDrzpmdl6VizljDVAR1hECiLqxzjrAsE4z5bhfGX1fTyN+k2aqN+Jg1/k0R0TzaRNsW+QsncKngBXLIvXKefx7gZJKIF3+OgMEvrxSJvZ8/faEqvmf6+AGbYwSHeQHFKGWUOZ9xFUkfN1x/tNigxAoGAXtLffhWtLvMOPHndXbYCmJX7Wu21Ryd9GYou1+mTJWPb1Iu0cl5AshT+tOEacCKWqEegeUGWhH0JSLzQ2xQWwD6ze77mGJCQFo4B2W3rLB8/byDwrEZKV55OrT4Z3ZFkDiHurwEHEpG2E2ZEatJF1wrOpPYJa5l8HkJ+T78qNxcCgYBZbJJFCL7buF5ZO6dhZVMSLlERL0q5XKbCWXe/987g2fMfi7t6UrQAQ6zxvqBFrapodcsGjxbeXerJzNHqkQ4fySHZ8qeiwSlx8tCbBiO0PR7pY4mlXratJjpHvQbs1yXUcGZ3obyuK1Oe+sa+jYJC54UVz08g2+nGiQGho5x1FQ==',1,'','2000-01-01 00:00:00','2025-04-15 11:57:22'),
	 (1605,'SPARK_PRO_QR_CODE','qr','二维码','https://oss-beijing-m8.openstorage.cn/SparkBot/test4/weichat_qr.jpeg',1,NULL,'2025-04-01 17:51:32','2025-06-05 17:07:41'),
	 (1607,'MCP_MODEL_API_REFLECT','mcp','xop3qwen30b','https://maas-api.cn-huabei-1.xf-yun.com/v2',1,'','2000-01-01 00:00:00','2025-05-29 15:54:10'),
	 (1609,'MCP_MODEL_API_REFLECT','mcp','xop3qwen235b','https://maas-api.cn-huabei-1.xf-yun.com/v2',1,'','2000-01-01 00:00:00','2025-05-29 15:54:11'),
	 (1611,'LLM_WORKFLOW_MODEL_FILTER','multiMode','多模态模型','image_understandingv3,image_understanding',1,'','2000-01-01 00:00:00','2025-03-12 15:45:05'),
	 (1613,'PERSONAL_MODEL','20000001','imagev3','{
    "llmSource": 1,
    "llmId": 10000005,
    "name": "图像理解V3",
    "patchId": "0",
    "domain": "imagev3",
    "serviceId": "image_understandingv3",
    "status": 1,
    "info": "{\\"conc\\":2,\\"domain\\":\\"generalv3.5\\",\\"expireTs\\":\\"2025-05-31\\",\\"qps\\":2,\\"tokensPreDay\\":1000,\\"tokensTotal\\":1000,\\"llmServiceId\\":\\"bm3.5\\"}"
    "info": "",
    "icon": "https://oss-beijing-m8.openstorage.cn/pro-bucket/aicloud/llm/resource/image/model/icon_iflyspark_96.png",
    "tag":
    [],
    "url": "wss://spark-api.cn-huabei-1.xf-yun.com/v2.1/image",
    "modelId": 0,
    "isThink":false,
    "multiMode":true
}',1,'','2000-01-01 00:00:00','2025-05-08 15:04:22'),
	 (1615,'WORKFLOW_KNOWLEDGE_PRO_STRATEGY','knowledgeProStrategy','Agentic RAG','Applicable to scenarios involving complex problems, proficient in breaking down complex issues into multiple sub-problems for retrieval.',1,'1','2000-01-01 00:00:00','2025-07-23 15:32:56'),
	 (1617,'WORKFLOW_KNOWLEDGE_PRO_STRATEGY','knowledgeProStrategy','Long RAG','Applicable to tasks involving understanding and generation of long document content.',1,'2','2000-01-01 00:00:00','2025-07-23 15:33:13'),
	 (1621,'LLM_WORKFLOW_FILTER_PRE','xfyun','knowledge-pro-base','xdeepseekv3',1,'','2000-01-01 00:00:00','2025-05-21 15:11:12'),
	 (1623,'LLM_WORKFLOW_FILTER_PRE','iflyaicloud','knowledge-pro-base','xdeepseekv3',1,'','2000-01-01 00:00:00','2025-05-21 15:11:12'),
	 (1627,'LLM_WORKFLOW_FILTER_PRE','iflyaicloud','question-answer','bm3,bm3.5,bm4,pro-128k,xgemma29bit,xaipersonality,xdeepseekv3,xdeepseekr1,image_understanding,image_understandingv3,xopqwenqwq32b,xdeepseekv32,x1,deepseek-ollama',1,'','2000-01-01 00:00:00','2025-05-21 10:30:36'),
	 (1629,'LLM_WORKFLOW_FILTER_PRE','xfyun','question-answer','bm3,bm3.5,bm4,pro-128k,xgemma29bit,xaipersonality,xdeepseekv3,xdeepseekr1,image_understanding,image_understandingv3,xopqwenqwq32b,xdeepseekv32,x1,deepseek-ollama',1,'','2000-01-01 00:00:00','2025-05-21 10:30:36'),
	 (1631,'LLM_WORKFLOW_FILTER','iflyaicloud','question-answer','bm3,bm3.5,bm4,pro-128k,xgemma29bit,xaipersonality,xdeepseekv3,xdeepseekr1,image_understanding,image_understandingv3,xopqwenqwq32b,xdeepseekv32,x1,deepseek-ollama',1,'','2000-01-01 00:00:00','2025-05-21 10:30:36'),
	 (1633,'LLM_WORKFLOW_FILTER','xfyun','question-answer','bm3,bm3.5,bm4,pro-128k,xgemma29bit,xaipersonality,xdeepseekv3,xdeepseekr1,image_understanding,image_understandingv3,xopqwenqwq32b,xdeepseekv32,x1,deepseek-ollama',1,'','2000-01-01 00:00:00','2025-05-21 10:30:36'),
	 (1635,'LLM_WORKFLOW_FILTER','xfyun','knowledge-pro-base','xdeepseekv3',1,'','2000-01-01 00:00:00','2025-05-16 15:10:15'),
	 (1637,'LLM_WORKFLOW_FILTER','iflyaicloud','knowledge-pro-base','xdeepseekv3',1,'','2000-01-01 00:00:00','2025-05-16 15:10:15'),
	 (1639,'WORKFLOW_NODE_TEMPLATE_PRE','1,2','基础节点','{
    "aliasName": "Knowledge Base Pro",
    "idType": "knowledge-pro-base",
    "data":
    {
        "outputs":
        [
            {
                "id": "52f0819d-e403-43e1-85d3-50519ccfcbcf",
                "name": "output",
                "schema":
                {
                    "type": "string",
                    "default": ""
                },
                "required": false,
                "nameErrMsg": ""
            },
            {
                "id": "87247b70-f05c-4125-a416-e2c41be2e1c1",
                "name": "result",
                "schema":
                {
                    "type": "array-object",
                    "default": "",
                    "properties":
                    [
                        {
                            "id": "a9db3a72-abb2-4512-a598-13b8294fce60",
                            "name": "source_id",
                            "type": "string",
                            "default": "",
                            "required": false,
                            "nameErrMsg": ""
                        },
                        {
                            "id": "c1711905-9f7e-4408-918e-33d57d39f9bc",
                            "name": "chunk",
                            "type": "array-object",
                            "default": "",
                            "required": false,
                            "nameErrMsg": "",
                            "properties":
                            [
                                {
                                    "id": "b8b50110-2abc-4732-9c96-6f3b7bad9259",
                                    "name": "chunk_context",
                                    "type": "string",
                                    "default": "",
                                    "required": false,
                                    "nameErrMsg": ""
                                },
                                {
                                    "id": "95ffea3c-4008-4df8-84a8-013079e72276",
                                    "name": "score",
                                    "type": "number",
                                    "default": "",
                                    "required": false,
                                    "nameErrMsg": "",
                                    "properties":
                                    []
                                }
                            ]
                        }
                    ]
                },
                "required": false,
                "nameErrMsg": ""
            }
        ],
        "references":
        [],
        "allowInputReference": true,
        "inputs":
        [
            {
                "schema":
                {
                    "type": "string",
                    "value":
                    {
                        "type": "ref",
                        "content":
                        {}
                    }
                },
                "name": "query",
                "id": ""
            }
        ],
        "icon": "https://oss-beijing-m8.openstorage.cn/pro-bucket/sparkBot/common/workflow/icon/knowledgeIcon.png",
        "allowOutputReference": true,
        "nodeMeta":
        {
            "aliasName": "知识库 Pro",
            "nodeType": "工具"
        },
        "nodeParam":
        {
            "repoTopK": 3,
            "topK": 4,
            "repoIds":
            [],
            "repoList":
            [],
            "ragType": 1,
            "url": "https://maas-api.cn-huabei-1.xf-yun.com/v2",
            "domain": "xdeepseekv3",
            "temperature": 0.5,
            "maxTokens": 2048,
            "model": "xdeepseekv3",
            "llmId": 141,
            "serviceId": "xdeepseekv3",
            "answerRole": "",
            "repoType": 1
        }
    },
    "description": "Invoke the knowledge base through intelligent strategy, supporting designated knowledge bases for retrieval and summarization response.",
    "nodeType": "Basic Node"
}',1,'知识库pro节点','2000-01-01 00:00:00','2025-07-25 16:58:05'),
	 (1641,'mingduan','x1','x1','https://spark-api-open.xf-yun.com/v2',1,'','2000-01-01 00:00:00','2025-05-21 14:50:16'),
	 (1643,'mingduan','bm4','bm4','https://spark-api-open.xf-yun.com/v1',1,'','2000-01-01 00:00:00','2025-05-21 14:50:16'),
	 (1645,'mingduan','AK:SK','','x1,bm4',1,'https://spark-api-open.xf-yun.com/v2','2000-01-01 00:00:00','2025-05-21 15:42:44'),
	 (1647,'MODEL_URL_CONFIG','Agent节点','https://maas-api.cn-huabei-1.xf-yun.com/v2','xdeepseekv3,xdeepseekr1,xop3qwen30b,xop3qwen235b',1,'','2000-01-01 00:00:00','2025-05-29 15:35:31'),
	 (1649,'WORKFLOW_NODE_TEMPLATE','1,2','Basic Node','{
    "aliasName": "Knowledge Base Pro",
    "idType": "knowledge-pro-base",
    "data":
    {
        "outputs":
        [
            {
                "id": "52f0819d-e403-43e1-85d3-50519ccfcbcf",
                "name": "output",
                "schema":
                {
                    "type": "string",
                    "default": ""
                },
                "required": false,
                "nameErrMsg": ""
            },
            {
                "id": "87247b70-f05c-4125-a416-e2c41be2e1c1",
                "name": "result",
                "schema":
                {
                    "type": "array-object",
                    "default": "",
                    "properties":
                    [
                        {
                            "id": "a9db3a72-abb2-4512-a598-13b8294fce60",
                            "name": "source_id",
                            "type": "string",
                            "default": "",
                            "required": false,
                            "nameErrMsg": ""
                        },
                        {
                            "id": "c1711905-9f7e-4408-918e-33d57d39f9bc",
                            "name": "chunk",
                            "type": "array-object",
                            "default": "",
                            "required": false,
                            "nameErrMsg": "",
                            "properties":
                            [
                                {
                                    "id": "b8b50110-2abc-4732-9c96-6f3b7bad9259",
                                    "name": "chunk_context",
                                    "type": "string",
                                    "default": "",
                                    "required": false,
                                    "nameErrMsg": ""
                                },
                                {
                                    "id": "95ffea3c-4008-4df8-84a8-013079e72276",
                                    "name": "score",
                                    "type": "number",
                                    "default": "",
                                    "required": false,
                                    "nameErrMsg": "",
                                    "properties":
                                    []
                                }
                            ]
                        }
                    ]
                },
                "required": false,
                "nameErrMsg": ""
            }
        ],
        "references":
        [],
        "allowInputReference": true,
        "inputs":
        [
            {
                "schema":
                {
                    "type": "string",
                    "value":
                    {
                        "type": "ref",
                        "content":
                        {}
                    }
                },
                "name": "query",
                "id": ""
            }
        ],
        "icon": "https://oss-beijing-m8.openstorage.cn/pro-bucket/sparkBot/common/workflow/icon/knowledgeIcon.png",
        "allowOutputReference": true,
        "nodeMeta":
        {
            "aliasName": "知识库 Pro",
            "nodeType": "工具"
        },
        "nodeParam":
        {
            "repoTopK": 3,
            "topK": 4,
            "repoIds":
            [],
            "repoList":
            [],
            "ragType": 1,
            "url": "https://maas-api.cn-huabei-1.xf-yun.com/v2",
            "domain": "xdeepseekv3",
            "temperature": 0.5,
            "maxTokens": 2048,
            "model": "xdeepseekv3",
            "llmId": 141,
            "serviceId": "xdeepseekv3",
            "answerRole": "",
            "repoType": 1
        }
    },
    "description": "Invoke the knowledge base through intelligent strategy, supporting designated knowledge bases for retrieval and summarization response.",
    "nodeType": "Basic Node"
}',1,'知识库pro节点','2000-01-01 00:00:00','2025-07-28 10:18:24'),
	 (1651,'WORKFLOW_NODE_TEMPLATE_INNER','1,2','固定节点','{
  "idType": "node-start",
  "type": "Start Node",
  "position": {
    "x": 100,
    "y": 300
  },
  "data": {
    "label": "Start",
    "description": "The starting node of the workflow, used to define the business variable information required for process invocation.",
    "nodeMeta": {
      "nodeType": "Basic Node",
      "aliasName": "Start Node"
    },
    "inputs": [],
    "outputs": [
      {
        "id": "",
        "name": "AGENT_USER_INPUT",
        "deleteDisabled": true,
        "required": true,
        "schema": {
          "type": "string",
          "default": "User input of the current conversation round"
        }
      }
    ],
    "nodeParam": {},
    "allowInputReference": false,
    "allowOutputReference": true,
    "icon": "https://oss-beijing-m8.openstorage.cn/pro-bucket/sparkBot/common/workflow/icon/start-node-icon.png"
  }
}',1,'开始节点','2000-01-01 00:00:00','2025-07-23 15:36:49'),
	 (1653,'WORKFLOW_NODE_TEMPLATE_INNER','1,2','固定节点','{
  "idType": "node-end",
  "type": "End Node",
  "position": {
    "x": 1000,
    "y": 300
  },
  "data": {
    "label": "End",
    "description": "The end node of the workflow, used to output the final result after the workflow execution.",
    "nodeMeta": {
      "nodeType": "Basic Node",
      "aliasName": "End Node"
    },
    "inputs": [
      {
        "id": "",
        "name": "output",
        "schema": {
          "type": "string",
          "value": {
            "type": "ref",
            "content": {}
          }
        }
      }
    ],
    "outputs": [],
    "nodeParam": {
      "outputMode": 1,
      "template": "",
      "streamOutput": true
    },
    "references": [],
    "allowInputReference": true,
    "allowOutputReference": false,
    "icon": "https://oss-beijing-m8.openstorage.cn/pro-bucket/sparkBot/common/workflow/icon/end-node-icon.png"
  }
}',1,'结束节点','2000-01-01 00:00:00','2025-07-23 15:36:49'),
	 (1655,'WORKFLOW_NODE_TEMPLATE_INNER','1,2','基础节点','{
    "idType": "spark-llm",
    "nodeType": "Basic Node",
    "aliasName": "Large Model",
    "description": "Based on the input prompt, the selected large language model will be invoked to respond accordingly.",
    "data": {
        "nodeMeta": {
            "nodeType": "Basic Node",
            "aliasName": "Large Model"
        },
        "inputs": [
            {
                "id": "",
                "name": "input",
                "schema": {
                    "type": "string",
                    "value": {
                        "type": "ref",
                        "content": {}
                    }
                }
            }
        ],
        "outputs": [
            {
                "id": "",
                "name": "output",
                "schema": {
                    "type": "string",
                    "default": ""
                }
            }
        ],
        "nodeParam": {
            "maxTokens": 2048,
            "temperature": 0.5,
            "topK": 4,
            "auditing": "default",
            "domain": "4.0Ultra",
            "template": "",
            "model": "spark",
            "serviceId": "bm4",
            "respFormat": 0,
            "llmId": 110,
            "patchId": "0",
            "url": "wss://spark-api.xf-yun.com/v4.0/chat",
            "appId": "d1590f30",
            "uid": "2171",
            "enableChatHistoryV2": {
                "isEnabled": false,
                "rounds": 1
            }
        },
        "references": [],
        "allowInputReference": true,
        "allowOutputReference": true,
        "icon": "https://oss-beijing-m8.openstorage.cn/pro-bucket/sparkBot/common/workflow/icon/largeModelIcon.png"
    }
}',1,'大模型','2000-01-01 00:00:00','2025-07-23 15:36:50'),
	 (1657,'WORKFLOW_NODE_TEMPLATE_INNER','1,2','基础节点','{
    "idType": "ifly-code",
    "nodeType": "Basic Node",
    "aliasName": "Code",
    "description": "Provides code development capability for developers, currently only supports Python language. Allows parameters to be passed in using defined variables, and the return statement is used to output the result of the function.",
    "data": {
        "nodeMeta": {
            "nodeType": "Tool",
            "aliasName": "Code"
        },
        "inputs": [
            {
                "id": "",
                "name": "input",
                "schema": {
                    "type": "string",
                    "value": {
                        "type": "ref",
                        "content": {}
                    }
                }
            }
        ],
        "outputs": [
            {
                "id": "",
                "name": "key0",
                "schema": {
                    "type": "string",
                    "default": ""
                }
            },
            {
                "id": "",
                "name": "key1",
                "schema": {
                    "type": "array-string",
                    "default": ""
                }
            },
            {
                "id": "",
                "name": "key2",
                "schema": {
                    "type": "object",
                    "default": "",
                    "properties": [
                        {
                            "id": "",
                            "name": "key21",
                            "type": "string",
                            "default": "",
                            "required": true,
                            "nameErrMsg": ""
                        }
                    ]
                }
            }
        ],
        "nodeParam": {
            "code": "def main(input):\\n    ret = {\\n        \\"key0\\": input + \\"hello\\",\\n        \\"key1\\": [\\"hello\\", \\"world\\"],\\n        \\"key2\\": {\\"key21\\": \\"hi\\"}\\n    }\\n    return ret"
        },
        "references": [],
        "allowInputReference": true,
        "allowOutputReference": true,
        "icon": "https://oss-beijing-m8.openstorage.cn/pro-bucket/sparkBot/common/workflow/icon/codeIcon.png"
    }
}',1,'代码','2000-01-01 00:00:00','2025-07-23 15:36:50'),
	 (1659,'WORKFLOW_NODE_TEMPLATE_INNER','1,2','基础节点','{
    "idType": "knowledge-base",
    "nodeType": "Basic Node",
    "aliasName": "Knowledge Base",
    "description": "Calls the knowledge base and allows specifying a knowledge repository for information retrieval and response.",
    "data": {
        "nodeMeta": {
            "nodeType": "Tool",
            "aliasName": "Knowledge Base"
        },
        "inputs": [
            {
                "id": "",
                "name": "query",
                "schema": {
                    "type": "string",
                    "value": {
                        "type": "ref",
                        "content": {}
                    }
                }
            }
        ],
        "outputs": [
            {
                "id": "",
                "name": "results",
                "schema": {
                    "type": "array-object",
                    "properties": [
                        {
                            "id": "",
                            "name": "score",
                            "type": "number",
                            "default": "",
                            "required": true,
                            "nameErrMsg": ""
                        },
                        {
                            "id": "",
                            "name": "docId",
                            "type": "string",
                            "default": "",
                            "required": true,
                            "nameErrMsg": ""
                        },
                        {
                            "id": "",
                            "name": "title",
                            "type": "string",
                            "default": "",
                            "required": true,
                            "nameErrMsg": ""
                        },
                        {
                            "id": "",
                            "name": "content",
                            "type": "string",
                            "default": "",
                            "required": true,
                            "nameErrMsg": ""
                        },
                        {
                            "id": "",
                            "name": "context",
                            "type": "string",
                            "default": "",
                            "required": true,
                            "nameErrMsg": ""
                        },
                        {
                            "id": "",
                            "name": "references",
                            "type": "object",
                            "default": "",
                            "required": true,
                            "nameErrMsg": ""
                        }
                    ]
                },
                "required": true,
                "nameErrMsg": ""
            }
        ],
        "nodeParam": {
            "repoId": [],
            "repoList": [],
            "topN": 3
        },
        "references": [],
        "allowInputReference": true,
        "allowOutputReference": true,
        "icon": "https://oss-beijing-m8.openstorage.cn/pro-bucket/sparkBot/common/workflow/icon/knowledgeIcon.png"
    }
}',1,'知识库','2000-01-01 00:00:00','2025-07-23 15:36:50'),
	 (1661,'WORKFLOW_NODE_TEMPLATE_INNER','1,2','工具','{
    "idType": "flow",
    "nodeType": "Tool",
    "aliasName": "Workflow",
    "description": "Quickly integrate published workflows for efficient reuse of existing capabilities.",
    "data": {
        "nodeMeta": {
            "nodeType": "Tool",
            "aliasName": "Workflow"
        },
        "inputs": [],
        "outputs": [],
        "nodeParam": {
            "appId": "",
            "flowId": "",
            "uid": ""
        },
        "references": [],
        "allowInputReference": true,
        "allowOutputReference": true,
        "icon": "https://oss-beijing-m8.openstorage.cn/pro-bucket/sparkBot/common/workflow/icon/flow-icon.png"
    }
}',1,'工作流','2000-01-01 00:00:00','2025-07-23 15:36:50'),
	 (1663,'WORKFLOW_NODE_TEMPLATE_INNER','1,2','逻辑','{
    "idType": "decision-making",
    "nodeType": "Basic Node",
    "aliasName": "Decision",
    "description": "Determine the subsequent logic path based on input parameters and the specified intents.",
    "data": {
        "nodeMeta": {
            "nodeType": "Basic Node",
            "aliasName": "Decision"
        },
        "nodeParam": {
            "maxTokens": 2048,
            "temperature": 0.5,
            "topK": 4,
            "auditing": "default",
            "domain": "4.0Ultra",
            "llmId": 110,
            "enableChatHistoryV2": {
                "isEnabled": false,
                "rounds": 1
            },
            "uid": "2171",
            "intentChains": [
                {
                    "intentType": 2,
                    "name": "",
                    "description": "",
                    "id": "intent-one-of::4724514d-ffc8-4412-bf7f-13cc3375110d"
                },
                {
                    "intentType": 1,
                    "name": "default",
                    "description": "Default intent",
                    "id": "intent-one-of::506841e4-3f6c-40b1-a804-dc5ffe723b34"
                }
            ],
            "reasonMode": 1,
            "model": "spark",
            "useFunctionCall": true,
            "serviceId": "bm4",
            "promptPrefix": "",
            "patchId": "0",
            "url": "wss://spark-api.xf-yun.com/v4.0/chat",
            "appId": "d1590f30"
        },
        "inputs": [
            {
                "id": "",
                "name": "Query",
                "schema": {
                    "type": "string",
                    "value": {
                        "type": "ref",
                        "content": {}
                    }
                }
            }
        ],
        "outputs": [
            {
                "id": "",
                "name": "class_name",
                "schema": {
                    "type": "string",
                    "default": ""
                }
            }
        ],
        "references": [],
        "allowInputReference": true,
        "allowOutputReference": true,
        "icon": "https://oss-beijing-m8.openstorage.cn/pro-bucket/sparkBot/common/workflow/icon/designMakeIcon.png"
    }
}',1,'决策','2000-01-01 00:00:00','2025-07-23 15:45:05'),
	 (1665,'WORKFLOW_NODE_TEMPLATE_INNER','1,2','逻辑','{
    "idType": "if-else",
    "nodeType": "Branch",
    "aliasName": "Branch",
    "description": "Determine the branch path based on the defined conditions",
    "data": {
        "nodeMeta": {
            "nodeType": "Branch",
            "aliasName": "Branch"
        },
        "nodeParam": {
            "cases": [
                {
                    "id": "branch_one_of::",
                    "level": 1,
                    "logicalOperator": "and",
                    "conditions": [
                        {
                            "id": "",
                            "leftVarIndex": null,
                            "rightVarIndex": null,
                            "compareOperator": null
                        }
                    ]
                },
                {
                    "id": "branch_one_of::",
                    "level": 999,
                    "logicalOperator": "and",
                    "conditions": []
                }
            ]
        },
        "inputs": [
            {
                "id": "",
                "name": "input",
                "schema": {
                    "type": "string",
                    "value": {
                        "type": "ref",
                        "content": {
                            "nodeId": "",
                            "name": ""
                        }
                    }
                }
            },
            {
                "id": "",
                "name": "input1",
                "schema": {
                    "type": "string",
                    "value": {
                        "type": "ref",
                        "content": {
                            "nodeId": "",
                            "name": ""
                        }
                    }
                }
            }
        ],
        "outputs": [],
        "references": [],
        "allowInputReference": true,
        "allowOutputReference": false,
        "icon": "https://oss-beijing-m8.openstorage.cn/pro-bucket/sparkBot/common/workflow/icon/if-else-node-icon.png"
    }
}',1,'分支器','2000-01-01 00:00:00','2025-07-23 15:45:05'),
	 (1667,'WORKFLOW_NODE_TEMPLATE_INNER','1,2','逻辑','{
    "idType": "iteration",
    "nodeType": "Basic Node",
    "aliasName": "Iteration",
    "description": "This node is used to handle loop logic and supports only one level of nesting",
    "data": {
        "nodeMeta": {
            "nodeType": "Basic Node",
            "aliasName": "Iteration"
        },
        "nodeParam": {},
        "inputs": [
            {
                "id": "",
                "name": "input",
                "schema": {
                    "type": "",
                    "value": {
                        "type": "ref",
                        "content": {}
                    }
                }
            }
        ],
        "outputs": [
            {
                "id": "",
                "name": "output",
                "schema": {
                    "type": "array-string",
                    "default": ""
                }
            }
        ],
        "iteratorNodes": [],
        "iteratorEdges": [],
        "references": [],
        "allowInputReference": true,
        "allowOutputReference": true,
        "icon": "https://oss-beijing-m8.openstorage.cn/pro-bucket/sparkBot/common/workflow/icon/iteration-icon.png"
    }
}',1,'迭代','2000-01-01 00:00:00','2025-07-23 15:45:05'),
	 (1669,'WORKFLOW_NODE_TEMPLATE_INNER','1,2','转换','{
    "idType": "node-variable",
    "nodeType": "Basic Node",
    "aliasName": "Variable Storage",
    "description": "Allows setting multiple variables for long-term data storage, which remains effective and updates persistently",
    "data": {
        "nodeMeta": {
            "nodeType": "Basic Node",
            "aliasName": "Variable Storage"
        },
        "nodeParam": {
            "method": "set"
        },
        "inputs": [
            {
                "id": "",
                "name": "input",
                "schema": {
                    "type": "string",
                    "value": {
                        "type": "ref",
                        "content": {}
                    }
                }
            }
        ],
        "outputs": [],
        "references": [],
        "allowInputReference": true,
        "allowOutputReference": true,
        "icon": "https://oss-beijing-m8.openstorage.cn/pro-bucket/sparkBot/common/workflow/icon/variable-memory-icon.png"
    }
}',1,'变量存储器','2000-01-01 00:00:00','2025-07-23 15:45:05'),
	 (1671,'WORKFLOW_NODE_TEMPLATE_INNER','1,2','转换','{
    "idType": "extractor-parameter",
    "nodeType": "Basic Node",
    "aliasName": "Variable Extractor",
    "description": "Extracts natural language content from the output of the previous node based on variable extraction descriptions",
    "data": {
        "nodeMeta": {
            "nodeType": "Basic Node",
            "aliasName": "Variable Extractor"
        },
        "nodeParam": {
            "maxTokens": 2048,
            "temperature": 0.5,
            "topK": 4,
            "auditing": "default",
            "domain": "4.0Ultra",
            "llmId": 110,
            "model": "spark",
            "serviceId": "bm4",
            "patchId": "0",
            "url": "wss://spark-api.xf-yun.com/v4.0/chat",
            "appId": "d1590f30",
            "uid": "2171",
            "reasonMode": 1
        },
        "inputs": [
            {
                "id": "",
                "name": "input",
                "schema": {
                    "type": "string",
                    "value": {
                        "type": "ref",
                        "content": {}
                    }
                }
            }
        ],
        "outputs": [
            {
                "id": "",
                "name": "output",
                "schema": {
                    "type": "string",
                    "description": ""
                },
                "required": true
            }
        ],
        "references": [],
        "allowInputReference": true,
        "allowOutputReference": true,
        "icon": "https://oss-beijing-m8.openstorage.cn/pro-bucket/sparkBot/common/workflow/icon/variable-extractor-icon.png"
    }
}',1,'变量提取器','2000-01-01 00:00:00','2025-07-23 15:45:05'),
	 (1673,'WORKFLOW_NODE_TEMPLATE_INNER','1,2','转换','{
    "idType": "text-joiner",
    "nodeType": "Tool",
    "aliasName": "Text Processing Node",
    "description": "Used to process multiple string variables according to specified formatting rules",
    "data": {
        "nodeMeta": {
            "nodeType": "Tool",
            "aliasName": "Text Joiner"
        },
        "nodeParam": {
            "prompt": ""
        },
        "inputs": [
            {
                "id": "",
                "name": "input",
                "schema": {
                    "type": "string",
                    "value": {
                        "type": "ref",
                        "content": {}
                    }
                }
            }
        ],
        "outputs": [
            {
                "id": "",
                "name": "output",
                "schema": {
                    "type": "string"
                }
            }
        ],
        "references": [],
        "allowInputReference": true,
        "allowOutputReference": true,
        "icon": "https://oss-beijing-m8.openstorage.cn/pro-bucket/sparkBot/common/workflow/icon/text-splicing-icon.png"
    }
}',1,'文本处理节点','2000-01-01 00:00:00','2025-07-23 15:45:05'),
	 (1675,'WORKFLOW_NODE_TEMPLATE_INNER','1,2','其他','{
    "idType": "message",
    "nodeType": "Basic Node",
    "aliasName": "Message",
    "description": "Used to output intermediate results during workflow execution",
    "data": {
        "nodeMeta": {
            "nodeType": "Basic Node",
            "aliasName": "Message"
        },
        "nodeParam": {
            "template": "",
            "startFrameEnabled": false
        },
        "inputs": [
            {
                "id": "",
                "name": "input",
                "schema": {
                    "type": "string",
                    "value": {
                        "type": "ref",
                        "content": {}
                    }
                }
            }
        ],
        "outputs": [
            {
                "id": "",
                "name": "output_m",
                "schema": {
                    "type": "string"
                }
            }
        ],
        "references": [],
        "allowInputReference": true,
        "allowOutputReference": false,
        "icon": "https://oss-beijing-m8.openstorage.cn/pro-bucket/sparkBot/common/workflow/icon/message-node-icon.png"
    }
}',1,'消息','2000-01-01 00:00:00','2025-07-23 15:45:06'),
	 (1677,'WORKFLOW_NODE_TEMPLATE_INNER','1,2','工具','{
    "idType": "plugin",
    "nodeType": "Tool",
    "aliasName": "Tool",
    "description": "Quickly acquire skills by integrating external tools to meet user needs",
    "data": {
        "nodeMeta": {
            "nodeType": "Tool",
            "aliasName": "Tool"
        },
        "inputs": [],
        "outputs": [],
        "nodeParam": {
            "appId": "4eea957b",
            "code": ""
        },
        "references": [],
        "allowInputReference": true,
        "allowOutputReference": true,
        "icon": "https://oss-beijing-m8.openstorage.cn/pro-bucket/sparkBot/common/workflow/icon/tool-icon.png"
    }
}',1,'工具','2000-01-01 00:00:00','2025-07-23 15:45:06'),
	 (1679,'WORKFLOW_NODE_TEMPLATE_INNER','1,2','逻辑','{
  "aliasName": "Agent Intelligent Decision",
  "idType": "agent",
  "data": {
    "outputs": [
      {
        "id": "",
        "customParameterType": "deepseekr1",
        "name": "REASONING_CONTENT",
        "nameErrMsg": "",
        "schema": {
          "default": "Model reasoning process",
          "type": "string"
        }
      },
      {
        "id": "",
        "name": "output",
        "nameErrMsg": "",
        "schema": {
          "default": "",
          "type": "string"
        }
      }
    ],
    "references": [],
    "allowInputReference": true,
    "inputs": [
      {
        "schema": {
          "type": "string",
          "value": {
            "type": "ref",
            "content": {}
          }
        },
        "name": "input",
        "id": ""
      }
    ],
    "icon": "https://oss-beijing-m8.openstorage.cn/SparkBotProd/icon/common/agent.png",
    "allowOutputReference": true,
    "nodeMeta": {
      "aliasName": "Agent Node",
      "nodeType": "Agent Node"
    },
    "nodeParam": {
      "appId": "",
      "serviceId": "xdeepseekv3",
      "enableChatHistoryV2": {
        "isEnabled": false,
        "rounds": 1
      },
      "modelConfig": {
        "domain": "xdeepseekv3",
        "api": "wss://maas-api.cn-huabei-1.xf-yun.com/v1.1/chat",
        "agentStrategy": 1
      },
      "instruction": {
        "reasoning": "",
        "answer": "",
        "query": ""
      },
      "plugin": {
        "tools": [],
        "toolsList": [],
        "mcpServerIds": [],
        "mcpServerUrls": [],
        "workflowIds": []
      },
      "maxLoopCount": 10
    }
  },
  "description": "According to task requirements, realize intelligent scheduling of large models by selecting an appropriate tool list",
  "nodeType": "Basic Node"
}',1,'agent','2000-01-01 00:00:00','2025-07-23 15:45:06'),
	 (1681,'WORKFLOW_NODE_TEMPLATE_INNER_PRE','1,2','固定节点','{
  "idType": "node-start",
  "type": "Start Node",
  "position": {
    "x": 100,
    "y": 300
  },
  "data": {
    "label": "Start",
    "description": "The starting node of the workflow, used to define the business variable information required for process invocation.",
    "nodeMeta": {
      "nodeType": "Basic Node",
      "aliasName": "Start Node"
    },
    "inputs": [],
    "outputs": [
      {
        "id": "",
        "name": "AGENT_USER_INPUT",
        "deleteDisabled": true,
        "required": true,
        "schema": {
          "type": "string",
          "default": "User input of the current conversation round"
        }
      }
    ],
    "nodeParam": {},
    "allowInputReference": false,
    "allowOutputReference": true,
    "icon": "https://oss-beijing-m8.openstorage.cn/pro-bucket/sparkBot/common/workflow/icon/start-node-icon.png"
  }
}',1,'开始节点','2000-01-01 00:00:00','2025-07-23 15:36:49'),
	 (1683,'WORKFLOW_NODE_TEMPLATE_INNER_PRE','1,2','固定节点','{
  "idType": "node-end",
  "type": "End Node",
  "position": {
    "x": 1000,
    "y": 300
  },
  "data": {
    "label": "End",
    "description": "The end node of the workflow, used to output the final result after the workflow execution.",
    "nodeMeta": {
      "nodeType": "Basic Node",
      "aliasName": "End Node"
    },
    "inputs": [
      {
        "id": "",
        "name": "output",
        "schema": {
          "type": "string",
          "value": {
            "type": "ref",
            "content": {}
          }
        }
      }
    ],
    "outputs": [],
    "nodeParam": {
      "outputMode": 1,
      "template": "",
      "streamOutput": true
    },
    "references": [],
    "allowInputReference": true,
    "allowOutputReference": false,
    "icon": "https://oss-beijing-m8.openstorage.cn/pro-bucket/sparkBot/common/workflow/icon/end-node-icon.png"
  }
}',1,'结束节点','2000-01-01 00:00:00','2025-07-23 15:36:49'),
	 (1685,'WORKFLOW_NODE_TEMPLATE_INNER_PRE','1,2','基础节点','{
    "idType": "spark-llm",
    "nodeType": "Basic Node",
    "aliasName": "Large Model",
    "description": "Based on the input prompt, the selected large language model will be invoked to respond accordingly.",
    "data": {
        "nodeMeta": {
            "nodeType": "Basic Node",
            "aliasName": "Large Model"
        },
        "inputs": [
            {
                "id": "",
                "name": "input",
                "schema": {
                    "type": "string",
                    "value": {
                        "type": "ref",
                        "content": {}
                    }
                }
            }
        ],
        "outputs": [
            {
                "id": "",
                "name": "output",
                "schema": {
                    "type": "string",
                    "default": ""
                }
            }
        ],
        "nodeParam": {
            "maxTokens": 2048,
            "temperature": 0.5,
            "topK": 4,
            "auditing": "default",
            "domain": "4.0Ultra",
            "template": "",
            "model": "spark",
            "serviceId": "bm4",
            "respFormat": 0,
            "llmId": 110,
            "patchId": "0",
            "url": "wss://spark-api.xf-yun.com/v4.0/chat",
            "appId": "d1590f30",
            "uid": "2171",
            "enableChatHistoryV2": {
                "isEnabled": false,
                "rounds": 1
            }
        },
        "references": [],
        "allowInputReference": true,
        "allowOutputReference": true,
        "icon": "https://oss-beijing-m8.openstorage.cn/pro-bucket/sparkBot/common/workflow/icon/largeModelIcon.png"
    }
}',1,'大模型','2000-01-01 00:00:00','2025-07-23 15:36:49'),
	 (1687,'WORKFLOW_NODE_TEMPLATE_INNER_PRE','1,2','基础节点','{
    "idType": "ifly-code",
    "nodeType": "Basic Node",
    "aliasName": "Code",
    "description": "Provides code development capability for developers, currently only supports Python language. Allows parameters to be passed in using defined variables, and the return statement is used to output the result of the function.",
    "data": {
        "nodeMeta": {
            "nodeType": "Tool",
            "aliasName": "Code"
        },
        "inputs": [
            {
                "id": "",
                "name": "input",
                "schema": {
                    "type": "string",
                    "value": {
                        "type": "ref",
                        "content": {}
                    }
                }
            }
        ],
        "outputs": [
            {
                "id": "",
                "name": "key0",
                "schema": {
                    "type": "string",
                    "default": ""
                }
            },
            {
                "id": "",
                "name": "key1",
                "schema": {
                    "type": "array-string",
                    "default": ""
                }
            },
            {
                "id": "",
                "name": "key2",
                "schema": {
                    "type": "object",
                    "default": "",
                    "properties": [
                        {
                            "id": "",
                            "name": "key21",
                            "type": "string",
                            "default": "",
                            "required": true,
                            "nameErrMsg": ""
                        }
                    ]
                }
            }
        ],
        "nodeParam": {
            "code": "def main(input):\\n    ret = {\\n        \\"key0\\": input + \\"hello\\",\\n        \\"key1\\": [\\"hello\\", \\"world\\"],\\n        \\"key2\\": {\\"key21\\": \\"hi\\"}\\n    }\\n    return ret"
        },
        "references": [],
        "allowInputReference": true,
        "allowOutputReference": true,
        "icon": "https://oss-beijing-m8.openstorage.cn/pro-bucket/sparkBot/common/workflow/icon/codeIcon.png"
    }
}',1,'代码','2000-01-01 00:00:00','2025-07-23 15:36:49'),
	 (1689,'WORKFLOW_NODE_TEMPLATE_INNER_PRE','1,2','基础节点','{
    "idType": "knowledge-base",
    "nodeType": "Basic Node",
    "aliasName": "Knowledge Base",
    "description": "Calls the knowledge base and allows specifying a knowledge repository for information retrieval and response.",
    "data": {
        "nodeMeta": {
            "nodeType": "Tool",
            "aliasName": "Knowledge Base"
        },
        "inputs": [
            {
                "id": "",
                "name": "query",
                "schema": {
                    "type": "string",
                    "value": {
                        "type": "ref",
                        "content": {}
                    }
                }
            }
        ],
        "outputs": [
            {
                "id": "",
                "name": "results",
                "schema": {
                    "type": "array-object",
                    "properties": [
                        {
                            "id": "",
                            "name": "score",
                            "type": "number",
                            "default": "",
                            "required": true,
                            "nameErrMsg": ""
                        },
                        {
                            "id": "",
                            "name": "docId",
                            "type": "string",
                            "default": "",
                            "required": true,
                            "nameErrMsg": ""
                        },
                        {
                            "id": "",
                            "name": "title",
                            "type": "string",
                            "default": "",
                            "required": true,
                            "nameErrMsg": ""
                        },
                        {
                            "id": "",
                            "name": "content",
                            "type": "string",
                            "default": "",
                            "required": true,
                            "nameErrMsg": ""
                        },
                        {
                            "id": "",
                            "name": "context",
                            "type": "string",
                            "default": "",
                            "required": true,
                            "nameErrMsg": ""
                        },
                        {
                            "id": "",
                            "name": "references",
                            "type": "object",
                            "default": "",
                            "required": true,
                            "nameErrMsg": ""
                        }
                    ]
                },
                "required": true,
                "nameErrMsg": ""
            }
        ],
        "nodeParam": {
            "repoId": [],
            "repoList": [],
            "topN": 3
        },
        "references": [],
        "allowInputReference": true,
        "allowOutputReference": true,
        "icon": "https://oss-beijing-m8.openstorage.cn/pro-bucket/sparkBot/common/workflow/icon/knowledgeIcon.png"
    }
}',1,'知识库','2000-01-01 00:00:00','2025-07-23 15:36:49'),
	 (1691,'WORKFLOW_NODE_TEMPLATE_INNER_PRE','1,2','工具','{
    "idType": "plugin",
    "nodeType": "Tool",
    "aliasName": "Tool",
    "description": "Quickly acquire skills by integrating external tools to meet user needs",
    "data": {
        "nodeMeta": {
            "nodeType": "Tool",
            "aliasName": "Tool"
        },
        "inputs": [],
        "outputs": [],
        "nodeParam": {
            "appId": "4eea957b",
            "code": ""
        },
        "references": [],
        "allowInputReference": true,
        "allowOutputReference": true,
        "icon": "https://oss-beijing-m8.openstorage.cn/pro-bucket/sparkBot/common/workflow/icon/tool-icon.png"
    }
}',1,'工具','2000-01-01 00:00:00','2025-07-23 15:45:05'),
	 (1693,'WORKFLOW_NODE_TEMPLATE_INNER_PRE','1,2','工具','{
    "idType": "flow",
    "nodeType": "Tool",
    "aliasName": "Workflow",
    "description": "Quickly integrate published workflows for efficient reuse of existing capabilities.",
    "data": {
        "nodeMeta": {
            "nodeType": "Tool",
            "aliasName": "Workflow"
        },
        "inputs": [],
        "outputs": [],
        "nodeParam": {
            "appId": "",
            "flowId": "",
            "uid": ""
        },
        "references": [],
        "allowInputReference": true,
        "allowOutputReference": true,
        "icon": "https://oss-beijing-m8.openstorage.cn/pro-bucket/sparkBot/common/workflow/icon/flow-icon.png"
    }
}',1,'工作流','2000-01-01 00:00:00','2025-07-23 15:36:49'),
	 (1695,'WORKFLOW_NODE_TEMPLATE_INNER_PRE','1,2','逻辑','{
    "idType": "decision-making",
    "nodeType": "Basic Node",
    "aliasName": "Decision",
    "description": "Determine the subsequent logic path based on input parameters and the specified intents.",
    "data": {
        "nodeMeta": {
            "nodeType": "Basic Node",
            "aliasName": "Decision"
        },
        "nodeParam": {
            "maxTokens": 2048,
            "temperature": 0.5,
            "topK": 4,
            "auditing": "default",
            "domain": "4.0Ultra",
            "llmId": 110,
            "enableChatHistoryV2": {
                "isEnabled": false,
                "rounds": 1
            },
            "uid": "2171",
            "intentChains": [
                {
                    "intentType": 2,
                    "name": "",
                    "description": "",
                    "id": "intent-one-of::4724514d-ffc8-4412-bf7f-13cc3375110d"
                },
                {
                    "intentType": 1,
                    "name": "default",
                    "description": "Default intent",
                    "id": "intent-one-of::506841e4-3f6c-40b1-a804-dc5ffe723b34"
                }
            ],
            "reasonMode": 1,
            "model": "spark",
            "useFunctionCall": true,
            "serviceId": "bm4",
            "promptPrefix": "",
            "patchId": "0",
            "url": "wss://spark-api.xf-yun.com/v4.0/chat",
            "appId": "d1590f30"
        },
        "inputs": [
            {
                "id": "",
                "name": "Query",
                "schema": {
                    "type": "string",
                    "value": {
                        "type": "ref",
                        "content": {}
                    }
                }
            }
        ],
        "outputs": [
            {
                "id": "",
                "name": "class_name",
                "schema": {
                    "type": "string",
                    "default": ""
                }
            }
        ],
        "references": [],
        "allowInputReference": true,
        "allowOutputReference": true,
        "icon": "https://oss-beijing-m8.openstorage.cn/pro-bucket/sparkBot/common/workflow/icon/designMakeIcon.png"
    }
}',1,'决策','2000-01-01 00:00:00','2025-07-23 15:45:05'),
	 (1697,'WORKFLOW_NODE_TEMPLATE_INNER_PRE','1,2','逻辑','{
    "idType": "if-else",
    "nodeType": "Branch",
    "aliasName": "Branch",
    "description": "Determine the branch path based on the defined conditions",
    "data": {
        "nodeMeta": {
            "nodeType": "Branch",
            "aliasName": "Branch"
        },
        "nodeParam": {
            "cases": [
                {
                    "id": "branch_one_of::",
                    "level": 1,
                    "logicalOperator": "and",
                    "conditions": [
                        {
                            "id": "",
                            "leftVarIndex": null,
                            "rightVarIndex": null,
                            "compareOperator": null
                        }
                    ]
                },
                {
                    "id": "branch_one_of::",
                    "level": 999,
                    "logicalOperator": "and",
                    "conditions": []
                }
            ]
        },
        "inputs": [
            {
                "id": "",
                "name": "input",
                "schema": {
                    "type": "string",
                    "value": {
                        "type": "ref",
                        "content": {
                            "nodeId": "",
                            "name": ""
                        }
                    }
                }
            },
            {
                "id": "",
                "name": "input1",
                "schema": {
                    "type": "string",
                    "value": {
                        "type": "ref",
                        "content": {
                            "nodeId": "",
                            "name": ""
                        }
                    }
                }
            }
        ],
        "outputs": [],
        "references": [],
        "allowInputReference": true,
        "allowOutputReference": false,
        "icon": "https://oss-beijing-m8.openstorage.cn/pro-bucket/sparkBot/common/workflow/icon/if-else-node-icon.png"
    }
}',1,'分支器','2000-01-01 00:00:00','2025-07-23 15:45:05'),
	 (1699,'WORKFLOW_NODE_TEMPLATE_INNER_PRE','1,2','逻辑','{
    "idType": "iteration",
    "nodeType": "Basic Node",
    "aliasName": "Iteration",
    "description": "This node is used to handle loop logic and supports only one level of nesting",
    "data": {
        "nodeMeta": {
            "nodeType": "Basic Node",
            "aliasName": "Iteration"
        },
        "nodeParam": {},
        "inputs": [
            {
                "id": "",
                "name": "input",
                "schema": {
                    "type": "",
                    "value": {
                        "type": "ref",
                        "content": {}
                    }
                }
            }
        ],
        "outputs": [
            {
                "id": "",
                "name": "output",
                "schema": {
                    "type": "array-string",
                    "default": ""
                }
            }
        ],
        "iteratorNodes": [],
        "iteratorEdges": [],
        "references": [],
        "allowInputReference": true,
        "allowOutputReference": true,
        "icon": "https://oss-beijing-m8.openstorage.cn/pro-bucket/sparkBot/common/workflow/icon/iteration-icon.png"
    }
}',1,'迭代','2000-01-01 00:00:00','2025-07-23 15:45:05'),
	 (1701,'WORKFLOW_NODE_TEMPLATE_INNER_PRE','1,2','转换','{
    "idType": "node-variable",
    "nodeType": "Basic Node",
    "aliasName": "Variable Storage",
    "description": "Allows setting multiple variables for long-term data storage, which remains effective and updates persistently",
    "data": {
        "nodeMeta": {
            "nodeType": "Basic Node",
            "aliasName": "Variable Storage"
        },
        "nodeParam": {
            "method": "set"
        },
        "inputs": [
            {
                "id": "",
                "name": "input",
                "schema": {
                    "type": "string",
                    "value": {
                        "type": "ref",
                        "content": {}
                    }
                }
            }
        ],
        "outputs": [],
        "references": [],
        "allowInputReference": true,
        "allowOutputReference": true,
        "icon": "https://oss-beijing-m8.openstorage.cn/pro-bucket/sparkBot/common/workflow/icon/variable-memory-icon.png"
    }
}',1,'变量存储器','2000-01-01 00:00:00','2025-07-23 15:45:05'),
	 (1703,'WORKFLOW_NODE_TEMPLATE_INNER_PRE','1,2','转换','{
    "idType": "extractor-parameter",
    "nodeType": "Basic Node",
    "aliasName": "Variable Extractor",
    "description": "Extracts natural language content from the output of the previous node based on variable extraction descriptions",
    "data": {
        "nodeMeta": {
            "nodeType": "Basic Node",
            "aliasName": "Variable Extractor"
        },
        "nodeParam": {
            "maxTokens": 2048,
            "temperature": 0.5,
            "topK": 4,
            "auditing": "default",
            "domain": "4.0Ultra",
            "llmId": 110,
            "model": "spark",
            "serviceId": "bm4",
            "patchId": "0",
            "url": "wss://spark-api.xf-yun.com/v4.0/chat",
            "appId": "d1590f30",
            "uid": "2171",
            "reasonMode": 1
        },
        "inputs": [
            {
                "id": "",
                "name": "input",
                "schema": {
                    "type": "string",
                    "value": {
                        "type": "ref",
                        "content": {}
                    }
                }
            }
        ],
        "outputs": [
            {
                "id": "",
                "name": "output",
                "schema": {
                    "type": "string",
                    "description": ""
                },
                "required": true
            }
        ],
        "references": [],
        "allowInputReference": true,
        "allowOutputReference": true,
        "icon": "https://oss-beijing-m8.openstorage.cn/pro-bucket/sparkBot/common/workflow/icon/variable-extractor-icon.png"
    }
}',1,'变量提取器','2000-01-01 00:00:00','2025-07-23 15:45:05'),
	 (1705,'WORKFLOW_NODE_TEMPLATE_INNER_PRE','1,2','转换','{
    "idType": "text-joiner",
    "nodeType": "Tool",
    "aliasName": "Text Processing Node",
    "description": "Used to process multiple string variables according to specified formatting rules",
    "data": {
        "nodeMeta": {
            "nodeType": "Tool",
            "aliasName": "Text Joiner"
        },
        "nodeParam": {
            "prompt": ""
        },
        "inputs": [
            {
                "id": "",
                "name": "input",
                "schema": {
                    "type": "string",
                    "value": {
                        "type": "ref",
                        "content": {}
                    }
                }
            }
        ],
        "outputs": [
            {
                "id": "",
                "name": "output",
                "schema": {
                    "type": "string"
                }
            }
        ],
        "references": [],
        "allowInputReference": true,
        "allowOutputReference": true,
        "icon": "https://oss-beijing-m8.openstorage.cn/pro-bucket/sparkBot/common/workflow/icon/text-splicing-icon.png"
    }
}',1,'文本处理节点','2000-01-01 00:00:00','2025-07-23 15:45:05'),
	 (1707,'WORKFLOW_NODE_TEMPLATE_INNER_PRE','1,2','其他','{
    "idType": "message",
    "nodeType": "Basic Node",
    "aliasName": "Message",
    "description": "Used to output intermediate results during workflow execution",
    "data": {
        "nodeMeta": {
            "nodeType": "Basic Node",
            "aliasName": "Message"
        },
        "nodeParam": {
            "template": "",
            "startFrameEnabled": false
        },
        "inputs": [
            {
                "id": "",
                "name": "input",
                "schema": {
                    "type": "string",
                    "value": {
                        "type": "ref",
                        "content": {}
                    }
                }
            }
        ],
        "outputs": [
            {
                "id": "",
                "name": "output_m",
                "schema": {
                    "type": "string"
                }
            }
        ],
        "references": [],
        "allowInputReference": true,
        "allowOutputReference": false,
        "icon": "https://oss-beijing-m8.openstorage.cn/pro-bucket/sparkBot/common/workflow/icon/message-node-icon.png"
    }
}',1,'消息','2000-01-01 00:00:00','2025-07-23 15:45:05'),
	 (1709,'WORKFLOW_NODE_TEMPLATE_INNER_PRE','1,2','逻辑','{
  "aliasName": "Agent Intelligent Decision",
  "idType": "agent",
  "data": {
    "outputs": [
      {
        "id": "",
        "customParameterType": "deepseekr1",
        "name": "REASONING_CONTENT",
        "nameErrMsg": "",
        "schema": {
          "default": "Model reasoning process",
          "type": "string"
        }
      },
      {
        "id": "",
        "name": "output",
        "nameErrMsg": "",
        "schema": {
          "default": "",
          "type": "string"
        }
      }
    ],
    "references": [],
    "allowInputReference": true,
    "inputs": [
      {
        "schema": {
          "type": "string",
          "value": {
            "type": "ref",
            "content": {}
          }
        },
        "name": "input",
        "id": ""
      }
    ],
    "icon": "https://oss-beijing-m8.openstorage.cn/SparkBotProd/icon/common/agent.png",
    "allowOutputReference": true,
    "nodeMeta": {
      "aliasName": "Agent Node",
      "nodeType": "Agent Node"
    },
    "nodeParam": {
      "appId": "",
      "serviceId": "xdeepseekv3",
      "enableChatHistoryV2": {
        "isEnabled": false,
        "rounds": 1
      },
      "modelConfig": {
        "domain": "xdeepseekv3",
        "api": "wss://maas-api.cn-huabei-1.xf-yun.com/v1.1/chat",
        "agentStrategy": 1
      },
      "instruction": {
        "reasoning": "",
        "answer": "",
        "query": ""
      },
      "plugin": {
        "tools": [],
        "toolsList": [],
        "mcpServerIds": [],
        "mcpServerUrls": [],
        "workflowIds": []
      },
      "maxLoopCount": 10
    }
  },
  "description": "According to task requirements, realize intelligent scheduling of large models by selecting an appropriate tool list",
  "nodeType": "Basic Node"
}',1,'agent','2000-01-01 00:00:00','2025-07-23 15:45:05'),
	 (1711,'SPECIAL_MODEL','10000012','dsv3t128k','{
    "llmSource": 1,
    "llmId": 10000012,
    "id": 10000012,
    "name": "星火128k",
    "patchId": "0",
    "domain": "xdsv3t128k",
    "modelType": 2,
    "licChannel":"xdsv3t128k",
    "serviceId": "xdsv3t128k",
    "status": 1,
    "info": "",
    "icon": "https://oss-beijing-m8.openstorage.cn/pro-bucket/aicloud/llm/resource/image/model/icon_iflyspark_96.png",
    "tag":
    [],
    "url": "wss://maas-long-context-api.cn-huabei-1.xf-yun.com/v1.1/chat",
    "modelId": 0
}',1,'','2000-01-01 00:00:00','2025-07-09 14:31:21'),
	 (1713,'SPECIAL_MODEL_CONFIG','10000012','dsv3t128k','{
        "id": 2431162637211654,
        "name": "DeepSeek-V3",
        "serviceId": "xdsv3t128k",
        "serverId": "xdsv3t128k",
        "domain": null,
        "patchId": "0",
        "type": 1,
        "config":
        {
            "serviceIdkeys":
            [
                "xdsv3t128k"
            ],
            "serviceBlock":
            {
                "xdsv3t128k":
                [
                    {
                        "fields":
                        [
                            {
                                "constraintType": "range",
                                "default": 8192,
                                "constraintContent":
                                [
                                    {
                                        "name": 1
                                    },
                                    {
                                        "name": 65535
                                    }
                                ],
                                "name": "Max tokens",
                                "revealed": true,
                                "support": true,
                                "fieldType": "int",
                                "initialValue": 65535,
                                "key": "max_tokens",
                                "required": true,
                                "desc": "最大回复长度：最小值是1, 最大值是65535。控制模型输出的Tokens 长度上限。通常 100 Tokens 约等于150 个中文汉字。"
                            },
                            {
                                "constraintContent":
                                [
                                    {
                                        "name": 0.1
                                    },
                                    {
                                        "name": 1.0
                                    }
                                ],
                                "precision": 0.1,
                                "accuracy": 1,
                                "required": true,
                                "constraintType": "range",
                                "default": 0.5,
                                "name": "Temperature",
                                "revealed": true,
                                "step": 0.1,
                                "support": true,
                                "fieldType": "float",
                                "initialValue": 0.5,
                                "key": "temperature",
                                "desc": "核采样阈值：取值范围 (0，1]。用于决定结果随机性，取值越高随机性越强即相同的问题得到的不同答案的可能性越高"
                            },
                            {
                                "constraintType": "range",
                                "default": 4,
                                "constraintContent":
                                [
                                    {
                                        "name": 1
                                    },
                                    {
                                        "name": 6
                                    }
                                ],
                                "name": "Top_k",
                                "revealed": true,
                                "support": true,
                                "fieldType": "int",
                                "initialValue": 4,
                                "key": "top_k",
                                "required": true,
                                "desc": "生成多样性：调高会使得模型的输出更多样性和创新性，反之，降低会使输出内容更加遵循指令要求但减少多样性。最小值1，最大值6"
                            },
                            {
                                "constraintType": "switch",
                                "default": false,
                                "constraintContent":
                                [
                                    {
                                        "name": "关",
                                        "label": "关",
                                        "value": true,
                                        "desc": "关"
                                    },
                                    {
                                        "name": "开",
                                        "label": "开",
                                        "value": false,
                                        "desc": "开"
                                    }
                                ],
                                "name": "联网搜索",
                                "revealed": true,
                                "support": true,
                                "fieldType": "boolean",
                                "initialValue": false,
                                "key": "search_disable",
                                "required": false,
                                "desc": "开启联网搜索，默认关闭。"
                            },
                            {
                                "constraintType": "enum",
                                "default": "force",
                                "constraintContent":
                                [
                                    {
                                        "name": "自动",
                                        "label": "default",
                                        "value": "auto",
                                        "desc": "自动判断是否需要搜索"
                                    },
                                    {
                                        "name": "强制开启",
                                        "label": "default",
                                        "value": "force",
                                        "desc": "强制开启搜索"
                                    }
                                ],
                                "name": "搜索模式",
                                "revealed": false,
                                "support": true,
                                "fieldType": "string",
                                "initialValue": "force",
                                "key": "search_mod",
                                "required": false,
                                "desc": "联网搜索的模式，默认自动判断。"
                            },
                            {
                                "constraintType": "enum",
                                "default": false,
                                "constraintContent":
                                [
                                    {
                                        "name": "开",
                                        "label": "default",
                                        "value": true,
                                        "desc": "开"
                                    },
                                    {
                                        "name": "关",
                                        "label": "default",
                                        "value": false,
                                        "desc": "关"
                                    }
                                ],
                                "name": "展示溯源信息",
                                "revealed": false,
                                "support": true,
                                "fieldType": "boolean",
                                "initialValue": false,
                                "key": "show_ref_label",
                                "required": false,
                                "desc": "开启联网搜索后在结果中展示搜索溯源信息，默认关闭。"
                            }
                        ],
                        "key": "generalv3"
                    }
                ]
            },
            "featureBlock":
            {},
            "payloadBlock":
            {},
            "acceptBlock":
            {},
            "protocolType": 1,
            "serviceId": "dsv3t128k",
            "multipleDialog": 1
        },
        "source": 2,
        "url": "wss://maas-long-context-api.cn-huabei-1.xf-yun.com/v1.1/chat",
        "appId": null,
        "licChannel": "xdsv3t128k"
    }
',1,'','2000-01-01 00:00:00','2025-06-26 17:39:30'),
	 (1715,'SELF_MODEL_COMMON_CONFIG','config','自定义模型公共配置','{
    "config":
    [
        {
            "standard": true,
            "constraintType": "range",
            "default": 2048,
            "constraintContent":
            [
                {
                    "name": 1
                },
                {
                    "name": 8192
                }
            ],
            "name": "最大回复长度",
            "fieldType": "int",
            "initialValue": 2048,
            "key": "maxTokens",
            "required": true
        },
        {
            "standard": true,
            "constraintContent":
            [
                {
                    "name": 0
                },
                {
                    "name": 1
                }
            ],
            "precision": 0.1,
            "required": true,
            "constraintType": "range",
            "default": 0.5,
            "name": "核采样阈值",
            "fieldType": "float",
            "initialValue": 0.5,
            "key": "temperature"
        },
        {
            "standard": true,
            "constraintType": "range",
            "default": 4,
            "constraintContent":
            [
                {
                    "name": 1
                },
                {
                    "name": 6
                }
            ],
            "name": "生成多样性",
            "fieldType": "int",
            "initialValue": 4,
            "key": "topK",
            "required": true
        }
    ]
}',1,'','2000-01-01 00:00:00','2025-06-05 19:15:55'),
	 (1717,'WORKFLOW_NODE_TEMPLATE_PRE','1,2','基础节点','{
  "aliasName": "Question and Answer Node",
  "idType": "question-answer",
  "data": {
    "outputs": [
      {
        "schema": {
          "default": "",
          "type": "string",
          "description": "The question content of this node"
        },
        "name": "query",
        "id": "",
        "required": true
      },
      {
        "schema": {
          "default": "",
          "type": "string",
          "description": "User reply content"
        },
        "name": "content",
        "id": "",
        "required": true
      }
    ],
    "references": [],
    "allowInputReference": true,
    "inputs": [
      {
        "schema": {
          "type": "string",
          "value": {
            "type": "ref",
            "content": {}
          }
        },
        "name": "input",
        "id": ""
      }
    ],
    "icon": "https://oss-beijing-m8.openstorage.cn/SparkBot/test4/answer-new2.png",
    "allowOutputReference": true,
    "nodeMeta": {
            "aliasName": "问答节点",
            "nodeType": "基础节点"
        },
    "nodeParam": {
      "question": "",
      "timeout": 3,
      "needReply": false,
      "answerType": "direct",
      "directAnswer": {
        "handleResponse": false,
        "maxRetryCounts": 2
      },
      "optionAnswer": [
        {
          "id": "option-one-of::01a35034-8e7a-4a84-83ee-c51d4cbe2660",
          "name": "A",
          "type": 2,
          "content": "",
          "content_type": "string"
        },
        {
          "id": "option-one-of::1df8b2ac-c228-4195-8978-54f87b1bdbb9",
          "name": "B",
          "type": 2,
          "content": "",
          "content_type": "string"
        },
        {
          "id": "option-one-of::646527fa-a9eb-4216-a324-95fc5601d2bf",
          "name": "default",
          "type": 1,
          "content": "",
          "content_type": "string"
        }
      ],
      "url": "wss://spark-api.xf-yun.com/v4.0/chat",
      "domain": "4.0Ultra",
      "appId": "d1590f30",
      "maxTokens": 2048,
      "temperature": 0.5,
      "topK": 4,
      "model": "spark",
      "llmId": 110,
      "serviceId": "bm4"
    }
  },
  "description": "This node supports asking questions to the user, receiving user responses, and outputting the reply content and extracted information",
  "nodeType": "Basic Node"
}',1,'问答节点','2000-01-01 00:00:00','2025-07-25 16:58:05'),
	 (1719,'SPARK_PRO_QR_CODE','qr_feishu','飞书二维码','https://oss-beijing-m8.openstorage.cn/SparkBot/test4/feishu_qr.jpeg',1,NULL,'2025-04-01 17:51:32','2025-06-05 16:46:35'),
	 (1723,'SPECIAL_MODEL','10000006','xdsv3t128k','{
    "llmSource": 1,
    "llmId": 10000006,
    "id": 10000006,
    "name": "xdsv3t128k",
    "patchId": "0",
    "domain": "xdsv3t128k",
    "serviceId": "xdsv3t128k",
    "status": 1,
    "modelType": 2,
    "licChannel":"xdsv3t128k",
    "info": "",
    "icon": "https://oss-beijing-m8.openstorage.cn/pro-bucket/aicloud/llm/resource/image/model/icon_iflyspark_96.png",
    "tag":
    [],
    "url": "https://maas-api.cn-huabei-1.xf-yun.com/v2",
    "modelId": 0
}',1,'','2000-01-01 00:00:00','2025-07-09 14:31:21'),
	 (1725,'SPECIAL_MODEL_CONFIG','10000006','xdsv3t128k','{
        "id": 2431162637211655,
        "name": "xdsv3t128k",
        "serviceId": "xdsv3t128k",
        "serverId": "xdsv3t128k",
        "domain": null,
        "patchId": "0",
        "type": 1,
        "config":
        {
            "serviceIdkeys":
            [
                "xdsv3t128k"
            ],
            "serviceBlock":
            {
                "xdsv3t128k":
                [
                    {
                        "fields":
                        [
                            {
                                "constraintType": "range",
                                "default": 8192,
                                "constraintContent":
                                [
                                    {
                                        "name": 1
                                    },
                                    {
                                        "name": 65535
                                    }
                                ],
                                "name": "Max tokens",
                                "revealed": true,
                                "support": true,
                                "fieldType": "int",
                                "initialValue": 8192,
                                "key": "max_tokens",
                                "required": true,
                                "desc": "最大回复长度：最小值是1, 最大值是16384。控制模型输出的Tokens 长度上限。通常 100 Tokens 约等于150 个中文汉字。"
                            },
                            {
                                "constraintContent":
                                [
                                    {
                                        "name": 0.1
                                    },
                                    {
                                        "name": 1.0
                                    }
                                ],
                                "precision": 0.1,
                                "accuracy": 1,
                                "required": true,
                                "constraintType": "range",
                                "default": 0.5,
                                "name": "Temperature",
                                "revealed": true,
                                "step": 0.1,
                                "support": true,
                                "fieldType": "float",
                                "initialValue": 0.5,
                                "key": "temperature",
                                "desc": "核采样阈值：取值范围 (0，1]。用于决定结果随机性，取值越高随机性越强即相同的问题得到的不同答案的可能性越高"
                            },
                            {
                                "constraintType": "range",
                                "default": 4,
                                "constraintContent":
                                [
                                    {
                                        "name": 1
                                    },
                                    {
                                        "name": 6
                                    }
                                ],
                                "name": "Top_k",
                                "revealed": true,
                                "support": true,
                                "fieldType": "int",
                                "initialValue": 4,
                                "key": "top_k",
                                "required": true,
                                "desc": "生成多样性：调高会使得模型的输出更多样性和创新性，反之，降低会使输出内容更加遵循指令要求但减少多样性。最小值1，最大值6"
                            },
                            {
                                "constraintType": "switch",
                                "default": false,
                                "constraintContent":
                                [
                                    {
                                        "name": "关",
                                        "label": "关",
                                        "value": true,
                                        "desc": "关"
                                    },
                                    {
                                        "name": "开",
                                        "label": "开",
                                        "value": false,
                                        "desc": "开"
                                    }
                                ],
                                "name": "联网搜索",
                                "revealed": true,
                                "support": true,
                                "fieldType": "boolean",
                                "initialValue": false,
                                "key": "search_disable",
                                "required": false,
                                "desc": "开启联网搜索，默认关闭。"
                            },
                            {
                                "constraintType": "enum",
                                "default": "force",
                                "constraintContent":
                                [
                                    {
                                        "name": "自动",
                                        "label": "default",
                                        "value": "auto",
                                        "desc": "自动判断是否需要搜索"
                                    },
                                    {
                                        "name": "强制开启",
                                        "label": "default",
                                        "value": "force",
                                        "desc": "强制开启搜索"
                                    }
                                ],
                                "name": "搜索模式",
                                "revealed": false,
                                "support": true,
                                "fieldType": "string",
                                "initialValue": "force",
                                "key": "search_mod",
                                "required": false,
                                "desc": "联网搜索的模式，默认自动判断。"
                            },
                            {
                                "constraintType": "enum",
                                "default": false,
                                "constraintContent":
                                [
                                    {
                                        "name": "开",
                                        "label": "default",
                                        "value": true,
                                        "desc": "开"
                                    },
                                    {
                                        "name": "关",
                                        "label": "default",
                                        "value": false,
                                        "desc": "关"
                                    }
                                ],
                                "name": "展示溯源信息",
                                "revealed": false,
                                "support": true,
                                "fieldType": "boolean",
                                "initialValue": false,
                                "key": "show_ref_label",
                                "required": false,
                                "desc": "开启联网搜索后在结果中展示搜索溯源信息，默认关闭。"
                            }
                        ],
                        "key": "generalv3"
                    }
                ]
            },
            "featureBlock":
            {},
            "payloadBlock":
            {},
            "acceptBlock":
            {},
            "protocolType": 1,
            "serviceId": "xdsv3t128k",
            "multipleDialog": 1
        },
        "source": 1,
        "url": "https://maas-api.cn-huabei-1.xf-yun.com/v2",
        "appId": null,
        "licChannel": "xdsv3t128k"
    }
',1,'','2000-01-01 00:00:00','2025-06-26 17:40:19'),
	 (1731,'MCP_MODEL_API_REFLECT','mcp','x1','https://spark-api-open.xf-yun.com/v2',1,'','2000-01-01 00:00:00','2025-06-10 17:52:48'),
	 (1735,'IP_BLACK_LIST','ip_balck_list','ip黑名单','0.0.0.0,127.0.0.1,localhost',1,NULL,'2022-06-10 00:00:00','2025-06-10 10:49:44'),
	 (1737,'NETWORK_SEGMENT_BLACK_LIST','network_segment_balck_list','网段黑名单','192.168.0.0/16,172.16.0.0/12,10.0.0.0/8,100.64.0.0/10',1,NULL,'2022-06-10 00:00:00','2025-06-10 10:41:51'),
	 (1739,'DOMAIN_BLACK_LIST','domain_balck_list','域名黑名单','cloud.iflytek.com,monojson.com,ssrf.security.private,ssrf-prod.security.private',1,NULL,'2022-06-10 00:00:00','2025-06-13 10:39:27'),
	 (1743,'WORKFLOW_NODE_TEMPLATE','1,2','Basic Node','{
  "aliasName": "Question and Answer Node",
  "idType": "question-answer",
  "data": {
    "outputs": [
      {
        "schema": {
          "default": "",
          "type": "string",
          "description": "The question content of this node"
        },
        "name": "query",
        "id": "",
        "required": true
      },
      {
        "schema": {
          "default": "",
          "type": "string",
          "description": "User reply content"
        },
        "name": "content",
        "id": "",
        "required": true
      }
    ],
    "references": [],
    "allowInputReference": true,
    "inputs": [
      {
        "schema": {
          "type": "string",
          "value": {
            "type": "ref",
            "content": {}
          }
        },
        "name": "input",
        "id": ""
      }
    ],
    "icon": "https://oss-beijing-m8.openstorage.cn/SparkBot/test4/answer-new2.png",
    "allowOutputReference": true,
    "nodeMeta": {
            "aliasName": "问答节点",
            "nodeType": "基础节点"
        },
    "nodeParam": {
      "question": "",
      "timeout": 3,
      "needReply": false,
      "answerType": "direct",
      "directAnswer": {
        "handleResponse": false,
        "maxRetryCounts": 2
      },
      "optionAnswer": [
        {
          "id": "option-one-of::01a35034-8e7a-4a84-83ee-c51d4cbe2660",
          "name": "A",
          "type": 2,
          "content": "",
          "content_type": "string"
        },
        {
          "id": "option-one-of::1df8b2ac-c228-4195-8978-54f87b1bdbb9",
          "name": "B",
          "type": 2,
          "content": "",
          "content_type": "string"
        },
        {
          "id": "option-one-of::646527fa-a9eb-4216-a324-95fc5601d2bf",
          "name": "default",
          "type": 1,
          "content": "",
          "content_type": "string"
        }
      ],
      "url": "wss://spark-api.xf-yun.com/v4.0/chat",
      "domain": "4.0Ultra",
      "appId": "d1590f30",
      "maxTokens": 2048,
      "temperature": 0.5,
      "topK": 4,
      "model": "spark",
      "llmId": 110,
      "serviceId": "bm4"
    }
  },
  "description": "This node supports asking questions to the user, receiving user responses, and outputting the reply content and extracted information",
  "nodeType": "Basic Node"
}',1,'问答节点','2000-01-01 00:00:00','2025-07-28 10:18:24'),
	 (1745,'SPECIAL_MODEL','10000007','xsp8f70988f','{
    "llmSource": 1,
    "llmId": 10000007,
    "id": 10000007,
    "name": "智能硬件专有2.6B模型",
    "patchId": "0",
    "domain": "xsp8f70988f",
    "serviceId": "xsp8f70988f",
    "modelType": 2,
    "licChannel":"xsp8f70988f",
    "status": 1,
    "info": "假设你是一个智能交互助手，基于用户的输入文本，解析其中语义，抽取关键信息，以json格式生成结构化的语义内容。我的输入是：请调小空气净化器的湿度到1",
    "icon": "https://oss-beijing-m8.openstorage.cn/pro-bucket/aicloud/llm/resource/image/model/icon_iflyspark_96.png",
    "tag":
    [],
    "url": "wss://xingchen-api.cn-huabei-1.xf-yun.com/v1.1/chat",
    "modelId": 0
}',1,'','2000-01-01 00:00:00','2025-07-09 14:31:21'),
	 (1747,'SPECIAL_MODEL_CONFIG','10000007','xsp8f70988f','{
        "id": 2431162637211656,
        "name": "xsp8f70988f",
        "serviceId": "xsp8f70988f",
        "serverId": "xsp8f70988f",
        "domain": null,
        "patchId": "0",
        "type": 1,
        "config":
        {
            "serviceIdkeys":
            [
                "xsp8f70988f"
            ],
            "serviceBlock":
            {
                "xsp8f70988f":
                [
                    {
                        "fields":
                        [
                            {
                                "constraintType": "range",
                                "default": 8192,
                                "constraintContent":
                                [
                                    {
                                        "name": 1
                                    },
                                    {
                                        "name": 16384
                                    }
                                ],
                                "name": "Max tokens",
                                "revealed": true,
                                "support": true,
                                "fieldType": "int",
                                "initialValue": 8192,
                                "key": "max_tokens",
                                "required": true,
                                "desc": "最大回复长度：最小值是1, 最大值是16384。控制模型输出的Tokens 长度上限。通常 100 Tokens 约等于150 个中文汉字。"
                            },
                            {
                                "constraintContent":
                                [
                                    {
                                        "name": 0.1
                                    },
                                    {
                                        "name": 1.0
                                    }
                                ],
                                "precision": 0.1,
                                "accuracy": 1,
                                "required": true,
                                "constraintType": "range",
                                "default": 0.5,
                                "name": "Temperature",
                                "revealed": true,
                                "step": 0.1,
                                "support": true,
                                "fieldType": "float",
                                "initialValue": 0.5,
                                "key": "temperature",
                                "desc": "核采样阈值：取值范围 (0，1]。用于决定结果随机性，取值越高随机性越强即相同的问题得到的不同答案的可能性越高"
                            },
                            {
                                "constraintType": "range",
                                "default": 4,
                                "constraintContent":
                                [
                                    {
                                        "name": 1
                                    },
                                    {
                                        "name": 6
                                    }
                                ],
                                "name": "Top_k",
                                "revealed": true,
                                "support": true,
                                "fieldType": "int",
                                "initialValue": 4,
                                "key": "top_k",
                                "required": true,
                                "desc": "生成多样性：调高会使得模型的输出更多样性和创新性，反之，降低会使输出内容更加遵循指令要求但减少多样性。最小值1，最大值6"
                            },
                            {
                                "constraintType": "switch",
                                "default": false,
                                "constraintContent":
                                [
                                    {
                                        "name": "关",
                                        "label": "关",
                                        "value": true,
                                        "desc": "关"
                                    },
                                    {
                                        "name": "开",
                                        "label": "开",
                                        "value": false,
                                        "desc": "开"
                                    }
                                ],
                                "name": "联网搜索",
                                "revealed": true,
                                "support": true,
                                "fieldType": "boolean",
                                "initialValue": false,
                                "key": "search_disable",
                                "required": false,
                                "desc": "开启联网搜索，默认关闭。"
                            },
                            {
                                "constraintType": "enum",
                                "default": "force",
                                "constraintContent":
                                [
                                    {
                                        "name": "自动",
                                        "label": "default",
                                        "value": "auto",
                                        "desc": "自动判断是否需要搜索"
                                    },
                                    {
                                        "name": "强制开启",
                                        "label": "default",
                                        "value": "force",
                                        "desc": "强制开启搜索"
                                    }
                                ],
                                "name": "搜索模式",
                                "revealed": false,
                                "support": true,
                                "fieldType": "string",
                                "initialValue": "force",
                                "key": "search_mod",
                                "required": false,
                                "desc": "联网搜索的模式，默认自动判断。"
                            },
                            {
                                "constraintType": "enum",
                                "default": false,
                                "constraintContent":
                                [
                                    {
                                        "name": "开",
                                        "label": "default",
                                        "value": true,
                                        "desc": "开"
                                    },
                                    {
                                        "name": "关",
                                        "label": "default",
                                        "value": false,
                                        "desc": "关"
                                    }
                                ],
                                "name": "展示溯源信息",
                                "revealed": false,
                                "support": true,
                                "fieldType": "boolean",
                                "initialValue": false,
                                "key": "show_ref_label",
                                "required": false,
                                "desc": "开启联网搜索后在结果中展示搜索溯源信息，默认关闭。"
                            }
                        ],
                        "key": "generalv3"
                    }
                ]
            },
            "featureBlock":
            {},
            "payloadBlock":
            {},
            "acceptBlock":
            {},
            "protocolType": 1,
            "serviceId": "xdsv3t128k",
            "multipleDialog": 1
        },
        "source": 1,
        "url": "https://maas-api.cn-huabei-1.xf-yun.com/v1",
        "appId": null,
        "licChannel": "xsp8f70988f"
    }
',1,'','2000-01-01 00:00:00','2025-06-12 09:36:51'),
	 (1749,'SPECIAL_MODEL','10000008','xqwen257bchat','{
    "llmSource": 1,
    "llmId": 10000008,
    "id": 10000008,
    "name": "xqwen257bchat",
    "patchId": "0",
    "domain": "xqwen257bchat",
    "serviceId": "xqwen257bchat",
    "modelType": 2,
    "licChannel":"xqwen257bchat",
    "status": 1,
    "info": "",
    "icon": "https://oss-beijing-m8.openstorage.cn/pro-bucket/aicloud/llm/resource/image/model/icon_iflyspark_96.png",
    "tag":
    [],
    "url": "wss://maas-api.cn-huabei-1.xf-yun.com/v1.1/chat",
    "modelId": 0
}',1,'','2000-01-01 00:00:00','2025-07-09 14:31:21'),
	 (1751,'SPECIAL_MODEL_CONFIG','10000008','xqwen257bchat','{
        "id": 2431162637211657,
        "name": "xqwen257bchat",
        "serviceId": "xqwen257bchat",
        "serverId": "xqwen257bchat",
        "domain": null,
        "patchId": "0",
        "type": 1,
        "config":
        {
            "serviceIdkeys":
            [
                "xqwen257bchat"
            ],
            "serviceBlock":
            {
                "xqwen257bchat":
                [
                    {
                        "fields":
                        [
                            {
                                "constraintType": "range",
                                "default": 8192,
                                "constraintContent":
                                [
                                    {
                                        "name": 1
                                    },
                                    {
                                        "name": 16384
                                    }
                                ],
                                "name": "Max tokens",
                                "revealed": true,
                                "support": true,
                                "fieldType": "int",
                                "initialValue": 8192,
                                "key": "max_tokens",
                                "required": true,
                                "desc": "最大回复长度：最小值是1, 最大值是16384。控制模型输出的Tokens 长度上限。通常 100 Tokens 约等于150 个中文汉字。"
                            },
                            {
                                "constraintContent":
                                [
                                    {
                                        "name": 0.1
                                    },
                                    {
                                        "name": 1.0
                                    }
                                ],
                                "precision": 0.1,
                                "accuracy": 1,
                                "required": true,
                                "constraintType": "range",
                                "default": 0.5,
                                "name": "Temperature",
                                "revealed": true,
                                "step": 0.1,
                                "support": true,
                                "fieldType": "float",
                                "initialValue": 0.5,
                                "key": "temperature",
                                "desc": "核采样阈值：取值范围 (0，1]。用于决定结果随机性，取值越高随机性越强即相同的问题得到的不同答案的可能性越高"
                            },
                            {
                                "constraintType": "range",
                                "default": 4,
                                "constraintContent":
                                [
                                    {
                                        "name": 1
                                    },
                                    {
                                        "name": 6
                                    }
                                ],
                                "name": "Top_k",
                                "revealed": true,
                                "support": true,
                                "fieldType": "int",
                                "initialValue": 4,
                                "key": "top_k",
                                "required": true,
                                "desc": "生成多样性：调高会使得模型的输出更多样性和创新性，反之，降低会使输出内容更加遵循指令要求但减少多样性。最小值1，最大值6"
                            },
                            {
                                "constraintType": "switch",
                                "default": false,
                                "constraintContent":
                                [
                                    {
                                        "name": "关",
                                        "label": "关",
                                        "value": true,
                                        "desc": "关"
                                    },
                                    {
                                        "name": "开",
                                        "label": "开",
                                        "value": false,
                                        "desc": "开"
                                    }
                                ],
                                "name": "联网搜索",
                                "revealed": true,
                                "support": true,
                                "fieldType": "boolean",
                                "initialValue": false,
                                "key": "search_disable",
                                "required": false,
                                "desc": "开启联网搜索，默认关闭。"
                            },
                            {
                                "constraintType": "enum",
                                "default": "force",
                                "constraintContent":
                                [
                                    {
                                        "name": "自动",
                                        "label": "default",
                                        "value": "auto",
                                        "desc": "自动判断是否需要搜索"
                                    },
                                    {
                                        "name": "强制开启",
                                        "label": "default",
                                        "value": "force",
                                        "desc": "强制开启搜索"
                                    }
                                ],
                                "name": "搜索模式",
                                "revealed": false,
                                "support": true,
                                "fieldType": "string",
                                "initialValue": "force",
                                "key": "search_mod",
                                "required": false,
                                "desc": "联网搜索的模式，默认自动判断。"
                            },
                            {
                                "constraintType": "enum",
                                "default": false,
                                "constraintContent":
                                [
                                    {
                                        "name": "开",
                                        "label": "default",
                                        "value": true,
                                        "desc": "开"
                                    },
                                    {
                                        "name": "关",
                                        "label": "default",
                                        "value": false,
                                        "desc": "关"
                                    }
                                ],
                                "name": "展示溯源信息",
                                "revealed": false,
                                "support": true,
                                "fieldType": "boolean",
                                "initialValue": false,
                                "key": "show_ref_label",
                                "required": false,
                                "desc": "开启联网搜索后在结果中展示搜索溯源信息，默认关闭。"
                            }
                        ],
                        "key": "generalv3"
                    }
                ]
            },
            "featureBlock":
            {},
            "payloadBlock":
            {},
            "acceptBlock":
            {},
            "protocolType": 1,
            "serviceId": "xdsv3t128k",
            "multipleDialog": 1
        },
        "source": 1,
        "url": "wss://maas-api.cn-huabei-1.xf-yun.com/v1.1/chat",
        "appId": null,
        "licChannel": "xqwen257bchat"
    }
',1,'','2000-01-01 00:00:00','2025-06-12 09:36:51'),
	 (1753,'SPECIAL_MODEL','10000009','xop3qwen8b','{
    "llmSource": 1,
    "llmId": 10000009,
    "id": 10000009,
    "name": "xop3qwen8b",
    "patchId": "0",
    "domain": "xop3qwen8b",
    "serviceId": "xop3qwen8b",
    "modelType": 2,
    "licChannel":"xop3qwen8b",
    "status": 1,
    "info": "",
    "icon": "https://oss-beijing-m8.openstorage.cn/pro-bucket/aicloud/llm/resource/image/model/icon_iflyspark_96.png",
    "tag":
    [],
    "url": "wss://maas-api.cn-huabei-1.xf-yun.com/v1.1/chat",
    "modelId": 0
}',1,'亚谋理想项目测试使用','2000-01-01 00:00:00','2025-07-09 14:31:21'),
	 (1755,'SPECIAL_MODEL','10000010','xop3qwen14b','{
    "llmSource": 1,
    "llmId": 10000010,
    "id": 10000010,
    "name": "xop3qwen14b",
    "patchId": "0",
    "domain": "xop3qwen14b",
    "serviceId": "xop3qwen14b",
    "modelType": 2,
    "licChannel":"xop3qwen14b",
    "status": 1,
    "info": "",
    "icon": "https://oss-beijing-m8.openstorage.cn/pro-bucket/aicloud/llm/resource/image/model/icon_iflyspark_96.png",
    "tag":
    [],
    "url": "wss://maas-api.cn-huabei-1.xf-yun.com/v1.1/chat",
    "modelId": 0
}',1,'亚谋理想项目测试使用','2000-01-01 00:00:00','2025-07-09 14:31:21'),
	 (1757,'SPECIAL_MODEL_CONFIG','10000009','xop3qwen8b','{
        "id": 2431162637211657,
        "name": "xop3qwen8b",
        "serviceId": "xop3qwen8b",
        "serverId": "xop3qwen8b",
        "domain": null,
        "patchId": "0",
        "type": 1,
        "config":
        {
            "serviceIdkeys":
            [
                "xop3qwen8b"
            ],
            "serviceBlock":
            {
                "xop3qwen8b":
                [
                    {
                        "fields":
                        [
                            {
                                "constraintType": "range",
                                "default": 8192,
                                "constraintContent":
                                [
                                    {
                                        "name": 1
                                    },
                                    {
                                        "name": 16384
                                    }
                                ],
                                "name": "Max tokens",
                                "revealed": true,
                                "support": true,
                                "fieldType": "int",
                                "initialValue": 8192,
                                "key": "max_tokens",
                                "required": true,
                                "desc": "最大回复长度：最小值是1, 最大值是16384。控制模型输出的Tokens 长度上限。通常 100 Tokens 约等于150 个中文汉字。"
                            },
                            {
                                "constraintContent":
                                [
                                    {
                                        "name": 0.1
                                    },
                                    {
                                        "name": 1.0
                                    }
                                ],
                                "precision": 0.1,
                                "accuracy": 1,
                                "required": true,
                                "constraintType": "range",
                                "default": 0.5,
                                "name": "Temperature",
                                "revealed": true,
                                "step": 0.1,
                                "support": true,
                                "fieldType": "float",
                                "initialValue": 0.5,
                                "key": "temperature",
                                "desc": "核采样阈值：取值范围 (0，1]。用于决定结果随机性，取值越高随机性越强即相同的问题得到的不同答案的可能性越高"
                            },
                            {
                                "constraintType": "range",
                                "default": 4,
                                "constraintContent":
                                [
                                    {
                                        "name": 1
                                    },
                                    {
                                        "name": 6
                                    }
                                ],
                                "name": "Top_k",
                                "revealed": true,
                                "support": true,
                                "fieldType": "int",
                                "initialValue": 4,
                                "key": "top_k",
                                "required": true,
                                "desc": "生成多样性：调高会使得模型的输出更多样性和创新性，反之，降低会使输出内容更加遵循指令要求但减少多样性。最小值1，最大值6"
                            },
                            {
                                "constraintType": "switch",
                                "default": false,
                                "constraintContent":
                                [
                                    {
                                        "name": "关",
                                        "label": "关",
                                        "value": true,
                                        "desc": "关"
                                    },
                                    {
                                        "name": "开",
                                        "label": "开",
                                        "value": false,
                                        "desc": "开"
                                    }
                                ],
                                "name": "联网搜索",
                                "revealed": true,
                                "support": true,
                                "fieldType": "boolean",
                                "initialValue": false,
                                "key": "search_disable",
                                "required": false,
                                "desc": "开启联网搜索，默认关闭。"
                            },
                            {
                                "constraintType": "enum",
                                "default": "force",
                                "constraintContent":
                                [
                                    {
                                        "name": "自动",
                                        "label": "default",
                                        "value": "auto",
                                        "desc": "自动判断是否需要搜索"
                                    },
                                    {
                                        "name": "强制开启",
                                        "label": "default",
                                        "value": "force",
                                        "desc": "强制开启搜索"
                                    }
                                ],
                                "name": "搜索模式",
                                "revealed": false,
                                "support": true,
                                "fieldType": "string",
                                "initialValue": "force",
                                "key": "search_mod",
                                "required": false,
                                "desc": "联网搜索的模式，默认自动判断。"
                            },
                            {
                                "constraintType": "enum",
                                "default": false,
                                "constraintContent":
                                [
                                    {
                                        "name": "开",
                                        "label": "default",
                                        "value": true,
                                        "desc": "开"
                                    },
                                    {
                                        "name": "关",
                                        "label": "default",
                                        "value": false,
                                        "desc": "关"
                                    }
                                ],
                                "name": "展示溯源信息",
                                "revealed": false,
                                "support": true,
                                "fieldType": "boolean",
                                "initialValue": false,
                                "key": "show_ref_label",
                                "required": false,
                                "desc": "开启联网搜索后在结果中展示搜索溯源信息，默认关闭。"
                            }
                        ],
                        "key": "generalv3"
                    }
                ]
            },
            "featureBlock":
            {},
            "payloadBlock":
            {},
            "acceptBlock":
            {},
            "protocolType": 1,
            "serviceId": "xop3qwen8b",
            "multipleDialog": 1
        },
        "source": 1,
        "url": "wss://maas-api.cn-huabei-1.xf-yun.com/v1.1/chat",
        "appId": null,
        "licChannel": "xop3qwen8b"
    }
',1,'亚谋理想项目测试使用','2000-01-01 00:00:00','2025-06-16 15:27:55'),
	 (1759,'SPECIAL_MODEL_CONFIG','10000010','xop3qwen14b','{
        "id": 2431162637211657,
        "name": "xop3qwen14b",
        "serviceId": "xop3qwen14b",
        "serverId": "xop3qwen14b",
        "domain": null,
        "patchId": "0",
        "type": 1,
        "config":
        {
            "serviceIdkeys":
            [
                "xop3qwen14b"
            ],
            "serviceBlock":
            {
                "xop3qwen14b":
                [
                    {
                        "fields":
                        [
                            {
                                "constraintType": "range",
                                "default": 8192,
                                "constraintContent":
                                [
                                    {
                                        "name": 1
                                    },
                                    {
                                        "name": 16384
                                    }
                                ],
                                "name": "Max tokens",
                                "revealed": true,
                                "support": true,
                                "fieldType": "int",
                                "initialValue": 8192,
                                "key": "max_tokens",
                                "required": true,
                                "desc": "最大回复长度：最小值是1, 最大值是16384。控制模型输出的Tokens 长度上限。通常 100 Tokens 约等于150 个中文汉字。"
                            },
                            {
                                "constraintContent":
                                [
                                    {
                                        "name": 0.1
                                    },
                                    {
                                        "name": 1.0
                                    }
                                ],
                                "precision": 0.1,
                                "accuracy": 1,
                                "required": true,
                                "constraintType": "range",
                                "default": 0.5,
                                "name": "Temperature",
                                "revealed": true,
                                "step": 0.1,
                                "support": true,
                                "fieldType": "float",
                                "initialValue": 0.5,
                                "key": "temperature",
                                "desc": "核采样阈值：取值范围 (0，1]。用于决定结果随机性，取值越高随机性越强即相同的问题得到的不同答案的可能性越高"
                            },
                            {
                                "constraintType": "range",
                                "default": 4,
                                "constraintContent":
                                [
                                    {
                                        "name": 1
                                    },
                                    {
                                        "name": 6
                                    }
                                ],
                                "name": "Top_k",
                                "revealed": true,
                                "support": true,
                                "fieldType": "int",
                                "initialValue": 4,
                                "key": "top_k",
                                "required": true,
                                "desc": "生成多样性：调高会使得模型的输出更多样性和创新性，反之，降低会使输出内容更加遵循指令要求但减少多样性。最小值1，最大值6"
                            },
                            {
                                "constraintType": "switch",
                                "default": false,
                                "constraintContent":
                                [
                                    {
                                        "name": "关",
                                        "label": "关",
                                        "value": true,
                                        "desc": "关"
                                    },
                                    {
                                        "name": "开",
                                        "label": "开",
                                        "value": false,
                                        "desc": "开"
                                    }
                                ],
                                "name": "联网搜索",
                                "revealed": true,
                                "support": true,
                                "fieldType": "boolean",
                                "initialValue": false,
                                "key": "search_disable",
                                "required": false,
                                "desc": "开启联网搜索，默认关闭。"
                            },
                            {
                                "constraintType": "enum",
                                "default": "force",
                                "constraintContent":
                                [
                                    {
                                        "name": "自动",
                                        "label": "default",
                                        "value": "auto",
                                        "desc": "自动判断是否需要搜索"
                                    },
                                    {
                                        "name": "强制开启",
                                        "label": "default",
                                        "value": "force",
                                        "desc": "强制开启搜索"
                                    }
                                ],
                                "name": "搜索模式",
                                "revealed": false,
                                "support": true,
                                "fieldType": "string",
                                "initialValue": "force",
                                "key": "search_mod",
                                "required": false,
                                "desc": "联网搜索的模式，默认自动判断。"
                            },
                            {
                                "constraintType": "enum",
                                "default": false,
                                "constraintContent":
                                [
                                    {
                                        "name": "开",
                                        "label": "default",
                                        "value": true,
                                        "desc": "开"
                                    },
                                    {
                                        "name": "关",
                                        "label": "default",
                                        "value": false,
                                        "desc": "关"
                                    }
                                ],
                                "name": "展示溯源信息",
                                "revealed": false,
                                "support": true,
                                "fieldType": "boolean",
                                "initialValue": false,
                                "key": "show_ref_label",
                                "required": false,
                                "desc": "开启联网搜索后在结果中展示搜索溯源信息，默认关闭。"
                            }
                        ],
                        "key": "generalv3"
                    }
                ]
            },
            "featureBlock":
            {},
            "payloadBlock":
            {},
            "acceptBlock":
            {},
            "protocolType": 1,
            "serviceId": "xop3qwen14b",
            "multipleDialog": 1
        },
        "source": 1,
        "url": "wss://maas-api.cn-huabei-1.xf-yun.com/v1.1/chat",
        "appId": null,
        "licChannel": "xop3qwen14b"
    }
',1,'亚谋理想项目测试使用','2000-01-01 00:00:00','2025-06-16 15:27:55'),
	 (1761,'SPECIAL_MODEL','10000011','image_understandingv3','{
    "llmSource": 1,
    "llmId": 10000005,
    "name": "图像理解V3",
    "patchId": "0",
    "domain": "imagev3",
    "serviceId": "image_understandingv3",
    "status": 1,
    "info": "{\\"conc\\":2,\\"domain\\":\\"generalv3.5\\",\\"expireTs\\":\\"2025-05-31\\",\\"qps\\":2,\\"tokensPreDay\\":1000,\\"tokensTotal\\":1000,\\"llmServiceId\\":\\"bm3.5\\"}"
    "info": "",
    "icon": "https://oss-beijing-m8.openstorage.cn/pro-bucket/aicloud/llm/resource/image/model/icon_iflyspark_96.png",
    "tag":
    [],
    "url": "wss://spark-api.cn-huabei-1.xf-yun.com/v2.1/image",
    "modelId": 0,
    "isThink":false,
    "multiMode":true
}',0,'亚谋理想项目测试使用','2000-01-01 00:00:00','2025-07-08 17:25:54'),
	 (1763,'SPECIAL_MODEL_CONFIG','10000011','image_understandingv3','{
        "id": 2431162637211660,
        "name": "image_understandingv3",
        "serviceId": "image_understandingv3",
        "serverId": "image_understandingv3",
        "domain": null,
        "patchId": "0",
        "type": 1,
        "config":
        {
            "serviceIdkeys":
            [
                "image_understandingv3"
            ],
            "serviceBlock":
            {
                "image_understandingv3":
                [
                    {
                        "fields":
                        [
                            {
                                "constraintType": "range",
                                "default": 8192,
                                "constraintContent":
                                [
                                    {
                                        "name": 1
                                    },
                                    {
                                        "name": 16384
                                    }
                                ],
                                "name": "Max tokens",
                                "revealed": true,
                                "support": true,
                                "fieldType": "int",
                                "initialValue": 8192,
                                "key": "max_tokens",
                                "required": true,
                                "desc": "最大回复长度：最小值是1, 最大值是16384。控制模型输出的Tokens 长度上限。通常 100 Tokens 约等于150 个中文汉字。"
                            },
                            {
                                "constraintContent":
                                [
                                    {
                                        "name": 0.1
                                    },
                                    {
                                        "name": 1.0
                                    }
                                ],
                                "precision": 0.1,
                                "accuracy": 1,
                                "required": true,
                                "constraintType": "range",
                                "default": 0.5,
                                "name": "Temperature",
                                "revealed": true,
                                "step": 0.1,
                                "support": true,
                                "fieldType": "float",
                                "initialValue": 0.5,
                                "key": "temperature",
                                "desc": "核采样阈值：取值范围 (0，1]。用于决定结果随机性，取值越高随机性越强即相同的问题得到的不同答案的可能性越高"
                            },
                            {
                                "constraintType": "range",
                                "default": 4,
                                "constraintContent":
                                [
                                    {
                                        "name": 1
                                    },
                                    {
                                        "name": 6
                                    }
                                ],
                                "name": "Top_k",
                                "revealed": true,
                                "support": true,
                                "fieldType": "int",
                                "initialValue": 4,
                                "key": "top_k",
                                "required": true,
                                "desc": "生成多样性：调高会使得模型的输出更多样性和创新性，反之，降低会使输出内容更加遵循指令要求但减少多样性。最小值1，最大值6"
                            },
                            {
                                "constraintType": "switch",
                                "default": false,
                                "constraintContent":
                                [
                                    {
                                        "name": "关",
                                        "label": "关",
                                        "value": true,
                                        "desc": "关"
                                    },
                                    {
                                        "name": "开",
                                        "label": "开",
                                        "value": false,
                                        "desc": "开"
                                    }
                                ],
                                "name": "联网搜索",
                                "revealed": true,
                                "support": true,
                                "fieldType": "boolean",
                                "initialValue": false,
                                "key": "search_disable",
                                "required": false,
                                "desc": "开启联网搜索，默认关闭。"
                            },
                            {
                                "constraintType": "enum",
                                "default": "force",
                                "constraintContent":
                                [
                                    {
                                        "name": "自动",
                                        "label": "default",
                                        "value": "auto",
                                        "desc": "自动判断是否需要搜索"
                                    },
                                    {
                                        "name": "强制开启",
                                        "label": "default",
                                        "value": "force",
                                        "desc": "强制开启搜索"
                                    }
                                ],
                                "name": "搜索模式",
                                "revealed": false,
                                "support": true,
                                "fieldType": "string",
                                "initialValue": "force",
                                "key": "search_mod",
                                "required": false,
                                "desc": "联网搜索的模式，默认自动判断。"
                            },
                            {
                                "constraintType": "enum",
                                "default": false,
                                "constraintContent":
                                [
                                    {
                                        "name": "开",
                                        "label": "default",
                                        "value": true,
                                        "desc": "开"
                                    },
                                    {
                                        "name": "关",
                                        "label": "default",
                                        "value": false,
                                        "desc": "关"
                                    }
                                ],
                                "name": "展示溯源信息",
                                "revealed": false,
                                "support": true,
                                "fieldType": "boolean",
                                "initialValue": false,
                                "key": "show_ref_label",
                                "required": false,
                                "desc": "开启联网搜索后在结果中展示搜索溯源信息，默认关闭。"
                            }
                        ],
                        "key": "generalv3"
                    }
                ]
            },
            "featureBlock":
            {},
            "payloadBlock":
            {},
            "acceptBlock":
            {},
            "protocolType": 1,
            "serviceId": "image_understandingv3",
            "multipleDialog": 1
        },
        "source": 1,
        "url": "wss://spark-api.cn-huabei-1.xf-yun.com/v2.1/image",
        "appId": null,
        "licChannel": "image_understandingv3"
    }
',1,'亚谋理想项目测试使用','2000-01-01 00:00:00','2025-06-16 15:27:55'),
	 (1765,'DEFAULT_SLICE_RULES_CBG','1','CBG默认切片规则','{"type":0,"seperator":["\\n"],"lengthRange":[256,1024]}',1,'','2025-06-18 17:21:37','2025-06-18 17:21:44'),
	 (1767,'CUSTOM_SLICE_RULES_CBG','1','CBG自定义切片模板','{"type":1,"seperator":["\\n"],"lengthRange":[16,1024]}',1,'','2025-06-18 17:21:42','2025-08-14 17:27:21'),
	 (1769,'DEFAULT_SLICE_RULES_SPARK','1','Spark默认切片规则','{"type":0,"seperator":["\\n"],"lengthRange":[16,1024]}',1,'','2025-06-18 17:21:41','2025-06-18 17:21:46'),
	 (1771,'CUSTOM_SLICE_RULES_SPARK','1','Spark自定义切片模板','{"type":1,"seperator":["\\n"],"lengthRange":[16,1024]}',1,'','2025-06-18 17:21:43','2025-06-18 17:21:47'),
	 (1773,'DEFAULT_SLICE_RULES_AIUI','1','AIUI默认切片规则','{"type":0,"seperator":["\\n"],"lengthRange":[16,1024]}',1,'','2025-07-03 15:18:40','2025-07-03 15:18:40'),
	 (1775,'CUSTOM_SLICE_RULES_AIUI','1','AIUI自定义切片模板','{"type":1,"seperator":["\\n"],"lengthRange":[16,1024]}',1,'','2025-07-03 15:18:40','2025-07-03 15:18:40'),
	 (1777,'WORKFLOW_INIT_DATA','workflow','工作流初始化data','{
    "nodes":
    [
        {
            "data":
            {
                "allowInputReference": false,
                "allowOutputReference": true,
                "description": "The start node of the workflow, used to define the business variables required for process invocation.",
                "icon": "https://oss-beijing-m8.openstorage.cn/pro-bucket/sparkBot/common/workflow/icon/start-node-icon.png",
                "inputs":
                [],
                "label": "Start",
                "nodeMeta":
                {
                    "aliasName": "开始节点",
                    "nodeType": "基础节点"
                },
                "nodeParam":
                {},
                "outputs":
                [
                    {
                        "deleteDisabled": true,
                        "id": "0918514b-72a8-4646-8dd9-ff4a8fc26d44",
                        "name": "AGENT_USER_INPUT",
                        "required": true,
                        "schema":
                        {
                            "default": "User''s input in the current round of conversation",
                            "type": "string"
                        }
                    }
                ],
                "status": "",
                "updatable": false
            },
            "dragging": false,
            "height": 256,
            "id": "node-start::d61b0f71-87ee-475e-93ba-f1607f0ce783",
            "position":
            {
                "x": -25.109019607843152,
                "y": 521.7086666666667
            },
            "positionAbsolute":
            {
                "x": -25.109019607843152,
                "y": 521.7086666666667
            },
            "selected": false,
            "type": "开始节点",
            "width": 658
        },
        {
            "data":
            {
                "allowInputReference": true,
                "allowOutputReference": false,
                "description": "The end node of the workflow, used to output the final result after the workflow execution.",
                "icon": "https://oss-beijing-m8.openstorage.cn/pro-bucket/sparkBot/common/workflow/icon/end-node-icon.png",
                "inputs":
                [
                    {
                        "id": "82de2b42-a059-4c98-bffb-b6b4800fcac9",
                        "name": "output",
                        "schema":
                        {
                            "type": "string",
                            "value":
                            {
                                "content":
                                {},
                                "type": "ref"
                            }
                        }
                    }
                ],
                "label": "End",
                "nodeMeta":
                {
                    "aliasName": "结束节点",
                    "nodeType": "基础节点"
                },
                "nodeParam":
                {
                    "template": "",
                    "streamOutput": true,
                    "outputMode": 1
                },
                "outputs":
                [],
                "references":
                [],
                "status": "",
                "updatable": false
            },
            "dragging": false,
            "height": 617,
            "id": "node-end::cda617af-551e-462e-b3b8-3bb9a041bf88",
            "position":
            {
                "x": 886.8833333333332,
                "y": 343.91588235294114
            },
            "positionAbsolute":
            {
                "x": 886.8833333333332,
                "y": 343.91588235294114
            },
            "selected": true,
            "type": "结束节点",
            "width": 408
        }
    ],
    "edges":
    []
}',1,NULL,'2022-06-10 00:00:00','2025-07-29 15:14:22'),
	 (1779,'DOMAIN_WHITE_LIST','domain_white_list','域名白名单','inner-sparklinkthirdapi.aipaasapi.cn,agentbuilder.aipaasapi.cn,dx-cbm-ocp-agg-search-inner.xf-yun.com,dx-cbm-ocp-gateway.xf-yun.com,xingchen-agent-mcp.aicp.private,dx-spark-agentbuilder.aicp.private,vmselect.huabei.xf-yun.com,pre-agentbuilder.aipaasapi.cn',1,NULL,'2022-06-10 00:00:00','2025-07-21 17:01:46'),
	 (1780,'WORKFLOW_NODE_TEMPLATE','1,2','Basic Node','{
  "aliasName": "Database",
  "idType": "database",
  "data": {
    "outputs": [
      {
        "id": "",
        "name": "isSuccess",
        "nameErrMsg": "",
        "schema": {
          "default": "SQL statement execution status indicator, true for success, false for failure",
          "type": "boolean"
        }
      },
      {
        "id": "",
        "name": "message",
        "nameErrMsg": "",
        "schema": {
          "default": "Failure reason",
          "type": "string"
        }
      },
      {
        "id": "",
        "name": "outputList",
        "nameErrMsg": "",
        "properties": [],
        "schema": {
          "default": "Execution result",
          "type": "array-object"
        }
      }
    ],
    "references": [],
    "allowInputReference": true,
    "inputs": [
      {
        "schema": {
          "type": "string",
          "value": {
            "type": "ref",
            "content": {}
          }
        },
        "name": "input",
        "id": ""
      }
    ],
    "icon": "https://oss-beijing-m8.openstorage.cn/SparkBotDev/icon/user/sparkBot_1752568522509_database_icon.svg",
    "allowOutputReference": true,
    "nodeMeta": {
        "aliasName": "数据库节点",
        "nodeType": "基础节点"
      },
    "nodeParam": {
      "mode": 0
    }
  },
  "description": "Supports user-defined SQL for performing database operations such as insert, delete, update, and query",
  "nodeType": "Basic Node"
}',1,'数据库节点','2000-01-01 00:00:00','2025-07-28 10:18:24'),
	 (1781,'WORKFLOW_NODE_TEMPLATE_PRE','1,2','基础节点','{
  "aliasName": "Database",
  "idType": "database",
  "data": {
    "outputs": [
      {
        "id": "",
        "name": "isSuccess",
        "nameErrMsg": "",
        "schema": {
          "default": "SQL statement execution status indicator, true for success, false for failure",
          "type": "boolean"
        }
      },
      {
        "id": "",
        "name": "message",
        "nameErrMsg": "",
        "schema": {
          "default": "Failure reason",
          "type": "string"
        }
      },
      {
        "id": "",
        "name": "outputList",
        "properties": [],
        "nameErrMsg": "",
        "schema": {
          "default": "Execution result",
          "type": "array-object"
        }
      }
    ],
    "references": [],
    "allowInputReference": true,
    "inputs": [
      {
        "schema": {
          "type": "string",
          "value": {
            "type": "ref",
            "content": {}
          }
        },
        "name": "input",
        "id": ""
      }
    ],
    "icon": "https://oss-beijing-m8.openstorage.cn/SparkBotDev/icon/user/sparkBot_1752568522509_database_icon.svg",
    "allowOutputReference": true,
    "nodeMeta": {
        "aliasName": "数据库节点",
        "nodeType": "基础节点"
      },
    "nodeParam": {
      "mode": 0
    }
  },
  "description": "Supports user-defined SQL for performing database operations such as insert, delete, update, and query",
  "nodeType": "Basic Node"
}',1,'数据库节点','2000-01-01 00:00:00','2025-07-25 16:55:31'),
	 (1782,'DB_TABLE_TEMPLATE','TB','数据库字段导入模版','https://oss-beijing-m8.openstorage.cn/SparkBotDev/sparkBot/DB_TABLE_IMPORT_TEMPLATE_en.xlsx',1,NULL,'2025-07-10 10:50:48','2025-07-31 19:59:04'),
	 (1783,'ICON','rag','http://oss-beijing-m8.openstorage.cn/SparkBotProd/','icon/rag/Personal_en@1x.png',1,'SparkDesk-RAG','2025-07-31 10:53:21','2025-07-31 19:49:25'),
	 (1784,'ICON','rag','http://oss-beijing-m8.openstorage.cn/SparkBotProd/','icon/rag/Spark_en@1x.png',1,'CBG-RAG','2025-07-31 10:53:21','2025-07-31 19:49:25'),
	 (1785,'ICON','rag','http://oss-beijing-m8.openstorage.cn/SparkBotProd/','icon/rag/Stellar_en@1x.png',1,'AIUI-RAG2','2025-07-31 10:53:21','2025-07-31 19:49:25'),
	 (1786,'EVAL_TASK_PROMPT','FIX','测评纬度优化prompt','# Role  
You are a prompt optimization expert, and your task is to analyze and optimize the following "original prompt" specifically for the single dimension of "{{评估维度名称}}", helping the user improve the prompt''s quality in that dimension.

# Original Prompt  
{{context}}

# Please follow these steps:  
1. Analyze the weaknesses of the original prompt in terms of “{{Evaluation Dimension Name}}” (e.g., vague expression, lack of necessary information).  
2. Optimize the original prompt if needed, such as refining wording, adding examples, clarifying format, etc., to ensure the prompt stands out in this dimension (e.g., more clear or more complete).  
3. Provide scoring criteria for this dimension with descriptions for all four levels.

**Scoring Criteria**  
Use the following fixed levels and scores for the dimension of “{{Evaluation Dimension Name}}”. Suppose the dimension is “Clarity”:  
| Level  | Score | Description                                     |
|--------|-------|-------------------------------------------------|
| **Good**    | 4     | Goal and instructions are perfectly clear with no ambiguity. |
| **Fairly Good** | 3     | Mostly clear with minor ambiguity that does not affect understanding. |
| **Average** | 2     | Somewhat vague, requires contextual guessing to understand intent. |
| **Poor**    | 1     | Ambiguous or contradictory instructions that are difficult to execute. |

# Output Format:  
"""
## Role  
You are a quality inspector of dialogue fluency, responsible for evaluating the quality of "user input" and "response text".

## Evaluation Process  
1. Check whether the sentences are smooth and free of grammatical errors (e.g., mismatched phrases, incomplete components).  
2. Analyze logical coherence to judge whether the transitions between paragraphs or sentences are natural, and whether there are any abrupt topic shifts or logical gaps.  
3. Evaluate whether the amount of information is appropriate and meets the user''s needs (e.g., redundant or missing information may affect fluency).

## Scoring Criteria  
| Level  | Score | Description                                                                 |
|--------|-------|------------------------------------------------------------------------------|
| **Good**    | 4     | Smooth sentences, rigorous logic, natural transitions, appropriate information, overall dialogue as smooth as human conversation. |
| **Fairly Good** | 3     | Basically fluent, with only occasional minor grammatical or transitional issues, no effect on communication. |
| **Average** | 2     | Some grammatical or logical errors, or slightly awkward transitions, but the main intent is understandable. |
| **Poor**    | 1     | Many grammar errors, confusing sentence structure, serious topic jumps, severely affecting conversation coherence. |

## Output Example  
{"Score":1,"Reason":"The assistant''s tone, wording, and content fully match its role as a Victorian-era English butler from the 19th century. The reply aligns with the user''s positive emotion and responds with polite, encouraging language."}
"""

# Output Requirements:  
- Focus entirely on **“{{Evaluation Dimension Name}}”** only, ignore all other dimensions.  
- Use concise, bullet-point style language for easy copying.  
- Provide a revised prompt focused on “{{Evaluation Dimension Name}}” that is structured and ready for direct use.  
- Only output the final optimized prompt result, no need to explain the thought process or optimization reasoning.  
- Follow the "Output Format" structure strictly, and ensure the "Output Example" is in valid JSON format with score and reason fields.',1,'','2025-07-31 10:52:49','2025-07-31 15:08:34'),
	 (1787,'EVAL_TASK_PROMPT','JUDGE','评分维度评价prompt','# Input  
You are to evaluate the "response text" based on the "user input" and "agent/workflow setting" along the dimension of "{{Evaluation Dimension}}".  
Agent/Workflow Setting: {{system_prompt}}  
User Input: {{input}}  
Response Text: {{output}}

# Output:  
Score: A number indicating how well the response meets the criteria defined in the prompt. The score ranges from 4 to 1, corresponding to 4 (Good), 3 (Fairly Good), 2 (Average), and 1 (Poor).  
Reason: A readable explanation for the given score. The reason must end with a complete sentence.  
Format: Strictly output in JSON format, with "Score" for the rating and "Reason" for the explanation.

# Output Format  
{"Score":3,"Reason":"The response generally aligns with the question context, but the mentioned secondary example fails to clearly support the main conclusion, causing minor logical looseness."}',1,'','2025-07-31 10:52:49','2025-07-31 15:07:50'),
	 (1788,'CUSTOM_SLICE_SEPERATORS_AIUI','1','AIUI自定义分隔符','[
    {
        "id": 1,
        "name": "Line break",
        "symbol": "\\\\n"
    },
    {
        "id": 2,
        "name": "Chinese period",
        "symbol": "。"
    },
    {
        "id": 3,
        "name": "English period",
        "symbol": "."
    },
    {
        "id": 4,
        "name": "Chinese exclamation mark",
        "symbol": "！"
    },
    {
        "id": 5,
        "name": "English exclamation mark",
        "symbol": "!"
    },
    {
        "id": 6,
        "name": "Chinese question mark",
        "symbol": "？"
    },
    {
        "id": 7,
        "name": "English question mark",
        "symbol": "?"
    },
    {
        "id": 8,
        "name": "Chinese semicolon",
        "symbol": "；"
    },
    {
        "id": 9,
        "name": "English semicolon",
        "symbol": ";"
    },
    {
        "id": 10,
        "name": "Chinese ellipsis",
        "symbol": "……"
    },
    {
        "id": 11,
        "name": "English ellipsis",
        "symbol": "..."
    }
]',1,'','2025-07-31 15:31:10','2025-07-31 15:31:23'),
	 (1789,'CUSTOM_SLICE_SEPERATORS_CBG','1','CBG自定义分隔符','[
    {
        "id": 1,
        "name": "Line break",
        "symbol": "\\\\n"
    },
    {
        "id": 2,
        "name": "Chinese period",
        "symbol": "。"
    },
    {
        "id": 3,
        "name": "English period",
        "symbol": "."
    },
    {
        "id": 4,
        "name": "Chinese exclamation mark",
        "symbol": "！"
    },
    {
        "id": 5,
        "name": "English exclamation mark",
        "symbol": "!"
    },
    {
        "id": 6,
        "name": "Chinese question mark",
        "symbol": "？"
    },
    {
        "id": 7,
        "name": "English question mark",
        "symbol": "?"
    },
    {
        "id": 8,
        "name": "Chinese semicolon",
        "symbol": "；"
    },
    {
        "id": 9,
        "name": "English semicolon",
        "symbol": ";"
    },
    {
        "id": 10,
        "name": "Chinese ellipsis",
        "symbol": "……"
    },
    {
        "id": 11,
        "name": "English ellipsis",
        "symbol": "..."
    }
]',1,'','2025-07-31 15:31:15','2025-07-31 15:31:22'),
	 (1790,'CUSTOM_SLICE_SEPERATORS_SPARK','1','SPARK自定义分隔符','[
    {
        "id": 1,
        "name": "Line break",
        "symbol": "\\\\n"
    },
    {
        "id": 2,
        "name": "Chinese period",
        "symbol": "。"
    },
    {
        "id": 3,
        "name": "English period",
        "symbol": "."
    },
    {
        "id": 4,
        "name": "Chinese exclamation mark",
        "symbol": "！"
    },
    {
        "id": 5,
        "name": "English exclamation mark",
        "symbol": "!"
    },
    {
        "id": 6,
        "name": "Chinese question mark",
        "symbol": "？"
    },
    {
        "id": 7,
        "name": "English question mark",
        "symbol": "?"
    },
    {
        "id": 8,
        "name": "Chinese semicolon",
        "symbol": "；"
    },
    {
        "id": 9,
        "name": "English semicolon",
        "symbol": ";"
    },
    {
        "id": 10,
        "name": "Chinese ellipsis",
        "symbol": "……"
    },
    {
        "id": 11,
        "name": "English ellipsis",
        "symbol": "..."
    }
]',1,'','2025-07-31 15:31:21','2025-07-31 15:31:25'),
	 (1791,'ICON','rag','http://oss-beijing-m8.openstorage.cn/SparkBotProd/','icon/rag/20251011-140414.png',1,'Ragflow-RAG','2025-07-31 19:50:09','2025-10-11 14:06:20'),
	 (1792,'ICON','rpa_robot','http://oss-beijing-m8.openstorage.cn/SparkBotProd/','icon/tool/rpa_robot_icon.png',1,'','2025-07-31 19:50:09','2025-10-11 14:06:20'),
	 (1793,'WORKFLOW_NODE_TEMPLATE','1,2','工具','{
    "idType": "rpa",
    "nodeType": "基础节点",
    "aliasName": "RPA",
    "description": "调用RPA，可以指定RPA执行",
    "data":
    {
        "nodeMeta":
        {
            "nodeType": "工具",
            "aliasName": "RPA"
        },
        "inputs":
        [],
        "outputs":
        [],
        "nodeParam":
        {
            "projectId": "1965981379635499008",
            "header":
            {
                "apiKey": ""
            },
            "rpaParams":
            {
                "execPosition": "EXECUTOR"
            },
            "source": "xiaowu",
            "icon": "https://oss-beijing-m8.openstorage.cn/pro-bucket/sparkBot/common/workflow/icon/tool-icon.png"
        },
        "references":
        [],
        "allowInputReference": true,
        "allowOutputReference": true,
        "icon": "http://oss-beijing-m8.openstorage.cn/SparkBotProd/icon/tool/rpa_icon.png"
    }
}',1,'RPA','2000-01-01 00:00:00','2025-10-11 14:45:16');
