package com.iflytek.astron.console.commons.mapper.model;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.iflytek.astron.console.commons.entity.model.McpData;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

/**
 * @author yun-zhi-ztl
 */
@Mapper
public interface McpDataMapper extends BaseMapper<McpData> {

    /**
     * Get the latest MCP data by agent ID
     *
     * @param botId Agent ID
     * @return MCP data
     */
    McpData selectLatestByBotId(@Param("botId") Integer botId);

    /**
     * Get MCP data list by user ID
     *
     * @param uid User ID
     * @return MCP data list
     */
    List<McpData> selectByUid(@Param("uid") String uid);

    /**
     * Check if agent has published MCP
     *
     * @param botId Agent ID
     * @param versionName Version name
     * @return Record count
     */
    int checkMcpExists(@Param("botId") Integer botId, @Param("versionName") String versionName);
}
