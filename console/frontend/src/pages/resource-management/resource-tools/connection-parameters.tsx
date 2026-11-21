import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactElement,
} from 'react';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { Input } from 'antd';

type Row = { id: number; name: string; value: string; saved?: boolean };

export default function ConnectionParameters({
  value,
  disabled,
  onChange,
}: {
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}): ReactElement {
  const identity = useRef(0);
  const emitted = useRef(value);
  const parse = useCallback(
    (source: string): Row[] =>
      Object.entries(JSON.parse(source) as Record<string, string>).map(
        ([name, item]) => ({
          id: identity.current++,
          name,
          value: item,
          saved: item === '******',
        })
      ),
    []
  );
  const [rows, setRows] = useState(() => parse(value));
  const names = useRef(new Map<number, HTMLInputElement>());
  const values = useRef(new Map<number, HTMLInputElement>());
  useEffect(() => {
    if (value !== emitted.current) {
      emitted.current = value;
      setRows(parse(value));
    }
    // Each resource remounts this editor; only external replacements reset drafts.
  }, [value, parse]);
  useEffect(() => {
    rows.forEach(row => {
      values.current
        .get(row.id)
        ?.setCustomValidity(
          row.value === '******' && !row.saved
            ? '请输入真实参数值，不能使用凭据保留标记。'
            : ''
        );
      names.current
        .get(row.id)
        ?.setCustomValidity(
          rows.some(other => other.id !== row.id && other.name === row.name)
            ? '参数名已存在'
            : row.name && !row.name.trim()
              ? '请输入参数名'
              : ''
        );
    });
  }, [rows]);
  const update = (next: Row[]): void => {
    setRows(next);
    emitted.current = JSON.stringify(
      Object.fromEntries(
        next.filter(row => row.name.trim()).map(row => [row.name, row.value])
      )
    );
    onChange(emitted.current);
  };
  return (
    <div className="resource-connection-params">
      <div className="resource-connection-header" aria-hidden="true">
        <span>参数名</span>
        <span>值</span>
        <span />
      </div>
      {rows.map(row => (
        <div className="resource-connection-row" key={row.id}>
          <Input
            aria-label="环境参数名"
            required
            disabled={disabled}
            readOnly={row.saved}
            title={
              row.saved
                ? '已保存的凭据名不可修改；如需更名，请删除并重新添加。'
                : undefined
            }
            placeholder="服务方提供的参数名"
            value={row.name}
            ref={input => {
              if (input?.input) names.current.set(row.id, input.input);
              else names.current.delete(row.id);
            }}
            onChange={event =>
              update(
                rows.map(item =>
                  item.id === row.id
                    ? { ...item, name: event.target.value }
                    : item
                )
              )
            }
          />
          <Input.Password
            aria-label={`${row.name || '环境参数'}的值`}
            disabled={disabled}
            autoComplete="new-password"
            placeholder="文本值"
            value={row.value}
            ref={input => {
              if (input?.input) values.current.set(row.id, input.input);
              else values.current.delete(row.id);
            }}
            onChange={event =>
              update(
                rows.map(item =>
                  item.id === row.id
                    ? { ...item, value: event.target.value }
                    : item
                )
              )
            }
          />
          <button
            type="button"
            className="resource-field-icon"
            disabled={disabled}
            aria-label={`删除环境参数 ${row.name}`}
            title="删除参数"
            onClick={() => update(rows.filter(item => item.id !== row.id))}
          >
            <DeleteOutlined />
          </button>
        </div>
      ))}
      {rows.some(row => row.saved) && (
        <p className="resource-tool-hint">
          已有凭据名保持不变；如需更名，请删除并重新添加、填写真实值。
        </p>
      )}
      <button
        type="button"
        className="resource-field-icon"
        disabled={disabled}
        aria-label="添加环境参数"
        title="添加环境参数"
        onClick={() =>
          setRows([...rows, { id: identity.current++, name: '', value: '' }])
        }
      >
        <PlusOutlined />
      </button>
    </div>
  );
}
