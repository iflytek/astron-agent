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
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

/**
 * Authorizes access to mutable bot drafts using the authenticated request identity.
 */
@Service
public class BotDraftPreviewAuthorizationService {

    private static final String BOT_EDIT_PERMISSION_KEY = "BotCreateController_updateBot_POST";

    @Autowired
    private ChatBotBaseMapper chatBotBaseMapper;

    @Autowired
    private EnterpriseSpaceService enterpriseSpaceService;

    public void checkBot(Integer botId) {
        String authenticatedUid = RequestContextUtil.getUID();
        Long spaceId = SpaceInfoUtil.getSpaceId();
        if (botId == null
                || chatBotBaseMapper.checkBotPermission(botId, authenticatedUid, spaceId) <= 0) {
            deny();
        }
        if (spaceId == null) {
            return;
        }

        SpaceUser spaceUser = enterpriseSpaceService.checkUserBelongSpace(spaceId, authenticatedUid);
        SpaceRoleEnum role = spaceUser == null ? null : SpaceRoleEnum.getByCode(spaceUser.getRole());
        if (role == null) {
            deny();
        }
        SpacePermission editPermission = enterpriseSpaceService.getSpacePermissionByKey(BOT_EDIT_PERMISSION_KEY);
        if (editPermission == null || !hasEditPermission(role, editPermission)) {
            deny();
        }
        if (!Boolean.TRUE.equals(editPermission.getAvailableExpired())
                && enterpriseSpaceService.checkSpaceExpired(spaceId)) {
            deny();
        }
    }

    private boolean hasEditPermission(SpaceRoleEnum role, SpacePermission permission) {
        return switch (role) {
            case OWNER -> Boolean.TRUE.equals(permission.getOwner());
            case ADMIN -> Boolean.TRUE.equals(permission.getAdmin());
            case MEMBER -> Boolean.TRUE.equals(permission.getMember());
        };
    }

    private void deny() {
        throw new BusinessException(ResponseEnum.INSUFFICIENT_PERMISSIONS);
    }
}
