import { FC, SetStateAction, Dispatch } from 'react';
import { Tooltip } from 'antd';
import { useNavigate } from 'react-router-dom';

import { useTranslation } from 'react-i18next';

import arrowLeft from '@/assets/imgs/knowledge/icon_zhishi_arrow-left.png';
import formSelect from '@/assets/imgs/knowledge/icon_form_select.png';
import { AvatarType, ToolItem } from '../../../../types/resource';
import { useToolHeader } from '../hooks/use-tool-header';

const ToolHeader: FC<{
  toolInfo: ToolItem;
  toolId: string;
  botIcon?: AvatarType;
  setOpen: Dispatch<SetStateAction<boolean>>;
}> = ({ toolInfo, toolId, botIcon, setOpen }) => {
  const { t } = useTranslation();

  const navigate = useNavigate();
  const {
    currentTab,
    showDropList,

    isHover,
    showVersionManagement,
    filterTools,
    setIsHover,
    setShowDropList,
    setCurrentTab,
    optionsRef,
  } = useToolHeader({ toolInfo, toolId });

  return (
    <div
      className="mx-auto h-[80px] bg-[#fff] border-b border-[#e2e8ff] flex justify-between px-6 py-5"
      style={{
        borderRadius: '0px 0px 24px 24px',
        width: '85%',
        minWidth: 1000,
        maxWidth: 1425,
      }}
    >
      <div className="flex w-1/4 items-center gap-2">
        <img
          src={arrowLeft}
          className="w-7 h-7 cursor-pointer"
          alt=""
          onClick={() => navigate('/resource/plugin')}
        />
        <div
          className="flex items-center gap-2"
          onClick={e => {
            e.stopPropagation();
            filterTools.length > 0 && setShowDropList(true);
          }}
        >
          <div
            className="flex items-center gap-2 relative rounded-lg py-1 px-1.5"
            style={{
              background: showDropList ? '#d5e8ff' : '',
              cursor: filterTools.length > 0 ? 'pointer' : 'default',
            }}
          >
            <img src={botIcon?.value || ''} className="w-6 h-6" alt="" />
            <h1>{toolInfo.name}</h1>
            {filterTools.length > 0 && (
              <img src={formSelect} className="w-4 h-4" alt="" />
            )}
            {showDropList && (
              <div
                className="w-full absolute  left-0 top-[38px] list-options py-3.5 pt-2 max-h-[255px] overflow-auto bg-[#fff] min-w-[150px] z-50"
                ref={optionsRef}
              >
                {filterTools?.map(item => (
                  <div
                    key={item.id}
                    className="w-full px-5 py-2.5 pr-4 text-desc font-medium hover:bg-[#F9FAFB] cursor-pointer flex items-center"
                    onClick={e => {
                      e.stopPropagation();
                      setShowDropList(false);
                      navigate(`/resource/plugin/detail/${item.id}/parameter`);
                    }}
                  >
                    <img
                      src={item.address + item.icon}
                      className="w-[26px] h-[26px]"
                      alt=""
                    />
                    <span
                      className="text-desc font-medium ml-[14px] text-overflow"
                      title={item.name}
                    >
                      {item.name}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="flex w-1/2 items-center gap-6 justify-center">
        <div
          className={`flex items-center px-5 py-2.5 rounded-xl font-medium cursor-pointer  ${
            currentTab === 'parameter'
              ? 'config-tabs-active'
              : 'config-tabs-normal'
          }`}
          onClick={() => {
            setCurrentTab('parameter');
            navigate(`/resource/plugin/detail/${toolId}/parameter`);
          }}
        >
          <span className="parameter-icon"></span>
          <span className="ml-2">{t('plugin.toolParameters')}</span>
        </div>
        <div
          className={`flex items-center px-5 py-2.5 rounded-xl font-medium cursor-pointer  ${
            currentTab === 'test' ? 'config-tabs-active' : 'config-tabs-normal'
          }`}
          onClick={() => {
            setCurrentTab('test');
            navigate(`/resource/plugin/detail/${toolId}/test`);
          }}
        >
          <span className="test-icon"></span>
          <span className="ml-2">{t('plugin.toolTest')}</span>
        </div>
        <div
          className={`flex items-center px-5 py-2.5 rounded-xl font-medium cursor-pointer  ${
            currentTab === 'setting'
              ? 'config-tabs-active'
              : 'config-tabs-normal'
          }`}
          onClick={() => {
            setCurrentTab('setting');
            navigate(`/resource/plugin/detail/${toolId}/setting`);
          }}
        >
          <span className="base-icon"></span>
          <span className="ml-2">{t('plugin.settings')}</span>
        </div>
      </div>
      <div className="w-1/4 h-10 flex items-center gap-2 justify-end flow-header-operation-container">
        {showVersionManagement && (
          <Tooltip title="历史版本" overlayClassName="black-tooltip">
            <span
              className="version-management-icon"
              onClick={() => setOpen((open: boolean) => !open)}
            ></span>
          </Tooltip>
        )}
        {toolInfo?.bots?.length && toolInfo?.bots?.length > 0 && (
          <div className="flex items-center">
            <div className="flex items-center text-sm">
              <span>{toolInfo?.bots?.length}</span>
              <span className="text-[#757575]">
                &nbsp;{t('plugin.relatedApplications')}
              </span>
              <div
                className="flex p-1 rounded-xl ml-3"
                style={{
                  background: isHover ? '#8299FF' : '',
                }}
              >
                <div
                  className="flex items-center relative h-8 cursor-pointer transition-all"
                  style={{
                    width: isHover
                      ? 36 * toolInfo?.bots?.length + 4
                      : 20 * toolInfo?.bots?.length + 12,
                  }}
                  onMouseEnter={() => setIsHover(true)}
                  onMouseLeave={() => setIsHover(false)}
                >
                  {toolInfo.bots?.map((item, index) => (
                    <div
                      key={item.id as string}
                      className="flex items-center justify-center w-8 h-8 absolute transition-all"
                      style={{
                        border: '1px solid #e2e8ff',
                        borderRadius: '10px',
                        boxShadow: '-2px 0px 8px 0px rgba(0,0,0,0.10)',
                        background: item.color as string,
                        right: isHover
                          ? ((toolInfo?.bots?.length || 0) - 1 - index) * 36 + 4
                          : ((toolInfo?.bots?.length || 0) - 1 - index) * 20,
                        top: 0,
                      }}
                      onClick={() => {
                        navigate(`/space/bot/${item.id}/chat`);
                      }}
                    >
                      <img
                        src={
                          (item.address || '' + item.avatarIcon || '') as string
                        }
                        className="w-5 h-5"
                        alt=""
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ToolHeader;
