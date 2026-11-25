import { useRef, useState, type ReactElement } from 'react';
import { Select, type SelectProps, type RefSelectProps } from 'antd';
import './resource-select.css';

type ResourceSelectProps = Omit<SelectProps, 'mode'> & { required?: boolean };

/** Shared only by resource editors: official Select behavior with native form validation. */
export default function ResourceSelect({
  className = '',
  required = false,
  value,
  disabled,
  onChange,
  ...props
}: ResourceSelectProps): ReactElement {
  const ref = useRef<RefSelectProps>(null);
  const [invalid, setInvalid] = useState(false);
  return (
    <span className={`resource-select-wrap ${className}`}>
      <Select
        {...props}
        ref={ref}
        className="resource-select"
        placement="bottomLeft"
        popupClassName="resource-select-popup"
        popupMatchSelectWidth={false}
        listHeight={240}
        getPopupContainer={trigger =>
          (trigger.closest('.ant-modal-content') as HTMLElement) ||
          document.body
        }
        value={value}
        disabled={disabled}
        status={
          required && invalid && (value === '' || value == null)
            ? 'error'
            : undefined
        }
        aria-required={required || undefined}
        onChange={(next, option) => {
          setInvalid(false);
          onChange?.(next, option);
        }}
      />
      {required && (
        <input
          className="resource-select-validation"
          tabIndex={-1}
          aria-hidden="true"
          required
          disabled={disabled}
          value={value == null ? '' : String(value)}
          onChange={() => undefined}
          onInvalid={event => {
            event.preventDefault();
            setInvalid(true);
            ref.current?.focus();
          }}
        />
      )}
      {required && invalid && (value === '' || value == null) && (
        <span className="resource-select-error" role="alert">
          请选择一项
        </span>
      )}
    </span>
  );
}
