-- ----------------------------
-- Records of agent_enterprise_permission
-- ----------------------------
INSERT INTO `agent_enterprise_permission` (`id`, `module`, `description`, `permission_key`, `officer`, `governor`,
                                           `staff`, `available_expired`, `create_time`, `update_time`)
VALUES (1, 'Team/Enterprise level space management', 'Create space', 'SpaceController_createCorporateSpace_POST', 1, 1, 0, 0,
        '2025-01-01 00:00:00', '2025-01-01 00:00:00');
INSERT INTO `agent_enterprise_permission` (`id`, `module`, `description`, `permission_key`, `officer`, `governor`,
                                           `staff`, `available_expired`, `create_time`, `update_time`)
VALUES (3, 'Team/Enterprise level space management', 'Delete space', 'SpaceController_deleteCorporateSpace_DELETE', 1, 1, 0, 0,
        '2025-01-01 00:00:00', '2025-01-01 00:00:00');
INSERT INTO `agent_enterprise_permission` (`id`, `module`, `description`, `permission_key`, `officer`, `governor`,
                                           `staff`, `available_expired`, `create_time`, `update_time`)
VALUES (5, 'Team/Enterprise info settings (Team management)', 'Set team/enterprise name', 'EnterpriseController_updateName_POST', 1, 1, 0, 0,
        '2025-01-01 00:00:00', '2025-01-01 00:00:00');
INSERT INTO `agent_enterprise_permission` (`id`, `module`, `description`, `permission_key`, `officer`, `governor`,
                                           `staff`, `available_expired`, `create_time`, `update_time`)
VALUES (7, 'Team/Enterprise level space management', 'Edit space info', 'SpaceController_updateCorporateSpace_POST', 1, 1, 0, 0,
        '2025-01-01 00:00:00', '2025-01-01 00:00:00');
INSERT INTO `agent_enterprise_permission` (`id`, `module`, `description`, `permission_key`, `officer`, `governor`,
                                           `staff`, `available_expired`, `create_time`, `update_time`)
VALUES (9, 'Team/Enterprise info view', 'View team/enterprise details', 'EnterpriseController_detail_GET', 1, 1, 1, 1,
        '2025-01-01 00:00:00', '2025-01-01 00:00:00');
INSERT INTO `agent_enterprise_permission` (`id`, `module`, `description`, `permission_key`, `officer`, `governor`,
                                           `staff`, `available_expired`, `create_time`, `update_time`)
VALUES (13, 'Team/Enterprise level space management', 'Enterprise all spaces', 'SpaceController_corporateList_GET', 1, 1, 1, 1,
        '2025-01-01 00:00:00', '2025-01-01 00:00:00');
INSERT INTO `agent_enterprise_permission` (`id`, `module`, `description`, `permission_key`, `officer`, `governor`,
                                           `staff`, `available_expired`, `create_time`, `update_time`)
VALUES (15, 'Team/Enterprise level space management', 'Enterprise my spaces', 'SpaceController_corporateJoinList_GET', 1, 1, 1, 1,
        '2025-01-01 00:00:00', '2025-01-01 00:00:00');
INSERT INTO `agent_enterprise_permission` (`id`, `module`, `description`, `permission_key`, `officer`, `governor`,
                                           `staff`, `available_expired`, `create_time`, `update_time`)
VALUES (17, 'Team/Enterprise Info Settings (Team Management)', 'Set team/enterprise LOGO', 'EnterpriseController_updateLogo_POST', 1, 1, 0, 0,
        '2025-01-01 00:00:00', '2025-01-01 00:00:00');
INSERT INTO `agent_enterprise_permission` (`id`, `module`, `description`, `permission_key`, `officer`, `governor`,
                                           `staff`, `available_expired`, `create_time`, `update_time`)
VALUES (19, 'Team/Enterprise Info Settings (Team Management)', 'Set team/enterprise avatar', 'EnterpriseController_updateAvatar_POST', 1, 1, 0, 0,
        '2025-01-01 00:00:00', '2025-01-01 00:00:00');
INSERT INTO `agent_enterprise_permission` (`id`, `module`, `description`, `permission_key`, `officer`, `governor`,
                                           `staff`, `available_expired`, `create_time`, `update_time`)
VALUES (21, 'Invitation Management', 'Enterprise team invitation list', 'InviteRecordController_enterpriseInviteList_POST', 1, 1, 0, 0,
        '2025-01-01 00:00:00', '2025-01-01 00:00:00');
INSERT INTO `agent_enterprise_permission` (`id`, `module`, `description`, `permission_key`, `officer`, `governor`,
                                           `staff`, `available_expired`, `create_time`, `update_time`)
VALUES (23, 'Enterprise Team User Management', 'Team user list', 'EnterpriseUserController_page_POST', 1, 1, 1, 0, '2025-01-01 00:00:00',
        '2025-01-01 00:00:00');
INSERT INTO `agent_enterprise_permission` (`id`, `module`, `description`, `permission_key`, `officer`, `governor`,
                                           `staff`, `available_expired`, `create_time`, `update_time`)
VALUES (25, 'Enterprise Team User Management', 'Modify user role', 'EnterpriseUserController_updateRole_POST', 1, 1, 0, 0,
        '2025-01-01 00:00:00', '2025-01-01 00:00:00');
INSERT INTO `agent_enterprise_permission` (`id`, `module`, `description`, `permission_key`, `officer`, `governor`,
                                           `staff`, `available_expired`, `create_time`, `update_time`)
VALUES (27, 'Enterprise Team User Management', 'Remove user', 'EnterpriseUserController_remove_DELETE', 1, 1, 0, 0, '2025-01-01 00:00:00',
        '2025-01-01 00:00:00');
INSERT INTO `agent_enterprise_permission` (`id`, `module`, `description`, `permission_key`, `officer`, `governor`,
                                           `staff`, `available_expired`, `create_time`, `update_time`)
VALUES (29, 'Invitation Management', 'Invite to join enterprise team', 'InviteRecordController_enterpriseInvite_POST', 1, 1, 0, 0,
        '2025-01-01 00:00:00', '2025-01-01 00:00:00');
INSERT INTO `agent_enterprise_permission` (`id`, `module`, `description`, `permission_key`, `officer`, `governor`,
                                           `staff`, `available_expired`, `create_time`, `update_time`)
VALUES (31, 'Invitation Management', 'Enterprise invitation search user', 'InviteRecordController_enterpriseSearchUser_GET', 1, 1, 0, 0,
        '2025-01-01 00:00:00', '2025-01-01 00:00:00');
INSERT INTO `agent_enterprise_permission` (`id`, `module`, `description`, `permission_key`, `officer`, `governor`,
                                           `staff`, `available_expired`, `create_time`, `update_time`)
VALUES (33, 'Invitation Management', 'Revoke enterprise invitation', 'InviteRecordController_revokeEnterpriseInvite_POST', 1, 1, 0, 0,
        '2025-01-01 00:00:00', '2025-01-01 00:00:00');
INSERT INTO `agent_enterprise_permission` (`id`, `module`, `description`, `permission_key`, `officer`, `governor`,
                                           `staff`, `available_expired`, `create_time`, `update_time`)
VALUES (35, 'Application Management', 'Apply to join enterprise space', 'ApplyRecordController_joinEnterpriseSpace_POST', 1, 1, 1, 0,
        '2025-01-01 00:00:00', '2025-01-01 00:00:00');
INSERT INTO `agent_enterprise_permission` (`id`, `module`, `description`, `permission_key`, `officer`, `governor`,
                                           `staff`, `available_expired`, `create_time`, `update_time`)
VALUES (37, 'Enterprise Team User Management', 'Quit enterprise team', 'EnterpriseUserController_quitEnterprise_POST', 1, 1, 1, 0,
        '2025-01-01 00:00:00', '2025-01-01 00:00:00');
INSERT INTO `agent_enterprise_permission` (`id`, `module`, `description`, `permission_key`, `officer`, `governor`,
                                           `staff`, `available_expired`, `create_time`, `update_time`)
VALUES (39, 'Enterprise Team User Management', 'Get user limits', 'EnterpriseUserController_getUserLimit_GET', 1, 1, 0, 0,
        '2025-01-01 00:00:00', '2025-01-01 00:00:00');
INSERT INTO `agent_enterprise_permission` (`id`, `module`, `description`, `permission_key`, `officer`, `governor`,
                                           `staff`, `available_expired`, `create_time`, `update_time`)
VALUES (41, 'User Rights Query', 'Get team edition non-model resources', 'UserAuthController_getDetailByEnterpriseId_GET', 1, 1, 1, 0,
        '2025-01-01 00:00:00', '2025-01-01 00:00:00');
INSERT INTO `agent_enterprise_permission` (`id`, `module`, `description`, `permission_key`, `officer`, `governor`,
                                           `staff`, `available_expired`, `create_time`, `update_time`)
VALUES (43, 'User Rights Query', 'Get team edition package', 'UserAuthController_getTeamOrderMeta_GET', 1, 1, 1, 0,
        '2025-01-01 00:00:00', '2025-01-01 00:00:00');
INSERT INTO `agent_enterprise_permission` (`id`, `module`, `description`, `permission_key`, `officer`, `governor`,
                                           `staff`, `available_expired`, `create_time`, `update_time`)
VALUES (45, 'User Rights Query', 'Get team edition model resources', 'UserAuthController_getModelDetailByEnterpriseId_GET', 1, 1, 1, 0,
        '2025-01-01 00:00:00', '2025-01-01 00:00:00');
INSERT INTO `agent_enterprise_permission` (`id`, `module`, `description`, `permission_key`, `officer`, `governor`,
                                           `staff`, `available_expired`, `create_time`, `update_time`)
VALUES (47, 'Team/Enterprise Level Space Management', 'Enterprise total space count', 'SpaceController_corporateCount_GET', 1, 1, 1, 0,
        '2025-01-01 00:00:00', '2025-01-01 00:00:00');
INSERT INTO `agent_enterprise_permission` (`id`, `module`, `description`, `permission_key`, `officer`, `governor`,
                                           `staff`, `available_expired`, `create_time`, `update_time`)
VALUES (49, 'User Rights Query', 'Get team edition model resources by app ID',
        'UserAuthController_getModelDetailByEnterpriseIdAndAppId_GET', 1, 1, 1, 0, '2025-01-01 00:00:00',
        '2025-01-01 00:00:00');
INSERT INTO `agent_enterprise_permission` (`id`, `module`, `description`, `permission_key`, `officer`, `governor`,
                                           `staff`, `available_expired`, `create_time`, `update_time`)
VALUES (51, 'Invitation Management', 'Enterprise invitation batch search user', 'InviteRecordController_enterpriseBatchSearchUser_POST', 1, 1, 1, 0,
        '2025-01-01 00:00:00', '2025-01-01 00:00:00');
INSERT INTO `agent_enterprise_permission` (`module`, `description`, `permission_key`, `officer`, `governor`, `staff`, `available_expired`, `create_time`, `update_time`) VALUES ('Invitation Management', 'Enterprise invitation search username', 'InviteRecordController_enterpriseBatchSearchUsername_POST', 1, 1, 1, 0, '2025-01-01 00:00:00', '2025-01-01 00:00:00');
INSERT INTO `agent_enterprise_permission` (`module`, `description`, `permission_key`, `officer`, `governor`, `staff`, `available_expired`, `create_time`, `update_time`) VALUES ('Invitation Management', 'Enterprise invitation batch search username', 'InviteRecordController_enterpriseSearchUsername_GET', 1, 1, 0, 0, '2025-01-01 00:00:00', '2025-01-01 00:00:00');



-- ----------------------------
-- Records of agent_space_permission
-- ----------------------------
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (1, 'Bot Management', 'testPoint', '', 'MyBotController_getCreatedList_POST', 1, 1, 1, 0, '2025-01-01 00:00:00',
        '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (3, 'Bot Management', 'testPoint', '', 'ChatBotMarketController_botDetail_POST', 1, 1, 1, 0, '2025-01-01 00:00:00',
        '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (5, 'Bot Management', 'testPoint', '', 'ChatBotController_insert_POST', 1, 1, 1, 0, '2025-01-01 00:00:00',
        '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (7, 'Bot Management', 'testPoint', '', 'WorkflowController_list_GET', 1, 1, 1, 0, '2025-01-01 00:00:00',
        '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (9, 'Publishing Management', 'testPoint', '', 'BotController_takeoffBot_POST', 1, 1, 1, 0, '2025-01-01 00:00:00',
        '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (11, 'Bot Management', 'testPoint', '', 'ShareController_getShareKey_POST', 1, 1, 1, 0, '2025-01-01 00:00:00',
        '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (13, 'Bot Management', 'testPoint', '', 'ChatBotMarketController_updateMarketBot_POST', 1, 1, 1, 0,
        '2025-01-01 00:00:00', '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (15, 'Bot Management', 'testPoint', '', 'ChatBotController_update_POST', 1, 1, 1, 0, '2025-01-01 00:00:00',
        '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (17, 'Bot Management', 'testPoint', '', 'ChatBotController_generateAvatar_POST', 1, 1, 1, 0, '2025-01-01 00:00:00',
        '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (19, 'Bot Management', 'testPoint', '', 'BotController_copyBot2_POST', 1, 1, 1, 0, '2025-01-01 00:00:00',
        '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (21, 'Publishing Management', 'testPoint', '', 'ChatBotMarketController_upToBotMarket_POST', 1, 1, 1, 0,
        '2025-01-01 00:00:00', '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (23, 'Bot Management', 'testPoint', '', 'MyBotController_deleteBot_POST', 1, 1, 1, 0, '2025-01-01 00:00:00',
        '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (25, 'Space Management', 'Get space details', '', 'SpaceController_detail_GET', 1, 1, 1, 0, '2025-01-01 00:00:00',
        '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (27, 'Space Management', 'Edit space information', '', 'SpaceController_updatePersonalSpace_POST', 1, 0, 0, 0,
        '2025-01-01 00:00:00', '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (29, 'Prompt Management', 'testPoint', '', 'PromptManageController_createPrompt_POST', 1, 1, 1, 0,
        '2025-01-01 00:00:00', '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (31, 'Prompt Management', 'testPoint', '', 'PromptManageController_deletePrompt_POST', 1, 1, 1, 0,
        '2025-01-01 00:00:00', '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (33, 'Prompt Management', 'testPoint', '', 'PromptManageController_listPrompt_POST', 1, 1, 1, 0, '2025-01-01 00:00:00',
        '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (35, 'Prompt Management', 'testPoint', '', 'PromptManageController_savePrompt_POST', 1, 1, 1, 0, '2025-01-01 00:00:00',
        '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (37, 'Prompt Management', 'testPoint', '', 'PromptManageController_createPromptGroup_POST', 1, 1, 1, 0,
        '2025-01-01 00:00:00', '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (39, 'Prompt Management', 'testPoint', '', 'PromptManageController_getPromptVersionDetail_POST', 1, 1, 1, 0,
        '2025-01-01 00:00:00', '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (41, 'Prompt Management', 'testPoint', '', 'PromptManageController_commitPrompt_POST', 1, 1, 1, 0,
        '2025-01-01 00:00:00', '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (43, 'Prompt Management', 'testPoint', '', 'PromptManageController_deletePromptVersion_POST', 1, 1, 1, 0,
        '2025-01-01 00:00:00', '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (45, 'Prompt Management', 'testPoint', '', 'PromptManageController_revertPrompt_POST', 1, 1, 1, 0,
        '2025-01-01 00:00:00', '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (47, 'Prompt Management', 'testPoint', '', 'PromptManageController_listPromptVersion_POST', 1, 1, 1, 0,
        '2025-01-01 00:00:00', '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (49, 'Prompt Management', 'testPoint', '', 'PromptManageController_getPromptDetail_POST', 1, 1, 1, 0,
        '2025-01-01 00:00:00', '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (51, 'Prompt Management', 'testPoint', '', 'PromptManageController_renamePrompt_POST', 1, 1, 1, 0,
        '2025-01-01 00:00:00', '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (53, 'Prompt Management', 'testPoint', '', 'ChatMessageController_promptDebug_POST', 1, 1, 1, 0, '2025-01-01 00:00:00',
        '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (55, 'Bot Management', 'testPoint', '', 'BotDashboardController_details_GET', 1, 1, 1, 0, '2025-01-01 00:00:00',
        '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (57, 'Publish Management', 'testPoint', '', 'BotV2Controller_botV2Info_GET', 1, 1, 1, 0, '2025-01-01 00:00:00',
        '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (59, 'Publish Management', 'testPoint', '', 'BotV2Controller_massPublish_POST', 1, 1, 1, 0, '2025-01-01 00:00:00',
        '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (61, 'Publish Management', 'testPoint', '', 'BotOffiaccountController_getAuthUrl_GET', 1, 1, 1, 0, '2025-01-01 00:00:00',
        '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (63, 'Publish Management', 'testPoint', '', 'MCPController_publishMCP_POST', 1, 1, 1, 0, '2025-01-01 00:00:00',
        '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (65, 'test', 'test', '', '', 1, 1, 1, 0, '2025-01-01 00:00:00', '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (71, 'Bot Management', 'testPoint', '', 'ChatMessageController_botDebug_POST', 1, 1, 1, 0, '2025-01-01 00:00:00',
        '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (73, 'Invite Management', '', '', 'InviteRecordController_spaceInviteList_POST', 1, 1, 0, 0, '2025-01-01 00:00:00',
        '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (75, 'Application Management', '', '', 'ApplyRecordController_page_POST', 1, 1, 0, 0, '2025-01-01 00:00:00',
        '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (77, 'Application Management', '', '', 'ApplyRecordController_agreeEnterpriseSpace_POST', 1, 1, 0, 0, '2025-01-01 00:00:00',
        '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (79, 'Invite Management', '', '', 'InviteRecordController_spaceSearchUser_POST', 1, 1, 0, 0, '2025-01-01 00:00:00',
        '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (81, 'Space User Management', '', '', 'SpaceUserController_enterpriseAdd_POST', 1, 1, 0, 0, '2025-01-01 00:00:00',
        '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (83, 'Space User Management', '', '', 'SpaceUserController_updateRole_POST', 1, 1, 0, 0, '2025-01-01 00:00:00',
        '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (85, 'Application Management', '', '', 'ApplyRecordController_refuseEnterpriseSpace_POST', 1, 1, 0, 0, '2025-01-01 00:00:00',
        '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (87, 'Space User Management', '', '', 'SpaceUserController_remove_POST', 1, 1, 0, 0, '2025-01-01 00:00:00',
        '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (89, 'Invite Management', '', '', 'InviteRecordController_spaceInvite_POST', 1, 1, 0, 0, '2025-01-01 00:00:00',
        '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (91, 'Space User Management', '', '', 'SpaceUserController_page_POST', 1, 1, 1, 0, '2025-01-01 00:00:00',
        '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (93, 'Invite Management', '', '', 'InviteRecordController_revokeSpaceInvite_POST', 1, 1, 0, 0, '2025-01-01 00:00:00',
        '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (95, 'Space User Management', '', '', 'SpaceUserController_transferSpace_POST', 1, 0, 0, 0, '2025-01-01 00:00:00',
        '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (97, 'Space User Management', '', '', 'SpaceUserController_listSpaceMember_GET', 1, 1, 0, 0, '2025-01-01 00:00:00',
        '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (99, 'Knowledge Base', 'Create Knowledge Base', '', 'RepoController_createRepo_POST', 1, 1, 1, 0, '2025-01-01 00:00:00',
        '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (101, 'Evaluation Dimension', 'Delete Evaluation Dimension', '', 'EvalDimensionController_deleteDimension_GET', 1, 1, 1, 0,
        '2025-01-01 00:00:00', '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (103, '', '', '', 'DataBaseController_deleteTable_GET', 1, 1, 1, 0, '2025-01-01 00:00:00',
        '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (105, 'Evaluation Scenario', 'Edit Evaluation Scenario', '', 'EvalDimensionController_updateScene_POST', 1, 1, 1, 0,
        '2025-01-01 00:00:00', '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (107, 'Workflow', 'Publish Workflow', '', 'WorkflowController_publish_POST', 1, 1, 1, 0, '2025-01-01 00:00:00',
        '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (109, '', '', '', 'DataBaseController_createDbTable_POST', 1, 1, 1, 0, '2025-01-01 00:00:00',
        '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (111, '', '', '', 'ToolBoxController_favorite_GET', 1, 1, 1, 0, '2025-01-01 00:00:00', '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (113, 'Knowledge', 'createKnowledge', '', 'KnowledgeController_createKnowledge_POST', 1, 1, 1, 0,
        '2025-01-01 00:00:00', '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (115, 'Evaluation Task Retry', 'Evaluation Task Retry', '', 'EvalTaskController_again_GET', 1, 1, 1, 0, '2025-01-01 00:00:00',
        '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (117, 'Evaluation Object Scenario', 'Evaluation Object', '', 'EvalTaskController_objectList_GET', 1, 1, 1, 0, '2025-01-01 00:00:00',
        '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (119, 'Evaluation Task Append - Only for Completed Tasks', 'Evaluation Task Append - Only for Completed Tasks', '',
        'EvalTaskController_getEvalReport_GET', 1, 1, 1, 0, '2025-01-01 00:00:00', '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (121, '', '', '', 'ToolBoxController_createTool_POST', 1, 1, 1, 0, '2025-01-01 00:00:00', '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (123, 'Evaluation Task Retry', 'Evaluation Task Retry', '', 'EvalTaskController_stopProgress_GET', 1, 1, 1, 0,
        '2025-01-01 00:00:00', '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (125, '', '', '', 'DataBaseController_getDbTableInfoList_GET', 1, 1, 1, 0, '2025-01-01 00:00:00',
        '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (127, 'Evaluation Task Delete', 'Evaluation Task Delete', '', 'EvalTaskController_delete_DELETE', 1, 1, 1, 0, '2025-01-01 00:00:00',
        '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (129, '', '', '', 'DataBaseController_getDatabaseInfo_GET', 1, 1, 1, 0, '2025-01-01 00:00:00',
        '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (131, 'Knowledge Base', 'Knowledge Base Simple List', '', 'RepoController_list_GET', 1, 1, 1, 0, '2025-01-01 00:00:00',
        '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (133, '', '', '', 'DataBaseController_getDbTableList_GET', 1, 1, 1, 0, '2025-01-01 00:00:00',
        '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (135, 'Create Evaluation Task', 'Create Evaluation Task', '', 'EvalTaskController_create_POST', 1, 1, 1, 0, '2025-01-01 00:00:00',
        '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (137, '', '', '', 'ToolBoxController_getToolDefaultIcon_GET', 1, 1, 1, 0, '2025-01-01 00:00:00',
        '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (139, 'Evaluation Dimension', 'Edit Evaluation Dimension', '', 'EvalDimensionController_updateDimension_POST', 1, 1, 1, 0,
        '2025-01-01 00:00:00', '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (141, '', '', '', 'DataBaseController_copyTable_GET', 1, 1, 1, 0, '2025-01-01 00:00:00', '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (143, 'Evaluation Task Temporary Storage Echo', 'Evaluation Task Temporary Storage Echo', '', 'EvalTaskController_storeTemporary_GET', 1, 1, 1, 0,
        '2025-01-01 00:00:00', '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (145, 'Model Management', 'Add/Edit Model', '', 'ModelController_validateModel_POST', 1, 1, 1, 0, '2025-01-01 00:00:00',
        '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (147, 'Knowledge Base', 'Knowledge Base List', '', 'RepoController_listRepos_GET', 1, 1, 1, 0, '2025-01-01 00:00:00',
        '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (149, '', '', '', 'DataBaseController_deleteDatabase_GET', 1, 1, 1, 0, '2025-01-01 00:00:00',
        '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (151, 'Knowledge Base', 'Knowledge Base Details', '', 'RepoController_getDetail_GET', 1, 1, 1, 0, '2025-01-01 00:00:00',
        '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (153, '', '', '', 'DataBaseController_copyDatabase_GET', 1, 1, 1, 0, '2025-01-01 00:00:00',
        '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (155, '', '', '', 'ToolBoxController_listToolSquare_POST', 1, 1, 1, 0, '2025-01-01 00:00:00',
        '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (157, 'Create Evaluation Task Temporary Storage', 'Create Evaluation Task Temporary Storage', '', 'EvalTaskController_storeTemporary_POST', 1, 1, 1, 0,
        '2025-01-01 00:00:00', '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (159, 'Evaluation Scenario', 'Delete Evaluation Scenario', '', 'EvalDimensionController_deleteScene_GET', 1, 1, 1, 0,
        '2025-01-01 00:00:00', '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (161, '', '', '', 'DataBaseController_createDatabase_POST', 1, 1, 1, 0, '2025-01-01 00:00:00',
        '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (163, 'Evaluation Task Append Data Echo', 'Evaluation Task Append Data Echo', '', 'EvalTaskController_appendFeedback_GET', 1, 1, 1, 0,
        '2025-01-01 00:00:00', '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (165, 'Knowledge Base', 'Update Knowledge Base', '', 'RepoController_updateRepo_POST', 1, 1, 1, 0, '2025-01-01 00:00:00',
        '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (167, 'Knowledge Base', 'Delete Knowledge Base', '', 'RepoController_deleteRepo_DELETE', 1, 1, 1, 0, '2025-01-01 00:00:00',
        '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (169, '', '', '', 'DataBaseController_selectDatabase_POST', 1, 1, 1, 0, '2025-01-01 00:00:00',
        '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (171, 'Evaluation Dimension', 'Evaluation Dimension Paged List', '', 'EvalDimensionController_getDimensionPageList_GET', 1, 1, 1, 0,
        '2025-01-01 00:00:00', '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (173, 'Evaluation Dimension', 'Add Evaluation Dimension', '', 'EvalDimensionController_addScene_POST', 1, 1, 1, 0, '2025-01-01 00:00:00',
        '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (175, 'Evaluation Set', 'Evaluation Set List', '', 'EvalSetController_list_GET', 1, 1, 1, 0, '2025-01-01 00:00:00',
        '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (177, '', '', '', 'DataBaseController_importTableData_POST', 1, 1, 1, 0, '2025-01-01 00:00:00',
        '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (179, '', '', '', 'DataBaseController_updateTable_POST', 1, 1, 1, 0, '2025-01-01 00:00:00',
        '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (181, '', '', '', 'ToolBoxController_deleteTool_DELETE', 1, 1, 1, 0, '2025-01-01 00:00:00',
        '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (183, 'Evaluation Set', 'Delete Evaluation Set', '', 'EvalSetController_delete_DELETE', 1, 1, 1, 0, '2025-01-01 00:00:00',
        '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (185, '', '', '', 'ToolBoxController_listTools_GET', 1, 1, 1, 0, '2025-01-01 00:00:00', '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (187, 'Knowledge', 'updateKnowledge', '', 'KnowledgeController_updateKnowledge_POST', 1, 1, 1, 0,
        '2025-01-01 00:00:00', '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (189, 'Create Evaluation Task Temporary Storage', 'Create Evaluation Task Temporary Storage', '', 'EvalTaskController_appendTemporary_POST', 1, 1, 1, 0,
        '2025-01-01 00:00:00', '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (191, 'Evaluation Set', 'Create Evaluation Set', '', 'EvalSetController_create_POST', 1, 1, 1, 0, '2025-01-01 00:00:00',
        '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (193, 'Knowledge', 'deleteKnowledge', '', 'KnowledgeController_deleteKnowledge_DELETE', 1, 1, 1, 0,
        '2025-01-01 00:00:00', '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (195, '', '', '', 'ToolBoxController_getToolVersion_GET', 1, 1, 1, 0, '2025-01-01 00:00:00',
        '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (197, 'Evaluation Task Append - Only for Completed Tasks', 'Evaluation Task Append - Only for Completed Tasks', '',
        'EvalTaskController_append_POST', 1, 1, 1, 0, '2025-01-01 00:00:00', '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (199, 'Knowledge', 'enableKnowledge', '', 'KnowledgeController_enableKnowledge_PUT', 1, 1, 1, 0,
        '2025-01-01 00:00:00', '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (201, '', '', '', 'DataBaseController_operateTableData_POST', 1, 1, 1, 0, '2025-01-01 00:00:00',
        '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (203, 'Workflow', 'Add Workflow', '', 'WorkflowController_create_POST', 1, 1, 1, 0, '2025-01-01 00:00:00',
        '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (205, '', '', '', 'DataBaseController_getTableTemplateFile_GET', 1, 1, 1, 0, '2025-01-01 00:00:00',
        '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (207, 'Evaluation Scenario', 'Evaluation Scenario List', '', 'EvalDimensionController_getSceneList_GET', 1, 1, 1, 0,
        '2025-01-01 00:00:00', '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (209, 'Evaluation Set', 'Download Evaluation Set', '', 'EvalSetController_download_GET', 1, 1, 1, 0, '2025-01-01 00:00:00',
        '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (211, '', '', '', 'ToolBoxController_debugToolV2_POST', 1, 1, 1, 0, '2025-01-01 00:00:00', '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (213, 'File', 'createHtmlFile', '', 'FileController_createHtmlFile_POST', 1, 1, 1, 0, '2025-01-01 00:00:00',
        '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (215, 'Workflow', 'Edit Workflow', '', 'WorkflowController_update_PUT', 1, 1, 1, 0, '2025-01-01 00:00:00',
        '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (217, 'File', 'fileIndexingStatus', '', 'FileController_getIndexingStatus_POST', 1, 1, 1, 0,
        '2025-01-01 00:00:00', '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (219, 'Model Management', 'Model List', '', 'ModelController_list_POST', 1, 1, 1, 0, '2025-01-01 00:00:00',
        '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (221, 'Evaluation Dimension', 'Evaluation Dimension Total List', '', 'EvalDimensionController_getDimensionList_GET', 1, 1, 1, 0,
        '2025-01-01 00:00:00', '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (223, 'Evaluation Set', 'Evaluation Set Details', '', 'EvalSetController_get_GET', 1, 1, 1, 0, '2025-01-01 00:00:00',
        '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (225, 'Evaluation Scenario', 'Add Evaluation Scenario', '', 'EvalDimensionController_addScene_GET', 1, 1, 1, 0, '2025-01-01 00:00:00',
        '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (227, '', '', '', 'DataBaseController_importDbTableField_POST', 1, 1, 1, 0, '2025-01-01 00:00:00',
        '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (229, '', '', '', 'DataBaseController_updateDatabase_POST', 1, 1, 1, 0, '2025-01-01 00:00:00',
        '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (231, 'Knowledge Base', 'Enable Knowledge Base', '', 'RepoController_enableRepo_PUT', 1, 1, 1, 0, '2025-01-01 00:00:00',
        '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (233, 'Model Management', 'Delete Model', '', 'ModelController_validateModel_GET', 1, 1, 1, 0, '2025-01-01 00:00:00',
        '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (235, '', '', '', 'ToolBoxController_updateTool_PUT', 1, 1, 1, 0, '2025-01-01 00:00:00', '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (237, 'File', 'File Upload', '', 'FileController_uploadFile_POST', 1, 1, 1, 0, '2025-01-01 00:00:00',
        '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (239, '', '', '', 'DataBaseController_getDbTableFieldList_POST', 1, 1, 1, 0, '2025-01-01 00:00:00',
        '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (241, '', '', '', 'ToolBoxController_getToolLatestVersion_GET', 1, 1, 1, 0, '2025-01-01 00:00:00',
        '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (243, '', '', '', 'DataBaseController_selectTableData_POST', 1, 1, 1, 0, '2025-01-01 00:00:00',
        '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (245, 'Evaluation Dimension', 'Import Evaluation Dimension', '', 'EvalDimensionController_importEvalDimensionData_POST', 1, 1, 1, 0,
        '2025-01-01 00:00:00', '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (247, 'Evaluation Task Scenario', 'Evaluation Task List', '', 'EvalTaskController_list_GET', 1, 1, 1, 0, '2025-01-01 00:00:00',
        '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (249, 'Workflow', 'Workflow Details', '', 'WorkflowController_detail_GET', 1, 1, 1, 0, '2025-01-01 00:00:00',
        '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (251, '', '', '', 'DataBaseController_exportTableData_POST', 1, 1, 1, 0, '2025-01-01 00:00:00',
        '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (253, '', '', '', 'ToolBoxController_temporaryTool_POST', 1, 1, 1, 0, '2025-01-01 00:00:00',
        '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (255, 'Evaluation Dimension', 'Evaluation Dimension List', '', 'EvalDimensionController_getDimension_GET', 1, 1, 1, 0,
        '2025-01-01 00:00:00', '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (257, 'Evaluation Task Scenario', 'Evaluation Task Single Details', '', 'EvalTaskController_get_GET', 1, 1, 1, 0, '2025-01-01 00:00:00',
        '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (259, '', '', '', 'ToolBoxController_getDetail_GET', 1, 1, 1, 0, '2025-01-01 00:00:00', '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (261, 'Space User Management', '', '', 'SpaceUserController_getUserLimit_GET', 1, 1, 0, 0, '2025-01-01 00:00:00',
        '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (263, 'Workflow', 'Workflow Build', '', 'WorkflowController_build_POST', 1, 1, 1, 0, '2025-01-01 00:00:00',
        '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (265, 'Space User Management', '', '', 'SpaceUserController_quitSpace_POST', 1, 1, 1, 0, '2025-01-01 00:00:00',
        '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (267, 'Invite Management', '', '', 'InviteRecordController_spaceSearchUser_GET', 1, 1, 1, 0, '2025-01-01 00:00:00',
        '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (269, 'Space User Management', '', '', 'SpaceUserController_remove_DELETE', 1, 1, 0, 0, '2025-01-01 00:00:00',
        '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (271, 'Evaluation Task Scenario', 'Evaluation Task Name Duplicate Check', '', 'EvalTaskController_checkName_GET', 1, 1, 1, 0,
        '2025-01-01 00:00:00', '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (273, 'Publish API Access Package', 'Publish API Access Package', '', 'UserAuthController_getBindableOrderId_GET', 1, 0, 0, 0,
        '2025-01-01 00:00:00', '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (275, 'Publish Management', 'testPoint', '', 'MCPController_getMcpContent_POST', 1, 1, 1, 0, '2025-01-01 00:00:00',
        '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (277, 'Model Management', 'Enable/Disable Model', '', 'ModelController_switchModel_GET', 1, 1, 1, 0, '2025-01-01 00:00:00',
        '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (278, 'Model Management', 'Add/Edit Local Model', '', 'ModelController_localModel_POST', 1, 1, 1, 0, '2025-01-01 00:00:00',
        '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (279, 'Model Management', 'Get Model File Directory List', '', 'ModelController_localModelList_GET', 1, 1, 1, 0,
        '2025-01-01 00:00:00', '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (280, 'Invite Management', '', '', 'InviteRecordController_spaceSearchUsername_GET', 1, 1, 1, 0, '2025-01-01 00:00:00',
        '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (281, 'Agent Details', '', '', 'MyBotController_getBotDetail_POST', 1, 1, 1, 0, '2025-01-01 00:00:00',
        '2025-01-01 00:00:00');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (282, 'Create Bot', '', '', 'BotCreateController_createBot_POST', 1, 1, 1, 0, '2025-08-11 09:19:40',
        '2025-09-20 16:00:44');
INSERT INTO `agent_space_permission` (`id`, `module`, `point`, `description`, `permission_key`, `owner`, `admin`,
                                      `member`, `available_expired`, `create_time`, `update_time`)
VALUES (283, 'Update Bot', '', '', 'BotCreateController_updateBot_POST', 1, 1, 1, 0, '2025-08-11 09:19:40',
        '2025-08-11 09:19:40');

INSERT INTO agent_space_permission (module, point, description, permission_key, owner, admin, member, available_expired, create_time, update_time) VALUES ('one-sentence', 'one-sentence', 'one-sentence', 'SpeakerTrainController_create_POST', 1, 1, 1, 0, NOW(), NOW());
INSERT INTO agent_space_permission (module, point, description, permission_key, owner, admin, member, available_expired, create_time, update_time) VALUES ('one-sentence', 'one-sentence', 'one-sentence', 'SpeakerTrainController_trainStatus_GET', 1, 1, 1, 0, NOW(), NOW());
INSERT INTO agent_space_permission (module, point, description, permission_key, owner, admin, member, available_expired, create_time, update_time) VALUES ('one-sentence', 'one-sentence', 'one-sentence', 'SpeakerTrainController_trainSpeaker_GET', 1, 1, 1, 0, NOW(), NOW());
INSERT INTO agent_space_permission (module, point, description, permission_key, owner, admin, member, available_expired, create_time, update_time) VALUES ('one-sentence', 'one-sentence', 'one-sentence', 'SpeakerTrainController_updateTrainSpeaker_POST', 1, 1, 1, 0, NOW(), NOW());
INSERT INTO agent_space_permission (module, point, description, permission_key, owner, admin, member, available_expired, create_time, update_time) VALUES ('one-sentence', 'one-sentence', 'one-sentence', 'SpeakerTrainController_deleteTrainSpeaker_POST', 1, 1, 1, 0, NOW(), NOW());
