import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Button,
  Form,
  Input,
  Modal,
  Segmented,
  Tree,
  Typography,
  message as antdMessage,
} from 'antd';
import type { DataNode, TreeProps } from 'antd/es/tree';
import {
  CodeOutlined,
  DeleteOutlined,
  EditOutlined,
  FileMarkdownOutlined,
  FileOutlined,
  FolderOpenOutlined,
  FolderOutlined,
  PlusOutlined,
  SaveOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import MonacoEditor from '@/components/monaco-editor';
import MarkdownRender from '@/components/markdown-render';
import {
  createSkillFile,
  createSkillFolder,
  deleteSkillEntry,
  getSkillFileContent,
  listSkillTree,
  moveSkillEntry,
  renameSkillEntry,
  updateSkillFileContent,
  uploadSkillDirectory,
  uploadSkillFiles,
} from '@/services/skill';
import { SkillFileContent, SkillTreeNode } from '@/types/skill';
import styles from './index.module.scss';

const FILE_ACCEPT = '.md,.txt,.yaml,.yml,.json,.py,.js,.ts,.csv,.xml';

type DialogMode = 'folder' | 'file' | 'rename' | null;
type MessageType = 'success' | 'error' | 'warning';

function SkillPage(): React.ReactElement {
  const [form] = Form.useForm();
  const fileUploadRef = useRef<HTMLInputElement | null>(null);
  const directoryUploadRef = useRef<HTMLInputElement | null>(null);
  const editorRef = useRef<{
    scrollToTop: () => void;
    scrollToBottom: () => void;
  } | null>(null);
  const [treeData, setTreeData] = useState<SkillTreeNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<SkillTreeNode | null>(null);
  const [dialogParentId, setDialogParentId] = useState<number | null>(null);
  const [currentFile, setCurrentFile] = useState<SkillFileContent | null>(null);
  const [editorValue, setEditorValue] = useState('');
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [submitting, setSubmitting] = useState(false);
  const [directoryUploading, setDirectoryUploading] = useState(false);
  const [dirty, setDirty] = useState(false);
  const keywordRef = useRef('');
  const selectedIdRef = useRef<number | null>(null);
  const submittingRef = useRef(false);
  const revalidateTimerRef = useRef<number | null>(null);

  useEffect(() => {
    keywordRef.current = keyword;
  }, [keyword]);

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  useEffect(() => {
    submittingRef.current = submitting;
  }, [submitting]);

  useEffect(() => {
    return (): void => {
      if (revalidateTimerRef.current !== null) {
        window.clearTimeout(revalidateTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const input = directoryUploadRef.current;
    if (!input) {
      return;
    }
    input.setAttribute('webkitdirectory', '');
    input.setAttribute('directory', '');
  }, []);

  const nodeMap = useMemo(() => {
    const map = new Map<number, SkillTreeNode>();
    const walk = (nodes: SkillTreeNode[]): void => {
      nodes.forEach(node => {
        map.set(node.id, node);
        if (node.children?.length) {
          walk(node.children);
        }
      });
    };
    walk(treeData);
    return map;
  }, [treeData]);

  const selectedNode = selectedId ? nodeMap.get(selectedId) || null : null;

  const loadTree = useCallback(
    async (
      nextKeyword?: string,
      nextSelectedId?: number | null
    ): Promise<void> => {
      const resolvedKeyword = nextKeyword ?? keywordRef.current;
      const resolvedSelectedId =
        typeof nextSelectedId === 'undefined'
          ? selectedIdRef.current
          : nextSelectedId;
      setLoading(true);
      try {
        const data = await listSkillTree(resolvedKeyword || undefined);
        const nextTreeData = data || [];
        setTreeData(nextTreeData);
        const existingIds = new Set(
          flattenNodes(nextTreeData).map(node => node.id)
        );
        setExpandedKeys(prev =>
          prev.filter(key => existingIds.has(Number(key)))
        );
        if (
          resolvedSelectedId &&
          !new Map(flattenNodes(nextTreeData).map(node => [node.id, node])).has(
            resolvedSelectedId
          )
        ) {
          setSelectedId(null);
          setCurrentFile(null);
          setEditorValue('');
          setDirty(false);
        }
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const refreshTree = useCallback(
    async (
      nextKeyword?: string,
      nextSelectedId?: number | null
    ): Promise<void> => {
      await loadTree(nextKeyword, nextSelectedId);
    },
    [loadTree]
  );

  const syncTreeAfterMutation = useCallback(
    async ({
      targetIds,
      expandIds = [],
      selectedId: nextSelectedId,
      keyword: syncKeyword,
      settleMs = 0,
      alwaysRefresh = false,
      successText,
    }: {
      targetIds: number[];
      expandIds?: Array<number | null | undefined>;
      selectedId?: number | null;
      keyword?: string;
      settleMs?: number;
      alwaysRefresh?: boolean;
      successText: string;
    }): Promise<void> => {
      const normalizedTargetIds = targetIds.filter(Boolean);
      const keywordForSync =
        typeof syncKeyword === 'undefined' ? keywordRef.current : syncKeyword;
      setLoading(true);
      try {
        let synced = false;
        for (let attempt = 0; attempt < 12; attempt += 1) {
          const nextTreeData = await listSkillTree(keywordForSync || undefined);
          const flattened = flattenNodes(nextTreeData);
          const existingIds = new Set(flattened.map(node => node.id));
          setTreeData(nextTreeData);
          setExpandedKeys(prev =>
            mergeExpandedKeys(
              prev.filter(key => existingIds.has(Number(key))),
              expandIds
            )
          );
          if (
            normalizedTargetIds.length === 0 ||
            normalizedTargetIds.every(id => existingIds.has(id))
          ) {
            synced = true;
            break;
          }
          await wait(300);
        }
        if (settleMs > 0) {
          await wait(settleMs);
        }
        if (!synced || alwaysRefresh) {
          await refreshTree(keywordForSync, nextSelectedId);
        }
        safeMessage('success', successText);
      } finally {
        setLoading(false);
      }
    },
    [refreshTree]
  );

  const scheduleRevalidate = useCallback(
    (nextKeyword?: string, nextSelectedId?: number | null): void => {
      if (revalidateTimerRef.current !== null) {
        window.clearTimeout(revalidateTimerRef.current);
      }
      revalidateTimerRef.current = window.setTimeout(() => {
        void refreshTree(nextKeyword, nextSelectedId);
        revalidateTimerRef.current = null;
      }, 400);
    },
    [refreshTree]
  );

  useEffect(() => {
    void loadTree('');
  }, [loadTree]);

  useEffect(() => {
    const handleSearch = (event: Event): void => {
      const detail = (event as CustomEvent<{ value: string; type: string }>)
        .detail;
      if (detail?.type !== 'skill') {
        return;
      }
      setKeyword(detail.value || '');
      void loadTree(detail.value || '');
    };
    const handleCreate = (): void => {
      form.resetFields();
      setDialogParentId(0);
      setDialogMode('folder');
    };
    window.addEventListener('headerSearch', handleSearch);
    window.addEventListener('headerCreateSkill', handleCreate);
    return (): void => {
      window.removeEventListener('headerSearch', handleSearch);
      window.removeEventListener('headerCreateSkill', handleCreate);
    };
  }, [form, loadTree]);

  const toTreeData = (nodes: SkillTreeNode[]): DataNode[] =>
    nodes.map(node => ({
      key: node.id,
      title: (
        <div className={styles.treeNode}>
          {node.entryType === 'folder' ? (
            <FolderOutlined />
          ) : node.skillEntry ? (
            <FileMarkdownOutlined />
          ) : (
            <FileOutlined />
          )}
          <div className={styles.treeLabel}>
            <span className={styles.treeName}>{node.name}</span>
            {node.skillEntry ? (
              <span className={styles.treeBadge}>SKILL</span>
            ) : null}
          </div>
        </div>
      ),
      children: toTreeData(node.children || []),
      isLeaf: node.entryType === 'file',
    }));

  const ensureDiscardChanges = async (): Promise<boolean> => {
    if (!dirty) {
      return true;
    }
    return await new Promise(resolve => {
      Modal.confirm({
        title: '放弃未保存的修改？',
        content: '当前文件还有未保存内容，继续切换会丢失本次修改。',
        okText: '放弃',
        cancelText: '继续编辑',
        onOk: () => resolve(true),
        onCancel: () => resolve(false),
      });
    });
  };

  const openFile = async (id: number): Promise<void> => {
    const detail = await getSkillFileContent(id);
    setCurrentFile(detail);
    setEditorValue(detail.content || '');
    setDirty(false);
    setMode(detail.fileExt === 'md' ? 'preview' : 'edit');
    setTimeout(() => editorRef.current?.scrollToTop?.(), 0);
  };

  const handleSelect = async (keys: React.Key[]): Promise<void> => {
    const targetId = Number(keys?.[0]);
    if (!targetId || !(await ensureDiscardChanges())) {
      return;
    }
    setSelectedId(targetId);
    const node = nodeMap.get(targetId);
    if (node?.entryType === 'file') {
      if (node.parentId) {
        setExpandedKeys(prev => mergeExpandedKeys(prev, [node.parentId]));
      }
      await openFile(targetId);
    } else {
      setExpandedKeys(prev => mergeExpandedKeys(prev, [targetId]));
      setCurrentFile(null);
      setEditorValue('');
      setDirty(false);
    }
  };

  const handleSave = async (): Promise<void> => {
    if (
      submittingRef.current ||
      !selectedNode ||
      selectedNode.entryType !== 'file' ||
      !selectedId
    ) {
      return;
    }
    submittingRef.current = true;
    setSubmitting(true);
    try {
      const saved = await updateSkillFileContent({
        id: selectedId,
        content: editorValue,
      });
      setCurrentFile(saved);
      setEditorValue(saved.content || '');
      setDirty(false);
      setTreeData(prev =>
        patchTreeNode(prev, toTreeNode(saved, selectedNode.parentId))
      );
      safeMessage('success', 'Skill 文件已保存');
      scheduleRevalidate(keywordRef.current, selectedId);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const handleDialogSubmit = async (): Promise<void> => {
    if (submittingRef.current) {
      return;
    }
    submittingRef.current = true;
    setSubmitting(true);
    try {
      const values = await form.validateFields();
      const resolvedParentId =
        dialogParentId ??
        (selectedNode?.entryType === 'folder'
          ? selectedNode.id
          : selectedNode?.parentId || 0);

      if (dialogMode === 'folder') {
        const createdFolder = await createSkillFolder({
          parentId: resolvedParentId,
          name: values.name,
        });
        setDialogMode(null);
        setDialogParentId(null);
        form.resetFields();
        setTreeData(prev => insertTreeNode(prev, createdFolder));
        setExpandedKeys(prev =>
          mergeExpandedKeys(prev, [resolvedParentId, createdFolder.id])
        );
        await syncTreeAfterMutation({
          targetIds: [createdFolder.id],
          expandIds: [resolvedParentId, createdFolder.id],
          selectedId: createdFolder.id,
          successText: '文件夹已创建',
        });
      } else if (dialogMode === 'file') {
        const created = await createSkillFile({
          parentId: resolvedParentId,
          name: values.name,
          content: values.content || '',
        });
        setDialogMode(null);
        setDialogParentId(null);
        form.resetFields();
        setSelectedId(created.id);
        setCurrentFile(created);
        setEditorValue(created.content || '');
        setMode(created.fileExt === 'md' ? 'preview' : 'edit');
        setDirty(false);
        setTreeData(prev =>
          insertTreeNode(prev, toTreeNode(created, resolvedParentId, true))
        );
        setExpandedKeys(prev => mergeExpandedKeys(prev, [resolvedParentId]));
        await syncTreeAfterMutation({
          targetIds: [created.id],
          expandIds: [resolvedParentId],
          selectedId: created.id,
          successText: '文件已创建',
        });
      } else if (dialogMode === 'rename' && selectedNode) {
        const renamed = await renameSkillEntry({
          id: selectedNode.id,
          name: values.name,
        });
        setDialogMode(null);
        form.resetFields();
        setTreeData(prev => patchTreeNode(prev, renamed));
        setCurrentFile(prev =>
          prev && prev.id === renamed.id
            ? {
                ...prev,
                name: renamed.name,
                fileExt: renamed.fileExt,
                skillEntry: renamed.skillEntry,
                skillName: renamed.skillName,
                skillDescription: renamed.skillDescription,
                updateTime: renamed.updateTime,
              }
            : prev
        );
        safeMessage('success', '名称已更新');
        await refreshTree(keywordRef.current, selectedNode.id);
      }
    } finally {
      setDialogParentId(null);
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (!selectedNode || submittingRef.current) {
      return;
    }
    setDeleteTarget(selectedNode);
  };

  const handleDeleteConfirm = async (): Promise<void> => {
    if (!deleteTarget || submittingRef.current) {
      return;
    }
    submittingRef.current = true;
    setSubmitting(true);
    try {
      await deleteSkillEntry(deleteTarget.id);
      setTreeData(prev => removeTreeNode(prev, deleteTarget.id));
      setExpandedKeys(prev =>
        prev.filter(key => Number(key) !== deleteTarget.id)
      );
      setDeleteTarget(null);
      setSelectedId(null);
      setCurrentFile(null);
      setEditorValue('');
      setDirty(false);
      safeMessage('success', '已删除');
      await refreshTree(keywordRef.current, null);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const handleRename = (): void => {
    if (!selectedNode) {
      return;
    }
    form.setFieldsValue({ name: selectedNode.name });
    setDialogParentId(null);
    setDialogMode('rename');
  };

  const handleUpload = async (files: FileList | null): Promise<void> => {
    if (submittingRef.current || !files?.length) {
      return;
    }
    const parentId =
      selectedNode?.entryType === 'folder'
        ? selectedNode.id
        : selectedNode?.parentId || 0;
    if (!parentId) {
      safeMessage('warning', '请先选中一个目录，再上传文件');
      return;
    }
    submittingRef.current = true;
    setSubmitting(true);
    try {
      const uploaded = await uploadSkillFiles(parentId, Array.from(files));

      setTreeData(prev =>
        uploaded.reduce(
          (nextTree, file) =>
            insertTreeNode(nextTree, toTreeNode(file, parentId, true)),
          prev
        )
      );
      setExpandedKeys(prev => mergeExpandedKeys(prev, [parentId]));
      await syncTreeAfterMutation({
        targetIds: uploaded.map(file => file.id),
        expandIds: [parentId],
        selectedId: parentId,
        successText: `已上传 ${uploaded.length} 个文件`,
      });
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
      if (fileUploadRef.current) {
        fileUploadRef.current.value = '';
      }
    }
  };

  const handleDirectoryUpload = async (
    files: FileList | null
  ): Promise<void> => {
    if (submittingRef.current || !files?.length) {
      return;
    }
    submittingRef.current = true;
    setSubmitting(true);
    setDirectoryUploading(true);
    setLoading(true);
    try {
      const uploadResult = await uploadSkillDirectory(Array.from(files));
      const uploadedNodes = uploadResult.uploadedNodes || [];
      const skippedCount = uploadResult.skippedFiles?.length || 0;
      const importedFileCount = uploadedNodes.filter(
        node => node.entryType === 'file'
      ).length;
      const nextTreeData = uploadResult.tree || [];
      const existingIds = new Set(
        flattenNodes(nextTreeData).map(node => node.id)
      );
      const uploadedFolderIds = uploadedNodes
        .filter(node => node.entryType === 'folder')
        .map(node => node.id);
      setKeyword('');
      setTreeData(nextTreeData);
      setExpandedKeys(prev =>
        mergeExpandedKeys(
          prev.filter(key => existingIds.has(Number(key))),
          uploadedFolderIds
        )
      );
      if (selectedIdRef.current && !existingIds.has(selectedIdRef.current)) {
        setSelectedId(null);
        setCurrentFile(null);
        setEditorValue('');
        setDirty(false);
      }
      const resultText =
        skippedCount > 0
          ? `目录上传完成，导入 ${importedFileCount} 个文件，跳过 ${skippedCount} 个不支持文件`
          : `目录上传完成，共导入 ${importedFileCount} 个文件`;
      safeMessage(importedFileCount > 0 ? 'success' : 'warning', resultText);
    } catch (error) {
      safeMessage('error', '目录上传失败，请稍后重试');
    } finally {
      setLoading(false);
      setDirectoryUploading(false);
      submittingRef.current = false;
      setSubmitting(false);
      if (directoryUploadRef.current) {
        directoryUploadRef.current.value = '';
      }
    }
  };

  const onDrop: TreeProps['onDrop'] = async info => {
    if (submittingRef.current) {
      return;
    }
    const dragId = Number(info.dragNode.key);
    const dropId = Number(info.node.key);
    const targetNode = nodeMap.get(dropId);
    if (!targetNode) {
      return;
    }
    submittingRef.current = true;
    let targetParentId = 0;
    let sortOrder = 0;
    if (!info.dropToGap && targetNode.entryType === 'folder') {
      targetParentId = targetNode.id;
      sortOrder = (targetNode.children?.length || 0) + 1;
    } else {
      targetParentId = targetNode.parentId || 0;
      const siblings = flattenNodes(treeData).filter(
        node => node.parentId === targetParentId
      );
      sortOrder = Math.max(
        siblings.findIndex(node => node.id === dropId) + 1,
        0
      );
    }
    setSubmitting(true);
    try {
      const movedNode = await moveSkillEntry({
        id: dragId,
        targetParentId,
        sortOrder,
      });
      setTreeData(prev => moveTreeNode(prev, movedNode));
      setExpandedKeys(prev => mergeExpandedKeys(prev, [targetParentId]));
      await refreshTree(keywordRef.current, dragId);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const clearSelection = async (): Promise<void> => {
    if (!(await ensureDiscardChanges())) {
      return;
    }
    setSelectedId(null);
    setCurrentFile(null);
    setEditorValue('');
    setDirty(false);
  };

  const renderEmpty = (): React.ReactElement => (
    <div className={styles.empty}>
      <div className={styles.emptyCard}>
        <div className={styles.eyebrow}>
          <span className={styles.statusDot}></span>
          Skill Filesystem
        </div>
        <div className={styles.emptyTitle}>用文件组织你的 Agent 技能</div>
        <div className={styles.emptyDesc}>
          推荐使用“技能目录 + SKILL.md + 脚本或参考文件”的结构管理内容。 Agent
          节点只注入必要的 skill 信息，详细内容按需从目录中读取。
        </div>
        <div className={styles.folderActions}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              form.resetFields();
              setDialogMode('folder');
            }}
          >
            新建文件夹
          </Button>
          <Typography.Text type="secondary">
            先选中一个目录，再在右侧创建文件或上传文件。
          </Typography.Text>
        </div>
      </div>
    </div>
  );

  const renderFolderView = (): React.ReactElement => (
    <div className={styles.empty}>
      <div className={styles.emptyCard}>
        <div className={styles.eyebrow}>
          <FolderOpenOutlined />
          当前目录
        </div>
        <div className={styles.emptyTitle}>{selectedNode?.name}</div>
        <div className={styles.emptyDesc}>
          在这个目录下创建 SKILL.md、说明文档、脚本和参考资源。 当目录中存在
          SKILL.md 时，它会出现在 Agent 节点的 skill 导入列表里。
        </div>
        <div className={styles.folderActions}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              form.resetFields();
              setDialogMode('folder');
            }}
          >
            新建文件夹
          </Button>
          <Button
            icon={<CodeOutlined />}
            onClick={() => {
              form.setFieldsValue({ name: 'SKILL.md', content: '' });
              setDialogMode('file');
            }}
          >
            新建文件
          </Button>
          <Button
            icon={<UploadOutlined />}
            onClick={() => fileUploadRef.current?.click()}
          >
            上传文件
          </Button>
          <Button icon={<EditOutlined />} onClick={handleRename}>
            重命名
          </Button>
          <Button danger icon={<DeleteOutlined />} onClick={handleDelete}>
            删除
          </Button>
        </div>
      </div>
    </div>
  );

  const renderFileView = (): React.ReactElement => (
    <>
      <div className={styles.editorHeader}>
        <div className={styles.editorMeta}>
          <div className={styles.editorTitleRow}>
            {selectedNode?.skillEntry ? (
              <FileMarkdownOutlined />
            ) : (
              <FileOutlined />
            )}
            <div className={styles.editorTitle}>{selectedNode?.name}</div>
            {selectedNode?.skillEntry ? (
              <span className={styles.treeBadge}>SKILL</span>
            ) : null}
            {dirty ? <span className={styles.monoTag}>UNSAVED</span> : null}
          </div>
          <div className={styles.editorSub}>
            {currentFile?.skillName ? (
              <span>技能名: {currentFile.skillName}</span>
            ) : null}
            <span className={styles.monoTag}>
              .{currentFile?.fileExt || 'txt'}
            </span>
          </div>
          {currentFile?.skillDescription ? (
            <div
              className={styles.editorDescription}
              title={currentFile.skillDescription}
            >
              {currentFile.skillDescription}
            </div>
          ) : null}
        </div>
        <div className={styles.editorActions}>
          <Segmented
            value={mode}
            onChange={value => setMode(value as 'edit' | 'preview')}
            options={[
              { label: '编辑', value: 'edit' },
              { label: '预览', value: 'preview' },
            ]}
          />
          <Button icon={<EditOutlined />} onClick={handleRename}>
            重命名
          </Button>
          <Button danger icon={<DeleteOutlined />} onClick={handleDelete}>
            删除
          </Button>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            loading={submitting}
            onClick={() => void handleSave()}
          >
            保存
          </Button>
        </div>
      </div>
      <div className={styles.editorBody}>
        <div className={styles.editorCanvas}>
          {mode === 'edit' ? (
            <MonacoEditor
              ref={editorRef}
              language={resolveLanguage(currentFile?.fileExt)}
              value={editorValue}
              onChange={value => {
                setEditorValue(value || '');
                setDirty(true);
              }}
              options={{
                fontSize: 13,
                wordWrap: 'on',
              }}
            />
          ) : currentFile?.fileExt === 'md' ? (
            <div className={styles.preview}>
              <MarkdownRender content={editorValue} isSending={false} />
            </div>
          ) : (
            <pre className={styles.codePreview}>{editorValue}</pre>
          )}
        </div>
      </div>
    </>
  );

  return (
    <div className={styles.page}>
      <input
        ref={fileUploadRef}
        type="file"
        accept={FILE_ACCEPT}
        multiple
        hidden
        onChange={event => void handleUpload(event.target.files)}
      />
      <input
        ref={directoryUploadRef}
        type="file"
        hidden
        onChange={event => void handleDirectoryUpload(event.target.files)}
      />
      <div className={styles.shell}>
        <div className={`${styles.panel} ${styles.sidebar}`}>
          <div className={styles.sidebarHeader}>
            <div className={styles.eyebrow}>
              <span className={styles.statusDot}></span>
              Resource / Skill
            </div>
            <div className={styles.title}>Skill 文件系统</div>
            <div className={styles.desc}>
              用目录组织 `SKILL.md`、脚本和参考文件，支持在线编辑与 Agent
              节点渐进式加载。
            </div>
            <div className={styles.toolbar}>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                disabled={submitting}
                onClick={() => {
                  form.resetFields();
                  setDialogParentId(0);
                  setDialogMode('folder');
                }}
              >
                文件夹
              </Button>
              <Button
                icon={<UploadOutlined />}
                loading={directoryUploading}
                disabled={submitting && !directoryUploading}
                onClick={() => directoryUploadRef.current?.click()}
              >
                上传目录
              </Button>
            </div>
            {loading ? (
              <Typography.Text type="secondary">加载中...</Typography.Text>
            ) : keyword ? (
              <Typography.Text type="secondary">
                当前筛选: {keyword}
              </Typography.Text>
            ) : null}
          </div>
          <div
            className={styles.treeWrap}
            onClick={event => {
              if (event.target === event.currentTarget) {
                void clearSelection();
              }
            }}
          >
            <Tree
              blockNode
              draggable
              expandedKeys={expandedKeys}
              selectedKeys={selectedId ? [selectedId] : []}
              treeData={toTreeData(treeData)}
              onExpand={keys => setExpandedKeys(keys)}
              onSelect={keys => void handleSelect(keys)}
              onDrop={info => void onDrop(info)}
            />
          </div>
        </div>

        <div className={`${styles.panel} ${styles.editorPanel}`}>
          {!selectedNode
            ? renderEmpty()
            : selectedNode.entryType === 'folder'
              ? renderFolderView()
              : renderFileView()}
        </div>
      </div>

      <Modal
        open={deleteTarget !== null}
        title={
          deleteTarget
            ? `删除${deleteTarget.entryType === 'folder' ? '文件夹' : '文件'}`
            : '删除'
        }
        okText="删除"
        cancelText="取消"
        okButtonProps={{ danger: true }}
        confirmLoading={submitting}
        onCancel={() => {
          if (submittingRef.current) {
            return;
          }
          setDeleteTarget(null);
        }}
        onOk={() => void handleDeleteConfirm()}
      >
        <Typography.Text>
          {deleteTarget?.entryType === 'folder'
            ? '删除后会同时移除该目录下的全部文件和子目录。'
            : '删除后不可恢复。'}
        </Typography.Text>
      </Modal>

      <Modal
        open={dialogMode !== null}
        title={
          dialogMode === 'folder'
            ? '新建文件夹'
            : dialogMode === 'file'
              ? '新建文件'
              : '重命名'
        }
        okText="确定"
        cancelText="取消"
        confirmLoading={submitting}
        onCancel={() => {
          setDialogParentId(null);
          setDialogMode(null);
          form.resetFields();
        }}
        onOk={handleDialogSubmit}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="名称"
            name="name"
            rules={[{ required: true, message: '请输入名称' }]}
          >
            <Input
              placeholder={
                dialogMode === 'folder' ? '例如：xiaohongshu' : '例如：SKILL.md'
              }
            />
          </Form.Item>
          {dialogMode === 'file' ? (
            <Form.Item label="初始内容" name="content">
              <Input.TextArea
                rows={8}
                placeholder="支持 Markdown / YAML / 代码文本"
              />
            </Form.Item>
          ) : null}
        </Form>
      </Modal>
    </div>
  );
}

function flattenNodes(nodes: SkillTreeNode[]): SkillTreeNode[] {
  return nodes.flatMap(node => [node, ...flattenNodes(node.children || [])]);
}

function mergeExpandedKeys(
  currentKeys: React.Key[],
  nextIds: Array<number | null | undefined>
): React.Key[] {
  const keySet = new Set(currentKeys.map(key => Number(key)));
  nextIds.forEach(id => {
    if (id) {
      keySet.add(id);
    }
  });
  return Array.from(keySet);
}

function safeMessage(type: MessageType, content: string): void {
  const handler = antdMessage[type];
  if (typeof handler === 'function') {
    handler(content);
  }
}

function wait(ms: number): Promise<void> {
  return new Promise(resolve => {
    window.setTimeout(resolve, ms);
  });
}

function toTreeNode(
  file: SkillFileContent,
  fallbackParentId?: number,
  fallbackSkillEntry?: boolean
): SkillTreeNode {
  return {
    id: file.id,
    parentId: file.parentId ?? fallbackParentId ?? 0,
    name: file.name,
    entryType: file.entryType,
    sortOrder: file.sortOrder,
    fileExt: file.fileExt,
    fileSize: file.fileSize,
    skillEntry: file.skillEntry ?? fallbackSkillEntry,
    skillName: file.skillName,
    skillDescription: file.skillDescription,
    updateTime: file.updateTime,
    children: [],
  };
}

function compareTreeNode(a: SkillTreeNode, b: SkillTreeNode): number {
  if (a.entryType !== b.entryType) {
    return a.entryType === 'folder' ? -1 : 1;
  }
  const sortDiff = (a.sortOrder || 0) - (b.sortOrder || 0);
  if (sortDiff !== 0) {
    return sortDiff;
  }
  return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
}

function sortTreeNodes(nodes: SkillTreeNode[]): SkillTreeNode[] {
  return [...nodes]
    .map(node => ({
      ...node,
      children: sortTreeNodes(node.children || []),
    }))
    .sort(compareTreeNode);
}

function insertTreeNode(
  nodes: SkillTreeNode[],
  targetNode: SkillTreeNode
): SkillTreeNode[] {
  const normalizedNode: SkillTreeNode = {
    ...targetNode,
    children: targetNode.children || [],
  };
  if (!normalizedNode.parentId) {
    return sortTreeNodes([...nodes, normalizedNode]);
  }
  let inserted = false;
  const nextNodes = nodes.map(node => {
    if (node.id === normalizedNode.parentId && node.entryType === 'folder') {
      inserted = true;
      return {
        ...node,
        children: sortTreeNodes([...(node.children || []), normalizedNode]),
      };
    }
    const currentChildren = node.children || [];
    const nextChildren = insertTreeNode(currentChildren, normalizedNode);
    if (nextChildren !== currentChildren) {
      inserted = true;
      return {
        ...node,
        children: nextChildren,
      };
    }
    return node;
  });
  return inserted ? sortTreeNodes(nextNodes) : nodes;
}

function patchTreeNode(
  nodes: SkillTreeNode[],
  targetNode: SkillTreeNode
): SkillTreeNode[] {
  let patched = false;
  const nextNodes = nodes.map(node => {
    if (node.id === targetNode.id) {
      patched = true;
      return {
        ...node,
        ...targetNode,
        children: node.children || [],
      };
    }
    const currentChildren = node.children || [];
    const nextChildren = patchTreeNode(currentChildren, targetNode);
    if (nextChildren !== currentChildren) {
      patched = true;
      return {
        ...node,
        children: nextChildren,
      };
    }
    return node;
  });
  return patched ? sortTreeNodes(nextNodes) : nodes;
}

function removeTreeNode(
  nodes: SkillTreeNode[],
  targetId: number
): SkillTreeNode[] {
  let removed = false;
  const nextNodes: SkillTreeNode[] = [];
  nodes.forEach(node => {
    if (node.id === targetId) {
      removed = true;
      return;
    }
    const currentChildren = node.children || [];
    const nextChildren = removeTreeNode(currentChildren, targetId);
    if (nextChildren !== currentChildren) {
      removed = true;
      nextNodes.push({
        ...node,
        children: nextChildren,
      });
      return;
    }
    nextNodes.push(node);
  });
  return removed ? sortTreeNodes(nextNodes) : nodes;
}

function moveTreeNode(
  nodes: SkillTreeNode[],
  targetNode: SkillTreeNode
): SkillTreeNode[] {
  const detached = detachTreeNode(nodes, targetNode.id);
  const movedNode: SkillTreeNode = {
    ...(detached.removed || { children: [] }),
    ...targetNode,
    children: detached.removed?.children || targetNode.children || [],
  };
  return insertTreeNode(detached.nodes, movedNode);
}

function detachTreeNode(
  nodes: SkillTreeNode[],
  targetId: number
): { nodes: SkillTreeNode[]; removed: SkillTreeNode | null } {
  let removedNode: SkillTreeNode | null = null;
  const nextNodes: SkillTreeNode[] = [];
  nodes.forEach(node => {
    if (node.id === targetId) {
      removedNode = node;
      return;
    }
    const currentChildren = node.children || [];
    const detached = detachTreeNode(currentChildren, targetId);
    if (detached.removed) {
      removedNode = detached.removed;
      nextNodes.push({
        ...node,
        children: detached.nodes,
      });
      return;
    }
    nextNodes.push(node);
  });
  return {
    nodes: removedNode ? sortTreeNodes(nextNodes) : nodes,
    removed: removedNode,
  };
}

function resolveLanguage(fileExt?: string): string {
  switch (fileExt) {
    case 'md':
      return 'markdown';
    case 'json':
      return 'json';
    case 'py':
      return 'python';
    case 'js':
      return 'javascript';
    case 'ts':
      return 'typescript';
    case 'xml':
      return 'xml';
    case 'yaml':
    case 'yml':
      return 'yaml';
    default:
      return 'plaintext';
  }
}

export default SkillPage;
