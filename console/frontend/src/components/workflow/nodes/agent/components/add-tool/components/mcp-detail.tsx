/*
 * @Author: snoopyYang
 * @Date: 2025-09-23 10:06:56
 * @LastEditors: snoopyYang
 * @LastEditTime: 2025-09-23 10:07:09
 * @Description: MCPDetail组件(MCP工具详情)
 */
import React, { useMemo, useState, useEffect } from 'react';
import { Input, Button, InputNumber, Select, message } from 'antd';
import { cloneDeep } from 'lodash';
import dayjs from 'dayjs';
import { getServerToolDetailAPI, debugServerToolAPI } from '@/services/plugin';
import MarkdownRender from '@/components/markdown-render';
import JsonMonacoEditor from '@/components/monaco-editor/JsonMonacoEditor';
import { useTranslation } from 'react-i18next';
import { transformSchemaToArray } from '@/components/workflow/utils/reactflowUtils';
import {
  MCPToolDetail,
  ToolArg,
  UseMcpDetailProps,
} from '@/types/plugin-store';
import { McpItem } from '@/components/workflow/types/modal/add-mcp';
import toolArrowLeft from '@/assets/imgs/workflow/tool-arrow-left.png';
import publishIcon from '@/assets/imgs/workflow/publish-icon.png';
import trialRunIcon from '@/assets/imgs/workflow/trial-run-icon.png';
import mcpArrowDown from '@/assets/imgs/mcp/mcp-arrow-down.svg';
import mcpArrowUp from '@/assets/imgs/mcp/mcp-arrow-up.svg';

function MCPDetailWrapper({
  currentTool,
  handleClearMCPToolDetail,
}: {
  currentTool: McpItem;
  handleClearMCPToolDetail: () => void;
}): React.ReactElement {
  const { t } = useTranslation();
  return (
    <div
      className="w-full h-full flex flex-col overflow-hidden bg-[#fff] gap-9"
      style={{
        padding: '65px 0px 43px',
      }}
    >
      <div
        className="flex mx-auto"
        style={{
          width: '90%',
        }}
      >
        <div
          className="inline-flex items-center gap-2 cursor-pointer"
          onClick={() => handleClearMCPToolDetail()}
        >
          <img
            src={toolArrowLeft}
            className="w-[14px] h-[12px] cursor-pointer"
            alt=""
          />
          <span className="font-medium">{t('workflow.nodes.common.back')}</span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div
          className="mx-auto"
          style={{
            width: '90%',
          }}
        >
          <MCPDetail currentTool={currentTool} />
        </div>
      </div>
    </div>
  );
}

const useMCPDetail = ({
  setCurrentMcp,
  tools,
  currentMcp,
  currentToolId,
}): UseMcpDetailProps => {
  const { t } = useTranslation();
  const handleInputParamsChange = (
    toolIndex: number,
    argIndex: number,
    value: unknown
  ): void => {
    setCurrentMcp(mcp => {
      const tool = mcp?.tools?.find((item, index) => index === toolIndex);
      if (tool) {
        const arg = tool.args?.find((item, index) => index === argIndex);
        if (arg) {
          arg.value = value as string | unknown[] | Record<string, unknown>;
        }
      }
      return cloneDeep(mcp);
    });
  };
  const handleDebugServerMCP = (
    e: React.MouseEvent<HTMLButtonElement>,
    toolIndex: number
  ): void => {
    e.stopPropagation();
    const tool = tools?.find((_, index) => index === toolIndex);
    if (!tool) return;

    const toolArgs: Record<string, unknown> = {};
    for (const item of tool.args || []) {
      toolArgs[item.name] =
        item.type === 'array' || item.type === 'object'
          ? JSON.parse(item.value as string)
          : item.value;
    }
    const params = {
      mcpServerId: '',
      mcpServerUrl: currentMcp.serverUrl,
      toolName: tool.name,
      toolId: currentToolId,
      toolArgs,
    };
    setCurrentMcp(mcp => {
      const tool = mcp?.tools?.find((_, index) => index === toolIndex);
      if (tool) {
        tool.loading = true;
      }
      return cloneDeep(mcp);
    });
    debugServerToolAPI(params)
      .then(data => {
        setCurrentMcp(mcp => {
          const tool = mcp?.tools?.find((_, index) => index === toolIndex);
          if (tool && data?.content) {
            tool.textResult = (
              data as { content: { text: string }[] }
            )?.content?.[0]?.text;
          }
          return cloneDeep(mcp);
        });
      })
      .catch(error => {
        message.error(error?.message);
      })
      .finally(() => {
        setCurrentMcp(mcp => {
          const tool = mcp?.tools?.find((item, index) => index === toolIndex);
          if (tool) {
            tool.loading = false;
          }
          return cloneDeep(mcp);
        });
      });
  };
  const renderInput = (
    arg: ToolArg,
    toolIndex: number,
    index: number
  ): React.ReactElement | undefined => {
    if (arg.enum?.length && arg.enum?.length > 0) {
      return (
        <Select
          className="h-10 global-select"
          placeholder={t('workflow.nodes.common.selectPlaceholder')}
          options={arg?.enum?.map((item: string) => ({
            label: item,
            value: item,
          }))}
          style={{ height: 40 }}
          value={arg?.value}
          onChange={value => handleInputParamsChange(toolIndex, index, value)}
        />
      );
    } else if (arg.type === 'string') {
      return (
        <Input.TextArea
          autoSize={{ minRows: 1, maxRows: 6 }}
          className="w-full global-input search-input mcp-input"
          placeholder={t('workflow.nodes.common.inputPlaceholder')}
          style={{
            borderRadius: 8,
            background: '#fff !important',
            resize: 'none',
          }}
          value={arg?.value as string}
          onChange={e =>
            handleInputParamsChange(toolIndex, index, e.target.value)
          }
        />
      );
    } else if (arg.type === 'boolean') {
      return (
        <Select
          style={{ height: 40 }}
          className="global-select"
          placeholder={t('workflow.nodes.common.selectPlaceholder')}
          options={[
            {
              label: 'true',
              value: true,
            },
            {
              label: 'false',
              value: false,
            },
          ]}
          value={arg?.value}
          onChange={value => handleInputParamsChange(toolIndex, index, value)}
        />
      );
    } else if (arg.type === 'integer') {
      return (
        <InputNumber
          step={1}
          precision={0}
          className="w-full global-input search-input"
          placeholder={t('workflow.nodes.common.inputPlaceholder')}
          style={{ borderRadius: 8, height: 40, background: '#fff !important' }}
          value={arg?.value as number}
          onChange={value => handleInputParamsChange(toolIndex, index, value)}
        />
      );
    } else if (arg.type === 'number') {
      return (
        <InputNumber
          className="w-full global-input search-input"
          placeholder={t('workflow.nodes.common.inputPlaceholder')}
          style={{ borderRadius: 8, height: 40, background: '#fff !important' }}
          value={arg?.value as number}
          onChange={value => handleInputParamsChange(toolIndex, index, value)}
        />
      );
    } else if (arg.type === 'array' || arg.type === 'object') {
      return (
        <JsonMonacoEditor
          value={arg?.value as string}
          onChange={value => handleInputParamsChange(toolIndex, index, value)}
        />
      );
    }
    return;
  };
  const handleOpenTool = (toolIndex: number): void => {
    setCurrentMcp(mcp => {
      const tool = mcp?.tools?.find((item, index) => index === toolIndex);
      if (tool) {
        tool.open = !tool?.open;
      }
      return cloneDeep(mcp);
    });
  };
  return {
    handleInputParamsChange,
    renderInput,
    handleOpenTool,
    handleDebugServerMCP,
  };
};

export function MCPDetail({
  currentTool,
}: {
  currentTool: McpItem;
}): React.ReactElement {
  const currentToolId = currentTool?.id;
  const childName = currentTool?.childName;
  const { t } = useTranslation();
  const [currentTab, setCurrentTab] = useState('content');
  const [currentMcp, setCurrentMcp] = useState<MCPToolDetail>(
    {} as MCPToolDetail
  );

  const tools = useMemo(() => {
    return childName
      ? currentMcp?.tools?.filter(item => item.name === childName)
      : currentMcp?.tools || [];
  }, [currentMcp, childName]);

  const { renderInput, handleOpenTool, handleDebugServerMCP } = useMCPDetail({
    setCurrentMcp,
    tools,
    currentMcp,
    currentToolId,
  });

  useEffect(() => {
    if (currentToolId) {
      getServerToolDetailAPI(currentToolId).then((data: MCPToolDetail) => {
        data.tools = data.tools?.map(item => ({
          ...item,
          childName: childName,
          args: item.inputSchema
            ? transformSchemaToArray(item.inputSchema)
            : [],
        }));
        setCurrentMcp(data);
      });
    }
  }, [currentToolId, childName]);

  return (
    <div>
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-3">
          <img
            src={currentMcp?.['logoUrl']}
            className="w-[48px] h-[48px]"
            alt=""
          />
          <div className="flex flex-col gap-2">
            <div>{currentMcp?.name}</div>
            <p className="text-desc">{currentMcp?.brief}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <img src={publishIcon} className="w-3 h-3" alt="" />
          <p className="text-[#757575] text-xs">
            {t('workflow.nodes.toolNode.publishedAt')}{' '}
            {dayjs(currentMcp['createTime'])?.format('YYYY-MM-DD HH:mm:ss')}
          </p>
        </div>
      </div>
      <div className="flex items-start gap-6 mt-9">
        <div className="flex flex-col w-full">
          <div className="bg-[#F6F9FF] rounded-lg p-1 inline-flex items-center gap-4 mb-3 w-fit">
            <div
              className="px-5 py-2 text-[#7F7F7F] rounded-lg cursor-pointer hover:bg-[#fff] hover:text-[#6356EA]"
              style={{
                background: currentTab === 'content' ? '#fff' : '',
                color: currentTab === 'content' ? '#6356EA' : '',
              }}
              onClick={() => setCurrentTab('content')}
            >
              Content
            </div>
            <div
              className="px-5 py-2 text-[#7F7F7F] rounded-lg cursor-pointer hover:bg-[#fff] hover:text-[#6356EA]"
              style={{
                background: currentTab === 'tools' ? '#fff' : '',
                color: currentTab === 'tools' ? '#6356EA' : '',
              }}
              onClick={() => setCurrentTab('tools')}
            >
              Tools
            </div>
          </div>
          {currentTab === 'overview' && (
            <div className="w-full rounded-lg border border-[#E4EAFF] bg-[#fcfdff] px-4 py-3">
              <MarkdownRender
                content={currentMcp?.overview}
                isSending={false}
              />
            </div>
          )}
          {currentTab === 'content' && (
            <div className="rounded-lg border border-[#E4EAFF] bg-[#fcfdff] px-4 py-3">
              <MarkdownRender content={currentMcp?.content} isSending={false} />
            </div>
          )}
          {currentTab === 'tools' && (
            <div>
              <div className="font-semibold">
                {t('workflow.nodes.toolNode.tool')}
              </div>
              <div className="flex flex-col gap-4 mt-4">
                {tools.map((tool, toolIndex) => (
                  <div
                    key={toolIndex}
                    className="w-full border border-[#F2F5FE] rounded-lg p-4 flex flex-col"
                  >
                    <div
                      className="flex items-start justify-between w-full gap-6 cursor-pointer"
                      onClick={() => handleOpenTool(toolIndex)}
                    >
                      <div className="flex flex-col gap-2">
                        <div className="text-sm text-[#6356EA] font-medium">
                          {tool?.name}
                        </div>
                        <p className="text-desc">{tool?.description}</p>
                      </div>
                      <div className="flex items-center flex-shrink-0 gap-10">
                        <img
                          src={tool?.open ? mcpArrowUp : mcpArrowDown}
                          className="w-5 h-5"
                          alt=""
                        />
                        <Button
                          loading={tool?.loading}
                          disabled={tool?.args?.some(
                            arg =>
                              arg.required &&
                              typeof arg?.value === 'string' &&
                              !arg.value?.trim()
                          )}
                          type="primary"
                          className="flex items-center gap-2"
                          onClick={(e: React.MouseEvent<HTMLButtonElement>) =>
                            handleDebugServerMCP(e, toolIndex)
                          }
                        >
                          <img src={trialRunIcon} className="w-3 h-3" alt="" />
                          <span>{t('workflow.nodes.toolNode.test')}</span>
                        </Button>
                      </div>
                    </div>
                    {tool?.open && (
                      <div className="flex gap-2 mt-6 overflow-hidden">
                        <div className="flex flex-col gap-6 bg-[#F2F5FE] rounded-lg p-4 flex-1 min-h-[100px] flex-shrink-0">
                          <div className="text-base text-[#6356EA] font-medium">
                            {t('workflow.nodes.codeIDEA.inputTest')}
                          </div>
                          {tool?.args?.map((arg, index) => (
                            <div key={index} className="flex flex-col gap-1">
                              <div className="flex items-center">
                                {arg.required && (
                                  <span className="text-[#F74E43] text-lg font-medium h-5">
                                    *
                                  </span>
                                )}
                                <span className="ml-0.5">{arg?.name}</span>
                              </div>
                              <p className="text-desc my-1 ml-2.5">
                                {arg?.description}
                              </p>
                              {renderInput(arg, toolIndex, index)}
                            </div>
                          ))}
                        </div>
                        <div className="flex flex-col gap-6 bg-[#F2F5FE] rounded-lg p-4 flex-1 min-h-[100px] flex-shrink-0">
                          <div className="text-base text-[#6356EA] font-medium">
                            {t('workflow.nodes.codeIDEA.outputResult')}
                          </div>
                          {tool.textResult !== undefined && (
                            <pre className="break-all whitespace-pre-wrap">
                              {tool.textResult}
                            </pre>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default MCPDetailWrapper;
