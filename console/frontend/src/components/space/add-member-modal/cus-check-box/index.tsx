import React from 'react';
import classNames from 'classnames';
import unchooseBox from '@/assets/imgs/space/unchoose-box.svg';
import chooseBox from '@/assets/imgs/space/choose-box.svg';
import styles from './index.module.scss';

interface CusCheckBoxProps {
  checked: boolean;
  disabled?: boolean;
  onChange?: (checked: boolean) => void;
  className?: string;
  children?: React.ReactNode;
}

const CusCheckBox: React.FC<CusCheckBoxProps> = ({
  checked,
  disabled = false,
  onChange,
  className,
  children,
}) => {
  const handleClick = (e: React.MouseEvent): void => {
    e.stopPropagation();
    if (disabled || !onChange) return;
    onChange(!checked);
  };

  return (
    <div
      className={classNames(
        styles.checkboxWrapper,
        disabled && styles.disabled,
        className
      )}
      onClick={handleClick}
    >
      <div
        className={classNames(styles.customCheckbox, checked && styles.checked)}
      >
        {checked ? (
          <img src={chooseBox} alt="选中" className={styles.checkedIcon} />
        ) : (
          <img
            src={unchooseBox}
            alt="未选中"
            className={styles.uncheckedIcon}
          />
        )}
      </div>
      {children && <span className={styles.checkboxLabel}>{children}</span>}
    </div>
  );
};

export default CusCheckBox;
