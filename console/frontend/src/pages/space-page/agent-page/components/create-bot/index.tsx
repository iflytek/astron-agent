import React, {
  useState,
  useEffect,
  useRef,
  useContext,
  useCallback,
} from 'react';
import {
  Checkbox,
  Input,
  Button,
  Form,
  Select,
  message,
  InputNumber,
  DatePicker,
  Spin,
} from 'antd';
import Lottie from 'lottie-react';
import dayjs from 'dayjs';
import { debounce } from 'lodash';
import { useNavigate } from 'react-router-dom';
import {
  getAutoAuthStatus,
  applySpark,
  createBotAPI,
  autoAuth,
  getAvailableAppIdList,
  modelAuthStatus,
} from '@/services/agent';
import { appType, robotType } from '@/types/types-services';
import MoreIcons from '@/components/modal/more-icons/index';
import globalStore from '@/store/global-store';
import { useTranslation } from 'react-i18next';

import formSelect from '@/assets/imgs/main/icon_nav_dropdown.svg';

const { TextArea } = Input;

const commonUser = window.location.href.includes('experience');

interface CreateBotProps {
  setCreateModal: (visible: boolean) => void;
}

function index({ setCreateModal }: CreateBotProps): React.ReactElement {
  const { t } = useTranslation();
  const avatarIcon = globalStore(state => state.avatarIcon);
  const avatarColor = globalStore(state => state.avatarColor);
  const getAvatarConfig = globalStore(state => state.getAvatarConfig);
  const navigate = useNavigate();
  const appRef = useRef<HTMLDivElement | null>(null);
  const loadingRef = useRef<boolean>(false);
  const [form] = Form.useForm();
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [disabledSave, setDisabledSave] = useState(false);
  const [userAppId, setUserAppId] = useState<appType[]>([]);
  const [isApplyed, setIsApplyed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [botIcon, setBotIcon] = useState<any>({});
  const [botColor, setBotColor] = useState('');
  const [showModal, setShowModal] = useState(false);
  interface ModelVersion {
    domain: string;
    status: number;
    name: string;
    serviceId: string;
    modelType: number;
    info: string;
    label?: string;
    value?: string;
  }
  const [versionList, setVersionList] = useState<ModelVersion[]>([]);
  const [serviceId, setServiceId] = useState('');
  const [modelType, setModelType] = useState(1);
  const [loadingUser, setLoadingUser] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [content, setContent] = useState('');
  const [current, setCurrent] = useState(1);
  const [appId, setAppId] = useState('');
  const [autoAuthStatus, setAutoAuthStatus] = useState(3);

  function changeAppId(value: string) {
    getVersionList(value);
  }

  useEffect(() => {
    getUserAppId();
    getAvatarConfig();
  }, []);

  function getUserAppId(value?: string): void {
    setLoadingUser(true);
    setUserAppId(() => []);
    loadingRef.current = true;

    const params = {
      current: 1,
      pageSize: 10,
      content: value !== undefined ? value?.trim() : content,
    };
    getAvailableAppIdList(params)
      .then((data: any) => {
        if (10 < data?.pagination?.totalCount) {
          setHasMore(true);
        } else {
          setHasMore(false);
        }
        setCurrent(2);
        const list: appType[] = Array.isArray(data?.list) ? data.list : [];
        setUserAppId(list);
        if (value === undefined) {
          const firstAppId = list[0]?.appId;
          if (firstAppId) {
            getVersionList(firstAppId);
          }
        }
      })
      .finally(() => {
        setLoadingUser(false);
        loadingRef.current = false;
      });
  }

  const getUserAppIdDebounce = useCallback(
    debounce((value: string) => {
      setContent(value);
      getUserAppId(value);
    }, 500),
    [content]
  );

  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const target = event.currentTarget;
    if (
      target.scrollTop + target.offsetHeight >= target.scrollHeight - 10 &&
      !loadingRef.current &&
      hasMore
    ) {
      moreUserAppId();
    }
  };

  function moreUserAppId() {
    loadingRef.current = true;
    setLoadingUser(true);

    const params = {
      current,
      pageSize: 10,
      content: content?.trim(),
    };

    getAvailableAppIdList(params)
      .then((data: any) => {
        if (userAppId.length + 10 < data?.pagination?.totalCount) {
          setHasMore(true);
        } else {
          setHasMore(false);
        }
        setCurrent(current => current + 1);
        const list: appType[] = Array.isArray(data?.list) ? data.list : [];
        setUserAppId([...userAppId, ...list]);
      })
      .finally(() => {
        setLoadingUser(false);
        loadingRef.current = false;
      });
  }

  function getVersionList(appId: string) {
    if (!appId) return;
    setLoading(true);
    modelAuthStatus(appId).then((list: ModelVersion[]) => {
      const mapped: ModelVersion[] = list.map(item => ({
        ...item,
        label: item.name,
        value: item.domain,
      }));
      setVersionList(mapped);
      handleSetForm(mapped?.[0]);
      setAppId(appId);
      getAutoAuthStatus(appId)
        .then(data => {
          setAutoAuthStatus(data);
        })
        .finally(() => setLoading(false));
    });
  }

  function handleSetForm(currentModelVersion?: ModelVersion) {
    if (
      currentModelVersion &&
      (currentModelVersion.status === 1 || currentModelVersion.status === 0)
    ) {
      const applyInfo = JSON.parse(currentModelVersion.info);
      form.setFieldsValue({
        domain: currentModelVersion.domain,
        conc: applyInfo.conc,
        expireTs: dayjs(applyInfo.expireTs, 'YYYY-MM-DD'),
        qps: applyInfo.qps,
        tokensPreDay: applyInfo.tokensPreDay,
        tokensTotal: applyInfo.tokensTotal,
      });
      setIsApplyed(true);
      setDisabledSave(false);
    } else {
      form.resetFields();
      form.setFieldsValue({
        domain: currentModelVersion?.domain,
        conc: 1,
        qps: 1,
        tokensTotal: 5000,
        tokensPreDay: 5000,
        expireTs: dayjs().add(3, 'months'),
      });
      setIsApplyed(false);
    }
    setServiceId(currentModelVersion?.serviceId ?? '');
    setModelType(currentModelVersion?.modelType ?? 1);
  }

  function changeModelVersion(value: string) {
    const currentModelVersion = versionList.find(
      (item: ModelVersion) => item.value === value
    );
    handleSetForm(currentModelVersion);
  }

  useEffect(() => {
    setBotIcon(avatarIcon[0]);
    setBotColor(avatarColor[0]?.name ?? '');
  }, [avatarIcon, avatarColor]);

  function createNewBot() {
    setLoading(true);
    const params = {
      appId,
      domain: String(form.getFieldValue('domain') ?? ''),
      name,
      desc,
      avatarColor: botColor,
      avatarIcon: botIcon?.value ?? '',
      floated: false,
    };
    createBotAPI(params)
      .then((data: robotType) => {
        setCreateModal(false);
        navigate('/space/config/' + data.id + '/base');
      })
      .finally(() => {
        setLoading(false);
      });
  }

  function CommonCreateBot() {
    setLoading(true);
    const params = {
      commonUser: true,
      name,
      desc,
      avatarColor: botColor,
      avatarIcon: botIcon?.value ?? '',
      floated: false,
    };
    createBotAPI(params)
      .then((data: robotType) => {
        setCreateModal(false);
        navigate('/space/config/' + data.id + '/base');
      })
      .finally(() => {
        setLoading(false);
      });
  }

  function applyAuth() {
    const values = form.getFieldsValue();
    const params = {
      appId,
      patchId: '',
      llmServiceId: serviceId,
      modelType: modelType,
      ...values,
      expireTs: values?.expireTs?.format('YYYY-MM-DD'),
    };
    applySpark(params);
  }

  function handleFormChange() {
    let flag = false;
    const values = form.getFieldsValue();
    delete values.modelType;
    delete values.zhanwei;
    for (const key in values) {
      if (!values[key]) {
        flag = true;
      }
    }

    setDisabledSave(flag);
  }

  function disabledDate(current: dayjs.Dayjs) {
    return current && current < dayjs().startOf('day');
  }

  function createBotByAuto() {
    setLoading(true);
    const domainFromForm = form.getFieldValue('domain') as string | undefined;
    const firstVersion = versionList[0];
    const resolvedDomain =
      domainFromForm ?? (firstVersion ? firstVersion.domain : '');
    if (!resolvedDomain) {
      setLoading(false);
      message.error(t('agentPage.createBot.noAvailableModel'));
      return;
    }
    const params = {
      appId,
      domain: resolvedDomain,
      name,
      desc,
      avatarColor: botColor,
      avatarIcon: botIcon.value,
      floated: false,
    };
    if (autoAuthStatus === 2) {
      createBotAPI(params)
        .then(botData => {
          setCreateModal(false);
          navigate('/space/config/' + botData.id + '/base');
        })
        .finally(() => setLoading(false));
    } else {
      Promise.all([createBotAPI(params), autoAuth(appId)])
        .then(([botData]: [robotType, unknown]) => {
          message.success(t('agentPage.createBot.successMessage'));
          setCreateModal(false);
          navigate('/space/config/' + botData.id + '/base');
        })
        .finally(() => setLoading(false));
    }
  }

  return (
    <div className="mask">
      {showModal && (
        <MoreIcons
          icons={avatarIcon}
          colors={avatarColor}
          botIcon={botIcon}
          setBotIcon={setBotIcon}
          botColor={botColor}
          setBotColor={setBotColor}
          setShowModal={setShowModal}
        />
      )}
      <div
        className="absolute bg-[#fff] rounded-2xl p-6 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50"
        ref={appRef}
      >
        {!commonUser && (
          <div className="text-lg font-medium flex items-center">
            <>
              <div className="flex items-center">
                <div
                  className="w-[18px] h-[18px] rounded-full text-center text-sm"
                  style={{
                    background: step === 1 ? '#6356EA' : '#F6F6FD',
                    color: step === 1 ? '#fff' : '#a4a4a4',
                  }}
                >
                  1
                </div>
                <div
                  className="ml-1"
                  style={{ color: step === 1 ? 'rgba(0,0,0,0.80)' : '#a4a4a4' }}
                >
                  {t('agentPage.createBot.createBotStep')}
                </div>
              </div>
              <div
                style={{
                  width: 43,
                  height: 0,
                  border: '1px dashed #d7dfe9',
                  margin: '0 4px',
                }}
              ></div>
              <div className="flex items-center">
                <div
                  className="w-[18px] h-[18px] rounded-full text-center text-sm"
                  style={{
                    background: step === 2 ? '#6356EA' : '#F6F6FD',
                    color: step === 2 ? '#fff' : '#a4a4a4',
                  }}
                >
                  2
                </div>
                <div
                  className="ml-1"
                  style={{ color: step === 2 ? 'rgba(0,0,0,0.80)' : '#a4a4a4' }}
                >
                  {t('agentPage.createBot.authBindingStep')}
                </div>
              </div>
            </>
          </div>
        )}
        {step === 1 && (
          <div>
            <div
              className={`${commonUser ? 'mt-0' : 'mt-7'} text-second font-medium text-sm`}
            >
              {t('agentPage.createBot.botName')}
            </div>
            <div className="flex items-center mt-1.5">
              <div
                className={`w-10 h-10 flex justify-center items-center rounded-lg mr-3 cursor-pointer`}
                style={{
                  background: botColor
                    ? botColor
                    : `url(${botIcon?.name + botIcon?.value}) no-repeat center / cover`,
                }}
                onClick={() => setShowModal(true)}
              >
                {botColor && (
                  <img
                    src={botIcon?.name + botIcon?.value}
                    className="w-6 h-6"
                    alt=""
                  />
                )}
              </div>
              <Input
                value={name}
                maxLength={20}
                showCount
                onChange={e => setName(e.target.value)}
                placeholder={t('agentPage.createBot.pleaseEnter')}
                className="global-input flex-1"
              />
            </div>
            <div className="mt-6 text-second font-medium text-sm">
              {t('agentPage.createBot.botDescription')}
            </div>
            <p className="mt-1.5 text-xs font-medium desc-color max-w-[400px]">
              {t('agentPage.createBot.botDescriptionTip')}
            </p>
            <div className="relative">
              <TextArea
                value={desc}
                onChange={e => setDesc(e.target.value)}
                className="mt-1.5 global-textarea"
                style={{ height: 104, maxHeight: '30vh' }}
                maxLength={200}
                placeholder={t('agentPage.createBot.pleaseEnter')}
              />
              <div className="absolute bottom-3 right-3 ant-input-limit ">
                {desc.length} / 200
              </div>
            </div>
          </div>
        )}
        <div className="flex flex-row-reverse gap-3 mt-7">
          <Button
            type="primary"
            className="w-[125px]"
            loading={loading}
            onClick={createNewBot}
            disabled={!name?.trim() || !desc?.trim()}
          >
            {t('agentPage.createBot.submit')}
          </Button>
          <Button
            type="text"
            className="origin-btn w-[125px]"
            onClick={() => setCreateModal(false)}
          >
            {t('agentPage.createBot.cancel')}
          </Button>
          {step === 2 && (
            <Button
              type="text"
              className="origin-btn w-[125px]"
              style={{ padding: '0 29px 0 34px' }}
              onClick={() => setStep(1)}
            >
              {t('agentPage.createBot.previousStep')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default index;
