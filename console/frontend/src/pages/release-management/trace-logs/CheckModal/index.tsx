import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Tree, message, Tag } from 'antd';
import { DownOutlined } from '@ant-design/icons';
import TreeNode from './TreeNode/index';
import ContentDisplay from './ContentDisplay/index';
import CopyButton from '../common/CopyButton';
import { DataType } from '../config/type';
import {
  INPUT_FIELD_PRIORITY,
  OUTPUT_FIELD_PRIORITY,
  findFieldByPriority,
} from '../config/index';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';

import styles from './index.module.scss';

interface OcrNodeData {
  key?: React.Key; // 添加 key 属性以匹配树形结构的 key 字段
  next_log_ids?: string[];
  children?: OcrNodeData[];
  data?: {
    output?: any; // 输出
    input?: {
      AGENT_USER_INPUT?: string; // 输入
      [key: string]: any;
    };
    usage?: {
      completion_tokens: number;
      prompt_tokens: number;
      question_tokens: number;
      total_tokens: number;
    };
    config?: any;
  };
  first_frame_duration?: number;
  node_name?: string;
  llm_output?: string;
  end_time?: number;
  func_id?: string;
  func_type?: string;
  sid?: string;
  running_status?: boolean; // 运行状态
  status_code?: string; // 状态码
  duration?: number;
  executionTime?: string;
  start_time?: number;
  id?: string;
  logs?: any[];
  func_name?: string;
  node_id?: string;
  node_type?: string; // 节点类型
  selectable?: boolean;
  isVirtual?: boolean;
}

interface OcrModalProps {
  visible: boolean;
  onCancel: () => void;
  record?: DataType | null;
}

// 树形数据key
const KEY = 'key';

/**
 * OCR图片识别弹窗组件
 * @param props 组件属性
 * @returns OCR弹窗组件
 */
const OcrModal: React.FC<OcrModalProps> = ({ visible, onCancel, record }) => {
  const [selectedNode, setSelectedNode] = useState<OcrNodeData | null>(null);
  const [treeData, setTreeData] = useState<OcrNodeData[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<React.Key[]>([]);
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
  const [traceId, setTraceId] = useState<string | null>(null);
  const { t } = useTranslation();

  const findFirstSelectableNode = useCallback(
    (nodes: OcrNodeData[]): OcrNodeData | null => {
      for (const node of nodes) {
        if (node.selectable !== false) {
          return node;
        }

        if (node.children?.length) {
          const childNode = findFirstSelectableNode(node.children);
          if (childNode) {
            return childNode;
          }
        }
      }

      return null;
    },
    []
  );

  const collectExpandedKeys = useCallback(
    (nodes: OcrNodeData[]): React.Key[] => {
      const keys: React.Key[] = [];

      const visit = (nodeList: OcrNodeData[]) => {
        nodeList.forEach(node => {
          if (node.children?.length) {
            if (node.node_type !== 'iteration-option') {
              keys.push(node[KEY] || '');
              visit(node.children);
            }
          }
        });
      };

      visit(nodes);
      return keys.filter(Boolean);
    },
    []
  );

  // 模拟树形数据
  useEffect(() => {
    if (visible) {
      const traceData = record?.trace || [];
      setTreeData(traceData);
      setExpandedKeys(collectExpandedKeys(traceData));

      const initialNode = findFirstSelectableNode(traceData);
      if (initialNode) {
        setSelectedNode(initialNode);
        setSelectedKeys([initialNode[KEY]]);
        setTraceId(initialNode.id);
      } else {
        setSelectedNode(null);
        setSelectedKeys([]);
        setTraceId(null);
      }
    }
  }, [visible, record, collectExpandedKeys, findFirstSelectableNode]);

  // 处理树节点选择事件
  const onSelect = (selectedKeys: React.Key[], info: any) => {
    const node = info.node;
    if (node?.selectable === false) {
      return;
    }
    setSelectedNode(node);
    setSelectedKeys(selectedKeys);
    setTraceId(node.id);
  };

  // 自定义树节点渲染
  const titleRender = (nodeData: OcrNodeData) => {
    // 为不同的节点设置合适的类型
    const nodeType = nodeData.node_type;

    return (
      <TreeNode
        title={nodeData.node_name || ''}
        type={nodeType}
        isSelected={selectedKeys.includes(nodeData[KEY] || '')}
        executionTime={nodeData.executionTime}
        duration={nodeData.duration}
      />
    );
  };

  /**
   * 获取输入内容 - 兼容多种字段名
   * 按优先级顺序查找：input -> prompt -> text -> AGENT_USER_INPUT
   */
  const getInputContent = () => {
    return findFieldByPriority(selectedNode?.data?.input, INPUT_FIELD_PRIORITY);
  };

  /**
   * 获取输出内容 - 兼容多种字段名
   * 按优先级顺序查找：output -> data
   */
  const getOutputContent = () => {
    return findFieldByPriority(
      selectedNode?.data?.output,
      OUTPUT_FIELD_PRIORITY
    );
  };

  // 渲染状态信息
  const renderStatusInfo = useCallback(() => {
    const statusItems = [
      {
        label: t('releaseDetail.TraceLogPage.checkStatus'),
        value: selectedNode ? (
          selectedNode.running_status ? (
            <Tag color="success">
              {t('releaseDetail.TraceLogPage.checkSuccess')}
            </Tag>
          ) : (
            <Tag color="error">{t('releaseDetail.TraceLogPage.checkFail')}</Tag>
          )
        ) : (
          '-'
        ),
      },
      {
        label: t('releaseDetail.TraceLogPage.statusCode'),
        value: `${record?.statusCode}`,
      },
      {
        label: t('releaseDetail.TraceLogPage.nodeID'),
        value: (
          <div className={styles.statusValue}>
            <div
              className={styles.nodeIdText}
              title={selectedNode?.func_id || '-'}
            >
              {selectedNode?.func_id || '-'}
            </div>
            {selectedNode?.func_id && (
              <CopyButton
                text={selectedNode?.func_id}
                className={styles.nodeCopyIcon}
              />
            )}
          </div>
        ),
      },
      {
        label: t('releaseDetail.TraceLogPage.nodeType'),
        value: selectedNode?.func_type,
      },
      {
        label: t('releaseDetail.TraceLogPage.nodeRunTime'),
        value: selectedNode?.executionTime,
      },
      {
        label: t('releaseDetail.TraceLogPage.nodeStartTime'),
        value: selectedNode
          ? dayjs(selectedNode.start_time).format('YYYY-MM-DD HH:mm:ss')
          : '-',
      },
    ];

    return (
      <div className={styles.statusContent}>
        {statusItems.map((item, index) => (
          <div className={styles.statusItem} key={index}>
            <div className={styles.statusLabel}>{item.label}</div>
            <div className={styles.statusValue}>{item.value || '-'}</div>
          </div>
        ))}
      </div>
    );
  }, [selectedNode, record]);

  // 自定义弹窗标题
  const modalTitle = (
    <div className={styles.modalTitleWrapper}>
      <span>{t('releaseDetail.TraceLogPage.callTreeDetail')}</span>
      {traceId && (
        <div className={styles.traceIdWrapper}>
          <span className={styles.traceIdLabel}>TraceID</span>
          <CopyButton text={traceId} className={styles.copyIcon} />
        </div>
      )}
    </div>
  );

  return (
    <Modal
      title={modalTitle}
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={1000}
      maskClosable={false}
      className={styles.ocrModal}
      destroyOnClose
    >
      <div className={styles.modalContent}>
        {/* 左侧树形菜单 */}
        <div className={styles.leftSide}>
          <div className={styles.treeTitle}>
            {t('releaseDetail.TraceLogPage.callTree')}
          </div>
          <div className={styles.treeContainer}>
            <Tree
              className={styles.customTree}
              fieldNames={{
                children: 'children',
                title: 'func_name',
                key: KEY,
              }}
              showLine={{ showLeafIcon: false }}
              switcherIcon={<DownOutlined />}
              onSelect={onSelect}
              onExpand={keys => setExpandedKeys(keys)}
              expandedKeys={expandedKeys}
              selectedKeys={selectedKeys}
              treeData={treeData as any}
              titleRender={(node: any) => titleRender(node as OcrNodeData)}
            />
          </div>
        </div>

        {/* 右侧内容展示区 */}
        <div className={styles.rightSide}>
          <div className={styles.rightContent}>
            <div className={styles.contentWrapper}>
              {/* 左侧输入输出区域 */}
              <div className={styles.contentLeft}>
                {/* 输入区域 */}
                <ContentDisplay
                  title={t('releaseDetail.TraceLogPage.input')}
                  className={styles.inputContent}
                  content={getInputContent()}
                />

                {/* 输出区域 */}
                <ContentDisplay
                  title={t('releaseDetail.TraceLogPage.output')}
                  className={styles.outputContent}
                  content={getOutputContent()}
                />
              </div>

              {/* 右侧状态信息区域 */}
              <div className={styles.contentRight}>
                <div className={styles.statusSection}>{renderStatusInfo()}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default OcrModal;
