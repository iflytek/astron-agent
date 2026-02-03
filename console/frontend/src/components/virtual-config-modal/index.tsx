import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from 'react';
import {
  Modal,
  Form,
  Input,
  Button,
  message,
  Spin,
  Tooltip,
  Switch,
  Select,
  Space,
} from 'antd';
import formSelect from '@/assets/imgs/main/icon_nav_dropdown.svg';
import Ai_img from '@/assets/imgs/virtual-config-modal/ai_create.svg';
import helpIcon from '@/assets/imgs/virtual-config-modal/help-icon.svg';
import defaultAvatar from '@/assets/imgs/virtual-config-modal/default-avatar.png';
import summaryActionIcon from '@/assets/imgs/virtual-config-modal/summary-action-icon.svg';
import voiceIcon from '@/assets/imgs/virtual-config-modal/voice-icon.svg';
import voiceActionIcon from '@/assets/imgs/workflow/edit-voice.svg';
import defaultModalAvatar from '@/assets/imgs/virtual-config-modal/default-modal-avatar.png';
import defaultModalAvatarPreview from '@/assets/imgs/virtual-config-modal/default-modal-avatar-preview.png';
import { getBotType, getSceneList } from '@/services/spark-common';
import { getVcnList } from '@/services/chat';
import styles from './index.module.scss';
import { aiGenPrologue } from '@/services/spark-common';
import { UUID } from 'uuidjs';
// import TtsModule from '@/components/tts_module';
import globalStore from '@/store/global-store';
import EditIconModal from './component/iconModal';
import flowIdCopyIcon from '@/assets/imgs/workflow/flowId-copy-icon.svg';
import copy from 'copy-to-clipboard';
import { useTranslation } from 'react-i18next';
import SpeakerModal, { VcnItem } from '@/components/speaker-modal';
// import { vcnCnJson, vcnEnJson } from '@/components/speaker-modal/vcn';

interface HeaderFeedbackModalProps {
  visible: boolean;
  formValues?: FormValues;
  onCancel: () => void;
  onSubmit: (data: FormValues) => void; //表单提交
}
interface FormValues {
  name: string;
  botType: number;
  avatar: string;
  botDesc: string;
  botId?: string | null;
  inputExample: any;
  flowId?: string;
  talkAgentConfig?: {
    interactType: number;
    vcn: string;
    vcnEnable: number;
    sceneId: string;
    callSceneId: string;
    sceneMode: number;
    sceneEnable: number;
    sceneVcn: string;
    isDelete: 0;
  };
}

/** 音色选项（来自后端） */
interface VoiceOption {
  /** 音色编码，与形象的 defaultVCN 对齐（后端字段 vcn） */
  id: string;
  /** 展示名称（后端字段 vcnName） */
  name: string;
  /** 性别：男/女（后端字段 gender，可选） */
  gender?: string;
  /** 支持语言（后端字段 language，可选） */
  language?: string[];
  /** 试听地址（若后端提供 demo/previewUrl 可映射） */
  previewUrl?: string;
  vcn?: string;
  /** 默认形象（后端字段 defaultVCN） */
  defaultVCN?: string;
  sampleAvatar?: string;
}

/** 形象项（后端归一化后的前端结构） */
interface SceneItem {
  sceneId: string;
  name: string;
  gender?: string;
  posture?: string;
  /** 场景类型：可能是中文字符串、字符串数组或字符串化的数组（例如 "[\"教育学习\"]"） */
  type?: string | string[];
  avatar?: string;
  defaultVCN?: string;
  sampleAvatar: string;
}

const VirtualConfig: React.FC<HeaderFeedbackModalProps> = ({
  visible,
  formValues,
  onSubmit,
  onCancel,
}) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  //类型列表
  const [botTypeList, setBotTypeList] = useState<any>([]);
  // 头像加载完成后再展示，避免加载过程出现破损图
  const [avatarLoaded, setAvatarLoaded] = useState<boolean>(false);

  // 声音和形象相关状态
  const [enableAvatar, setEnableAvatar] = useState<boolean>(true);
  /** 当前选中形象 sceneId（来源后端） */
  const [selectedAvatar, setSelectedAvatar] = useState<string>('');
  /** 形象列表（来源后端） */
  const [avatarList, setAvatarList] = useState<SceneItem[]>([]);

  const [enableVoice, setEnableVoice] = useState<boolean>(true);
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const [callSceneId, setCallSceneId] = useState<string | null>('');
  const [sceneMode, setSceneMode] = useState<number>(0);
  const [sceneVcn, setSceneVcn] = useState<string>('');

  // 折叠状态
  const [voiceExpanded, setVoiceExpanded] = useState<boolean>(false);

  // 形象选择弹窗与尺寸
  const [avatarModalVisible, setAvatarModalVisible] = useState<boolean>(false);
  // 弹窗内的临时选择（未点击“使用”前不提交到正式状态）
  const [tempSelectedAvatar, setTempSelectedAvatar] = useState<string>('');
  const [tempSelectedVoice, setTempSelectedVoice] = useState<string>('');

  const [botCreateActiveV, setBotCreateActiveV] = useState<any>({
    cn: '',
    en: '',
    emotion: '',
  });

  /** 正在播放的音色 ID（保证单声源） */
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  /** 性别筛选：'male' | 'female' | 'all' */
  const [genderFilter, setGenderFilter] = useState<'male' | 'female' | 'all'>(
    'all'
  );
  /** 姿势筛选：'full' | 'half' | 'sit' | 'all' */
  const [postureFilter, setPostureFilter] = useState<
    'full' | 'half' | 'sit' | 'all'
  >('all');
  /** 场景筛选：'ai_host' | 'education' | 'digital_staff' | 'conference_host' | 'cartoon' | 'historical' | 'all' */
  const [typeFilter, setTypeFilter] = useState<
    | 'ai_host'
    | 'education'
    | 'digital_staff'
    | 'conference_host'
    | 'cartoon'
    | 'historical'
    | 'all'
  >('all');
  const [vocName, setVocName] = useState<string>('');
  const [vocLanguage, setVocLanguage] = useState<string>('cn');
  const [vocPreviewText, setVocPreviewText] = useState<string>('');
  const [isAudioPlaying, setIsAudioPlaying] = useState<boolean>(false);
  const genId = () => {
    const uuid = UUID.genV4();
    return uuid.toString().replace(/-/g, '').substring(0, 6);
  };
  const avatarIcon = globalStore((state: any) => state.avatarIcon);
  const avatarColor = globalStore((state: any) => state.avatarColor);
  const getAvatarConfig = globalStore((state: any) => state.getAvatarConfig);
  const createAvatarParams = (): {
    avatarUrl: string;
    avatar: string;
    avatarColor: string;
  } => {
    if (!avatarIcon?.length || !avatarColor?.length) {
      return {
        avatarUrl:
          'https://oss-beijing-m8.openstorage.cn/SparkBotProd/icon/common/emojiitem_00_10@2x.png',
        avatar:
          'https://oss-beijing-m8.openstorage.cn/SparkBotProd/icon/common/emojiitem_00_10@2x.png',
        avatarColor: '#FFEAD5',
      };
    }
    const avatarIconIndex = Math.floor(Math.random() * avatarIcon.length);
    const avatarColorIndex = Math.floor(Math.random() * avatarColor.length);
    const { name, value } = avatarIcon[avatarIconIndex];
    const avatarColorItem = avatarColor[avatarColorIndex];
    return {
      avatarUrl: value,
      avatar: name + value,
      avatarColor: avatarColorItem.name,
    };
  };
  const [avatarUrl, setAvatarUrl] = useState(createAvatarParams().avatarUrl);
  const [showModal, setShowModal] = useState(false);

  const [officialVcnList, setOfficialVcnList] = useState<VcnItem[]>([]);
  const [mySpeaker, setMySpeaker]: any = useState([]); //我的发音人数组

  const defVcnList = [
    {
      avatar:
        'https://openres.xfyun.cn/xfyundoc/2024-10-21/0969f0d7-519b-45c0-b006-2765fa8f79f7/1729496233283/lingxiaoyue.jpg',
      defaultVCN: 'x5_lingxiaoyue_flow',
      gender: t('virtualConfig.defVcnList.gender1'),
      name: t('virtualConfig.defVcnList.name1'),
      posture: t('virtualConfig.defVcnList.posture'),
      sceneId: 'avatar_wmy001',
      type: [t('virtualConfig.defVcnList.scene')],
      sampleAvatar:
        'https://openres.xfyun.cn/xfyundoc/2024-10-21/0969f0d7-519b-45c0-b006-2765fa8f79f7/1729496233283/lingxiaoyue.jpg',
    },
    {
      avatar:
        'https://openres.xfyun.cn/xfyundoc/2025-01-10/072d1c04-b23b-4feb-9728-091207773145/1736479064040/20250110-111727.jpg',
      defaultVCN: 'x5_lingfeiyi_flow',
      gender: t('virtualConfig.defVcnList.gender2'),
      name: t('virtualConfig.defVcnList.name2'),
      posture: t('virtualConfig.defVcnList.posture'),
      sceneId: 'avatar_lfy',
      type: [t('virtualConfig.defVcnList.scene')],
      sampleAvatar:
        'https://openres.xfyun.cn/xfyundoc/2025-01-10/072d1c04-b23b-4feb-9728-091207773145/1736479064040/20250110-111727.jpg',
    },
  ];
  const currentAvatarList = useMemo(
    () => (sceneMode === 0 ? avatarList : defVcnList),
    [sceneMode, avatarList, defVcnList]
  );
  const currentType = useMemo(
    () => (sceneMode === 0 ? selectedAvatar : callSceneId),
    [sceneMode, avatarList, defVcnList]
  );
  useEffect(() => {
    if (formValues) {
      form.setFieldValue('name', formValues.name);
      form.setFieldValue('botType', formValues.botType || null);
      form.setFieldValue('avatar', formValues.avatar);
      form.setFieldValue('botDesc', formValues.botDesc);
      setAvatarUrl(formValues.avatar);
      setAvatarLoaded(false);
      if (formValues.talkAgentConfig) {
        form.setFieldValue(
          'interactType',
          formValues.talkAgentConfig.interactType
        );
        setEnableAvatar(formValues.talkAgentConfig.sceneEnable === 1);
        setSelectedAvatar(formValues.talkAgentConfig.sceneId);
        setCallSceneId(formValues.talkAgentConfig.callSceneId);
        setEnableVoice(formValues.talkAgentConfig.vcnEnable === 1);
        setSceneMode(formValues.talkAgentConfig.sceneMode);
        setSelectedVoice(formValues.talkAgentConfig.vcn);
        setSceneVcn(formValues.talkAgentConfig.sceneVcn);
        setBotCreateActiveV({
          ...botCreateActiveV,
          cn: formValues.talkAgentConfig.vcn,
        });
      }
    }
  }, [formValues]);

  // 头像地址变化时重置加载状态
  useEffect(() => {
    setAvatarLoaded(false);
    if (avatarUrl) {
      form.setFieldValue('avatar', avatarUrl);
    }
  }, [avatarUrl]);
  // 获取类型列表
  /**
   * 形象摘要点击：打开弹窗（用当前已选初始化临时值）
   */
  const toggleAvatarExpanded = useCallback(() => {
    // 打开前确保筛选与临时选择为初始态，避免沿用上次状态
    setGenderFilter('all');
    setPostureFilter('all');
    setTypeFilter('all');
    setTempSelectedAvatar('');
    setTempSelectedVoice('');
    // 用当前已选初始化临时值，供用户快速确认
    setTempSelectedAvatar(currentType || '');
    setTempSelectedVoice(selectedVoice);
    setAvatarModalVisible(true);
  }, [sceneMode, selectedAvatar, callSceneId, selectedVoice]);

  /**
   * 切换语音折叠
   */
  const toggleVoiceExpanded = useCallback(() => {
    setVoiceExpanded(prev => !prev);
    setBotCreateActiveV({ ...botCreateActiveV, cn: selectedVoice });
  }, [sceneMode, selectedVoice]);

  /**
   * 重置“虚拟人形象”弹窗的筛选与临时选择状态
   * - 性别/姿势/场景筛选重置为 'all'
   * - 临时选择清空，避免保留上次状态
   */
  const resetAvatarModalState = useCallback((): void => {
    setGenderFilter('all');
    setPostureFilter('all');
    setTypeFilter('all');
    setTempSelectedAvatar('');
    setTempSelectedVoice('');
    setIsAudioPlaying(false);
    setVocName('');
    setPlayingVoiceId(null);
  }, []);

  /** 音色列表（来源后端） */
  const [voiceOptions, setVoiceOptions] = useState<VoiceOption[]>([]);

  /**
   * 提交表单
   * @param values 表单值
   */
  const handleSubmit = async (values: {
    name?: string;
    botType?: number | string;
    avatar?: string;
    botDesc?: string;
  }) => {
    const name = (values?.name ?? '').trim();
    const botDesc = (values?.botDesc ?? '').trim();

    if (!name) {
      message.error(t('virtualConfig.rulesName'));
      return;
    }

    if (!botDesc) {
      message.error(t('virtualConfig.rulesDesc'));
      return;
    }

    setLoading(true);
    try {
      const botTypeNum =
        typeof values?.botType === 'number'
          ? (values!.botType as number)
          : Number(values?.botType ?? 0);
      const avatarUrl =
        typeof values?.avatar === 'string' && values.avatar
          ? values.avatar
          : 'https://oss-beijing-m8.openstorage.cn/SparkBotProd/icon/common/emojiitem_00_10@2x.png';

      const fields: FormValues = {
        name,
        botType: botTypeNum,
        avatar: avatarUrl,
        botDesc,
        botId: formValues?.botId || null,
        inputExample:
          formValues?.inputExample ||
          (['', '', ''] as [string, string, string]),
        talkAgentConfig: {
          interactType: form.getFieldValue('interactType') || 0,
          vcn: selectedVoice || '',
          vcnEnable: enableVoice ? 1 : 0,
          sceneId: selectedAvatar || '',
          callSceneId: callSceneId || '',
          sceneMode: sceneMode,
          sceneEnable: enableAvatar ? 1 : 0,
          sceneVcn: sceneVcn,
          isDelete: 0,
        },
      };

      onSubmit?.(fields);

      setLoading(false);
    } catch (err) {
      const msg =
        typeof err === 'object' &&
        err &&
        'message' in (err as Record<string, unknown>)
          ? String((err as Record<string, unknown>).message)
          : t('virtualConfig.submitFailed');
      message.error(msg);
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };
  /**
   * AI 生成描述
   */
  const aiGen = () => {
    const cur = form.getFieldValue('botDesc');
    if (!cur) {
      return message.warning(t('virtualConfig.rulesContent'));
    }
    setLoading(true);
    aiGenPrologue({ name: cur })
      .then(res => {
        const text = typeof res === 'string' ? res : JSON.stringify(res);
        console.log(res, 'text', text, form);
        form.setFieldValue('botDesc', text);
      })
      .catch(err => {
        message.error(err?.message || t('virtualConfig.aiGenFailed'));
      })
      .finally(() => {
        setLoading(false);
      });
  };
  //获取类型列表
  const getBotTypeList = async () => {
    let res: any = await getBotType();
    res = res.filter((item: any) => item.key !== 25);
    setBotTypeList(res);
  };
  //获取形象列表
  const getAvatarList = async () => {
    try {
      const res = await getSceneList();
      const list: SceneItem[] = Array.isArray(res) ? (res as SceneItem[]) : [];
      setAvatarList(list);
      if (!selectedAvatar && list.length > 0) {
        setSelectedAvatar(list[0]!.sceneId || '');
        setSceneVcn(list[0]!.defaultVCN || '');
      }
      if (list.length === 0) {
        message.info(t('virtualConfig.noAvatar'));
      }
    } catch (e) {
      // message.error('获取形象列表失败');
      setAvatarList([]);
    }
  };
  /** 头像筛选后的列表（基于选择） */
  const filteredAvatarList = useMemo(() => {
    const genderMap: Record<'male' | 'female', '男' | '女'> = {
      male: '男',
      female: '女',
    };
    const postureMap: Record<
      'full' | 'half' | 'sit',
      '全身' | '大半身' | '坐姿'
    > = {
      full: '全身',
      half: '大半身',
      sit: '坐姿',
    };
    const typeMap: Record<
      'ai_host' | 'education' | 'digital_staff' | 'cartoon' | 'historical',
      string
    > = {
      ai_host: 'AI主播',
      education: '教育学习',
      digital_staff: '数字员工',
      // conference_host: '大会主持',
      cartoon: '卡通形象',
      historical: '历史人物',
    };
    return currentAvatarList.filter(a => {
      const genderOk =
        genderFilter === 'all' ? true : a.gender === genderMap[genderFilter];
      const postureOk =
        postureFilter === 'all'
          ? true
          : a.posture === postureMap[postureFilter];
      const typeOk =
        typeFilter === 'all'
          ? true
          : (() => {
              const expected = typeMap[typeFilter as keyof typeof typeMap];
              const raw = a.type as unknown;
              if (Array.isArray(raw)) {
                return (raw as unknown[]).some(
                  x => typeof x === 'string' && x === expected
                );
              }
              if (typeof raw === 'string') {
                const s = raw.trim();
                if (s.startsWith('[') && s.endsWith(']')) {
                  try {
                    const arr = JSON.parse(s);
                    return (
                      Array.isArray(arr) &&
                      arr.some(
                        (x: unknown) => typeof x === 'string' && x === expected
                      )
                    );
                  } catch {
                    return s === expected;
                  }
                }
                return s === expected;
              }
              return false;
            })();
      return genderOk && postureOk && typeOk;
    });
  }, [avatarList, genderFilter, postureFilter, typeFilter, sceneMode]);

  useEffect(() => {
    getVcnList()
      .then((res: VcnItem[]) => {
        setOfficialVcnList(res);
        setSelectedVoice(res[0]?.voiceType || '');
      })
      .catch(err => {});
    getAvatarList();
    getBotTypeList();
    if (!avatarIcon?.length) {
      getAvatarConfig(); // 获取图标库
    }
  }, []);

  const setBotCreateVcn = (vcn: any) => {
    setBotCreateActiveV(vcn);
    setSelectedVoice(vcn.cn);
  };
  /**
   * 渲染助手发音人
   */
  const renderBotVcn = useCallback(() => {
    let vcnObj =
      [...officialVcnList].find(
        (item: any) => item.voiceType === selectedVoice
      ) || mySpeaker.find((item: any) => item.assetId === selectedVoice);
    return <>{vcnObj ? vcnObj.name : t('virtualConfig.defaultVoice')}</>;
  }, [officialVcnList, selectedVoice, mySpeaker]);
  return (
    <Modal
      wrapClassName={styles.open_source_modal}
      width={680}
      open={visible}
      centered
      onCancel={onCancel}
      destroyOnClose
      maskClosable={false}
      footer={null}
      styles={{ body: { padding: 0, maxHeight: '70vh', overflow: 'auto' } }}
    >
      <Spin spinning={loading} tip={t('virtualConfig.generate') + '...'}>
        <div className={styles.modal_content}>
          <div className={styles.title}>{t('virtualConfig.baseConfig')}</div>
          <div className={styles.scrollable_content}>
            <Form
              form={form}
              preserve={false}
              onFinish={handleSubmit}
              style={{ position: 'relative' }}
            >
              <div className={styles.sectionHeader}>
                <div className={styles.sectionTitle}>
                  {t('virtualConfig.baseInfo')}
                </div>
                {/* <Tooltip title="基本信息">
                <img className={styles.sectionHelp} src={helpIcon} />
              </Tooltip> */}
              </div>

              <div className={styles.nameAndType}>
                <Form.Item
                  label={t('virtualConfig.name')}
                  required
                  colon={false}
                  layout="vertical"
                >
                  <Space>
                    <Form.Item
                      label={null}
                      name="avatar"
                      colon={false}
                      initialValue={avatarUrl}
                      className={styles.form_avatar}
                    >
                      <div className={styles.teamAvatar}>
                        {!avatarLoaded && <div />}
                        <img
                          key={avatarUrl}
                          src={avatarUrl}
                          alt={t('virtualConfig.avatar')}
                          referrerPolicy="no-referrer"
                          // onMouseEnter={() => setReUploadImg(true)}
                          onLoad={() => setAvatarLoaded(true)}
                          onError={e => {
                            e.currentTarget.src = defaultAvatar;
                            setAvatarLoaded(true);
                          }}
                          onClick={() => setShowModal(true)}
                          style={{
                            objectFit: 'cover',
                          }}
                        />
                      </div>
                    </Form.Item>
                    <Form.Item
                      label={null}
                      name="name"
                      colon={false}
                      initialValue={t('virtualConfig.customName') + genId()}
                      className={styles.form_avatar}
                    >
                      <Input
                        className={styles.inputField}
                        maxLength={20}
                        placeholder={t('virtualConfig.placeholderName')}
                        onBlur={e => {
                          const v = (e.target.value ?? '').trim();
                          form.setFieldsValue({ botName: v });
                        }}
                      />
                    </Form.Item>
                  </Space>
                </Form.Item>

                <Form.Item
                  name="botType"
                  colon={false}
                  label={t('virtualConfig.type')}
                  layout="vertical"
                >
                  <Select
                    suffixIcon={<img src={formSelect} className="w-4 h-4 " />}
                    className={styles.inputField}
                    placeholder={t('virtualConfig.placeholderType')}
                    options={botTypeList}
                    fieldNames={{ label: 'typeName', value: 'typeKey' }}
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    filterOption={(input, option) => {
                      const label =
                        typeof option?.name === 'string' ? option.name : '';
                      return label.toLowerCase().includes(input.toLowerCase());
                    }}
                  />
                </Form.Item>
              </div>
              <Form.Item
                name="botDesc"
                label={t('virtualConfig.description')}
                required
                labelCol={{ span: 24 }}
                wrapperCol={{ span: 24 }}
                validateTrigger="onBlur"
                className={styles.form_area}
              >
                <Input.TextArea
                  showCount
                  maxLength={200}
                  className={styles.input_area}
                  autoSize={{ minRows: 7, maxRows: 7 }}
                  placeholder={t('virtualConfig.placeholderDescription')}
                />
              </Form.Item>
              <div className={styles.inputBottom}>
                <div
                  className={styles.aiBottom}
                  onClick={() => {
                    aiGen();
                  }}
                >
                  <img src={Ai_img} alt="" />
                  <span>{t('virtualConfig.aiGenerate')}</span>
                </div>
              </div>

              {/* 声音和形象 */}
              <div className={styles.sectionHeader}>
                <div className={styles.sectionTitle}>
                  {t('virtualConfig.voiceAndAvatar')}
                </div>
                <Tooltip
                  title={t('virtualConfig.avatarTip')}
                  overlayStyle={{ maxWidth: 220, whiteSpace: 'normal' }}
                >
                  <img className={styles.sectionHelp} src={helpIcon} />
                </Tooltip>
              </div>
              <div className={styles.configSection}>
                {/* 虚拟人开关 */}
                <div className={styles.toggleRow}>
                  <span className={styles.toggleLabel}>
                    {t('virtualConfig.virtualHuman')}
                  </span>
                  <Tooltip title={t('virtualConfig.virtualHumanTip')}>
                    <img className={styles.sectionHelp} src={helpIcon} />
                  </Tooltip>
                  <Switch
                    checked={enableAvatar}
                    onChange={checked => {
                      setEnableAvatar(checked);
                      if (checked) {
                        setSceneMode(0);
                        form.setFieldValue('interactType', 2);
                        setEnableAvatar(checked);
                      } else {
                        if (enableVoice) {
                          form.setFieldValue('interactType', 0);
                          setEnableAvatar(checked);
                        } else {
                          form.setFieldValue('interactType', 2);
                          setEnableAvatar(true);
                        }
                      }
                    }}
                  />
                </div>
                <div className={styles.sectionHeaderHelp}>
                  {t('virtualConfig.virtualHumanTip2')}
                </div>
                {/* 播报通话开关 */}

                <div className={styles.toggleSwitch}>
                  <div
                    className={`${styles.toggleSwitchItem} ${sceneMode === 0 ? styles.toggleSwitchItemActive : ''}`}
                    onClick={() => {
                      setSceneMode(0);
                      setSelectedAvatar(
                        selectedAvatar || avatarList[0]!.sceneId
                      );
                      setSceneVcn(avatarList[0]!.defaultVCN || '');
                    }}
                  >
                    {t('virtualConfig.broadcast')}
                  </div>
                  <div
                    className={`${styles.toggleSwitchItem} ${sceneMode === 1 ? styles.toggleSwitchItemActive : ''}`}
                    onClick={() => {
                      setSceneMode(1);
                      setCallSceneId(callSceneId || defVcnList[0]!.sceneId);
                      setSceneVcn(defVcnList[0]!.defaultVCN || '');
                    }}
                  >
                    {t('virtualConfig.call')}
                  </div>
                </div>

                {/* 形象选择 */}
                {enableAvatar && (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12,
                    }}
                  >
                    <span className={styles.toggleLabel}>
                      {t('virtualConfig.virtualHumanAvatar')}
                    </span>
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={toggleAvatarExpanded}
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ')
                          toggleAvatarExpanded();
                      }}
                      className={styles.summaryRow}
                    >
                      <div className={styles.summaryLeft}>
                        <div className={styles.optionInfo}>
                          <img
                            className={styles.summaryAvatar}
                            src={
                              currentAvatarList.find(
                                a => a.sceneId === currentType
                              )?.sampleAvatar || defaultAvatar
                            }
                            alt=""
                          />
                          <div className={styles.summaryName}>
                            <div className={styles.summaryNameText}>
                              {currentAvatarList.find(
                                a => a.sceneId === currentType
                              )?.name ?? t('virtualConfig.defaultAvatar')}
                            </div>
                            {/* <div className={styles.summaryNameSub}>
                              <img src={summaryIcon} alt="" />
                              <span>{selectedVoice}</span>
                            </div> */}
                          </div>
                        </div>
                      </div>
                      <img
                        className={styles.summaryAction}
                        src={summaryActionIcon}
                        alt=""
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 语音互动 */}

              <div className={`${styles.configSection} ${styles.voiceSection}`}>
                <div className={styles.toggleRow}>
                  <span className={styles.toggleLabel}>
                    {t('virtualConfig.roleVoice')}
                  </span>
                  <Tooltip title={t('virtualConfig.roleVoiceTip')}>
                    <img className={styles.sectionHelp} src={helpIcon} />
                  </Tooltip>
                  {/* <Switch
                    checked={enableVoice}
                    onChange={checked => {
                      setEnableVoice(checked);
                      if (checked) {
                        if (!enableAvatar) {
                          form.setFieldValue('interactType', 0);
                        } else {
                          form.setFieldValue('interactType', 2);
                        }
                        setEnableVoice(checked);
                      } else {
                        if (!enableAvatar) {
                          message.warning('请保证虚拟人和角色声音至少选择一种');
                          form.setFieldValue('interactType', 0);
                          setEnableVoice(true);
                        } else {
                          form.setFieldValue('interactType', 2);
                          setEnableVoice(checked);
                        }
                      }
                    }}
                  /> */}
                </div>
                <div className={styles.sectionHeaderHelp}>
                  {t('virtualConfig.roleVoiceTip2')}
                </div>

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                  }}
                >
                  {/* 摘要胶囊：当前音色 */}
                  <span className={styles.toggleLabel}>
                    {t('virtualConfig.currentVoice')}
                  </span>

                  <div
                    role="button"
                    tabIndex={0}
                    onClick={toggleVoiceExpanded}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ' ')
                        toggleVoiceExpanded();
                    }}
                    className={styles.summaryRow}
                  >
                    <div className={styles.summaryLeft}>
                      <div className={styles.voicePill}>
                        <div className={styles.voiceIcon} aria-hidden="true">
                          <img
                            src={voiceIcon}
                            alt=""
                            loading="lazy"
                            onError={e => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = voiceIcon;
                            }}
                          />
                        </div>
                        <span className={styles.summaryName}>
                          {renderBotVcn()}
                        </span>
                      </div>
                    </div>
                    <img
                      className={styles.summaryActionVcn}
                      src={voiceActionIcon}
                      alt=""
                    />
                  </div>
                </div>
              </div>

              {/* 虚拟人形象弹窗 */}
              {avatarModalVisible && (
                <Modal
                  open={avatarModalVisible}
                  onCancel={() => {
                    setIsAudioPlaying(false);
                    setVocName('');
                    setPlayingVoiceId(null);
                    setAvatarModalVisible(false);
                  }}
                  footer={null}
                  width={980}
                  centered
                  maskClosable
                  destroyOnClose
                  afterClose={resetAvatarModalState}
                  title={null}
                  closable
                  classNames={{
                    body: '!p-0',
                  }}
                >
                  <div className={styles.avatarModalWrap}>
                    <div className={styles.avatarModalHeader}>
                      <div className={styles.avatarModalTitle}>
                        {t('virtualConfig.avatarModal.chooseAvatar')}
                      </div>
                    </div>
                    {
                      <div className={styles.avatarModalBody}>
                        <div className={styles.avatarListPane}>
                          {sceneMode === 0 && (
                            <div className={styles.avatarFilterRow}>
                              <span className={styles.filterLabel}>
                                {t('virtualConfig.avatarModal.filterByType')}
                              </span>
                              {/* 性别 */}
                              <Select
                                suffixIcon={
                                  <img src={formSelect} className="w-4 h-4 " />
                                }
                                style={{ width: 160 }}
                                className={styles.filterSelect}
                                value={genderFilter}
                                options={[
                                  {
                                    label: t(
                                      'virtualConfig.avatarModal.filterByGender'
                                    ),
                                    value: 'all',
                                  },
                                  {
                                    label: t(
                                      'virtualConfig.avatarModal.filterByGenderMale'
                                    ),
                                    value: 'male',
                                  },
                                  {
                                    label: t(
                                      'virtualConfig.avatarModal.filterByGenderFemale'
                                    ),
                                    value: 'female',
                                  },
                                ]}
                                onChange={v =>
                                  setGenderFilter(
                                    v as 'male' | 'female' | 'all'
                                  )
                                }
                              />
                              {/* 姿势 */}
                              <Select
                                suffixIcon={
                                  <img src={formSelect} className="w-4 h-4 " />
                                }
                                style={{ width: 160 }}
                                className={styles.filterSelect}
                                value={postureFilter}
                                options={[
                                  {
                                    label: t(
                                      'virtualConfig.avatarModal.filterByPosture'
                                    ),
                                    value: 'all',
                                  },
                                  {
                                    label: t(
                                      'virtualConfig.avatarModal.filterByPostureFull'
                                    ),
                                    value: 'full',
                                  },
                                  {
                                    label: t(
                                      'virtualConfig.avatarModal.filterByPostureHalf'
                                    ),
                                    value: 'half',
                                  },
                                  // { label: '坐姿', value: 'sit' },
                                ]}
                                onChange={v =>
                                  setPostureFilter(
                                    v as 'full' | 'half' | 'sit' | 'all'
                                  )
                                }
                              />
                              {/* 场景 */}
                              <Select
                                suffixIcon={
                                  <img src={formSelect} className="w-4 h-4 " />
                                }
                                style={{ width: 160 }}
                                className={styles.filterSelect}
                                value={typeFilter}
                                options={[
                                  {
                                    label: t(
                                      'virtualConfig.avatarModal.filterByScene'
                                    ),
                                    value: 'all',
                                  },
                                  {
                                    label: t(
                                      'virtualConfig.avatarModal.filterBySceneAIAnchor'
                                    ),
                                    value: 'ai_host',
                                  },
                                  {
                                    label: t(
                                      'virtualConfig.avatarModal.filterBySceneEducationAndLearning'
                                    ),
                                    value: 'education',
                                  },
                                  {
                                    label: t(
                                      'virtualConfig.avatarModal.filterBySceneDigitalEmployee'
                                    ),
                                    value: 'digital_staff',
                                  },
                                  {
                                    label: t(
                                      'virtualConfig.avatarModal.filterBySceneCartoonCharacter'
                                    ),
                                    value: 'cartoon',
                                  },
                                  {
                                    label: t(
                                      'virtualConfig.avatarModal.filterBySceneHistoricalFigures'
                                    ),
                                    value: 'historical',
                                  },
                                ]}
                                onChange={v =>
                                  setTypeFilter(
                                    v as
                                      | 'ai_host'
                                      | 'education'
                                      | 'digital_staff'
                                      | 'conference_host'
                                      | 'cartoon'
                                      | 'historical'
                                      | 'all'
                                  )
                                }
                              />
                            </div>
                          )}

                          <div className={styles.avatarGrid}>
                            {filteredAvatarList.map(a => {
                              const active =
                                a.sceneId ===
                                (tempSelectedAvatar || currentType);
                              return (
                                <div
                                  key={a.sceneId}
                                  className={styles.avatarItem}
                                  role="button"
                                  tabIndex={0}
                                  onClick={() => {
                                    setTempSelectedAvatar(a.sceneId);
                                    if (
                                      a.defaultVCN &&
                                      voiceOptions.some(
                                        v => v.id === a.defaultVCN
                                      )
                                    ) {
                                      setTempSelectedVoice(a.defaultVCN);
                                    }
                                  }}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                      setTempSelectedAvatar(a.sceneId);
                                      if (
                                        a.defaultVCN &&
                                        voiceOptions.some(
                                          v => v.id === a.defaultVCN
                                        )
                                      ) {
                                        setTempSelectedVoice(a.defaultVCN);
                                      }
                                    }
                                  }}
                                >
                                  <div
                                    className={`${styles.avatarItemThumb} ${active ? styles.avatarItemActive : ''} ${sceneMode === 0 ? '' : styles.avatarItemDisabled}`}
                                    aria-hidden="true"
                                  >
                                    <img
                                      src={
                                        a.sampleAvatar ||
                                        a.avatar ||
                                        defaultModalAvatar
                                      }
                                      alt=""
                                    />
                                  </div>
                                  <div className={styles.avatarName}>
                                    {a.name}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        <div className={styles.avatarPreviewPane}>
                          <div className={styles.avatarPreviewCard}>
                            <div className={styles.avatarPreviewHeader}>
                              <div className={styles.previewName}>
                                {
                                  currentAvatarList.find(
                                    a =>
                                      a.sceneId ===
                                      (tempSelectedAvatar || currentType)
                                  )?.name
                                }
                                <span>
                                  ·{' '}
                                  {t(
                                    'virtualConfig.avatarModal.avatarPreviewText'
                                  )}
                                </span>
                              </div>
                              {/* <div
                                className={`${styles.avatarPreviewPlay}`}
                                onClick={() =>
                                  handleTogglePlay(
                                    currentAvatarList.find(
                                      a =>
                                        a.sceneId ===
                                        (tempSelectedAvatar || currentType)
                                    ) as unknown as VoiceOption
                                  )
                                }
                              >
                                <img
                                  src={
                                    isAudioPlaying
                                      ? avatarTrumpetOpen
                                      : avatarTrumpet
                                  }
                                  alt=""
                                />
                                <span>试听</span>
                              </div> */}
                            </div>

                            <img
                              className={`${styles.avatarPreviewImage} ${sceneMode === 0 ? '' : styles.avatarPreviewImageXuniren}`}
                              src={
                                currentAvatarList.find(
                                  a =>
                                    a.sceneId ===
                                    (tempSelectedAvatar || currentType)
                                )?.avatar || defaultModalAvatarPreview
                              }
                              alt=""
                            />
                          </div>
                          <div className={styles.avatarPreviewCaption}>
                            {t('virtualConfig.avatarModal.avatarPreview')}
                          </div>
                        </div>
                      </div>
                    }
                  </div>
                  <div className={styles.avatarModalFooter}>
                    <Button
                      onClick={() => {
                        setIsAudioPlaying(false);
                        setVocName('');
                        setPlayingVoiceId(null);
                        setAvatarModalVisible(false);
                      }}
                    >
                      {t('virtualConfig.avatarModal.cancel')}
                    </Button>
                    <Button
                      type="primary"
                      onClick={() => {
                        // 确认提交临时选择
                        if (tempSelectedAvatar) {
                          if (sceneMode === 0) {
                            setSelectedAvatar(tempSelectedAvatar);
                          } else if (sceneMode === 1) {
                            setCallSceneId(tempSelectedAvatar);
                          }
                        }
                        if (tempSelectedVoice) {
                          setSelectedVoice(tempSelectedVoice);
                        } else {
                          // 若未选临时音色但形象有默认音色且在可选列表中，则应用之
                          const cur = avatarList.find(
                            a => a.sceneId === tempSelectedAvatar
                          );
                          const vcn = cur?.defaultVCN;
                          if (vcn && voiceOptions.some(v => v.id === vcn)) {
                            setSelectedVoice(vcn);
                          }
                        }
                        setAvatarModalVisible(false);
                      }}
                    >
                      {t('virtualConfig.avatarModal.confirm')}
                    </Button>
                  </div>
                </Modal>
              )}

              {/* 默认交互方式 */}
              <Form.Item
                label={
                  <div
                    className={styles.sectionHeader}
                    style={{ marginBottom: 0 }}
                  >
                    <div className={styles.sectionTitle}>
                      {t('virtualConfig.defaultInteraction')}
                    </div>
                    <Tooltip title={t('virtualConfig.defaultInteractionTip')}>
                      <img className={styles.sectionHelp} src={helpIcon} />
                    </Tooltip>
                  </div>
                }
                style={{ display: 'none' }}
                name="interactType"
                initialValue={2}
                layout="vertical"
              >
                <Select
                  suffixIcon={<img src={formSelect} className="w-4 h-4 " />}
                  className={styles.form_select}
                  options={[
                    { label: t('virtualConfig.voiceCall'), value: 0 },
                    { label: t('virtualConfig.textChat'), value: 1 },
                    { label: t('virtualConfig.broadcast'), value: 2 },
                    { label: t('virtualConfig.call'), value: 3 },
                  ]}
                />
              </Form.Item>

              <div className={styles.footerContiner}>
                {formValues?.flowId && (
                  <div className={styles.footerContinerLeft}>
                    <div className="flex items-center gap-3">
                      <p className="text-desc text-[#7F7F7F]">
                        {t('workflow.nodes.flowModal.flowId')}：
                        {formValues?.flowId}
                      </p>
                      <img
                        src={flowIdCopyIcon}
                        className="w-[14px] h-[14px] cursor-pointer"
                        alt=""
                        onClick={() => {
                          copy(formValues?.flowId || '');
                          message.success(
                            t('workflow.nodes.flowModal.copySuccess')
                          );
                        }}
                      />
                    </div>
                  </div>
                )}
                <div className={styles.footerContinerRight}>
                  <div
                    className={styles.cancelBtn}
                    onClick={() => {
                      onCancel();
                    }}
                  >
                    {t('virtualConfig.cancel')}
                  </div>
                  <Button className={styles.submitBtn} htmlType="submit">
                    {t('virtualConfig.submitBtn')}
                  </Button>
                </div>
              </div>
            </Form>
          </div>
        </div>
      </Spin>
      {/* <TtsModule
        text={vocPreviewText}
        voiceName={vocName}
        language={vocLanguage}
        isPlaying={isAudioPlaying}
        setIsPlaying={setIsAudioPlaying}
      /> */}
      {showModal && (
        <EditIconModal
          icons={avatarIcon}
          colors={avatarColor}
          botIcon={avatarUrl}
          setBotIcon={setAvatarUrl}
          botColor={''}
          setBotColor={''}
          setShowModal={setShowModal}
        />
      )}
      <SpeakerModal
        vcnList={officialVcnList}
        showSpeakerModal={voiceExpanded}
        changeSpeakerModal={setVoiceExpanded}
        botCreateCallback={setBotCreateVcn}
        botCreateActiveV={botCreateActiveV}
        setBotCreateActiveV={setBotCreateActiveV}
        onMySpeakerChange={setMySpeaker}
      />
    </Modal>
  );
};

export default VirtualConfig;
