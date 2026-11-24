import React from 'react';
import { Checkbox } from 'antd';

interface CusCheckBoxProps {
  checked: boolean;
  disabled?: boolean;
  onChange?: (checked: boolean) => void;
  className?: string;
  children?: React.ReactNode;
  label?: string;
}
const CusCheckBox: React.FC<CusCheckBoxProps> = ({
  checked,
  disabled = false,
  onChange,
  className,
  children,
  label,
}) => (
  <span data-checkbox onClick={event => event.stopPropagation()}>
    <Checkbox
      className={className}
      checked={checked}
      disabled={disabled}
      aria-label={label}
      onChange={event => onChange?.(event.target.checked)}
    >
      {children}
    </Checkbox>
  </span>
);
export default CusCheckBox;
