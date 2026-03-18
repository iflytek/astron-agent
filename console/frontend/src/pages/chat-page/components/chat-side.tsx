import React, { useMemo } from 'react';
import { Tooltip } from 'antd';
import { useTranslation } from 'react-i18next';
import { BotInfoType } from '@/types/chat';
import codeIcon from '@/assets/imgs/chat/plugin/code.svg';
import netIcon from '@/assets/imgs/chat/plugin/network.svg';
import genPicIcon from '@/assets/imgs/chat/plugin/gen-pic.svg';
import sparkIcon from '@/assets/imgs/chat/plugin/spark-logo.png';

// 模型配置类型
type ModelConfig =
  | 'x1'
  | 'bm4'
  | 'bm3'
  | 'bm3.5'
  | 'pro-128k'
  | 'image_understanding'
  | 'image_understandingv3'
  | 'xaipersonality'
  | 'xdeepseekr1'
  | 'xdeepseekv3'
  | 'xdeepseekv32'
  | 'deepseek-ollama'
  | 'xgemma29bit'
  | 'xop3qwen235b'
  | 'xop3qwen30b'
  | 'plugin'
  | 'knowledge-base'
  | 'flow';

// 工具类型
type ToolType = 'ifly_search' | 'text_to_image' | 'codeinterpreter';

// 模型信息接口
interface ModelInfo {
  name: string;
  icon?: string;
  tooltip: string;
}

// 组件Props接口
interface ChatSideProps {
  botInfo?: BotInfoType;
}

const ChatSide: React.FC<ChatSideProps> = ({ botInfo }) => {
  const { t } = useTranslation();

  // 获取模型版本信息，使用useMemo优化性能
  const modelInfo = useMemo((): ModelInfo => {
    const config = botInfo?.config || [];
    const sparkModels: ModelConfig[] = [
      'x1',
      'bm4',
      'bm3',
      'bm3.5',
      'pro-128k',
      'image_understanding',
      'image_understandingv3',
      'xaipersonality',
    ];
    const deepseekR1Models: ModelConfig[] = ['xdeepseekr1'];
    const deepseekV3Models: ModelConfig[] = ['xdeepseekv3', 'xdeepseekv32'];
    const gemmaModels: ModelConfig[] = ['xgemma29bit'];
    const qwenModels: ModelConfig[] = ['xop3qwen235b', 'xop3qwen30b'];

    if (config.some(item => sparkModels.includes(item as ModelConfig))) {
      return {
        name: `${t('chatPage.chatSide.sparkModel')} · ${t('chatPage.chatSide.toolCalling')}`,
        tooltip: t('chatPage.chatSide.sparkModel'),
      };
    }
    if (config.some(item => deepseekR1Models.includes(item as ModelConfig))) {
      return {
        name: `${t('chatPage.chatSide.deepseekR1Model')} · ${t('chatPage.chatSide.toolCalling')}`,
        tooltip: t('chatPage.chatSide.deepseekR1Model'),
      };
    }
    if (config.some(item => deepseekV3Models.includes(item as ModelConfig))) {
      return {
        name: `${t('chatPage.chatSide.deepseekV3Model')} · ${t('chatPage.chatSide.toolCalling')}`,
        tooltip: t('chatPage.chatSide.deepseekV3Model'),
      };
    }
    if (config.some(item => gemmaModels.includes(item as ModelConfig))) {
      return {
        name: `${t('chatPage.chatSide.gemmaModel')} · ${t('chatPage.chatSide.toolCalling')}`,
        tooltip: t('chatPage.chatSide.gemmaModel'),
      };
    }
    if (config.some(item => qwenModels.includes(item as ModelConfig))) {
      return {
        name: `${t('chatPage.chatSide.qwenModel')} · ${t('chatPage.chatSide.toolCalling')}`,
        tooltip: t('chatPage.chatSide.qwenModel'),
      };
    }

    return {
      name: `${t('chatPage.chatSide.sparkModel')} · ${t('chatPage.chatSide.toolCalling')}`,
      tooltip: t('chatPage.chatSide.sparkModel'),
    };
  }, [botInfo?.config, t]);

  // 获取唯一的工具配置
  const uniqueTools = useMemo((): ModelConfig[] => {
    return Array.from(new Set(botInfo?.config || [])) as ModelConfig[];
  }, [botInfo?.config]);

  // 获取工具列表
  const toolList = useMemo((): ToolType[] => {
    return (
      (botInfo?.openedTool?.split(',').filter(Boolean) as ToolType[]) || []
    );
  }, [botInfo?.openedTool]);

  return (
    <div className="fixed top-[104px] right-6 w-[340px] h-[calc(100vh-128px)] bg-white rounded-2xl py-10 px-6 overflow-y-auto scrollbar-hide">
      {/* 创建者信息 */}
      <div className="flex items-center h-5 mb-3">
        <img
          src={require('@/assets/imgs/home/author.svg')}
          alt="author"
          className="w-3.5 h-3.5 mr-2"
        />
        <span className="text-sm text-gray-800 font-medium">
          {botInfo?.creatorNickname}
        </span>
      </div>

      {/* 智能体描述 */}
      <div className="text-sm text-gray-500 mb-4">{botInfo?.botDesc}</div>

      {/* 分割线 */}
      <div className="w-full h-px bg-[#e2e8ff] my-4" />

      {/* 配置标题 */}
      <div className="flex items-center h-5 mb-3">
        <img
          src={require('@/assets/imgs/home/setting.svg')}
          alt="setting"
          className="w-3.5 h-3.5 mr-2"
        />
        <span className="text-sm text-gray-800 font-medium">
          {t('chatPage.chatSide.configuration')}
        </span>
      </div>

      {/* 模型和工具配置 */}

      <div className="flex items-center mt-4 mb-4">
        {/* 模型图标和名称 */}
        {botInfo?.config?.length ? (
          <>
            {/* 根据配置显示对应的模型图标 */}
            {uniqueTools.some(item =>
              [
                'xdeepseekr1',
                'xdeepseekv3',
                'xdeepseekv32',
                'deepseek-ollama',
              ].includes(item)
            ) && (
              <Tooltip
                title={modelInfo.tooltip}
                placement="top"
                overlayClassName="black-tooltip"
              >
                <img
                  src="https://oss-beijing-m8.openstorage.cn/atp/image/model/icon/deepseek.png"
                  alt="deepseek"
                  className="w-5 h-5 mr-1.5"
                />
              </Tooltip>
            )}

            {uniqueTools.includes('xgemma29bit') && (
              <Tooltip
                title={t('chatPage.chatSide.gemmaModel')}
                placement="top"
              >
                <img
                  src="https://oss-beijing-m8.openstorage.cn/pro-bucket/aicloud/llm/resource/image/model/icon_llm_96.png"
                  alt="gemma"
                  className="w-5 h-5 mr-1.5"
                />
              </Tooltip>
            )}

            {uniqueTools.some(item =>
              ['xop3qwen235b', 'xop3qwen30b'].includes(item)
            ) && (
              <Tooltip
                title={t('chatPage.chatSide.qwenModel')}
                placement="top"
                overlayClassName="black-tooltip"
              >
                <img
                  src="https://oss-beijing-m8.openstorage.cn/atp/image/model/icon/icon_Qwen_96.png"
                  alt="qwen"
                  className="w-5 h-5 mr-1.5"
                />
              </Tooltip>
            )}

            {modelInfo.name.includes('星火大模型') && (
              <Tooltip
                title={modelInfo.tooltip}
                placement="top"
                overlayClassName="black-tooltip"
              >
                <img
                  src="https://oss-beijing-m8.openstorage.cn/pro-bucket/aicloud/llm/resource/image/model/icon_iflyspark_96.png"
                  alt="spark"
                  className="w-5 h-5 mr-1.5"
                />
              </Tooltip>
            )}

            <Tooltip
              title={modelInfo.name}
              placement="top"
              overlayClassName="black-tooltip"
            >
              <span
                className="text-sm text-gray-800 font-normal whitespace-nowrap overflow-hidden text-ellipsis"
                title={modelInfo.name}
              >
                {modelInfo.name}
              </span>
            </Tooltip>
          </>
        ) : (
          /* 兼容旧版模型配置 */
          <>
            {botInfo?.model === 'xdeepseekr1' && (
              <>
                <Tooltip
                  title={t('chatPage.chatSide.deepseekR1Model')}
                  placement="top"
                  overlayClassName="black-tooltip"
                >
                  <img
                    src={require('@/assets/imgs/sparkImg/icon_deepseek.png')}
                    alt="deepseek"
                    className="w-5 h-5 mr-1.5"
                  />
                </Tooltip>
                <Tooltip
                  title={`${t('chatPage.chatSide.deepseekR1Model')} · ${t('chatPage.chatSide.toolCalling')}`}
                  placement="top"
                  overlayClassName="black-tooltip"
                >
                  <span className="text-sm text-gray-800 font-normal whitespace-nowrap overflow-hidden text-ellipsis">
                    {`${t('chatPage.chatSide.deepseekR1Model')} · ${t('chatPage.chatSide.toolCalling')}`}
                  </span>
                </Tooltip>
              </>
            )}

            {botInfo?.model === 'xdeepseekv3' && (
              <>
                <Tooltip
                  title={t('chatPage.chatSide.deepseekV3Model')}
                  placement="top"
                  overlayClassName="black-tooltip"
                >
                  <img
                    src={require('@/assets/imgs/sparkImg/icon_deepseek.png')}
                    alt="deepseek"
                    className="w-5 h-5 mr-1.5"
                  />
                </Tooltip>
                <Tooltip
                  title={`${t('chatPage.chatSide.deepseekV3Model')} · ${t('chatPage.chatSide.toolCalling')}`}
                  placement="top"
                  overlayClassName="black-tooltip"
                >
                  <span className="text-sm text-gray-800 font-normal whitespace-nowrap overflow-hidden text-ellipsis">
                    {`${t('chatPage.chatSide.deepseekV3Model')} · ${t('chatPage.chatSide.toolCalling')}`}
                  </span>
                </Tooltip>
              </>
            )}

            {!botInfo?.model && (
              <>
                <Tooltip
                  title={t('chatPage.chatSide.sparkModel')}
                  placement="top"
                  overlayClassName="black-tooltip"
                >
                  <img src={sparkIcon} alt="spark" className="w-5 h-5 mr-1.5" />
                </Tooltip>
                <Tooltip
                  title={`${t('chatPage.chatSide.sparkModel')} · ${t('chatPage.chatSide.toolCalling')}`}
                  placement="top"
                  overlayClassName="black-tooltip"
                >
                  <span className="text-sm text-gray-800 font-normal whitespace-nowrap overflow-hidden text-ellipsis">
                    {`${t('chatPage.chatSide.sparkModel')} · ${t('chatPage.chatSide.toolCalling')}`}
                  </span>
                </Tooltip>
              </>
            )}

            {botInfo?.model &&
              !['xdeepseekr1', 'xdeepseekv3'].includes(botInfo.model) && (
                <>
                  <Tooltip
                    title={botInfo.model}
                    placement="top"
                    overlayClassName="black-tooltip"
                  >
                    <span className="text-sm text-gray-800 font-normal whitespace-nowrap overflow-hidden text-ellipsis">
                      {botInfo.model}
                    </span>
                  </Tooltip>
                </>
              )}
          </>
        )}

        {/* 工具配置区域 */}
        <div className="flex ml-[25px] relative before:content-[''] before:block before:w-px before:h-full before:bg-[#e2e8ff] before:mr-4 before:absolute before:left-[-12px] before:top-0">
          {/* 新版工具配置显示 */}
          {botInfo?.config?.length ? (
            <>
              {uniqueTools.includes('plugin') && (
                <Tooltip
                  title={t('chatPage.chatSide.tool')}
                  placement="top"
                  overlayClassName="black-tooltip"
                >
                  <img
                    src="https://oss-beijing-m8.openstorage.cn/pro-bucket/sparkBot/common/workflow/icon/tool-icon.png"
                    alt="工具"
                    className="w-5 h-5 mr-2"
                  />
                </Tooltip>
              )}

              {uniqueTools.includes('knowledge-base') && (
                <Tooltip
                  title={t('chatPage.chatSide.knowledgeBase')}
                  placement="top"
                  overlayClassName="black-tooltip"
                >
                  <img
                    src="https://oss-beijing-m8.openstorage.cn/pro-bucket/sparkBot/common/workflow/icon/knowledgeIcon.png"
                    alt="知识库"
                    className="w-5 h-5 mr-2"
                  />
                </Tooltip>
              )}

              {uniqueTools.includes('flow') && (
                <Tooltip
                  title={t('chatPage.chatSide.workflow')}
                  placement="top"
                  overlayClassName="black-tooltip"
                >
                  <img
                    src="https://oss-beijing-m8.openstorage.cn/pro-bucket/sparkBot/common/workflow/icon/flow-icon.png"
                    alt="工作流"
                    className="w-5 h-5 mr-2"
                  />
                </Tooltip>
              )}
            </>
          ) : (
            /* 兼容旧版工具配置 */
            toolList.map((tool: ToolType, index: number) => (
              <div key={`${tool}-${index}`}>
                {tool === 'ifly_search' && (
                  <Tooltip
                    title={t('chatPage.chatSide.webSearch')}
                    placement="top"
                    overlayClassName="black-tooltip"
                  >
                    <img
                      src={netIcon}
                      alt="网络搜索"
                      className="w-5 h-5 mr-2"
                    />
                  </Tooltip>
                )}

                {tool === 'text_to_image' && (
                  <Tooltip
                    title={t('chatPage.chatSide.aiImage')}
                    placement="top"
                    overlayClassName="black-tooltip"
                  >
                    <img
                      src={genPicIcon}
                      alt="AI生图"
                      className="w-5 h-5 mr-2"
                    />
                  </Tooltip>
                )}

                {tool === 'codeinterpreter' && (
                  <Tooltip
                    title={t('chatPage.chatSide.codeGeneration')}
                    placement="top"
                    overlayClassName="black-tooltip"
                  >
                    <img
                      src={codeIcon}
                      alt="代码生成"
                      className="w-5 h-5 mr-2"
                    />
                  </Tooltip>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatSide;
