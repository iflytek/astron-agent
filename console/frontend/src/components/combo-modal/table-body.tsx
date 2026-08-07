import React from 'react';
import rightBlue from '@/assets/imgs/trace/right-blue.svg';

interface TableBodyProps {
  resources: any[];
  styles: any;
}

export const TableBody: React.FC<TableBodyProps> = ({ resources, styles }) => (
  <tbody>
    {resources.map((item, index) => (
      <React.Fragment key={index}>
        <tr>
          <td colSpan={5} className={styles.sourceTitle}>
            {item.title}
          </td>
        </tr>
        {item.resource.map((resourceItem: any, resourceIndex: any) => (
          <tr
            className={styles.sourceItemTr}
            key={resourceIndex}
            style={{
              borderBottom:
                resourceIndex === item.resource.length - 1
                  ? '2px solid #f2f4f8'
                  : 'none',
            }}
          >
            <td className={styles.sourceItemTd}>
              <div style={{ whiteSpace: 'pre-line' }}>{resourceItem.name}</div>
              {resourceItem?.nameDesc && (
                <div
                  className={styles.nameDesc}
                  style={{ whiteSpace: 'pre-line' }}
                >
                  {resourceItem?.nameDesc}
                </div>
              )}
            </td>
            {resourceItem.Items.map((itm: any, ind: any) => (
              <td key={ind}>
                {itm ? (
                  <div
                    className={styles.sourceItemWrap}
                    style={{ whiteSpace: 'pre-line' }}
                  >
                    {itm?.icon && <img src={rightBlue} />}
                    {itm.itemTitle ?? '-'}
                  </div>
                ) : (
                  '-'
                )}
              </td>
            ))}
          </tr>
        ))}
      </React.Fragment>
    ))}
  </tbody>
);
