import Lottie from 'lottie-react';
import { ReactElement } from 'react';
import LoadingAnimate from '@/constants/lottie-react/chat-loading.json';
const UseToolsInfo = (props: {
  allToolsList: string[];
  loading: boolean;
}): ReactElement | null => {
  const { allToolsList, loading } = props;
  if (allToolsList.length === 0) {
    return null;
  }
  return (
    <div className="flex mb-2.5 items-center text-[#4a84eb]">
      {loading && (
        <div className="flex items-center w-auto max-w-xs mb-2">
          <Lottie
            animationData={LoadingAnimate}
            loop={true}
            className="w-[30px] h-[30px] mr-1"
            rendererSettings={{
              preserveAspectRatio: 'xMidYMid slice',
            }}
          />
        </div>
      )}
      <span>使用工具：{allToolsList.join(',')}</span>
    </div>
  );
};

export default UseToolsInfo;
