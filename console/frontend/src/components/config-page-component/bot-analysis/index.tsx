import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Input, Modal, Select, Space, Table, message } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import {
  sessionOption,
  userOption,
  interactionOption,
  TokenOption,
  mutiUserOption,
  mutiSessionOption,
  processChannelData,
} from './config';
import { getErrorNodeList } from '@/services/flow';
import {
  // getAnalysisData,
  getAnalysisData01,
  getAnalysisData02,
} from '@/services/spark-common';
import type { SortOrder } from 'antd/es/table/interface';

import indicator from '@/assets/imgs/bot-center/indicator.svg';
import errorTime from '@/assets/imgs/create-bot-v2/errorTime.svg';

import styles from './index.module.scss';

interface NodeErrorInfo {
  info: {
    errorTime: string;
    errorCode: string | number;
    errorMsg: string;
  }[];
  [key: string]: any;
}

const BotAnalysis = ({
  botId,
  detailInfo,
}: {
  botId: any;
  detailInfo: any;
}) => {
  const { t } = useTranslation();
  const [webData, setWebData] = useState<any>({}); //概览数据
  const [overviewType, setOverviewType] = useState<number>(1); //概览时间选择
  const [channelType, setChannelType] = useState<number>(1); //渠道时间选择
  const [monitorType, setMonitorType] = useState<number>(1); //监控时间选择
  const [sessionOptions, setSessionOptions] = useState<any>(sessionOption); //全部会话选项
  const [userOptions, setUserOptions] = useState<any>(userOption); //活跃用户选项
  const [interactionOptions, setInteractionOptions] =
    useState<any>(interactionOption); //平均会话互动数选项
  const [TokenOptions, setTokenOptions] = useState<any>(TokenOption); //Token消耗量选项
  const [beforeData, setBeforeData] = useState<any>({}); //过去7天数据
  const [mutiUserOptions, setMutiUserOptions] = useState<any>(mutiUserOption); //多线用户数选项
  const [mutiSessionOptions, setMutiSessionOptions] =
    useState<any>(mutiSessionOption); //多线会话数选项
  const [nodeErrorList, setNodeErrorList] = useState([]); //节点报错列表
  const [suggestErrorList, setSuggestErrorList] = useState([]); //用户反馈报错列表
  const searchInput = useRef(null);
  const [errorInfo, setErrorInfo] = useState<
    { errorTime: string; errorCode: string | number; errorMsg: string }[]
  >([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  // //日期对应的value
  const selectDayOption = [
    { label: t('common.botAndFlowAnalysis.past7Days'), value: 1 },
    { label: t('common.botAndFlowAnalysis.past14Days'), value: 2 },
    { label: t('common.botAndFlowAnalysis.past30Days'), value: 3 },
  ];
  const dayType: Record<number, { label: string; value: number }> = {
    1: {
      label: t('common.botAndFlowAnalysis.past7Days'),
      value: 7,
    },
    2: {
      label: t('common.botAndFlowAnalysis.past14Days'),
      value: 14,
    },
    3: {
      label: t('common.botAndFlowAnalysis.past30Days'),
      value: 30,
    },
  };

  //获取节点报错信息
  const getNodeErrorInfo = async (botId: any) => {
    const res: any = await getErrorNodeList({ botId });
    const dataErrorList: any = res?.errorList.map((item: any, index: any) => ({
      ...item,
      key: (index + 1).toString(),
    }));
    setNodeErrorList(dataErrorList ?? []);
    const dataSuggest: any = res?.feedbackList.map((item: any, index: any) => ({
      ...item,
      key: (index + 1).toString(),
    }));
    setSuggestErrorList(dataSuggest ?? []);
  };
  // console.log(nodeErrorList, 'nodeErrorList');
  // console.log(suggestErrorList, 'suggestErrorList');

  //获取表格搜索
  const getColumnSearchProps = (dataIndex: string) => ({
    filterDropdown: (props: {
      setSelectedKeys: (selectedKeys: React.Key[]) => void;
      selectedKeys: React.Key[];
      confirm: () => void;
      clearFilters?: () => void;
    }) => {
      const { setSelectedKeys, selectedKeys, confirm, clearFilters } = props;
      return (
        <div style={{ padding: 8 }} onKeyDown={e => e.stopPropagation()}>
          <Input
            ref={searchInput}
            placeholder={`${t('common.botAndFlowAnalysis.search')} ${dataIndex}`}
            value={selectedKeys[0]}
            onChange={e =>
              setSelectedKeys(e.target.value ? [e.target.value] : [])
            }
            onPressEnter={() => confirm()}
            style={{ marginBottom: 8, display: 'block' }}
          />
          <Space>
            <Button
              type="primary"
              onClick={() => confirm()}
              icon={<SearchOutlined />}
              size="small"
              style={{ width: 90 }}
            >
              {t('common.botAndFlowAnalysis.search')}
            </Button>
            <Button
              onClick={() => clearFilters && clearFilters()}
              size="small"
              style={{ width: 90 }}
            >
              {t('common.botAndFlowAnalysis.reset')}
            </Button>
          </Space>
        </div>
      );
    },
    filterIcon: (filtered: boolean) => (
      <SearchOutlined style={{ color: filtered ? '#1890ff' : undefined }} />
    ),
    onFilter: (value: boolean | React.Key, record: Record<string, any>) => {
      if (typeof value === 'string' || typeof value === 'number') {
        return record[dataIndex]
          ?.toString()
          .toLowerCase()
          .includes(value.toString().toLowerCase());
      }
      return false;
    },
  });

  const columnsSuggest = [
    {
      title: t('common.botAndFlowAnalysis.feedbackUserUid'),
      dataIndex: 'uid',
      key: 'uid',
      ...getColumnSearchProps('uid'),
    },
    {
      title: t('common.botAndFlowAnalysis.errorCode'),
      dataIndex: 'errorCode',
      key: 'errorCode',
      sorter: (a: any, b: any) => a.errorCode - b.errorCode,
      sortDirections: ['descend', 'ascend'] as SortOrder[],
    },
    {
      title: t('common.botAndFlowAnalysis.feedbackTime'),
      dataIndex: 'errorTime',
      key: 'errorTime',
      sorter: (a: any, b: any) => a.errorTime - b.errorTime,
      sortDirections: ['descend', 'ascend'] as SortOrder[],
    },
  ];

  const handleExpandable = (e: NodeErrorInfo) => {
    setIsModalOpen(true);
    setErrorInfo(e.info);
  };

  const columns = [
    {
      title: t('common.botAndFlowAnalysis.nodeName'),
      dataIndex: 'nodeName',
      key: 'nodeName',
      ...getColumnSearchProps('nodeName'),
    },
    {
      title: t('common.botAndFlowAnalysis.totalCalls'),
      dataIndex: 'callNum',
      key: 'callNum',
      sorter: (a: any, b: any) => a.callNum - b.callNum,
      sortDirections: ['descend', 'ascend'] as SortOrder[],
    },
    {
      title: t('common.botAndFlowAnalysis.errorCount'),
      dataIndex: 'errorNum',
      key: 'errorNum',
      sorter: (a: any, b: any) => a.errorNum - b.errorNum,
      sortDirections: ['descend', 'ascend'] as SortOrder[],
    },
    {
      title: t('common.botAndFlowAnalysis.operation'),
      key: 'action',
      render: (rootdata: any) => (
        <Space size="middle">
          <a>
            <Space onClick={() => handleExpandable(rootdata)}>
              {t('common.botAndFlowAnalysis.details')}
            </Space>
          </a>
        </Space>
      ),
    },
  ];

  //更新chat数据
  const updateChatChart = (channelChats: any) => {
    const processedData = processChannelData(channelChats);

    setMutiSessionOptions((pre: typeof mutiSessionOption) => {
      return {
        ...pre,
        xAxis: {
          ...pre.xAxis,
          data: processedData.dates,
        },
        series: [
          {
            name: '星火Desk',
            ...pre.series[0],
            data: processedData.channelData.desk,
          },
          {
            name: '星火App',
            ...pre.series[1],
            data: processedData.channelData.app,
          },
          {
            name: '星辰广场',
            ...pre.series[2],
            data: processedData.channelData.plaza,
          },
          {
            name: 'H5',
            ...pre.series[3],
            data: processedData.channelData.h5,
          },
          {
            name: '小程序',
            ...pre.series[4],
            data: processedData.channelData.mini,
          },
        ],
      };
    });
  };

  //更新user数据
  const updateUserChart = (userChats: any) => {
    const processedData = processChannelData(userChats);

    setMutiUserOptions((pre: typeof mutiUserOption) => {
      return {
        ...pre,
        xAxis: {
          ...pre.xAxis,
          data: processedData.dates,
        },
        series: [
          {
            name: '星火Desk',
            ...pre.series[0],
            data: processedData.channelData.desk,
          },
          {
            name: '星火App',
            ...pre.series[1],
            data: processedData.channelData.app,
          },
          {
            name: '星辰广场',
            ...pre.series[2],
            data: processedData.channelData.plaza,
          },
          {
            name: 'H5',
            ...pre.series[3],
            data: processedData.channelData.h5,
          },
          {
            name: '小程序',
            ...pre.series[4],
            data: processedData.channelData.mini,
          },
        ],
      };
    });
  };

  //分析概览时间选择
  const handleChangeTime = (value: any) => {
    setOverviewType(value);
  };

  //渠道分析时间选择
  const handleChangeChannelTime = (value: any) => {
    setChannelType(value);
  };
  //监控时间选择
  const handleChangeMonitorTime = (value: any) => {
    setMonitorType(value);
  };

  // 处理图表数据更新
  const updateChartData = (res: any) => {
    //全部会话数
    if (res?.chatMessages?.length > 0) {
      setSessionOptions((pre: any) => ({
        ...pre,
        xAxis: {
          ...pre.xAxis,
          data: res?.chatMessages?.map((item: any) => item?.date),
        },
        series: [
          {
            ...pre.series,
            data: res?.chatMessages?.map((item: any) => item?.count),
          },
        ],
      }));
    }

    //活跃用户数
    if (res?.activityUser?.length > 0) {
      setUserOptions((pre: any) => ({
        ...pre,
        xAxis: {
          ...pre.xAxis,
          data: res?.activityUser?.map((item: any) => item?.date),
        },
        series: [
          {
            ...pre.series,
            data: res?.activityUser?.map((item: any) => item?.count),
          },
        ],
      }));
    }

    //平均会话互动数
    if (res?.avgChatMessages?.length > 0) {
      setInteractionOptions((pre: any) => ({
        ...pre,
        xAxis: {
          ...pre.xAxis,
          data: res?.avgChatMessages?.map((item: any) => item?.date),
        },
        series: [
          {
            ...pre.series,
            data: res?.avgChatMessages?.map((item: any) => item?.count),
          },
        ],
      }));
    }

    //Token消耗量
    if (res?.tokenUsed?.length > 0) {
      setTokenOptions((pre: any) => ({
        ...pre,
        xAxis: {
          ...pre.xAxis,
          data: res?.tokenUsed?.map((item: any) => item?.date),
        },
        series: [
          {
            ...pre.series,
            data: res?.tokenUsed?.map((item: any) => item?.count),
          },
        ],
      }));
    }
  };

  //获取全部数据
  const getAnalysisDataFn = async () => {
    const [result01, result02] = await Promise.allSettled([
      getAnalysisData01({
        botId,
        overviewDays: dayType[overviewType]?.value ?? 7,
        // channelDays: dayType[channelType]?.value ?? 7,
      }),
      getAnalysisData02({
        botId,
      }),
    ]);

    const res01 =
      result01.status === 'fulfilled'
        ? result01.value.data
        : { totalUsers: 0, totalChats: 0, totalMessages: 0, totalTokens: 0 };
    const res02 = result02.status === 'fulfilled' ? result02.value.data : {};

    // 处理错误信息并显示给用户
    const errors: string[] = [];
    if (result01.status === 'rejected') {
      errors.push(result01.reason?.message || '获取概览数据失败');
    }
    if (result02.status === 'rejected') {
      errors.push(result02.reason?.message || '获取渠道数据失败');
    }

    // 如果有错误，显示错误信息
    if (errors.length > 0) {
      const errorMessage =
        errors.length === 1 ? errors[0] : `获取数据失败：${errors.join('、')}`;
      message.error(errorMessage);
    }

    const res = {
      ...res01,
      ...res02,
    };
    setWebData({
      totalUsers: res?.totalUsers,
      totalChats: res?.totalChats,
      totalMessages: res?.totalMessages,
      totalTokens: res?.totalTokens,
    });

    // 计算统计数据
    const dayChatNum = res?.chatMessages?.reduce(
      (acc: any, curr: any) => acc + curr.count,
      0
    );
    const dayUserNum = res?.activityUser?.reduce(
      (acc: any, curr: any) => acc + curr.count,
      0
    );
    const dayAvgChatNum = res?.avgChatMessages?.reduce(
      (acc: any, curr: any) => acc + curr.count,
      0
    );
    const dayTokenNum = res?.tokenUsed?.reduce(
      (acc: any, curr: any) => acc + curr.count,
      0
    );

    setBeforeData({ dayChatNum, dayUserNum, dayAvgChatNum, dayTokenNum });

    updateChartData(res);

    //渠道分析
    if (res?.channelChats?.length > 0) updateChatChart(res?.channelChats);
    if (res?.channelUsers?.length > 0) updateUserChart(res?.channelUsers);
  };

  useEffect(() => {
    detailInfo?.version > 1 && getNodeErrorInfo(botId);
  }, [detailInfo]);

  useEffect(() => {
    getAnalysisDataFn();
  }, [overviewType, channelType]);

  return (
    <div className={styles.web_app_swap}>
      <div className={styles.web_app_contaienr}>
        <div className={styles.monitor_count_container}>
          <div className={styles.monitor_title}>
            <span>{t('common.botAndFlowAnalysis.cumulativeIndicators')}</span>
          </div>
          <div className={styles.monitor_count_box_container}>
            <div className={styles.monitor_count}>
              <div className={styles.title}>
                {t('common.botAndFlowAnalysis.totalChats')}
              </div>
              <div className={styles.count}>{webData?.totalMessages || 0}</div>
              <img src={indicator} alt="" />
            </div>
            <div className={styles.monitor_count}>
              <div className={styles.title}>
                {t('common.botAndFlowAnalysis.totalUsers')}
              </div>
              <div className={styles.count}>{webData?.totalUsers || 0}</div>
              <img src={indicator} alt="" />
            </div>
            <div className={styles.monitor_count}>
              <div className={styles.title}>
                {t('common.botAndFlowAnalysis.totalTokenConsumption')}
              </div>
              <div className={styles.count}>{webData?.totalTokens || 0}</div>
              <img src={indicator} alt="" />
            </div>
            <div className={styles.monitor_count}>
              <div className={styles.title}>
                {t('common.botAndFlowAnalysis.totalMessages')}
              </div>
              <div className={styles.count}>{webData?.totalMessages || 0}</div>
              <img src={indicator} alt="" />
            </div>
          </div>
          <div className={styles.monitor_count_tip}>
            {t(
              'common.botAndFlowAnalysis.cumulativeIndicatorsNotAffectedByTimeFilter'
            )}
          </div>
        </div>
        <div className={styles.chart_con}>
          <div className={styles.chart_title}>
            <span>{t('common.botAndFlowAnalysis.analysisOverview')}</span>
            <Select
              options={selectDayOption}
              defaultValue={1}
              onChange={handleChangeTime}
              className={styles.select_time}
            />
          </div>
          <div className={styles.chart_con_box_container}>
            <div className={styles.chart_con_box}>
              <div className={styles.chart_con_box_title}>
                {t('common.botAndFlowAnalysis.totalChats')}
              </div>
              <div className={styles.chart_con_box_time}>
                {dayType[overviewType]?.label}
              </div>
              <div className={styles.total_count}>
                {beforeData?.dayChatNum || 0}
              </div>
              <ReactECharts
                option={sessionOptions}
                style={{ height: 280 }}
                opts={{ locale: 'FR' }}
              />
            </div>
            <div className={styles.chart_con_box}>
              <div className={styles.chart_con_box_title}>
                {t('common.botAndFlowAnalysis.activeUsers')}
              </div>
              <div className={styles.chart_con_box_time}>
                {dayType[overviewType]?.label}
              </div>
              <div className={styles.total_count}>
                {beforeData?.dayUserNum || 0}
              </div>
              <ReactECharts
                option={userOptions}
                style={{ height: 280 }}
                opts={{ locale: 'FR' }}
              />
            </div>
            <div className={styles.chart_con_box}>
              <div className={styles.chart_con_box_title}>
                {t('common.botAndFlowAnalysis.averageSessionInteraction')}
              </div>
              <div className={styles.chart_con_box_time}>
                {dayType[overviewType]?.label}
              </div>
              <div className={styles.total_count}>
                {beforeData?.dayAvgChatNum || 0}
              </div>
              <ReactECharts
                option={interactionOptions}
                style={{ height: 280 }}
                opts={{ locale: 'FR' }}
              />
            </div>
            <div className={styles.chart_con_box}>
              <div className={styles.chart_con_box_title}>
                {t('common.botAndFlowAnalysis.tokenConsumption')}
              </div>
              <div className={styles.chart_con_box_time}>
                {dayType[overviewType]?.label}
              </div>
              <div className={styles.total_count}>
                {beforeData?.dayTokenNum || 0}
              </div>
              <ReactECharts
                option={TokenOptions}
                style={{ height: 280 }}
                opts={{ locale: 'FR' }}
              />
            </div>
          </div>

          {detailInfo?.version > 1 && (
            <>
              <div className={styles.chart_title}>
                {t('common.botAndFlowAnalysis.stabilityMonitoring')}
                <Select
                  options={selectDayOption}
                  defaultValue={1}
                  onChange={handleChangeMonitorTime}
                  style={{ width: 120, marginLeft: 10 }}
                />
              </div>
              <div className={styles.error_table_container}>
                <div className={styles.error_table_item}>
                  <div className={styles.error_table_item_title}>
                    <div>{t('common.botAndFlowAnalysis.nodeError')}</div>
                    <div>{dayType[monitorType]?.label}</div>
                  </div>
                  <div>
                    <Table
                      scroll={{ y: 240 }}
                      pagination={false}
                      dataSource={nodeErrorList}
                      columns={columns}
                      className={styles.node_Table}
                    />
                  </div>
                </div>
                <div className={styles.error_table_item}>
                  <div className={styles.error_table_item_title}>
                    <div>
                      {t('common.botAndFlowAnalysis.userFeedbackError')}
                    </div>
                    <div>{dayType[monitorType]?.label}</div>
                  </div>
                  <div>
                    <Table
                      scroll={{ y: 240 }}
                      pagination={false}
                      dataSource={suggestErrorList}
                      columns={columnsSuggest}
                      className={styles.node_Table}
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      <Modal
        wrapClassName={styles.errorInfoModel}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        centered
        title={
          <div>
            <span className={styles.fontWeight}>
              {t('common.botAndFlowAnalysis.errorLog')}
            </span>
          </div>
        }
      >
        <div className={styles.errorModel}>
          {errorInfo.map((item: any, index: any) => {
            return (
              <div className={styles.errorInfo} key={index}>
                <div className={styles.errorHead}>
                  <img className={styles.errorInfoImg} src={errorTime} alt="" />
                  <span className={styles.errorSpan}>{item.errorTime}</span>
                </div>
                <div className={styles.errorCode}>
                  <span className={styles.errorLable}>
                    {t('common.botAndFlowAnalysis.errorCode')}:
                  </span>
                  <span className={styles.errorSpan}>{item.errorCode}</span>
                </div>
                <div className={styles.errorMsg}>
                  <span className={styles.errorLable}>
                    {t('common.botAndFlowAnalysis.errorReason')}:
                  </span>
                  <span className={styles.errorSpan}>{item.errorMsg}</span>
                </div>
              </div>
            );
          })}
        </div>
      </Modal>
    </div>
  );
};

export default BotAnalysis;
