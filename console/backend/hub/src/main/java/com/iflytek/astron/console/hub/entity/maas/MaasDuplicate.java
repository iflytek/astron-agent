package com.iflytek.astron.console.hub.entity.maas;

import com.iflytek.astron.console.commons.dto.bot.BotCreateForm;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
public class MaasDuplicate extends BotCreateForm {

    private Long maasId;
    private Long templateId;
    private String templateSource;

}
