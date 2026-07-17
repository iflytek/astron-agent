import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal, message, Spin, Dropdown, Tooltip } from 'antd';
import { CloseOutlined, PlusOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useSpaceType } from '@/hooks/use-space-type';
import WorkflowImportModal from './components/WorkflowImportModal';
import {
  submitBotBaseInfo,
  createFromTemplate,
  deleteWorkflowTemplate,
  getStarTemplate,
  getStarTemplateGroup,
} from '@/services/spark-common';
import ai_kefu from '@/assets/imgs/create-bot-v2/ai_kefu.png';
import workflowImportIcon from '@/assets/imgs/workflow/workflow-import-icon.svg';

import styles from './index.module.scss';

interface MakeCreateModalProps {
  visible: boolean;
  onCancel: () => void;
}

const AI_RECORD_BOT_ID = 3063333;

const MakeCreateModal: React.FC<MakeCreateModalProps> = ({
  visible,
  onCancel,
}) => {
  const { t, i18n } = useTranslation();
  const isEnglish = i18n.language === 'en';
  const navigate = useNavigate();
  const { isDefaultPersonalSpace } = useSpaceType(navigate);

  const [starTemplatePageInfo] = useState({
    pageIndex: 1,
    pageSize: 20000,
  });
  const [addAgentTemplateLoading, setAddAgentTemplateLoading] = useState(false);
  const [workflowImportModalVisible, setWorkflowImportModalVisible] =
    useState(false);
  const [starModelList, setStarModelList] = useState<any[]>([]);
  const [modalList, setModalList] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<number | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState(-1);
  const [moreDropdownOpen, setMoreDropdownOpen] = useState(false);

  const starModeShowList = useMemo(() => {
    if (isDefaultPersonalSpace()) {
      return starModelList;
    }

    return starModelList.filter(item => item.bot_id !== AI_RECORD_BOT_ID);
  }, [isDefaultPersonalSpace, starModelList]);

  const getStarTemplateList = async (groupId?: number | null) => {
    const params: { pageIndex: number; pageSize: number; groupId?: number } = {
      ...starTemplatePageInfo,
    };
    if (groupId !== undefined && groupId !== null) {
      params.groupId = groupId;
    }
    const res = await getStarTemplate(params);
    setStarModelList(Array.isArray(res) ? res : []);
  };

  const getTemplateTypeList = async () => {
    const res = await getStarTemplateGroup();
    const nextModalList = Array.isArray(res) ? [...res] : [];
    nextModalList.unshift({
      id: null,
      groupName: t('createAgent1.allTemplates'),
      groupNameEn: t('createAgent1.allTemplates'),
    });
    setModalList(nextModalList);
  };

  const addAgentTemplate = async (useTemplate: boolean, item?: any) => {
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

    try {
      if (useTemplate && item) {
        const templateId = String(item.templateId || item.id);
        req.templateSource = item.templateSource;
        req.templateId = templateId;
        req.name = `${item.title}${Date.now()}`;
        const res = (await createFromTemplate(req)) as {
          flowId?: string | number;
        };
        navigate(`/work_flow/${res.flowId}/arrange`);
        return;
      }

      const res = await submitBotBaseInfo(req);
      navigate(`/work_flow/${res.maasId}/arrange`);
    } catch (e: any) {
      message.error(e?.message || '创建失败');
    } finally {
      setAddAgentTemplateLoading(false);
    }
  };

  const deleteTemplateCard = async (templateId: number | string) => {
    try {
      await deleteWorkflowTemplate(templateId);
      message.success(t('createAgent1.templateDeleteSuccess'));
      await getStarTemplateList(activeTab);
      await getTemplateTypeList();
    } catch (e: any) {
      message.error(e?.message || t('createAgent1.templateDeleteFailed'));
    }
  };

  const handleTabChange = (id: number | null) => {
    if (id === activeTab) return;
    setActiveTab(id);
    getStarTemplateList(id);
  };

  useEffect(() => {
    if (!visible) {
      return;
    }
    getTemplateTypeList();
    getStarTemplateList(activeTab);
  }, [visible]);

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
        width="auto"
        footer={false}
        centered
        onCancel={onCancel}
        afterClose={() => {
          setActiveTab(null);
          setHoveredIndex(-1);
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

            <div className="w-full flex items-center justify-between mb-[14px]">
              <div className={styles.agent_Template_Tab}>
                {modalList.slice(0, isEnglish ? 5 : 8).map(item => (
                  <div
                    key={item.id ?? 'all'}
                    className={`${styles.agent_Template_Tab_item} cursor-pointer ${
                      activeTab == item.id
                        ? styles.agent_Template_Tab_item_active
                        : ''
                    } transition duration-75`}
                    onClick={() => handleTabChange(item.id)}
                  >
                    <Tooltip
                      title={isEnglish ? item.groupNameEn : item.groupName}
                      placement="top"
                    >
                      <div className={styles.agent_Template_Tab_item_content}>
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
                            className={`cursor-pointer font-medium text-[14px] leading-4 transition duration-75 px-4 py-2 ${
                              activeTab == item.id
                                ? 'text-[#6356EA] bg-[#fff]'
                                : ''
                            }`}
                            onClick={() => handleTabChange(item.id)}
                          >
                            <Tooltip
                              title={
                                isEnglish ? item.groupNameEn : item.groupName
                              }
                              placement="top"
                            >
                              {isEnglish ? item.groupNameEn : item.groupName}
                            </Tooltip>
                          </div>
                        ))}
                      </div>
                    )}
                    trigger={['click']}
                    onOpenChange={setMoreDropdownOpen}
                  >
                    <div
                      className={`${styles.agent_Template_Tab_item} cursor-pointer transition duration-75 ${
                        !moreDropdownOpen &&
                        modalList
                          .slice(isEnglish ? 5 : 8)
                          .some(i => i.id === activeTab)
                          ? styles.agent_Template_Tab_item_active
                          : ''
                      }`}
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
                      <div className={styles.iconBox}>
                        <PlusOutlined
                          style={{
                            fontSize: '20px',
                            color: 'white',
                          }}
                        />
                      </div>
                      <div className={styles.iconTitle}>
                        {t('createAgent1.customCreation')}
                      </div>
                    </div>

                    {starModeShowList.map((item, index) => {
                      const cover =
                        item?.cover_url || item?.coverUrl || ai_kefu;
                      const description =
                        item?.subtitle ||
                        item?.coreAbilities?.description ||
                        '';
                      const templateKey = `${item.templateSource || 'EXPORTED'}-${item.templateId || item.id || index}`;

                      return (
                        <div
                          key={templateKey}
                          className={styles.agentType_Type_content}
                          onMouseLeave={() => setHoveredIndex(-1)}
                          onMouseEnter={() => setHoveredIndex(index)}
                        >
                          {item?.deletable && (
                            <button
                              className={styles.templateDeleteBtn}
                              onClick={e => {
                                e.stopPropagation();
                                deleteTemplateCard(
                                  String(item.templateId || item.id)
                                );
                              }}
                              title={t('createAgent1.deleteTemplate')}
                            >
                              <CloseOutlined />
                            </button>
                          )}

                          <div
                            className={`${styles.wrapper_agentType_Type} ${styles.templateCard}`}
                          >
                            <div className={styles.agent_img}>
                              <img src={cover} alt="" />
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
                              {hoveredIndex === index ? (
                                <button
                                  onClick={() => addAgentTemplate(true, item)}
                                  className={styles.my_btn}
                                >
                                  <span>{t('createAgent1.buildSame')}</span>
                                </button>
                              ) : (
                                <div
                                  className={`${styles.ell} ${styles.templateDesc}`}
                                >
                                  {description}
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
