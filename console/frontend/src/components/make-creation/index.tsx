import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal, Form, message, Spin, Dropdown, Tooltip } from 'antd';
import {
  submitBotBaseInfo,
  createFromTemplate,
  getStarTemplate,
  getStarTemplateGroup,
} from '@/services/spark-common';
import { useTranslation } from 'react-i18next';
import { useSpaceType } from '@/hooks/use-space-type';
import WorkflowImportModal from './components/WorkflowImportModal';
import { PlusOutlined } from '@ant-design/icons';
import ai_kefu from '@/assets/imgs/create-bot-v2/ai_kefu.png';
import workflowImportIcon from '@/assets/imgs/workflow/workflow-import-icon.svg';

import styles from './index.module.scss';

interface MakeCreateModalProps {
  visible: boolean;
  onCancel: () => void;
}

const MakeCreateModal: React.FC<MakeCreateModalProps> = ({
  visible,
  onCancel,
}) => {
  const { t, i18n } = useTranslation();
  const isEnglish = i18n.language === 'en';
  const navigate = useNavigate();
  const [starTemplatePageInfo, setStarTemplatePageInfo] = useState<{
    pageIndex: number;
    pageSize: number;
  }>({ pageIndex: 1, pageSize: 20000 });
  const [addAgentTemplateLoading, setAddAgentTemplateLoading] = useState(false);
  const [createButton, setCreateButton] = useState(-1);
  const mouseNowPageRef = useRef<Array<HTMLDivElement | null>>([]);
  const { isDefaultPersonalSpace } = useSpaceType(navigate);

  const addAgentTemplate = async (flag: boolean, item?: any) => {
    setAddAgentTemplateLoading(true);
    const req: any = {
      name: t('createAgent1.commonCustom') + Date.now(),
      botType: 0,
      avatar:
        'https://oss-beijing-m8.openstorage.cn/SparkBotProd/icon/common/emojiitem_00_10@2x.png',
      botDesc: '',
      botId: null,
      inputExample: ['', '', ''],
    };
    if (flag) {
      req['maasId'] = item.maasId;
      req['name'] = item.title + Date.now();
      const coreScenarios = item?.coreScenarios as any;
      const botTemplateFromTemplate =
        coreScenarios?.botTemplate ??
        coreScenarios?.bot_template ??
        coreScenarios?.inputTemplate ??
        coreScenarios?.input_template ??
        coreScenarios?.description;

      if (
        typeof botTemplateFromTemplate === 'string' &&
        botTemplateFromTemplate.trim()
      ) {
        req['botTemplate'] = botTemplateFromTemplate;
      }
      await createFromTemplate(req)
        .then((res: any) => {
          navigate(`/work_flow/${res.flowId}/arrange`);
        })
        .catch(e => {
          message.error(e?.message || '创建失败');
        });
    } else {
      await submitBotBaseInfo(req)
        .then((res: any) => {
          navigate(`/work_flow/${res.maasId}/arrange`);
        })
        .catch(e => {
          message.error(e?.message || '创建失败');
        });
    }
    setAddAgentTemplateLoading(false);
  };

  // ai 记账智能体 bodId,
  const AI_RECORD_BOT_ID = 3063333;
  const [starModelList, setStarModelList] = useState<any[]>([]);
  const firstPageRef = useRef<Array<HTMLDivElement | null>>([]);
  const [workflowImportModalVisible, setWorkflowImportModalVisible] =
    useState(false);

  // 根据id ai记账工具过滤， 只在默认的个人空间下展示
  const starModeShowList = useMemo(() => {
    if (isDefaultPersonalSpace()) {
      return starModelList;
    }

    return starModelList.filter(item => item.bot_id !== AI_RECORD_BOT_ID);
  }, [isDefaultPersonalSpace, starModelList]);

  // 获取星辰模板
  const getStarTemplateList = async (id?: any) => {
    const params: { pageIndex: number; pageSize: number; groupId?: number } = {
      ...starTemplatePageInfo,
    };
    if (id !== undefined && id !== null) {
      params.groupId = id;
    }
    const res = await getStarTemplate(params);
    setStarModelList(res);
  };
  //获取模板分类列表
  const getTemplateTypeList = async () => {
    const res = await getStarTemplateGroup();
    res.unshift({
      id: null,
      groupName: t('createAgent1.allTemplates'),
      groupNameEn: t('createAgent1.allTemplates'),
    }); // 添加“所有模板”选项
    setModalList(res);
  };
  // 根据分类进行查询
  const handleTabChange = (id: number | null) => {
    if (id === activeTab) return; // 如果点击的tab已经是激活状态，则不进行操作
    setActiveTab(id);
    getStarTemplateList(id);
  };

  useEffect(() => {
    getTemplateTypeList(); // 获取工作流模板分类
    getStarTemplateList(); // 星辰模板
  }, []);
  //工作流创建分类
  const [activeTab, setActiveTab] = useState<any>(null);
  const [modalList, setModalList] = useState<any[]>([]);
  const [moreDropdownOpen, setMoreDropdownOpen] = useState(false);

  return (
    <div className={styles.create_modal}>
      {workflowImportModalVisible && (
        <WorkflowImportModal
          setWorkflowImportModalVisible={setWorkflowImportModalVisible}
        />
      )}
      <Modal
        open={visible}
        getContainer={false}
        width={'auto'}
        footer={false}
        centered
        onCancel={onCancel}
        afterClose={() => {
          setActiveTab(0);
        }}
      >
        <Spin style={{ maxHeight: '654px' }} spinning={addAgentTemplateLoading}>
          <div className={styles.create_modal_wrap}>
            <div className={styles.wrapper_title}>
              <div className={styles.title_left}>
                <span style={{ fontWeight: 600 }}>
                  {t('createAgent1.workflowCreationTitle')}
                </span>
              </div>
            </div>
            {/* 工作流模板tabs */}
            <div className="w-full flex items-center justify-between mb-[14px]">
              <div className={styles.agent_Template_Tab}>
                {modalList.slice(0, isEnglish ? 5 : 8).map(item => (
                  <div
                    key={item.id}
                    className={`${styles.agent_Template_Tab_item} cursor-pointer 
                    ${activeTab == item.id ? styles.agent_Template_Tab_item_active : ''} 
                    transition duration-75`}
                    onClick={() => handleTabChange(item.id)}
                  >
                    <Tooltip
                      title={isEnglish ? item.groupNameEn : item.groupName}
                      placement="top"
                    >
                      <div
                        className={`${styles.agent_Template_Tab_item_content}`}
                      >
                        {isEnglish ? item.groupNameEn : item.groupName}
                      </div>
                    </Tooltip>
                  </div>
                ))}
                {modalList.length > (isEnglish ? 5 : 8) && (
                  <Dropdown
                    dropdownRender={() => (
                      <div className="bg-[#F6F9FF] text-[#7F7F7F]">
                        {modalList.slice(isEnglish ? 5 : 8).map(item => (
                          <div
                            key={item.id}
                            className={`cursor-pointer font-medium text-[14px] leading-4 transition duration-75 font-[苹方-简] px-4 py-2 ${activeTab == item.id ? 'text-[#6356EA] bg-[#fff]' : ''}`}
                            onClick={() => {
                              handleTabChange(item.id);
                            }}
                          >
                            <Tooltip title={item.groupName} placement="top">
                              {item.groupName}
                            </Tooltip>
                          </div>
                        ))}
                      </div>
                    )}
                    trigger={['click']}
                    onOpenChange={open => {
                      // 控制高亮状态
                      setMoreDropdownOpen(open);
                    }}
                  >
                    <div
                      className={`
                        ${styles.agent_Template_Tab_item}
                        cursor-pointer
                        transition duration-75
                        ${
                          // 只有在关闭且有选中才高亮，打开时不高亮
                          !moreDropdownOpen &&
                          modalList.slice(8).some(i => i.id === activeTab)
                            ? styles.agent_Template_Tab_item_active
                            : ''
                        }
                      `}
                    >
                      {t('createAgent1.moreCategories')}
                    </div>
                  </Dropdown>
                )}
              </div>
              <div
                className="flex items-center gap-2 w-fit cursor-pointer"
                onClick={() => setWorkflowImportModalVisible(true)}
              >
                <img
                  src={workflowImportIcon}
                  className="w-[14px] h-[14px]"
                  alt=""
                />
                <span className="text-sm text-[#6356EA]">
                  {t('createAgent1.importWorkflow')}
                </span>
              </div>
            </div>
            <div className={styles.scroll_bar}>
              <div className={styles.wrapper_container}>
                <div className={styles.wrapper_container_agentType}>
                  <div className={styles.wrapper_agentType_content}>
                    <div
                      onClick={() => addAgentTemplate(false)}
                      className={`${styles.wrapper_agentType_Type} ${styles.wrapper_agentType_Type_only_hover}`}
                    >
                      <div
                        className={styles.iconBox}
                        style={{
                          width: '48px',
                          height: '48px',
                          backgroundColor: '#6356EA',
                          borderRadius: '50%',
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'center',
                          marginBottom: '21px',
                        }}
                      >
                        <PlusOutlined
                          style={{
                            fontSize: '20px',
                            color: 'white',
                          }}
                        />
                      </div>
                      <div
                        className={styles.iconTitle}
                        style={{
                          fontSize: '16px',
                          fontWeight: 'normal',
                          lineHeight: '24px',
                          color: '#000000',
                        }}
                      >
                        {t('createAgent1.customCreation')}
                      </div>
                    </div>

                    {/* --------------- 模板创建 -------------------- */}
                    {starModeShowList.map((item, index) => {
                      return (
                        <div
                          key={item.maasId}
                          className={styles.agentType_Type_content}
                          ref={ref => (mouseNowPageRef.current[index] = ref)}
                          onMouseLeave={() => {
                            setCreateButton(-1);
                          }}
                          onMouseEnter={() => {
                            setCreateButton(index);
                          }}
                        >
                          <div
                            ref={ref => (firstPageRef.current[index] = ref)}
                            className={styles.wrapper_agentType_Type}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                            }}
                          >
                            <div className={styles.agent_img}>
                              <img
                                src={item?.cover_url ? item.cover_url : ai_kefu}
                                alt=""
                              />
                            </div>
                            <div className={styles.agent_bottom}>
                              <div className={styles.agent_center_title}>
                                <div className={styles.agent_center_title_left}>
                                  <p
                                    title={item.title}
                                    className={styles.title_left_text1}
                                  >
                                    {item.title}
                                  </p>
                                </div>
                              </div>
                              {createButton == index && (
                                <button
                                  onClick={() => addAgentTemplate(true, item)}
                                  className={styles.my_btn}
                                >
                                  <span>{t('createAgent1.buildSame')}</span>
                                </button>
                              )}
                              {createButton !== index && (
                                <div
                                  className={styles.ell}
                                  style={{
                                    fontSize: '14px',
                                    fontWeight: 'normal',
                                    color: '#7f7f7f',
                                    lineHeight: '18px',
                                    paddingTop: '2px',
                                    width: '100%',
                                  }}
                                >
                                  {item?.coreAbilities?.description}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Spin>
      </Modal>
    </div>
  );
};

export default MakeCreateModal;
