import React, { memo } from 'react';

import back from '@/assets/imgs/common/arrow-left.svg';

export const BackToNavigation: React.FC<{ onClick: () => void; text: string }> =
  memo(({ onClick, text }) => {
    return (
      <div className="astron-back-to-navigation" onClick={onClick}>
        <div className="astron-back-to-navigation-iconContainer">
          <img src={back} className="w-3.5 h-3.5" alt="" />
        </div>
        <span>{text}</span>
      </div>
    );
  });
