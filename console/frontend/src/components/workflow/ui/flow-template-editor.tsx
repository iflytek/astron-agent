import React, { useRef, useState, useMemo, useEffect, memo } from 'react';
import { cloneDeep, debounce } from 'lodash';
import useFlowsManager from '@/components/workflow/store/use-flows-manager';
import FlowTree from './flow-tree';
import { useNodeCommon } from '@/components/workflow/hooks/use-node-common';
import {
  getCurrentLineContent,
  handleReplaceInput,
  handleReplaceSpan,
  findPathToNode,
  findNodeByKey,
  findNodeByValue,
} from '@/components/workflow/utils';
import { useMemoizedFn } from 'ahooks';
import {
  UseDropdownControlReturn,
  UseFlowTemplateEditorReturn,
  UseFlowTemplateInputReturn,
} from '@/components/workflow/types';
const useFlowTemplateEditorEffect = ({
  showDropdown,
  setFocusedKey,
  setKeyboardNavigationActive,
  isFirstOpen,
  setIsFirstOpen,
  beforeUpdateNodeInputData,
  updateNodeInputData,
  setTemplateValue,
  setEditorContent,
  value,
  editorRef,
  isArrowDownPressed,
  dropdownRef,
  treeData,
  focusedKey,
  keyboardNavigationActive,
  setIsArrowDownPressed,
  setDropdownPosition,
  setIsEmpty,
  templateValue,
  isPastingRef,
  setShowDropdown,
}): void => {
  useEffect(() => {
    if (showDropdown) {
      // 每次打开下拉菜单时重置focusedKey
      setFocusedKey(null);
      setKeyboardNavigationActive(false);

      // 如果不是首次打开，重置选择状态
      if (!isFirstOpen) {
        setIsFirstOpen(true); // 为下次打开做准备
      }
    } else {
      // 隐藏下拉菜单时重置首次打开标记
      setIsFirstOpen(false);
    }
  }, [showDropdown]);
  useEffect(() => {
    if (beforeUpdateNodeInputData.current !== updateNodeInputData) {
      setTemplateValue(value);
      setEditorContent(value || '');
      beforeUpdateNodeInputData.current = updateNodeInputData;
    }
  }, [updateNodeInputData, value]);
  useEffect(() => {
    setTemplateValue(value);
  }, []);
  useEffect(() => {
    const editor = editorRef.current;
    if (editor) {
      setEditorContent(value || '');
    }
  }, []);
  useEffect(() => {
    setIsEmpty(!templateValue);
  }, [templateValue]);
  useEffect((): void | (() => void) => {
    if (editorRef?.current) {
      const handleKeyDown = (event): void => {
        if (event.ctrlKey && (event.key === 'c' || event.key === 'v')) {
          event.stopPropagation();
          if (event.key === 'v') {
            isPastingRef.current = true;
          }
        }
      };

      editorRef.current.addEventListener('keydown', handleKeyDown);
      return (): void => {
        editorRef?.current?.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, []);
  useEffect((): void | (() => void) => {
    if (editorRef?.current) {
      const handleWheel = (e: WheelEvent): void => {
        e.stopPropagation();
      };

      editorRef?.current.addEventListener('wheel', handleWheel);

      return (): void => {
        editorRef?.current?.removeEventListener('wheel', handleWheel);
      };
    }
  }, []);
  useEffect((): void | (() => void) => {
    const handleClickOutside = (): void => {
      setShowDropdown(false);
    };

    window.addEventListener('click', handleClickOutside);

    return (): void => window.removeEventListener('click', handleClickOutside);
  }, []);
  // 焦点管理逻辑,只有按下箭头键时才聚焦
  useEffect(() => {
    if (showDropdown && isArrowDownPressed) {
      dropdownRef.current?.focus();
      setIsArrowDownPressed(false); // 重置状态
    }
  }, [showDropdown, isArrowDownPressed]);

  useEffect(() => {
    if (showDropdown && treeData.length > 0) {
      // 仅在通过键盘导航且未设置焦点时初始化聚焦
      if (keyboardNavigationActive && focusedKey === null) {
        setFocusedKey(treeData[0].id);
      }
    }
  }, [showDropdown, treeData, focusedKey, keyboardNavigationActive]);

  // 键盘事件监听
  useEffect((): void | (() => void) => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'ArrowDown') {
        setIsArrowDownPressed(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent): void => {
      if (e.key === 'ArrowDown') {
        setIsArrowDownPressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return (): void => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);
};
const useEditorHandlers = ({
  editorRef,
}): { setEditorContent: (content: string) => void } => {
  const setEditorContent = useMemoizedFn(content => {
    if (editorRef.current) {
      // 清空现有内容
      editorRef.current.innerHTML = '';

      // 将字符串按行分割
      const lines = content.split('\n');

      // 处理每一行的内容，将 {{xxx}} 包裹上 <span>
      lines.forEach((line, index) => {
        const lineContainer = document.createElement('div');

        // 使用正则表达式查找并分割 {{xxx}} 包裹的内容
        const parts = line.split(/(\{\{.*?\}\})/g);

        parts.forEach(part => {
          if (part.startsWith('{{') && part.endsWith('}}')) {
            // 如果是 {{xxx}} 的部分，用 <span> 包裹
            const span = document.createElement('span');
            span.textContent = part;
            span.style.color = 'blue'; // 可根据需求设置样式
            lineContainer.appendChild(span);
          } else {
            // 其他文本直接添加为文本节点
            const textNode = document.createTextNode(part);
            lineContainer.appendChild(textNode);
          }
        });

        // 检查 lineContainer 是否为空
        if (!lineContainer.textContent.trim()) {
          // 如果为空，添加 <br /> 标签
          const br = document.createElement('br');
          lineContainer.appendChild(br);
        }

        // 将处理好的行添加到编辑器中
        editorRef.current.appendChild(lineContainer);
      });
    }
  });
  return {
    setEditorContent,
  };
};

const useDropdownControl = ({
  showDropdown,
  focusedKey,
  treeData,
  setFocusedKey,
  setKeyboardNavigationActive,
  dropdownRef,
  setIsFirstOpen,
  setShowDropdown,
  replaceSpanRef,
  inputsOption,
  filterArr,
  willInertInfo,
  setDropdownPosition,
  currentSelection,
  setTreeData,
  setMatchingInformation,
  getCursorPosition,
  handleTreeSelect,
}): UseDropdownControlReturn => {
  const isInsideTemplateTag = useMemoizedFn(() => {
    const selection = window.getSelection();
    if (!selection.rangeCount) return false;

    const range = selection.getRangeAt(0);
    const currentLineContent = getCurrentLineContent();
    if (!currentLineContent) return false;

    const cursorPosition = range.startOffset;
    const textBeforeCursor = currentLineContent.slice(0, cursorPosition);
    const textAfterCursor = currentLineContent.slice(cursorPosition);

    return textBeforeCursor.includes('{{') && textAfterCursor.includes('}}');
  });
  const handleKeyDown = useMemoizedFn(e => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      // 如果在 {{ 内，激活下拉菜单的键盘导航
      if (showDropdown && isInsideTemplateTag()) {
        e.preventDefault();
        // 设置初始焦点
        if (!focusedKey && treeData.length > 0) {
          setFocusedKey(treeData[0].id);
        }
        setKeyboardNavigationActive(true);
        dropdownRef.current?.focus();
        return;
      }
    }
    if (e.key !== 'Backspace' && e.key !== 'Delete') {
      replaceSpanRef.current = false;
    } else {
      replaceSpanRef.current = true;
    }
  });
  // 确保选中节点可见（处理滚动）
  const ensureNodeVisible = useMemoizedFn(nodeId => {
    const nodeElement = dropdownRef.current?.querySelector(
      `[data-key="${nodeId}"]`
    );
    if (nodeElement) {
      nodeElement.scrollIntoView({ block: 'nearest' });
    }
  });
  const onKeyUp = useMemoizedFn(e => {
    e.stopPropagation();

    const selection = window.getSelection();

    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const cursorPosition = range.startOffset;
      const editorContent = getCurrentLineContent();

      const beforeCursor = editorContent.slice(0, cursorPosition);
      const afterCursor = editorContent.slice(cursorPosition);

      const matchBefore = beforeCursor.match(/{{([^{}]*)$/);
      const matchAfter = afterCursor.match(/^([^{}]*)}}/);

      if (matchBefore) {
        const matchText = matchBefore[1];
        if (matchText) {
          const newOptions = filterArr(
            inputsOption,
            matchText,
            {
              offsetLeft: matchBefore?.[1]?.length || 0,
              offsetRight: matchAfter?.[1]?.length || 0,
            },
            matchBefore[1] + matchAfter?.[1]
          );
          if (newOptions?.length) {
            willInertInfo.current.cursorPosition = cursorPosition;
            currentSelection.current = range;
            setShowDropdown(true);
            setTreeData(newOptions);
          } else if (matchText?.endsWith('.')) {
            setShowDropdown(true);
            setTreeData(newOptions);
          } else {
            setShowDropdown(false);
          }
        } else {
          const { x, y } = range.getBoundingClientRect();
          setDropdownPosition({ top: y + 20, left: x });
          currentSelection.current = range;
          setShowDropdown(true);
          setTreeData(cloneDeep(inputsOption));
          willInertInfo.current.cursorPosition = cursorPosition;
          willInertInfo.current.offset = {
            offsetLeft: 0,
            offsetRight: matchAfter?.[1]?.length || 0,
          };
          setMatchingInformation({
            keyWord: '',
            matchingKeyWord: '',
          });
        }
      } else {
        setMatchingInformation({
          keyWord: '',
          matchingKeyWord: '',
        });
        setShowDropdown(false); // 否则隐藏下拉菜单
      }
      getCursorPosition();
    } else {
      setShowDropdown(false);
    }
    // 打开下拉菜单时重置选择状态
    setFocusedKey(null);
    setKeyboardNavigationActive(false);
    setIsFirstOpen(false);
  });
  // 处理下拉菜单内的键盘事件
  const handleDropdownKeyDown = useMemoizedFn(e => {
    if (!treeData.length) return;

    const key = e.key;
    const isArrowKey = key === 'ArrowUp' || key === 'ArrowDown';
    const isEnterKey = key === 'Enter';

    if (isArrowKey) {
      e.preventDefault();
      setKeyboardNavigationActive(true);

      let currentIndex = treeData.findIndex(node => node.id === focusedKey);
      if (focusedKey === null) {
        currentIndex = -1;
      }

      if (currentIndex === -1 && treeData.length > 0) {
        currentIndex = 0; // 首次导航时设为第一个节点
        setFocusedKey(treeData[currentIndex].id);
        ensureNodeVisible(treeData[currentIndex].id);
        return;
      }

      const direction = key === 'ArrowUp' ? -1 : 1;
      const newIndex =
        (currentIndex + direction + treeData.length) % treeData.length;

      const newFocusedNode = treeData[newIndex];
      setFocusedKey(newFocusedNode.id);

      ensureNodeVisible(newFocusedNode.id);
    } else if (isEnterKey && focusedKey) {
      e.preventDefault();
      handleTreeSelect([focusedKey]);
    }
  });
  return {
    handleKeyDown,
    onKeyUp,
    handleDropdownKeyDown,
  };
};

const DropDownList = ({
  showDropdown,
  focusedKey,
  keyboardNavigationActive,
  matchingInformation,
  handleTreeSelect,
  dropdownRef,
  dropdownPosition,
  handleDropdownKeyDown,
  hasData,
  noProperties,
  treeData,
}): React.ReactElement | null => {
  if (!showDropdown) return null;
  const titleRender = useMemoizedFn(value => {
    const isFocused = value.id === focusedKey && keyboardNavigationActive;
    const content = value?.label || '';
    const { keyWord, matchingKeyWord } = matchingInformation;
    // 先匹配 keyWord，将其包裹为蓝色
    const escapedKeyWord = keyWord.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
    const blueWrappedContent = content
      .split(new RegExp(`(${escapedKeyWord})`, 'g'))
      .map((part, index) => {
        if (part === keyWord) {
          // 在匹配到 keyWord 的部分，进一步处理 matchingKeyWord 的嵌套包裹
          return (
            <span key={`blue-${index}`} style={{ color: '#4d53e8' }}>
              {part
                .split(new RegExp(`(${matchingKeyWord})`, 'g'))
                .map((subPart, subIndex) => {
                  if (subPart === matchingKeyWord) {
                    return (
                      <span
                        key={`yellow-${index}-${subIndex}`}
                        style={{ color: '#ff9600' }}
                      >
                        {subPart}
                      </span>
                    );
                  }
                  return subPart;
                })}
            </span>
          );
        }
        return part;
      });

    return (
      <div
        className={isFocused ? 'bg-gray-100 rounded px-1' : ''}
        onClick={e => {
          e?.stopPropagation();
          handleTreeSelect([value.id]);
        }}
      >
        {blueWrappedContent}
      </div>
    );
  });
  return (
    <div
      ref={dropdownRef}
      className="nodrag px-2 py-1 min-w-[150px]"
      style={{
        position: 'absolute',
        top: dropdownPosition.top,
        left: dropdownPosition.left,
        borderRadius: '6px',
        backgroundColor: '#fff',
        zIndex: 1000,
        boxShadow: '0 0 1px 0 rgba(0,0,0,.3),0 4px 14px 0 rgba(0,0,0,.1)',
        outline: 'none',
      }}
      onClick={e => e.stopPropagation()}
      onKeyDown={handleDropdownKeyDown} // 添加键盘事件监听
      tabIndex={0} // 使其可以获取焦点
    >
      {hasData ? (
        <FlowTree
          className={noProperties ? 'no-ant-tree-switcher' : ''}
          fieldNames={{
            title: 'label',
            key: 'id',
          }}
          titleRender={titleRender}
          showLine={false}
          treeData={treeData}
          selectedKeys={keyboardNavigationActive ? [focusedKey] : []}
        />
      ) : (
        <p className="text-desc cursor-text">该变量无子变量</p>
      )}
    </div>
  );
};

const useFlowTemplateEditor = ({
  currentSelection,
  willInertInfo,
  setShowDropdown,
  setDropdownPosition,
  zoom,
  setMatchingInformation,
  references,
  inputs,
  treeData,
  parentRef,
}): UseFlowTemplateEditorReturn => {
  const insertOption = useMemoizedFn((content, isLeaf) => {
    const range = currentSelection.current;
    const replaceContent = content?.slice(willInertInfo?.current?.offset);

    if (range) {
      // 删除当前选区内的内容
      range.deleteContents();

      // 清理现有的文本节点
      const startContainer = range.startContainer;
      const offset = range.startOffset;
      let newRange = document.createRange();

      // 如果光标前后有文本节点，删除它们
      if (startContainer.nodeType === Node.TEXT_NODE) {
        const textBefore = startContainer.textContent.slice(
          0,
          offset - willInertInfo?.current?.offset?.offsetLeft
        );

        const textAfter = startContainer.textContent.slice(
          offset + willInertInfo?.current?.offset?.offsetRight
        );
        // 只保留一个文本节点
        startContainer.textContent = textBefore + content + textAfter;
        const contentLength =
          textBefore?.length + content?.length + textAfter?.length;
        const textNode = startContainer.childNodes[0] || startContainer;
        const cursorOffset = isLeaf ? contentLength : contentLength - 2;
        newRange.setStart(textNode, cursorOffset);
        newRange.collapse(true);
      } else {
        // 创建并插入新的文本节点
        const textNode = document.createTextNode(replaceContent);
        range.insertNode(textNode);
        range.setStartAfter(textNode);
        range.collapse(true);
        newRange = range;
      }
      // 恢复选区
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(newRange);

      // 隐藏下拉菜单
      setShowDropdown(false);
    }
  });

  const getCursorPosition = useMemoizedFn(() => {
    const parentDiv = parentRef.current;

    // 获取光标位置
    const selection = window.getSelection();
    if (selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    // 获取父元素的位置信息
    const parentRect = parentDiv.getBoundingClientRect();

    // 计算光标到父元素顶部和左边的距离
    const offsetTop = rect.top - parentRect.top;
    const offsetLeft = rect.left - parentRect.left;
    const scale = zoom / 100;

    setDropdownPosition({
      top: offsetTop / scale + 20,
      left: offsetLeft / scale,
    });
  });
  const filterArr = useMemoizedFn((arr, value, offset, content) => {
    const splitArr = value?.split('.');
    const filterSplitArr = splitArr?.map(str => str.replace(/\[\d+\]$/, ''));
    willInertInfo.current.offset = offset;
    if (splitArr?.length === 1) {
      setMatchingInformation({
        keyWord: content?.split('.')[0],
        matchingKeyWord: value,
      });
      return arr.filter(item => item?.label?.startsWith(value));
    } else {
      const topValue = inputs?.find(item => item.name === filterSplitArr[0]);
      const endValue = splitArr.at(-1);
      const leftIndex = value?.replace(`${endValue}`, '')?.length;
      const contentValue =
        topValue?.schema?.value?.content?.name +
        value?.replace(splitArr[0], '')?.replace(`.${endValue}`, '');
      const treeContent =
        findNodeByValue(contentValue, cloneDeep(references))?.children || [];
      setMatchingInformation({
        keyWord: content?.slice(leftIndex),
        matchingKeyWord: endValue,
      });
      return treeContent;
    }
  });
  const noProperties = useMemo(() => {
    return treeData?.every(
      item => !item?.children || item?.children?.length === 0
    );
  }, [treeData]);

  const hasData = useMemo(() => {
    return treeData?.length > 0;
  }, [treeData]);
  const inputsOption = useMemo(() => {
    return (
      inputs
        ?.map(input => {
          const contentValue = input?.schema?.value?.content?.name;
          const treeContent = findNodeByValue(
            contentValue,
            cloneDeep(references)
          );
          if (input?.schema?.value?.type === 'literal' || !treeContent) {
            return {
              id: treeContent?.id || input?.id,
              label: input?.name,
            };
          } else {
            return {
              ...treeContent,
              label: input?.name,
            };
          }
        })
        ?.filter(input => input) || []
    );
  }, [inputs, references]);
  return {
    insertOption,
    getCursorPosition,
    filterArr,
    noProperties,
    hasData,
    inputsOption,
  };
};

const useFlowTemplateInput = ({
  filterArr,
  inputsOption,
  willInertInfo,
  currentSelection,
  setShowDropdown,
  setTreeData,
  setDropdownPosition,
  setMatchingInformation,
  getCursorPosition,
  setFocusedKey,
  setKeyboardNavigationActive,
  setIsFirstOpen,
  onChange,
  editorRef,
  isPastingRef,
  setEditorContent,
  setTemplateValue,
  replaceSpanRef,
  insertOption,
  isComposingRef,
  treeData,
}): UseFlowTemplateInputReturn => {
  const handleClick = useMemoizedFn(() => {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const cursorPosition = range.startOffset;
      const editorContent = getCurrentLineContent();

      const beforeCursor = editorContent.slice(0, cursorPosition);
      const afterCursor = editorContent.slice(cursorPosition);

      const matchBefore = beforeCursor.match(/{{([^{}]*)$/);
      const matchAfter = afterCursor.match(/^([^{}]*)}}/);

      if (matchBefore) {
        const matchText = matchBefore[1];
        if (matchText) {
          const newOptions = filterArr(
            inputsOption,
            matchText,
            {
              offsetLeft: matchBefore?.[1]?.length || 0,
              offsetRight: matchAfter?.[1]?.length || 0,
            },
            matchBefore[1] + matchAfter?.[1]
          );
          if (newOptions?.length) {
            willInertInfo.current.cursorPosition = cursorPosition;
            currentSelection.current = range;
            setShowDropdown(true);
            setTreeData(newOptions);
          } else if (matchText?.endsWith('.')) {
            setShowDropdown(true);
            setTreeData(newOptions);
          } else {
            setShowDropdown(false);
          }
        } else {
          const { x, y } = range.getBoundingClientRect();
          setDropdownPosition({ top: y + 20, left: x });
          currentSelection.current = range;
          setShowDropdown(true);
          setTreeData(cloneDeep(inputsOption));
          willInertInfo.current.cursorPosition = cursorPosition;
          willInertInfo.current.offset = {
            offsetLeft: 0,
            offsetRight: matchAfter?.[1]?.length || 0,
          };
          setMatchingInformation({
            keyWord: '',
            matchingKeyWord: '',
          });
        }
      } else {
        setMatchingInformation({
          keyWord: '',
          matchingKeyWord: '',
        });
        setShowDropdown(false); // 否则隐藏下拉菜单
      }
      getCursorPosition();
    } else {
      setShowDropdown(false);
    }
    // 打开下拉菜单时重置选择状态
    setFocusedKey(null);
    setKeyboardNavigationActive(false);
    setIsFirstOpen(false);
  });

  const handleChangeDebounce = useMemoizedFn(
    debounce(text => {
      onChange(text);
    }, 500)
  );
  const handleInput = useMemoizedFn(() => {
    const editor = editorRef.current;
    let text = '';
    if (text === '\n') text = '';
    // 重置粘贴状态
    if (isPastingRef.current) {
      isPastingRef.current = false;
      text = editor?.innerText;
      setEditorContent(text || '');
    } else {
      text = editor?.innerText?.replaceAll('\n\n', '\n');
    }
    handleChangeDebounce(text || '');
    setTemplateValue(text || '');
    if (!replaceSpanRef.current) {
      handleReplaceInput(replaceSpanRef);
      handleReplaceSpan(isComposingRef);
    }
  });
  const handleTreeSelect = useMemoizedFn(selectedKeys => {
    if (selectedKeys.length > 0) {
      const selectedKey = selectedKeys[0];
      const pathTitles = findPathToNode(treeData, selectedKey);
      const pathString = pathTitles ? pathTitles.join('.') : '';
      const selectedNode = findNodeByKey(treeData, selectedKey);
      const isLeaf = selectedNode && !selectedNode.children;
      insertOption(pathString, isLeaf);
      handleInput();
    }
  });
  return {
    handleClick,
    handleInput,
    handleTreeSelect,
  };
};

const FlowTemplateEditor = (props: unknown): React.ReactElement => {
  const {
    id,
    data,
    value,
    placeholder = '',
    onBlur = (): void => {},
    onChange = (value): void => {},
    minHeight = '100px',
  } = props;
  const { inputs, references } = useNodeCommon({ id, data });
  const updateNodeInputData = useFlowsManager(
    state => state.updateNodeInputData
  );
  const getCurrentStore = useFlowsManager(state => state.getCurrentStore);
  const currentStore = getCurrentStore();
  const isComposingRef = useRef(false);
  const beforeUpdateNodeInputData = useRef(false);
  const replaceSpanRef = useRef(false);
  const zoom = currentStore(state => state.zoom);
  const editorRef = useRef<null | HTMLDivElement>(null);
  const parentRef = useRef(null);
  const currentSelection = useRef(null);
  const dropdownRef = useRef(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const willInertInfo = useRef({
    cursorPosition: 0,
    offset: {
      offsetLeft: 0,
      offsetRight: 0,
    },
  });
  const [treeData, setTreeData] = useState([]);
  const [isEmpty, setIsEmpty] = useState(true);
  const [matchingInformation, setMatchingInformation] = useState({
    keyWord: '',
    matchingKeyWord: '',
  });
  const [templateValue, setTemplateValue] = useState('');
  const isPastingRef = useRef(false);

  // 键盘事件的状态管理
  const [focusedKey, setFocusedKey] = useState(null);
  const [keyboardNavigationActive, setKeyboardNavigationActive] =
    useState(false);
  const [isArrowDownPressed, setIsArrowDownPressed] = useState(false);
  //用于记录是否是首次打开下拉菜单
  const [isFirstOpen, setIsFirstOpen] = useState(true);
  const { setEditorContent } = useEditorHandlers({
    editorRef,
  });
  const {
    insertOption,
    getCursorPosition,
    filterArr,
    noProperties,
    hasData,
    inputsOption,
  } = useFlowTemplateEditor({
    currentSelection,
    willInertInfo,
    setShowDropdown,
    setDropdownPosition,
    zoom,
    setMatchingInformation,
    references,
    inputs,
    treeData,
    parentRef,
  });
  const { handleClick, handleInput, handleTreeSelect } = useFlowTemplateInput({
    filterArr,
    inputsOption,
    willInertInfo,
    currentSelection,
    setShowDropdown,
    setTreeData,
    setDropdownPosition,
    setMatchingInformation,
    getCursorPosition,
    setFocusedKey,
    setKeyboardNavigationActive,
    setIsFirstOpen,
    onChange,
    editorRef,
    isPastingRef,
    setEditorContent,
    setTemplateValue,
    replaceSpanRef,
    insertOption,
    isComposingRef,
    treeData,
  });
  const { handleKeyDown, onKeyUp, handleDropdownKeyDown } = useDropdownControl({
    showDropdown,
    focusedKey,
    treeData,
    setFocusedKey,
    setKeyboardNavigationActive,
    dropdownRef,
    setIsFirstOpen,
    setShowDropdown,
    replaceSpanRef,
    inputsOption,
    filterArr,
    willInertInfo,
    setDropdownPosition,
    currentSelection,
    setTreeData,
    setMatchingInformation,
    getCursorPosition,
    handleTreeSelect,
  });
  useFlowTemplateEditorEffect({
    showDropdown,
    setFocusedKey,
    setKeyboardNavigationActive,
    isFirstOpen,
    setIsFirstOpen,
    beforeUpdateNodeInputData,
    updateNodeInputData,
    setTemplateValue,
    setEditorContent,
    value,
    editorRef,
    isArrowDownPressed,
    dropdownRef,
    treeData,
    focusedKey,
    keyboardNavigationActive,
    setIsArrowDownPressed,
    setDropdownPosition,
    setIsEmpty,
    templateValue,
    isPastingRef,
    setShowDropdown,
  });
  return (
    <div
      ref={parentRef}
      style={{ position: 'relative' }}
      className="nodrag"
      onKeyDown={e => e.stopPropagation()}
    >
      <div
        ref={editorRef}
        contentEditable
        onKeyDown={handleKeyDown}
        onKeyUp={onKeyUp}
        onClick={e => {
          e.stopPropagation();
          handleClick();
        }}
        className="flow-template-editor nodrag"
        style={{
          padding: '10px',
          minHeight,
        }}
        onBlur={onBlur}
        onInput={e => handleInput(e)}
        onCompositionStart={() => (isComposingRef.current = true)}
        onCompositionEnd={() => {
          isComposingRef.current = false;
          handleReplaceSpan(isComposingRef);
        }}
      />
      <DropDownList
        showDropdown={showDropdown}
        focusedKey={focusedKey}
        keyboardNavigationActive={keyboardNavigationActive}
        matchingInformation={matchingInformation}
        handleTreeSelect={handleTreeSelect}
        dropdownRef={dropdownRef}
        dropdownPosition={dropdownPosition}
        handleDropdownKeyDown={handleDropdownKeyDown}
        hasData={hasData}
        noProperties={noProperties}
        treeData={treeData}
      />
      {isEmpty && (
        <div
          className="px-2.5 py-1 text-[#9ca3af] break-all"
          style={{
            position: 'absolute',
            top: '0px',
            left: '0px',
            pointerEvents: 'none',
          }}
        >
          {placeholder}
        </div>
      )}
    </div>
  );
};

export default memo(FlowTemplateEditor);
