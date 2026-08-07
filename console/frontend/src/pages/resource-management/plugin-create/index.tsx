import { useState, memo, useEffect, FC } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CreateTool } from '@/components/modal/plugin';
import { getToolDetail } from '@/services/plugin';

import arrowLeft from '@/assets/imgs/common/arrow_back.png';
import dottedLine from '@/assets/imgs/plugin/dotted_line.svg';
import dottedLineActive from '@/assets/imgs/plugin/dotted_line_active.svg';
import { AvatarType, ToolItem } from '@/types/resource';

const PluginCreate: FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  // const [users, setUsers] = useState([]);
  const [botIcon, setBotIcon] = useState<AvatarType>({});
  const [botColor, setBotColor] = useState('');

  const [searchParams] = useSearchParams();
  const toolId = searchParams?.get('id');
  const [toolInfo, setToolInfo] = useState<ToolItem>({} as ToolItem);

  useEffect(() => {
    if (toolId) {
      getToolDetail({
        id: toolId,
        temporary: true,
      }).then(data => {
        setToolInfo(data);
      });
    }
  }, [toolId]);
  return (
    <div className="w-full h-full pb-6 px-6 flex flex-col overflow-hidden">
      <div
        className="w-full mx-auto flex items-center max-w-[1425px]"
        style={{
          width: '85%',
          minWidth: 1000,
          padding: '30px 0px 0px 0px',
        }}
      >
        <div
          className="w-[200px] flex items-center gap-2 cursor-pointer"
          onClick={() => navigate('/resource/plugin')}
        >
          <img src={arrowLeft} className="w-[18px] h-[18px]" alt="" />
          <span className="font-medium">{t('plugin.back')}</span>
        </div>
        <div className="flex items-center gap-5 flex-1 justify-center">
          <div className="flex items-center gap-2">
            <div
              className="w-[28px] h-[28px] rounded-full text-center text-base leading-none"
              style={{
                color: step >= 1 ? '#6356EA' : '#7F7F7F',
                border: step >= 1 ? '2px solid #6356EA' : '2px solid #7F7F7F',
                lineHeight: '24px',
              }}
            >
              1
            </div>
            <div
              className="font-medium text-base"
              style={{ color: step >= 1 ? '#6356EA' : '#7F7F7F' }}
            >
              {t('plugin.fillBasicInfo')}
            </div>
          </div>
          <img
            src={step >= 2 ? dottedLineActive : dottedLine}
            className="w-[80px] h-[2px]"
            alt=""
          />
          <div className="flex items-center gap-2">
            <div
              className="w-[28px] h-[28px] rounded-full text-center text-base leading-none"
              style={{
                color: step >= 2 ? '#6356EA' : '#7F7F7F',
                border: step >= 2 ? '2px solid #6356EA' : '2px solid #7F7F7F',
                lineHeight: '24px',
              }}
            >
              2
            </div>
            <div
              className="font-medium text-base"
              style={{ color: step >= 2 ? '#6356EA' : '#7F7F7F' }}
            >
              {t('plugin.addPlugin')}
            </div>
          </div>
          <img
            src={step >= 3 ? dottedLineActive : dottedLine}
            className="w-[80px] h-[2px]"
            alt=""
          />
          <div className="flex items-center gap-2">
            <div
              className="w-[28px] h-[28px] rounded-full text-center text-base leading-none"
              style={{
                color: step === 3 ? '#6356EA' : '#7F7F7F',
                border: step === 3 ? '2px solid #6356EA' : '2px solid #7F7F7F',
                lineHeight: '24px',
              }}
            >
              3
            </div>
            <div
              className="font-medium"
              style={{ color: step === 3 ? '#6356EA' : '#7F7F7F' }}
            >
              {t('plugin.debugAndValidate')}
            </div>
          </div>
        </div>
        <div className="w-[200px]"></div>
      </div>
      <CreateTool
        showHeader={false}
        currentToolInfo={toolInfo}
        handleCreateToolDone={() => navigate('/resource/plugin')}
        step={step}
        setStep={setStep}
        botIcon={botIcon}
        setBotIcon={setBotIcon}
        botColor={botColor}
        setBotColor={setBotColor}
      />
    </div>
  );
};

export default memo(PluginCreate);
