package com.iflytek.astron.console.hub.properties;

import com.iflytek.astron.console.commons.util.I18nUtil;
import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@ConfigurationProperties(prefix = "space.invite-message-template")
@Data
@Component
public class InviteMessageTempProperties {
    private String url;

    /**
     * Get localized space invitation title
     *
     * @return localized space invitation title
     */
    public String getSpaceTitle() {
        return I18nUtil.getMessage("invite.message.space.title");
    }

    /**
     * Get localized space invitation content template
     *
     * @return localized space invitation content template
     */
    public String getSpaceContent() {
        return I18nUtil.getMessage("invite.message.space.content");
    }

    /**
     * Get localized enterprise invitation title
     *
     * @return localized enterprise invitation title
     */
    public String getEnterpriseTitle() {
        return I18nUtil.getMessage("invite.message.enterprise.title");
    }

    /**
     * Get localized enterprise invitation content template
     *
     * @return localized enterprise invitation content template
     */
    public String getEnterpriseContent() {
        return I18nUtil.getMessage("invite.message.enterprise.content");
    }
}
