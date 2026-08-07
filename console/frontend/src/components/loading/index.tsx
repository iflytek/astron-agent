import { FC } from 'react';
import { Spin } from 'antd';

const Loading: FC = () => {
  return (
    <div className="flex items-center justify-center w-full h-full">
      <Spin />
    </div>
  );
};

export default Loading;
