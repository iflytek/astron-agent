import React, { useState, useMemo } from 'react';
import { Button, Modal, message } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { getTraceCount, traceDownload } from '@/services/trace';
import { useTranslation } from 'react-i18next';
import styles from './index.module.scss';

interface ExportBtnProps {
  timeRange?: [dayjs.Dayjs, dayjs.Dayjs] | null;
  record?: any;
  botId?: string;
}

const ExportBtn: React.FC<ExportBtnProps> = ({ timeRange, record, botId }) => {
  const { t } = useTranslation();
  const maxDownloadCount = 100000;
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [logCount, setLogCount] = useState(0);

  const isOverFlow = useMemo(() => {
    return logCount > maxDownloadCount;
  }, [logCount]);

  const canDownload = useMemo(() => {
    return !isOverFlow && logCount > 0;
  }, [logCount, isOverFlow]);

  const [downloadController, setDownloadController] =
    useState<AbortController | null>(null);

  // 处理导出按钮点击
  const handleExportClick = async () => {
    if (!timeRange || !timeRange[0] || !timeRange[1]) {
      message.warning('请先选择时间范围');
      return;
    }

    if (!botId) {
      message.warning('缺少智能体ID');
      return;
    }

    setLoading(true);
    try {
      // 调用API获取日志数量
      const params = {
        botId,
        startTime: timeRange[0].format('YYYY-MM-DD HH:mm:ss'),
        endTime: timeRange[1].format('YYYY-MM-DD HH:mm:ss'),
      };

      const count = await getTraceCount(params);
      setLogCount(count || 0);
      setIsModalVisible(true);
    } catch (error) {
      console.error('获取日志统计失败:', error);
      message.error('获取日志统计失败');
    } finally {
      setLoading(false);
      setIsModalVisible(true); // mock
    }
  };

  // 处理确认导出
  const handleConfirmExport = async () => {
    if (!botId || !timeRange) {
      message.error('参数不完整');
      return;
    }

    setExportLoading(true);
    const controller = new AbortController();
    setDownloadController(controller);
    try {
      const params = {
        botId,
        startTime: timeRange[0].format('YYYY-MM-DD HH:mm:ss'),
        endTime: timeRange[1].format('YYYY-MM-DD HH:mm:ss'),
      };

      // 调用导出API获取二进制数据流
      const response: any = await traceDownload(params, {
        signal: controller.signal,
      });

      // 处理二进制流数据（axios 返回）
      const disposition =
        response.headers?.['content-disposition'] ||
        response.headers?.['Content-Disposition'] ||
        '';
      let filename = 'trace.xlsx';
      const match = disposition.match(
        /filename\*=UTF-8''([^;]+)|filename=([^;]+)/i
      );
      if (match) {
        filename = decodeURIComponent(
          (match[1] || match[2] || filename).replace(/"/g, '')
        );
      }
      const dataBlob =
        response.data instanceof Blob
          ? response.data
          : new Blob([response.data]);
      const url = URL.createObjectURL(dataBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);

      message.success('导出成功');
      setIsModalVisible(false);
    } catch (error: any) {
      if (error?.code === 'ERR_CANCELED' || error?.message === 'canceled') {
        // 用户取消下载
        message.info('已取消下载');
      } else {
        console.error('导出失败:', error);
        message.error('导出失败');
      }
    } finally {
      setExportLoading(false);
      setDownloadController(null);
    }
  };

  // 处理取消
  const handleCancel = () => {
    // 若存在进行中的下载，取消之
    if (downloadController) {
      downloadController.abort();
    }
    setIsModalVisible(false);
  };

  // 格式化时间显示
  const formatTimeRange = () => {
    if (!timeRange || !timeRange[0] || !timeRange[1]) {
      return '';
    }
    return `${timeRange[0].format('YYYY-MM-DD HH:mm:ss')} ~ ${timeRange[1].format('YYYY-MM-DD HH:mm:ss')}`;
  };

  return (
    <>
      <Button
        size="small"
        type="default"
        onClick={handleExportClick}
        loading={loading}
        disabled={!timeRange || !timeRange[0] || !timeRange[1] || !botId}
      >
        导出
      </Button>

      <Modal
        title="导出"
        open={isModalVisible}
        maskClosable={false}
        onCancel={handleCancel}
        footer={[
          <Button key="cancel" onClick={handleCancel}>
            取消
          </Button>,
          <Button
            key="export"
            type="primary"
            loading={exportLoading}
            disabled={!canDownload}
            onClick={handleConfirmExport}
          >
            导出excel文件
          </Button>,
        ]}
        className={styles.exportModal}
      >
        <div className={styles.exportContent}>
          <div className={styles.exportInfo}>
            您即将导出符合以下条件的trace日志：
          </div>

          <div className={styles.exportDetails}>
            <div className={styles.detailItem}>
              <span className={styles.label}>智能体名称：</span>
              <span className={styles.value}>{record?.botName || '-'}</span>
            </div>

            <div className={styles.detailItem}>
              <span className={styles.label}>时间范围：</span>
              <span className={styles.value}>{formatTimeRange()}</span>
            </div>

            <div className={styles.detailItem}>
              <span className={styles.label}>预计导出数据量：</span>
              <span className={styles.value}>约{logCount}条</span>
            </div>
          </div>

          {isOverFlow && (
            <div className={styles.warningInfo}>
              <ExclamationCircleOutlined className={styles.warningIcon} />
              <span className={styles.warningText}>
                当前数据量超过 100,000 条，请缩小时间范围
              </span>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
};

export default ExportBtn;
