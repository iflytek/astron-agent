import React from 'react';
import { Popover } from 'antd';

import communityQRCodeContainer from '@/assets/imgs/workflow/community-qRCode-container.png';
import fixedCommunityQRCode from '@/assets/imgs/workflow/WeCom_Group.png';

function index(): React.ReactElement {
  return (
    <Popover
      placement="leftBottom"
      content={
        <div className="flex items-center justify-center p-2">
          <img
            src={fixedCommunityQRCode}
            className="w-[220px] h-[220px] rounded-lg"
            alt="企业微信群二维码"
          />
        </div>
      }
      arrow={false}
    >
      <img
        src={communityQRCodeContainer}
        className="w-[46px] fixed bottom-[236px] right-[3px] cursor-pointer"
        style={{
          zIndex: 99,
        }}
        alt=""
      />
    </Popover>
  );
}

export default index;
