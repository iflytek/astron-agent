import { useMemo, useState } from 'react';

// Actions定义
export interface Actions<T> {
  setLeft: () => void;
  setRight: () => void;
  set: (value: T) => void;
  toggle: () => void;
}

// 函数重载
function useToggle<T = boolean>(): [boolean, Actions<T>];

function useToggle<T>(defaultValue: T): [T, Actions<T>];

function useToggle<T, U>(
  defaultValue: T,
  reverseValue: U
): [T | U, Actions<T | U>];

function useToggle<D, R>(
  defaultValue: D = false as unknown as D,
  reverseValue?: R
) {
  // 默认为false
  const [state, setState] = useState<D | R>(defaultValue);

  const actions = useMemo(() => {
    const reverseValueOrigin = (
      reverseValue === undefined ? !defaultValue : reverseValue
    ) as D | R;

    /**
     * 用于在默认值和反转值之间切换状态
     */
    const toggle = () =>
      setState(s => (s === defaultValue ? reverseValueOrigin : defaultValue));

    /**
     * 用于设置状态为指定值，但是限制在D | R两个值之间
     */
    const set = (value: D | R) => setState(value);

    /**
     * 用于设置状态为默认值
     */
    const setLeft = () => setState(defaultValue);

    /**
     * 用于设置状态为反转值
     */
    const setRight = () => setState(reverseValueOrigin);

    return {
      toggle,
      set,
      setLeft,
      setRight,
    };
  }, []);

  return [state, actions];
}

export default useToggle;
