import React from 'react';
import { useTranslation } from 'react-i18next';
import CardButtonGroup, {
  type ButtonItemConfig,
} from '@/pages/resource-management/card-button-group';
import { Dropdown } from 'antd';
import styles from './index.module.scss';
import { getFixedUrl } from '@/components/workflow/utils';
import { downloadFileWithHeaders } from '@/utils/http';

import editIcon from '@/assets/svgs/edit-outline.svg';
import deleteIcon from '@/assets/svgs/delete-outline.svg';
import exportIcon from '@/assets/imgs/plugin/icon_export.png';
import { ToolItem } from '@/types/resource';

interface CardItemProps {
  tool: ToolItem;
  onCardClick: (tool: ToolItem) => void;
  onDeleteClick: (tool: ToolItem) => void;
}

const CardItem: React.FC<CardItemProps> = ({
  tool,
  onCardClick,
  onDeleteClick,
}) => {
  const { t } = useTranslation();

  const buttons: ButtonItemConfig[] = [
    {
      key: 'parameter',
      text: t('common.edit'),
      icon: <img src={editIcon} alt="edit" />,
      onClick: (key: string, e: React.MouseEvent) => {
        e.stopPropagation();
        handleCardClick();
      },
    },
    {
      key: 'delete',
      text: t('common.delete'),
      icon: <img src={deleteIcon} alt="delete" />,
      danger: true,
      onClick: (key: string, e: React.MouseEvent) => {
        e.stopPropagation();
        handleDeleteClick(e);
      },
    },
  ];

  const handleCardClick = () => {
    onCardClick(tool);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDeleteClick(tool);
  };

  const statusConfig = {
    0: {
      background: '#f2f2f2',
      color: '#7F7F7F',
      text: t('plugin.draft'),
    },
    default: {
      background:
        'linear-gradient(36deg, #6B23FF 21%, rgba(153, 98, 255, 0.9281) 82%)',
      color: '#FFFFFF',
      text: t('plugin.available'),
    },
  };

  const currentStatusConfig =
    statusConfig[tool.status as keyof typeof statusConfig] ||
    statusConfig.default;

  return (
    <div className={styles.cardItem} onClick={handleCardClick}>
      {/* 状态标签 */}
      <div
        className={styles.statusTag}
        style={{
          background: currentStatusConfig?.background,
          color: currentStatusConfig?.color,
        }}
      >
        {currentStatusConfig?.text}
      </div>

      {/* API图标 */}
      <div className={styles.header}>
        <div className={styles.apiIcon}>
          <span
            className="w-12 h-12 flex items-center justify-center rounded-lg"
            style={{
              background: tool.avatarColor
                ? tool.avatarColor
                : `url(${tool.icon}) no-repeat center / cover`,
            }}
          >
            {tool.avatarColor && (
              <img src={tool.icon || ''} className="w-[28px] h-[28px]" alt="" />
            )}
          </span>
        </div>

        <h3 className={styles.title} title={tool.name}>
          {tool.name}
        </h3>
      </div>

      {/* 内容区域 */}
      <div className={styles.content}>
        <p className={styles.description} title={tool.description}>
          {tool.description}
        </p>
      </div>

      {/* 底部操作区域 */}
      <div className={styles.footer}>
        <span className={styles.publishTime} title={tool.updateTime || ''}>
          {t('common.publishedAt')} {tool.updateTime || ''}
        </span>
        <CardButtonGroup
          className={styles.actionGroup}
          buttons={buttons}
          gap={8}
          align="right"
        />
        <Dropdown
          menu={{
            items: [
              {
                key: '1',
                label: (
                  <span
                    onClick={() =>
                      downloadFileWithHeaders(
                        getFixedUrl(`/tool/export?id=${tool.id}&type=1`),
                        `${tool.name}.json`
                      )
                    }
                  >
                    {t('plugin.exportAsJson')}
                  </span>
                ),
              },
              {
                key: '2',
                label: (
                  <span
                    onClick={() =>
                      downloadFileWithHeaders(
                        getFixedUrl(`/tool/export?id=${tool.id}&type=2`),
                        `${tool.name}.yaml`
                      )
                    }
                  >
                    {t('plugin.exportAsYaml')}
                  </span>
                ),
              },
            ],
            onClick: e => {
              e.domEvent.stopPropagation();
            },
          }}
        >
          <div
            className={styles.dropdownBtn}
            onClick={e => e.stopPropagation()}
          >
            <img src={exportIcon} alt="" />
            <span>{t('plugin.export')}</span>
          </div>
        </Dropdown>
      </div>
    </div>
  );
};

export default CardItem;
