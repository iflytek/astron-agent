import React, {
  useEffect,
  useState,
  memo,
  useRef,
  useCallback,
  FC,
} from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { getToolDetail } from '@/services/plugin';
import { getRouteId } from '@/utils/utils';
import { useNavigate } from 'react-router-dom';
import ToolHeader from './components/tool-header';
import VersionManagement from '@/components/drawer/plugin/version-management';
import { CreateTool } from '@/components/modal/plugin';
import { ToolDebugger } from '@/components/modal/plugin';
import SettingPage from './setting-page';
import { ToolItem } from '../../../types/resource';

const PluginDetail: FC = () => {
  const createToolRef = useRef<{
    updateToolInfo: (
      selectedCard: ToolItem,
      shouldUpdateToolInfo: boolean
    ) => void;
  }>(null);
  const toolId = getRouteId() as string;
  const location = useLocation();
  const [toolInfo, setToolInfo] = useState<ToolItem>({} as ToolItem);
  const [botIcon, setBotIcon] = useState<{ name?: string; value?: string }>({});
  const [botColor, setBotColor] = useState<string>('');
  const [open, setOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState<ToolItem>({} as ToolItem); //选中card的id
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  useEffect(() => {
    initData();
    setOpen(false);
    setSelectedCard({} as ToolItem);
  }, [location]);

  function initData(): void {
    getToolDetail({
      id: toolId,
      temporary: true,
    }).then((data: ToolItem) => {
      setToolInfo(data);
    });
  }

  const handleCardClick = useCallback(
    (data: ToolItem) => {
      createToolRef.current?.updateToolInfo(
        {
          ...data,
        },
        !selectedCard?.id
      );
      setSelectedCard({
        ...data,
      });
    },
    [selectedCard?.id]
  );

  return (
    <div className="w-full h-full flex flex-col overflow-hidden px-6">
      <ToolHeader
        toolId={toolId}
        toolInfo={toolInfo}
        botIcon={botIcon}
        setOpen={setOpen}
      />
      <VersionManagement
        open={open}
        setOpen={setOpen}
        currentDebuggerPluginInfo={toolInfo}
        selectedCard={selectedCard}
        handleCardClick={handleCardClick}
      />
      <div className="flex-1 w-full overflow-hidden">
        <Routes>
          <Route
            path="/:id/parameter"
            element={
              <CreateTool
                ref={createToolRef}
                showHeader={false}
                currentToolInfo={toolInfo}
                handleCreateToolDone={() => navigate('/resource/plugin')}
                step={step}
                setStep={setStep}
                botIcon={botIcon}
                setBotIcon={setBotIcon}
                botColor={botColor}
                setBotColor={setBotColor}
                selectedCard={selectedCard}
              />
            }
          />
          <Route
            path="/:id/test"
            element={
              <ToolDebugger
                currentToolInfo={toolInfo}
                handleClearData={() => {}}
                showHeader={false}
                selectedCard={selectedCard}
              />
            }
          />
          <Route
            path="/:id/setting"
            element={
              <SettingPage
                toolId={toolId}
                toolInfo={toolInfo}
                initData={initData}
              />
            }
          />
        </Routes>
      </div>
    </div>
  );
};

export default memo(PluginDetail);
