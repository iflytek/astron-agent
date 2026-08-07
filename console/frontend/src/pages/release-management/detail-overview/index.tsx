import { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { Table, message } from 'antd';
import useToggle from '@/hooks/use-toggle';
import {
  getVersionList,
  getBotInfo,
  publish,
  getChainInfo,
} from '@/services/spark-common';
import { useBotStateStore } from '@/store/spark-store/bot-state';
import WxModal from '@/components/wx-modal';

import wechatIcon from '@/assets/imgs/workflow/wechat-icon.png';
import mcpIcon from '@/assets/imgs/workflow/mcp-icon.png';
import iflytekCloudIcon from '@/assets/imgs/workflow/iflytekCloud-icon.png';
// import iflytekIcon from '@/assets/imgs/workflow/iflytek-icon.png';
import agentHubIcon from '@/assets/imgs/workflow/agent-hub-icon.svg';
import { useTranslation } from 'react-i18next';

import styles from './index.module.scss';

const DetailOverview = () => {
  const [botMultiFileParam, setBotMultiFileParam] = useState<any>(false);
  // 接收父组件传递的context
  const { record: botRecord, botId } = useOutletContext<{
    record: any;
    botId: string;
  }>();
  const [editV2Visible, { setLeft: hide, setRight: show }] = useToggle();
  const navigate = useNavigate();

  const [pageInfo, setPageInfo] = useState({
    current: 1,
    size: 10,
  });
  const [loading, setLoading] = useState(false);
  const [versionList, setVersionList] = useState([]);
  const [fabuFlag, setFabuFlag]: any = useState(false);
  const [openWxmol, setOpenWxmol] = useState(false);
  const [isOpenapi, setIsOpenapi]: any = useState(false);

  const setBotInfo = useBotStateStore(state => state.setBotDetailInfo);
  const { t } = useTranslation();

  const columns: any = [
    {
      dataIndex: 'name',
      title: t('releaseDetail.DetailOverviewPage.version'),
      align: 'left',
      // text去除第一位的v
      render: (text: string) =>
        text?.length > 0 ? <span>V{text?.slice(1)}</span> : null,
    },
    {
      dataIndex: 'versionNum',
      title: t('releaseDetail.DetailOverviewPage.versionID'),

      align: 'left',
      render: (text: string) => (
        <div
          style={{
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: '200px',
          }}
          title={text}
        >
          {text}
        </div>
      ),
    },
    {
      dataIndex: 'publishResult',
      title: t('releaseDetail.DetailOverviewPage.status'),
      align: 'left',
      render: (text: string) => <div>{text}</div>,
    },
    {
      dataIndex: 'description',
      title: t('releaseDetail.DetailOverviewPage.agentDescription'),

      align: 'left',
      render: (text: string) => (
        <div
          title={text}
          style={{
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: '200px',
          }}
        >
          {text}
        </div>
      ),
    },
    {
      dataIndex: 'publishChannel',
      title: t('releaseDetail.DetailOverviewPage.releasedChannel'),
      align: 'left',
      render: (text: number) => {
        return renderPlatformLogo(text);
      },
    },
    {
      dataIndex: 'createdTime',
      title: t('releaseDetail.DetailOverviewPage.releaseTime'),
      align: 'left',
      render: (time: string) => (
        <span className={styles.timeColor}>
          {time?.replace(/T/g, ' ').slice(0, 16)}
        </span>
      ),
    },
    {
      dataIndex: 'action',
      title: t('releaseDetail.DetailOverviewPage.operation'),
      render: (_: any, record: { publishResult: any }) => {
        return (
          <div className={styles.actionBtnBox}>
            <span
              onClick={() => {
                if (botRecord.version !== 3) {
                  getBotBaseInfo(botRecord?.botId);
                  setFabuFlag(true);
                  setOpenWxmol(true);
                } else {
                  getChainInfo(botRecord?.botId).then(res => {
                    setBotMultiFileParam(res.botMultiFileParam);
                    publish({
                      id: res.massId,
                      botId: `${botRecord?.botId}`,
                      flowId: res.flowId,
                      name: botRecord?.botName || '',
                      description: botRecord?.botDesc || '',
                      data: { nodes: [] },
                    })
                      .then(() => {
                        getBotBaseInfo(botRecord?.botId);
                        setFabuFlag(true);
                        setOpenWxmol(true);
                      })
                      .catch(err => {
                        message.error(err?.message);
                      });
                  });
                }
              }}
            >
              {record?.publishResult
                ? t('releaseDetail.DetailOverviewPage.release')
                : null}
            </span>

            <span onClick={() => updateAgent(record)}>
              {t('releaseDetail.DetailOverviewPage.edit')}
            </span>
          </div>
        );
      },
    },
  ];

  /** ## 编辑智能体 */
  const updateAgent = (bot: any) => {
    navigate(`/work_flow/${bot?.flowId}/arrange`);
  };

  const renderPlatformLogo = (type: number) => {
    switch (type) {
      case 1:
        return (
          <img
            src={agentHubIcon}
            alt={t('releaseDetail.DetailOverviewPage.iFlytek')}
            className="w-5 h-5"
          />
        );
      case 2:
        return (
          <img
            src={iflytekCloudIcon}
            alt={t('releaseDetail.DetailOverviewPage.iFlytekCloud')}
            className="w-5 h-5"
          />
        );
      case 3:
        return (
          <img
            src={wechatIcon}
            alt={t('releaseDetail.DetailOverviewPage.wx')}
            className="w-5 h-5"
          />
        );

      case 4:
        return <img src={mcpIcon} alt="MCP" className="w-5 h-5" />;
      default:
        return null;
    }
  };

  // 获取助手基本信息
  const getBotBaseInfo = (newBotId?: any) => {
    const botId = newBotId;
    getBotInfo({ botId })
      .then((data: any) => {
        setBotInfo({
          ...data,
          name: data?.botName,
        });
      })
      .catch(err => {
        return err?.message && message.error(err.message);
      });
  };

  /** ## 获取发布版本列表 */
  const getVersionListData = (botId: string | undefined) => {
    setLoading(true);
    const params = {
      botId,
      size: pageInfo.size,
      current: pageInfo.current,
    };
    getVersionList(params)
      .then((res: any) => {
        setVersionList(res?.records || []);
      })
      .catch(err => {
        message.error(
          err?.message ||
            t('releaseDetail.DetailOverviewPage.getVersionListFail')
        );
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    // 从http://localhost:5173/management/release/detail/4011159 路径中获取botId
    const paras = window.location.pathname.split('/');
    const botId = paras[paras.length - 1];
    getVersionListData(botId);
  }, []);

  return (
    <div className={styles.detailOverview}>
      <div className={styles.overviewHeader}>
        <span></span>
      </div>

      <div className={styles.overviewContent}>
        <Table
          loading={loading}
          className="xingchen-table"
          columns={columns}
          dataSource={versionList}
          rowKey={(record: { createdTime: number }) => record.createdTime}
          pagination={{
            position: ['bottomCenter'],
            current: pageInfo.current,
            pageSize: pageInfo.size,
            onChange: (page, pageSize) => {
              setPageInfo(pre => ({
                ...pre,
                pageIndex: page,
                pageSize: pageSize,
              }));
            },
          }}
          scroll={{
            scrollToFirstRowOnChange: true,
            y: 'max(200px ,calc(100vh - 350px))',
          }}
        />
      </div>

      <WxModal
        botMultiFileParam={botMultiFileParam}
        showInfoModel={show}
        setPageInfo={setPageInfo}
        disjump={true}
        setIsOpenapi={setIsOpenapi}
        fabuFlag={fabuFlag}
        show={openWxmol}
        onCancel={() => {
          setOpenWxmol(false);
        }}
      />
    </div>
  );
};

export default DetailOverview;
