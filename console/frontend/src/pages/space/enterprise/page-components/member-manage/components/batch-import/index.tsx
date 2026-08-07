import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Modal, Upload, Button, message, Spin, Space } from 'antd';
import { UploadOutlined, DownloadOutlined } from '@ant-design/icons';
import SpaceButton from '@/components/button-group/space-button';
import AddMemberModal from '@/components/space/add-member-modal';
import { useTranslation } from 'react-i18next';
import type { UploadFile } from 'antd';
import {
  batchImportMembers,
  downloadMemberTemplate,
  type BatchImportResult,
  downloadResult,
  validExcel,
} from './utils';
import { ImportStep, BatchImportProps, btnConfigs } from './config';
import styles from './index.module.scss';

const { Dragger } = Upload;

const BatchImport: React.FC<BatchImportProps> = ({
  onSubmit,
  skipResultPreview = true,
}) => {
  const { t } = useTranslation();

  // 状态管理
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [addMemberModalVisible, setAddMemberModalVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState<ImportStep>(
    ImportStep.BEFORE_IMPORT
  );
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [importResult, setImportResult] = useState<BatchImportResult | null>(
    null
  );
  const [abortController, setAbortController] =
    useState<AbortController | null>(null);

  const resetState = useCallback(() => {
    setCurrentStep(ImportStep.BEFORE_IMPORT);
    setFileList([]);
    setImportResult(null);
  }, []);

  // 点击批量导入按钮
  const handleBatchImportClick = useCallback(() => {
    setImportModalVisible(true);
    resetState();
  }, [resetState]);

  // 取消上传
  const handleCancelUpload = useCallback(() => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
    }
    setCurrentStep(ImportStep.BEFORE_IMPORT);
    message.info(t('spaceManagement.cancelUpload'));
  }, [abortController]);

  // 关闭导入弹窗
  const handleImportModalClose = useCallback(() => {
    // 如果正在上传，先取消上传
    if (currentStep === ImportStep.UPLOADING) {
      handleCancelUpload();
    }

    setImportModalVisible(false);
    resetState();
  }, [currentStep, abortController, resetState, handleCancelUpload]);

  // 文件上传前验证
  const beforeUpload = useCallback((file: File) => {
    if (!validExcel(file)) {
      message.error(t('spaceManagement.templateFormatNotMatch'));
      return false;
    }

    setFileList([file as any]);

    // 文件校验成功后自动开始上传
    handleStartImport(file);

    return false; // 阻止默认自动上传
  }, []);

  // 开始导入
  const handleStartImport = useCallback(
    async (file?: File) => {
      const targetFile = file || fileList[0];
      if (!targetFile) {
        message.error(t('spaceManagement.pleaseSelectFile'));
        return;
      }

      setCurrentStep(ImportStep.UPLOADING);

      // 创建 AbortController
      const controller = new AbortController();
      setAbortController(controller);

      try {
        // 创建FormData
        const formData = new FormData();
        formData.append('file', targetFile as any);

        // 调用批量导入API，传递 signal
        const result = await batchImportMembers(formData, controller.signal);

        setImportResult(result);
        setAbortController(null); // 清除 AbortController

        if (result.success && result.data) {
          if (skipResultPreview) {
            // 跳过结果预览，直接打开AddMemberModal
            setImportModalVisible(false);
            setAddMemberModalVisible(true);
          } else {
            setCurrentStep(ImportStep.IMPORT_RESULT);
          }
        } else {
          message.error(t('spaceManagement.uploadFail'));
          setCurrentStep(ImportStep.BEFORE_IMPORT);
        }
      } catch (error: any) {
        setAbortController(null); // 清除 AbortController

        // 区分是否为取消操作
        if (error.name === 'AbortError' || error.message === '上传已取消') {
          return;
        }

        message.error(
          error?.desc || error?.msg || t('spaceManagement.uploadFail')
        );
        setCurrentStep(ImportStep.BEFORE_IMPORT);
      }
    },
    [skipResultPreview]
  );

  // AddMemberModal关闭处理
  const handleAddMemberModalClose = useCallback(() => {
    setAddMemberModalVisible(false);
  }, [setAddMemberModalVisible]);

  // 确认导入处理
  const handleConfirmImport = useCallback(() => {
    if (importResult?.data) {
      setImportModalVisible(false);
      setAddMemberModalVisible(true);
    }
  }, [importResult, setAddMemberModalVisible]);

  // AddMemberModal提交处理
  const handleAddMemberModalSubmit = useCallback(
    async (values: any) => {
      // 这里可以处理最终的成员添加逻辑
      try {
        const res = await onSubmit?.(values);
        if (res) {
          setAddMemberModalVisible(false);
          resetState();
        }
      } catch (err: any) {
        message.error(err.message || t('spaceManagement.importFail'));
      }
    },
    [onSubmit, resetState]
  );

  // 渲染导入前步骤
  const renderBeforeImportStep = () => (
    <div className={styles.beforeImport}>
      <div className={styles.templateSection}>
        <span className={styles.templateHint}>
          {t('spaceManagement.supportUploadExcel')}
        </span>
        <SpaceButton
          config={btnConfigs.importTemplate}
          onClick={downloadMemberTemplate}
        />
      </div>
      <div className={styles.uploadArea}>
        <Dragger
          accept=".xlsx,.xls"
          beforeUpload={beforeUpload}
          maxCount={1}
          className={styles.dragger}
        >
          <p className="ant-upload-drag-icon">
            <UploadOutlined className={styles.uploadIcon} />
          </p>
          <p className="ant-upload-text">
            {t('spaceManagement.supportDragOrClickUpload')}
          </p>
          {/* <p className="ant-upload-hint">
            支持Excel文件(.xlsx、.xls)
          </p> */}
        </Dragger>
      </div>
    </div>
  );

  // 渲染上传中步骤
  const renderUploadingStep = () => (
    <div className={styles.uploading}>
      <div className={styles.progressSection}>
        <Spin />
        <div className={styles.progressText}>
          {t('spaceManagement.parsingInProgress')}
        </div>
      </div>

      {/* <div className={styles.cancelSection}>
        <SpaceButton
          config={{
            key: "cancel",
            text: "取消",
            type: "link",
          }}
          onClick={handleCancelUpload}
        />
      </div> */}
    </div>
  );

  // 渲染导入结果步骤
  const renderImportResultStep = () => (
    <div className={styles.importResult}>
      <div className={styles.resultSummary}>
        <div className={styles.resultTitle}>
          {t('spaceManagement.fileParsedSuccessfully')}
        </div>
        {importResult && importResult.success && importResult.data && (
          <div className={styles.resultStats}>
            <div className={styles.successStats}>
              <span className={styles.successCount}>
                {t('spaceManagement.successfullyParsed')}{' '}
                {importResult.data.userList.length}{' '}
                {t('spaceManagement.members')}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const initialUsers = useMemo(() => {
    if (importResult?.data?.userList) {
      return importResult.data.userList.map((member: any) => ({
        ...member,
        status: member.status || 0,
      }));
    }
    return [];
  }, [importResult]);

  const handleExportResult = useCallback(() => {
    if (!importResult?.data?.resultUrl) {
      message.error(t('spaceManagement.noParsingResult'));
      return;
    }

    downloadResult(importResult.data.resultUrl);
  }, [importResult]);

  const TitleRender = () => {
    return (
      <div className={styles.AddMemberTitle}>
        <span>{t('spaceManagement.addNewMember')}</span>
        <SpaceButton
          config={btnConfigs.exportResult}
          onClick={handleExportResult}
        />
      </div>
    );
  };

  return (
    <>
      {/* 批量导入按钮 */}
      <SpaceButton
        config={btnConfigs.batchImport}
        onClick={handleBatchImportClick}
      />

      {/* 导入弹窗 */}
      <Modal
        title={t('spaceManagement.batchImport')}
        open={importModalVisible}
        onCancel={handleImportModalClose}
        width={600}
        className={styles.importModal}
        destroyOnClose
        maskClosable={false}
        footer={
          currentStep === ImportStep.IMPORT_RESULT && (
            <Space>
              <Button onClick={handleImportModalClose}>
                {t('spaceManagement.cancel')}
              </Button>
              <Button type="primary" onClick={handleConfirmImport}>
                {t('spaceManagement.confirmImport')}
              </Button>
            </Space>
          )
        }
      >
        {currentStep === ImportStep.BEFORE_IMPORT
          ? renderBeforeImportStep()
          : currentStep === ImportStep.UPLOADING
            ? renderUploadingStep()
            : renderImportResultStep()}
      </Modal>

      {/* 添加成员弹窗 */}
      {addMemberModalVisible && (
        <AddMemberModal
          title={<TitleRender />}
          open={addMemberModalVisible}
          onClose={handleAddMemberModalClose}
          onSubmit={handleAddMemberModalSubmit}
          inviteType="enterprise"
          initialUsers={initialUsers}
        />
      )}
    </>
  );
};

export default BatchImport;
