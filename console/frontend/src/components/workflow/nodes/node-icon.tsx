import React, { useState } from 'react';
import {
  AppstoreOutlined,
  BranchesOutlined,
  DatabaseOutlined,
  QuestionCircleOutlined,
  RobotOutlined,
  StopOutlined,
} from '@ant-design/icons';
import { workflowNodeIconSource } from './node-icon-source';
import styles from './node-icon.module.scss';

const fallbackIcons: Record<string, typeof AppstoreOutlined> = {
  'node-end': StopOutlined,
  'iteration-node-end': StopOutlined,
  'loop-node-end': StopOutlined,
  'loop-exit': StopOutlined,
  'decision-making': BranchesOutlined,
  'if-else': BranchesOutlined,
  agent: RobotOutlined,
  'question-answer': QuestionCircleOutlined,
  database: DatabaseOutlined,
};

export function WorkflowNodeIcon({
  nodeType,
  src,
  className,
}: {
  nodeType: string;
  src?: string;
  className?: string;
}): React.ReactElement {
  const [failedSources, setFailedSources] = useState<string[]>([]);
  const source = [
    workflowNodeIconSource(nodeType, src),
    workflowNodeIconSource(nodeType),
  ].find(candidate => candidate && !failedSources.includes(candidate));
  const classes = `${styles.icon} ${className || ''}`;
  if (source) {
    return (
      <img
        src={source}
        className={classes}
        alt=""
        onError={() => setFailedSources(failed => [...failed, source])}
      />
    );
  }
  const FallbackIcon = fallbackIcons[nodeType] || AppstoreOutlined;
  return <FallbackIcon className={classes} aria-hidden />;
}
