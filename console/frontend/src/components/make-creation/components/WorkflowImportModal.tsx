import React, { useEffect, useRef, useState } from 'react';
import { Alert, Button, message, Modal, Tag, Upload, UploadFile } from 'antd';
import { v4 as uuid } from 'uuid';
import {
  getWorkflowImportEntryStatus,
  getWorkflowImportDependencyPresentation,
  normalizeWorkflowImportResult,
  shouldShowWorkflowImportError,
  summarizeWorkflowImportReport,
  type NormalizedWorkflowImportResult,
  type WorkflowImportEntryStatus,
  type WorkflowImportReport,
  type WorkflowImportReportEntry,
  workflowImport,
} from '@/services/flow';
import { typeList } from '@/constants';
import { useNavigate } from 'react-router-dom';
import i18next from 'i18next';

import uploadAct from '@/assets/imgs/knowledge/icon_zhishi_upload_act.png';

const { Dragger } = Upload;

// 定义上传事件类型
interface FileUploadEvent {
  file: File;
  onSuccess?: (response: any, file: File) => void;
  onError?: (error: any, response: any) => void;
  onProgress?: (event: { percent: number }, file: File) => void;
}

// 定义自定义上传文件类型，扩展UploadFile
interface CustomUploadFile extends UploadFile {
  id: string;
  type?: string;
  total?: string;
  progress?: number;
  loaded?: number;
  file?: File;
}

const getEntries = (
  report?: WorkflowImportReport
): WorkflowImportReportEntry[] =>
  Array.isArray(report?.entries) ? report.entries : [];

const IMPORT_REASON_KEYS: Record<string, string> = {
  'database is not visible in target space': 'importReasonDatabaseMissing',
  'operation or webSchema contract is incompatible':
    'importReasonContractIncompatible',
  'multiple visible versions share the source tool id':
    'importReasonMultipleVersions',
  'multiple visible tools have the same name': 'importReasonDuplicateName',
  'same-name tool has an incompatible contract':
    'importReasonSameNameIncompatible',
  'tool is missing or not visible in target space': 'importReasonToolMissing',
  'multiple visible tools have the same identity': 'importReasonMultipleTools',
  'multiple visible tool rows share the source id and version':
    'importReasonMultipleVersions',
  'multiple compatible tools have the same name': 'importReasonDuplicateName',
  'multiple visible tool rows share the same name, id and version':
    'importReasonMultipleVersions',
  'nested workflow is not visible in target space':
    'importReasonWorkflowMissing',
  'knowledge base is not visible in target space':
    'importReasonKnowledgeMissing',
  'one or more knowledge bases are not visible in target space':
    'importReasonKnowledgeItemsMissing',
};

const getLocalizedReason = (reasonCode: unknown, reason: unknown): string => {
  if (typeof reasonCode === 'string' && reasonCode.trim()) {
    const key = `importReasonCode_${reasonCode.trim().toUpperCase()}`;
    const translated = i18next.t(`workflow.promptDebugger.${key}`);
    if (translated !== `workflow.promptDebugger.${key}`) return translated;
  }
  if (typeof reason !== 'string' || !reason.trim()) {
    return i18next.t('workflow.promptDebugger.importReportNoReason');
  }
  const key = IMPORT_REASON_KEYS[reason.trim().toLowerCase()];
  return key ? i18next.t(`workflow.promptDebugger.${key}`) : reason.trim();
};

const getProtocolCode = (value: unknown, fallback = 'UNKNOWN'): string => {
  if (typeof value !== 'string' || !value.trim()) return fallback;
  return value
    .trim()
    .toUpperCase()
    .replace(/[-\s]+/g, '_');
};

const getLocalizedMappingType = (mappingType: unknown): string => {
  const code = getProtocolCode(mappingType, '');
  if (!code) {
    return i18next.t('workflow.promptDebugger.importReportNotProvided');
  }
  const key = `workflow.promptDebugger.importMappingType_${code}`;
  const translated = i18next.t(key);
  return translated === key ? code : translated;
};

const getDisplayValue = (value: unknown): string =>
  typeof value === 'string' && value.trim()
    ? value.trim()
    : i18next.t('workflow.promptDebugger.importReportNotProvided');

const getMappingDisplay = (
  sourceValue: unknown,
  targetValue: unknown
): string => {
  const source = getDisplayValue(sourceValue);
  return typeof targetValue === 'string' && targetValue.trim()
    ? `${source} → ${targetValue.trim()}`
    : source;
};

function ImportReportView({
  report,
  onOpenCanvas,
}: {
  report: WorkflowImportReport;
  onOpenCanvas: () => void;
}): React.ReactElement {
  const entries = getEntries(report);
  const { total, resolved, ambiguous, unresolved, hasProblem } =
    summarizeWorkflowImportReport(report);

  const statusLabel = (status: WorkflowImportEntryStatus): string => {
    const key = {
      resolved: 'importReportMapped',
      unresolved: 'importReportUnresolved',
      ambiguous: 'importReportAmbiguous',
      unknown: 'importReportUnknown',
    }[status];
    return i18next.t(`workflow.promptDebugger.${key}`);
  };

  const protocolLabel = (
    humanLabel: string,
    value: unknown,
    fallback = 'UNKNOWN'
  ): string => `${humanLabel} (${getProtocolCode(value, fallback)})`;

  const statusColor = (status: WorkflowImportEntryStatus): string => {
    if (status === 'resolved') return 'success';
    if (status === 'ambiguous') return 'warning';
    if (status === 'unresolved' || status === 'unknown') return 'error';
    return 'default';
  };

  const entryName = (entry: WorkflowImportReportEntry): string =>
    String(
      entry.nodeName ??
        entry.name ??
        entry.sourceName ??
        entry.nodeId ??
        i18next.t('workflow.promptDebugger.importReportUnknownNode')
    );

  const entryReason = (entry: WorkflowImportReportEntry): string =>
    getLocalizedReason(
      entry.reasonCode,
      entry.reason ?? entry.message ?? entry.detail
    );

  return (
    <div className="mt-5">
      <div className="text-base font-semibold">
        {i18next.t('workflow.promptDebugger.importReportTitle')}
      </div>
      <div className="grid grid-cols-4 gap-2 mt-4 text-center">
        <div className="rounded-lg bg-[#F6F6F6] px-2 py-2">
          <div className="text-lg font-semibold">{total}</div>
          <div className="text-xs text-[#8C8C8C]">
            {i18next.t('workflow.promptDebugger.importReportTotal')}
          </div>
        </div>
        <div className="rounded-lg bg-[#F0FFF4] px-2 py-2">
          <div className="text-lg font-semibold text-[#389E0D]">{resolved}</div>
          <div className="text-xs text-[#8C8C8C]">
            {i18next.t('workflow.promptDebugger.importReportMapped')}
          </div>
        </div>
        <div className="rounded-lg bg-[#FFF7E6] px-2 py-2">
          <div className="text-lg font-semibold text-[#D46B08]">
            {ambiguous}
          </div>
          <div className="text-xs text-[#8C8C8C]">
            {i18next.t('workflow.promptDebugger.importReportAmbiguous')}
          </div>
        </div>
        <div className="rounded-lg bg-[#FFF1F0] px-2 py-2">
          <div className="text-lg font-semibold text-[#CF1322]">
            {unresolved}
          </div>
          <div className="text-xs text-[#8C8C8C]">
            {i18next.t('workflow.promptDebugger.importReportUnresolved')}
          </div>
        </div>
      </div>

      {hasProblem && (
        <Alert
          className="mt-4"
          type="warning"
          showIcon
          message={i18next.t('workflow.promptDebugger.importReportWarning')}
          description={i18next.t(
            'workflow.promptDebugger.importReportWarningDescription'
          )}
        />
      )}

      {!hasProblem && (
        <Alert
          className="mt-4"
          type="success"
          showIcon
          message={i18next.t('workflow.promptDebugger.importReportSuccess')}
          description={i18next.t(
            'workflow.promptDebugger.importReportSuccessDescription'
          )}
        />
      )}

      {entries.length > 0 && (
        <div className="mt-3 max-h-[220px] overflow-y-auto rounded-lg border border-[#F0F0F0]">
          {entries.map((entry, index) => {
            const status = getWorkflowImportEntryStatus(entry);
            const dependencyPresentation =
              getWorkflowImportDependencyPresentation(entry);
            const mappingType = getProtocolCode(entry.mappingType, '');
            const reasonCode = getProtocolCode(entry.reasonCode, '');
            return (
              <div
                key={`${String(entry.nodeId ?? index)}-${index}`}
                className="border-b border-[#F5F5F5] px-3 py-2 last:border-b-0"
              >
                <div className="flex items-center justify-between gap-2">
                  <div
                    className="min-w-0 flex-1 truncate"
                    title={entryName(entry)}
                  >
                    {entryName(entry)}
                    {entry.nodeType ? (
                      <span className="ml-2 text-xs text-[#8C8C8C]">
                        ({entry.nodeType})
                      </span>
                    ) : null}
                  </div>
                  <Tag color={statusColor(status)}>
                    {protocolLabel(statusLabel(status), entry.status)}
                  </Tag>
                </div>
                <div className="mt-2 grid gap-1 text-xs text-[#697386]">
                  <div>
                    <span className="text-[#8C8C8C]">
                      {i18next.t(
                        'workflow.promptDebugger.importReportMappingType'
                      )}
                    </span>
                    {getLocalizedMappingType(entry.mappingType)}
                    <span className="ml-1 font-mono text-[#8C8C8C]">
                      ({mappingType || '—'})
                    </span>
                  </div>
                  <div>
                    <span className="text-[#8C8C8C]">
                      {i18next.t('workflow.promptDebugger.importReportReason')}
                    </span>
                    {entryReason(entry)}
                    <span className="ml-1 font-mono text-[#8C8C8C]">
                      ({reasonCode || '—'})
                    </span>
                  </div>
                  <div className="break-all font-mono">
                    <span className="font-sans text-[#8C8C8C]">
                      {i18next.t(
                        `workflow.promptDebugger.${dependencyPresentation.resourceLabelKey}`
                      )}
                    </span>
                    {getMappingDisplay(
                      dependencyPresentation.sourceResourceId,
                      dependencyPresentation.targetResourceId
                    )}
                  </div>
                  {dependencyPresentation.showPluginDetails &&
                    (entry.sourceOperationId || entry.targetOperationId) && (
                      <div className="break-all font-mono">
                        <span className="font-sans text-[#8C8C8C]">
                          {i18next.t(
                            'workflow.promptDebugger.importReportOperationId'
                          )}
                        </span>
                        {getMappingDisplay(
                          entry.sourceOperationId,
                          entry.targetOperationId
                        )}
                      </div>
                    )}
                  {dependencyPresentation.showPluginDetails &&
                    (entry.sourceVersion || entry.targetVersion) && (
                      <div className="break-all font-mono">
                        <span className="font-sans text-[#8C8C8C]">
                          {i18next.t(
                            'workflow.promptDebugger.importReportVersion'
                          )}
                        </span>
                        {getMappingDisplay(
                          entry.sourceVersion,
                          entry.targetVersion
                        )}
                      </div>
                    )}
                  {dependencyPresentation.showPluginDetails &&
                    Array.isArray(entry.candidatePluginIds) &&
                    entry.candidatePluginIds.length > 0 && (
                      <div className="break-all font-mono">
                        <span className="font-sans text-[#8C8C8C]">
                          {i18next.t(
                            'workflow.promptDebugger.importReportCandidatePluginIds'
                          )}
                        </span>
                        {entry.candidatePluginIds.join(', ')}
                      </div>
                    )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-5 flex justify-end gap-3">
        <Button onClick={() => onOpenCanvas()} type="primary">
          {i18next.t('workflow.promptDebugger.importReportOpenCanvas')}
        </Button>
      </div>
    </div>
  );
}

function WorkflowImportModal({
  setWorkflowImportModalVisible,
}: {
  setWorkflowImportModalVisible: (visible: boolean) => void;
}) {
  const navigate = useNavigate();
  // 使用自定义类型替代原始UploadFile类型
  const [uploadList, setUploadList] = useState<CustomUploadFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [importResult, setImportResult] =
    useState<NormalizedWorkflowImportResult | null>(null);
  const mountedRef = useRef(true);
  const requestInFlightRef = useRef(false);
  const requestGenerationRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      requestInFlightRef.current = false;
      requestGenerationRef.current += 1;
    };
  }, []);

  const closeModal = () => {
    if (requestInFlightRef.current) return;
    setImportResult(null);
    setWorkflowImportModalVisible(false);
  };

  const openImportedCanvas = (
    result = importResult,
    requestGeneration?: number
  ) => {
    if (
      !mountedRef.current ||
      !result?.flowId ||
      (requestGeneration !== undefined &&
        requestGeneration !== requestGenerationRef.current)
    )
      return;
    // Successful completion is not a user cancellation, so it must be able
    // to close the modal even while the request's `finally` is still pending.
    setImportResult(null);
    setWorkflowImportModalVisible(false);
    navigate(`/work_flow/${encodeURIComponent(result.flowId)}/arrange`);
  };

  function beforeUpload(file: UploadFile) {
    const maxSize = 20 * 1024 * 1024;
    if (file.size && file.size > maxSize) {
      message.error(
        i18next.t('workflow.promptDebugger.uploadFileSizeExceeded')
      );
      return false;
    }
    const isYml = ['yml', 'yaml'].includes(
      (file?.name?.split('.')?.pop() || '').toLowerCase()
    );
    if (!isYml) {
      message.error(
        i18next.t('workflow.promptDebugger.pleaseUploadYmlYamlFormat')
      );
      return false;
    } else {
      return true;
    }
  }

  const formatFileSize = (sizeInBytes: number) => {
    if (sizeInBytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(sizeInBytes) / Math.log(k));

    return (
      parseFloat((sizeInBytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    );
  };

  const fileUpload = (event: unknown) => {
    const file = (event as FileUploadEvent).file;
    const id = uuid();
    // 使用自定义类型创建文件对象
    const customFile: CustomUploadFile = {
      uid: id,
      id,
      name: file.name,
      type: file.name?.split('.')?.pop()?.toLowerCase(),
      progress: 0,
      status: 'uploading',
      loaded: 0,
      total: formatFileSize(file.size),
      file,
    };

    setUploadList([customFile]);
  };

  const uploadProps = {
    name: 'file',
    action: '/xingchen-api/image/upload',
    showUploadList: false,
    accept: '.yml,.yaml',
    beforeUpload,
    customRequest: fileUpload,
  };

  const handleOk = () => {
    const file = uploadList[0]?.file;
    if (!file || requestInFlightRef.current) return;
    const requestGeneration = ++requestGenerationRef.current;
    requestInFlightRef.current = true;
    setLoading(true);
    workflowImport({
      file,
    })
      .then((value: unknown) => {
        if (
          !mountedRef.current ||
          requestGeneration !== requestGenerationRef.current
        )
          return;
        const result = normalizeWorkflowImportResult(value);
        if (!result) {
          throw new Error(
            i18next.t('workflow.promptDebugger.importResponseInvalid')
          );
        }
        // Older servers return only a Workflow and preserve the original
        // behaviour.  A report is shown inline so users can review unresolved
        // references before opening the canvas.
        if (result.report) {
          setImportResult(result);
          return;
        }
        openImportedCanvas(result, requestGeneration);
      })
      .catch((error: unknown) => {
        if (
          !mountedRef.current ||
          requestGeneration !== requestGenerationRef.current
        )
          return;
        if (!shouldShowWorkflowImportError(error)) return;
        const errorMessage =
          typeof error === 'object' &&
          error !== null &&
          'message' in error &&
          typeof error.message === 'string'
            ? error.message.trim()
            : '';
        message.error(
          errorMessage || i18next.t('workflow.promptDebugger.importFailed')
        );
      })
      .finally(() => {
        if (requestGeneration === requestGenerationRef.current) {
          requestInFlightRef.current = false;
        }
        if (
          mountedRef.current &&
          requestGeneration === requestGenerationRef.current
        ) {
          setLoading(false);
        }
      });
  };

  return (
    <Modal
      open
      centered
      zIndex={1201}
      width={importResult?.report ? 560 : 480}
      title={i18next.t('workflow.promptDebugger.importWorkflow')}
      footer={null}
      // Keep ESC handling enabled so rc-dialog consumes the event. During an
      // import, closeModal's synchronous ref guard rejects the cancellation
      // without allowing ESC to reach an ancestor modal.
      keyboard
      maskClosable={false}
      closable={!loading}
      onCancel={closeModal}
      destroyOnClose
    >
      {importResult?.report ? (
        <ImportReportView
          report={importResult.report}
          onOpenCanvas={openImportedCanvas}
        />
      ) : (
        <>
          <div className="mt-6">
            <Dragger
              {...uploadProps}
              disabled={loading}
              className="icon-upload"
            >
              <img src={uploadAct} className="w-8 h-8" alt="" />
              <div className="font-medium mt-6">
                {i18next.t('workflow.promptDebugger.dragFileHereOr')}
                <span className="text-[#6356EA]">
                  {i18next.t('workflow.promptDebugger.selectFile')}
                </span>
              </div>
              <p className="text-desc mt-2">
                {i18next.t('workflow.promptDebugger.fileFormatYmlYaml')}
              </p>
            </Dragger>
          </div>
          {uploadList?.length > 0 && (
            <div className="mt-3">
              {uploadList?.map(item => (
                <div
                  key={item?.id}
                  className="bg-[#F6F6F6] rounded-lg px-[5px] py-0.5 flex items-center justify-between"
                >
                  <div className="flex items-center gap-[22px] overflow-hidden">
                    <div
                      className="w-[32px] h-[32px] bg-[#fff] rounded-lg flex items-center justify-center"
                      style={{
                        boxShadow: '0px 2px 4px 0px rgba(46,51,68,0.04)',
                      }}
                    >
                      <img
                        src={typeList.get(item?.type || '')}
                        className="w-[18px] h-[18px]"
                        alt=""
                      />
                    </div>
                    <div className="flex-1 text-overflow" title={item?.name}>
                      {item?.name}
                    </div>
                    <div>{item?.total}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="flex justify-end gap-4 mt-10">
            <Button
              type="text"
              className="origin-btn px-[24px]"
              onClick={closeModal}
              disabled={loading}
            >
              {i18next.t('workflow.promptDebugger.cancel')}
            </Button>
            <Button
              loading={loading}
              type="primary"
              disabled={uploadList.length === 0}
              className="px-[24px]"
              onClick={handleOk}
            >
              {i18next.t('common.save')}
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
}

export default WorkflowImportModal;
