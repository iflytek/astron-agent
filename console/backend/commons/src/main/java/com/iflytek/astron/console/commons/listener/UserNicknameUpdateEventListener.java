package com.iflytek.astron.console.commons.listener;

import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.iflytek.astron.console.commons.entity.space.EnterpriseUser;
import com.iflytek.astron.console.commons.entity.space.SpaceUser;
import com.iflytek.astron.console.commons.event.UserNicknameUpdatedEvent;
import com.iflytek.astron.console.commons.mapper.space.EnterpriseUserMapper;
import com.iflytek.astron.console.commons.mapper.space.SpaceUserMapper;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Component
@Slf4j
public class UserNicknameUpdateEventListener {

    @Autowired
    private EnterpriseUserMapper enterpriseUserMapper;

    @Autowired
    private SpaceUserMapper spaceUserMapper;

    @EventListener
    @Async
    public void handleUserNicknameUpdated(UserNicknameUpdatedEvent event) {
        String uid = event.getUid();
        String newNickname = event.getNewNickname();

        if (StringUtils.isBlank(uid) || StringUtils.isBlank(newNickname)) {
            log.warn("Invalid nickname update event: uid={}, newNickname={}", uid, newNickname);
            return;
        }

        log.info("Processing nickname update event: uid={}, oldNickname={}, newNickname={}",
                uid, event.getOldNickname(), newNickname);

        try {
            // Update nickname in enterprise user table
            updateEnterpriseUserNickname(uid, newNickname);

            // Update nickname in space user table
            updateSpaceUserNickname(uid, newNickname);

            log.info("Successfully updated all related nickname fields for uid: {}", uid);

        } catch (Exception e) {
            log.error("Failed to update related nickname fields for uid: {}", uid, e);
        }
    }

    private void updateEnterpriseUserNickname(String uid, String newNickname) {
        try {
            LambdaUpdateWrapper<EnterpriseUser> wrapper = new LambdaUpdateWrapper<>();
            wrapper.eq(EnterpriseUser::getUid, uid)
                    .set(EnterpriseUser::getNickname, newNickname)
                    .set(EnterpriseUser::getUpdateTime, LocalDateTime.now());

            int count = enterpriseUserMapper.update(null, wrapper);
            log.debug("Updated {} enterprise user records for uid: {}", count, uid);
        } catch (Exception e) {
            log.error("Failed to update enterprise user nickname for uid: {}", uid, e);
            throw e;
        }
    }

    private void updateSpaceUserNickname(String uid, String newNickname) {
        try {
            LambdaUpdateWrapper<SpaceUser> wrapper = new LambdaUpdateWrapper<>();
            wrapper.eq(SpaceUser::getUid, uid)
                    .set(SpaceUser::getNickname, newNickname)
                    .set(SpaceUser::getUpdateTime, LocalDateTime.now());

            int count = spaceUserMapper.update(null, wrapper);
            log.debug("Updated {} space user records for uid: {}", count, uid);
        } catch (Exception e) {
            log.error("Failed to update space user nickname for uid: {}", uid, e);
            throw e;
        }
    }
}
