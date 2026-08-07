import { Input, message, Tooltip } from 'antd';
import styles from './index.module.scss';
import { useEffect, useState, useCallback } from 'react';
import SpaceModal from '@/components/space/space-modal';
import useSpaceStore from '@/store/space-store';
import { useNavigate } from 'react-router-dom';
import { debounce } from 'lodash';
import searchIcon from '@/assets/imgs/space/space-search.svg';
import choosedIcon from '@/assets/imgs/space/space-choosed.png';
import addIcon from '@/assets/imgs/space/add-space.svg';
import spaceIcon from '@/assets/imgs/space/space-icon.svg';
import personalIcon from '@/assets/imgs/space/person-space-icon.svg';
import noDataIcon from '@/assets/imgs/space/no-data-icon.svg';
import {
  getAllSpace,
  getRecentVisit,
  visitSpace,
  getJoinedCorporateList,
} from '@/services/space';
import { useTranslation } from 'react-i18next';
import eventBus from '@/utils/event-bus';
//空间角色
const spaceRole = {
  '1': 'owner',
  '2': 'admin',
  '3': 'member',
} as const;

export const PersonSpace = ({
  setIsShowAddSpace,
}: {
  setIsShowAddSpace: (isShow: boolean) => void;
}) => {
  const [searchValue, setSearchValue] = useState(''); // 搜索关键词状态
  const {
    spaceType,
    spaceId,
    enterpriseId,
    isShowSpacePopover,
    setIsShowSpacePopover,
    setSpaceName,
    setSpaceId,
    setSpaceAvatar,
  } = useSpaceStore();
  const navigate = useNavigate();
  const [recentList, setRecentList] = useState<any[]>([]);
  const { t } = useTranslation();
  const [allList, setAllList] = useState<any[]>([
    { id: '', name: t('sidebar.personalSpace'), sub: '' },
  ]);

  //添加空间
  const handleAddSpace = () => {
    setIsShowSpacePopover(false);
    setIsShowAddSpace(true);
  };

  //空间管理
  const handleSpaceManage = () => {
    setIsShowSpacePopover(false);

    const spaceManageUrl =
      spaceType === 'team' ? `/enterprise/${enterpriseId}/space` : '/space';
    navigate(spaceManageUrl);
  };

  //空间选择
  const handleSpaceSelect = async (item: any) => {
    try {
      await visitSpace(item.id);
      setSpaceName(item.name);
      setSpaceAvatar(item.avatarUrl);
      setIsShowSpacePopover(false);
      if (item.id === '') {
        navigate('/space/agent');
        setSpaceId('');
      } else {
        setSpaceId(item.id);
        navigate('/space/agent');
      }
    } catch (err: any) {
      message.error(err.msg || t('space.accessSpaceFailed'));
    }
  };

  //获取全部空间
  const getSpaceList = (searchValue?: string) => {
    const isTeamSpace = spaceType === 'team';
    const params: any = isTeamSpace ? { name: searchValue } : searchValue;

    if (isTeamSpace) {
      getJoinedCorporateList(params)
        .then((res: any) => {
          setAllList(res);
        })
        .catch((err: any) => {
          message.error(err.msg || t('space.getSpaceListFailed'));
        });
    } else {
      getAllSpace(params)
        .then((res: any) => {
          if (searchValue) {
            setAllList(res);
          } else {
            const personalSpace = {
              id: '',
              name: t('sidebar.personalSpace'),
              sub: '',
            };
            setAllList([personalSpace, ...res]);
          }
        })
        .catch((err: any) => {
          message.error(err.msg || t('space.getSpaceListFailed'));
        });
    }
  };

  // 使用lodash创建防抖搜索函数
  const debouncedSearch = useCallback(
    debounce((searchValue: string) => {
      getSpaceList(searchValue);
    }, 300),
    []
  );

  //搜索空间
  const handleSearchSpace = (e: any) => {
    const value = e.target.value;
    if (value) {
      setRecentList([]);
    } else {
      getRecentVisitList();
    }
    setSearchValue(value); // 立即更新输入框显示
    debouncedSearch(value); // 使用lodash防抖函数
  };

  //获取最近访问列表
  const getRecentVisitList = () => {
    getRecentVisit()
      .then((res: any) => {
        setRecentList(res?.slice(0, 5));
      })
      .catch((err: any) => {
        message.error(err.msg || t('space.getRecentVisitFailed'));
      });
  };

  useEffect(() => {
    if (isShowSpacePopover) {
      setSearchValue('');
      // 获取数据
      getSpaceList();
      getRecentVisitList();
    }
  }, [isShowSpacePopover]);

  return (
    <div className={styles.person_space}>
      <div className={styles.person_space_header}>
        <Input
          placeholder={t('spaceManagement.searchTeamSpace')}
          className={styles.search_input}
          prefix={<img src={searchIcon} alt="search" />}
          value={searchValue}
          onChange={handleSearchSpace}
        />
      </div>
      {recentList.length > 0 && (
        <div className={styles.recent_list}>
          <div className={styles.recent_list_title}>
            {t('spaceManagement.recent')}
          </div>
          {recentList.map(item => (
            <div
              key={item.id}
              className={styles.recent_list_item}
              onClick={() => {
                handleSpaceSelect(item);
              }}
            >
              <div className={styles.icon_placeholder}>
                {item.id === spaceId && (
                  <img
                    src={choosedIcon}
                    alt="choosed"
                    className={styles.item_icon}
                  />
                )}
              </div>
              <img
                src={item.avatarUrl || spaceIcon}
                alt=""
                className={styles.item_icon}
              />
              <Tooltip
                placement="bottomLeft"
                title={item.name}
                arrow={false}
                overlayClassName="black-tooltip"
              >
                <div className={styles.item_name}>{item.name}</div>
              </Tooltip>
            </div>
          ))}
        </div>
      )}
      {allList.length > 0 ? (
        <>
          <div className={styles.all_list_title}>
            {t('spaceManagement.all')}
          </div>
          <div className={styles.all_list}>
            {allList.map(item => (
              <div
                key={item.id}
                className={styles.all_list_item}
                onClick={() => {
                  handleSpaceSelect(item);
                }}
              >
                <div className={styles.icon_placeholder}>
                  {item.id === spaceId && (
                    <img
                      src={choosedIcon}
                      alt="choosed"
                      className={styles.item_icon}
                    />
                  )}
                </div>
                <img
                  src={
                    item.id === '' ? personalIcon : item.avatarUrl || spaceIcon
                  }
                  alt=""
                  className={styles.item_icon}
                />
                <Tooltip
                  placement="bottomLeft"
                  title={item.name}
                  arrow={false}
                  overlayClassName="black-tooltip"
                >
                  <div className={styles.item_name}>{item.name}</div>
                </Tooltip>
                {item.id !== '' && (
                  <div className={styles.item_owner}>
                    {t(
                      `spaceManagement.${spaceRole[item.userRole as keyof typeof spaceRole]}`
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className={styles.no_data}>
          <img src={noDataIcon} alt="noData" />
          <div>{t('spaceManagement.noData')}</div>
        </div>
      )}
      <div className={styles.person_space_footer}>
        <div className={styles.add_space} onClick={handleAddSpace}>
          <div className={styles.add_space_content}>
            <img src={addIcon} alt="add" />
            <div>{t('spaceManagement.addSpace')}</div>
          </div>
        </div>
        <div className={styles.space_manage} onClick={handleSpaceManage}>
          {t('spaceManagement.spaceManage')}
        </div>
      </div>
    </div>
  );
};
