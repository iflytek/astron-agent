package com.iflytek.astron.console.commons.service.bot;

import com.iflytek.astron.console.commons.constant.ResponseEnum;
import com.iflytek.astron.console.commons.entity.space.SpacePermission;
import com.iflytek.astron.console.commons.entity.space.SpaceUser;
import com.iflytek.astron.console.commons.enums.space.SpaceRoleEnum;
import com.iflytek.astron.console.commons.exception.BusinessException;
import com.iflytek.astron.console.commons.mapper.bot.ChatBotBaseMapper;
import com.iflytek.astron.console.commons.service.space.EnterpriseSpaceService;
import com.iflytek.astron.console.commons.util.RequestContextUtil;
import com.iflytek.astron.console.commons.util.space.SpaceInfoUtil;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BotDraftPreviewAuthorizationServiceTest {

    private static final Integer BOT_ID = 7;
    private static final String AUTHENTICATED_UID = "authenticated-user";
    private static final Long SPACE_ID = 99L;

    @Mock
    private ChatBotBaseMapper chatBotBaseMapper;

    @Mock
    private EnterpriseSpaceService enterpriseSpaceService;

    @InjectMocks
    private BotDraftPreviewAuthorizationService authorizationService;

    @Test
    void rejectsForgedWorkspaceHeaderWhenAuthenticatedUserIsNotAMember() {
        when(chatBotBaseMapper.checkBotPermission(BOT_ID, AUTHENTICATED_UID, SPACE_ID))
                .thenReturn(1);
        when(enterpriseSpaceService.checkUserBelongSpace(SPACE_ID, AUTHENTICATED_UID))
                .thenReturn(null);

        try (MockedStatic<RequestContextUtil> requestContext = mockStatic(RequestContextUtil.class);
                MockedStatic<SpaceInfoUtil> spaceInfo = mockStatic(SpaceInfoUtil.class)) {
            requestContext.when(RequestContextUtil::getUID).thenReturn(AUTHENTICATED_UID);
            spaceInfo.when(SpaceInfoUtil::getSpaceId).thenReturn(SPACE_ID);

            BusinessException exception = assertThrows(
                    BusinessException.class,
                    () -> authorizationService.checkBot(BOT_ID));

            assertEquals(ResponseEnum.INSUFFICIENT_PERMISSIONS, exception.getResponseEnum());
            verify(enterpriseSpaceService, never()).getSpacePermissionByKey("BotCreateController_updateBot_POST");
        }
    }

    @Test
    void rejectsWorkspaceMemberWithoutBotEditPermission() {
        SpaceUser member = spaceUser(SpaceRoleEnum.MEMBER);
        SpacePermission permission = editPermission(false);
        when(chatBotBaseMapper.checkBotPermission(BOT_ID, AUTHENTICATED_UID, SPACE_ID))
                .thenReturn(1);
        when(enterpriseSpaceService.checkUserBelongSpace(SPACE_ID, AUTHENTICATED_UID))
                .thenReturn(member);
        when(enterpriseSpaceService.getSpacePermissionByKey("BotCreateController_updateBot_POST"))
                .thenReturn(permission);

        try (MockedStatic<RequestContextUtil> requestContext = mockStatic(RequestContextUtil.class);
                MockedStatic<SpaceInfoUtil> spaceInfo = mockStatic(SpaceInfoUtil.class)) {
            requestContext.when(RequestContextUtil::getUID).thenReturn(AUTHENTICATED_UID);
            spaceInfo.when(SpaceInfoUtil::getSpaceId).thenReturn(SPACE_ID);

            BusinessException exception = assertThrows(
                    BusinessException.class,
                    () -> authorizationService.checkBot(BOT_ID));

            assertEquals(ResponseEnum.INSUFFICIENT_PERMISSIONS, exception.getResponseEnum());
        }
    }

    @Test
    void allowsAuthenticatedWorkspaceEditor() {
        SpaceUser member = spaceUser(SpaceRoleEnum.MEMBER);
        SpacePermission permission = editPermission(true);
        permission.setAvailableExpired(true);
        when(chatBotBaseMapper.checkBotPermission(BOT_ID, AUTHENTICATED_UID, SPACE_ID))
                .thenReturn(1);
        when(enterpriseSpaceService.checkUserBelongSpace(SPACE_ID, AUTHENTICATED_UID))
                .thenReturn(member);
        when(enterpriseSpaceService.getSpacePermissionByKey("BotCreateController_updateBot_POST"))
                .thenReturn(permission);

        try (MockedStatic<RequestContextUtil> requestContext = mockStatic(RequestContextUtil.class);
                MockedStatic<SpaceInfoUtil> spaceInfo = mockStatic(SpaceInfoUtil.class)) {
            requestContext.when(RequestContextUtil::getUID).thenReturn(AUTHENTICATED_UID);
            spaceInfo.when(SpaceInfoUtil::getSpaceId).thenReturn(SPACE_ID);

            assertDoesNotThrow(() -> authorizationService.checkBot(BOT_ID));
        }
    }

    @Test
    void allowsOnlyTheAuthenticatedOwnerForPersonalBots() {
        when(chatBotBaseMapper.checkBotPermission(BOT_ID, AUTHENTICATED_UID, null))
                .thenReturn(1);

        try (MockedStatic<RequestContextUtil> requestContext = mockStatic(RequestContextUtil.class);
                MockedStatic<SpaceInfoUtil> spaceInfo = mockStatic(SpaceInfoUtil.class)) {
            requestContext.when(RequestContextUtil::getUID).thenReturn(AUTHENTICATED_UID);
            spaceInfo.when(SpaceInfoUtil::getSpaceId).thenReturn(null);

            assertDoesNotThrow(() -> authorizationService.checkBot(BOT_ID));
            verifyNoInteractions(enterpriseSpaceService);
        }
    }

    @Test
    void rejectsAuthenticatedNonOwnerForPersonalBots() {
        when(chatBotBaseMapper.checkBotPermission(BOT_ID, AUTHENTICATED_UID, null))
                .thenReturn(0);

        try (MockedStatic<RequestContextUtil> requestContext = mockStatic(RequestContextUtil.class);
                MockedStatic<SpaceInfoUtil> spaceInfo = mockStatic(SpaceInfoUtil.class)) {
            requestContext.when(RequestContextUtil::getUID).thenReturn(AUTHENTICATED_UID);
            spaceInfo.when(SpaceInfoUtil::getSpaceId).thenReturn(null);

            BusinessException exception = assertThrows(
                    BusinessException.class,
                    () -> authorizationService.checkBot(BOT_ID));

            assertEquals(ResponseEnum.INSUFFICIENT_PERMISSIONS, exception.getResponseEnum());
            verifyNoInteractions(enterpriseSpaceService);
        }
    }

    private SpaceUser spaceUser(SpaceRoleEnum role) {
        SpaceUser spaceUser = new SpaceUser();
        spaceUser.setSpaceId(SPACE_ID);
        spaceUser.setUid(AUTHENTICATED_UID);
        spaceUser.setRole(role.getCode());
        return spaceUser;
    }

    private SpacePermission editPermission(boolean memberCanEdit) {
        return SpacePermission.builder()
                .permissionKey("BotCreateController_updateBot_POST")
                .owner(true)
                .admin(true)
                .member(memberCanEdit)
                .availableExpired(false)
                .build();
    }
}
