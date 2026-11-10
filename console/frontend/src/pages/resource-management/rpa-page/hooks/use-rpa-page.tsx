import { getRpaList } from '@/services/rpa';
import { RpaDetailFormInfo, RpaInfo } from '@/types/rpa';
import {
  type RefObject,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';

export const useRpaPage = (
  modalFormRef: RefObject<{ showModal: (values?: RpaDetailFormInfo) => void }>
) => {
  const [searchValue, setSearchValue] = useState('');
  const [rpas, setRpas] = useState<RpaInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const sequence = useRef(0);
  const refresh = useCallback((): void => setRevision(value => value + 1), []);
  useEffect(() => {
    const id = ++sequence.current;
    setLoading(true);
    setError('');
    void getRpaList({ name: searchValue.trim() })
      .then(data => {
        if (id === sequence.current) setRpas(data || []);
      })
      .catch(failure => {
        if (id === sequence.current)
          setError(
            failure instanceof Error
              ? failure.message
              : 'RPA 加载失败，请重试。'
          );
      })
      .finally(() => {
        if (id === sequence.current) setLoading(false);
      });
    return () => {
      sequence.current += 1;
    };
  }, [searchValue, revision]);
  const search = (value: string): void => {
    setRpas([]);
    setSearchValue(value);
  };
  useEffect(() => {
    const onSearch = (event: Event): void => {
      const { type, value } = (event as CustomEvent).detail;
      if (type === 'rpa') {
        setRpas([]);
        setSearchValue(value);
      }
    };
    const onCreate = (): void => modalFormRef.current?.showModal();
    window.addEventListener('headerSearch', onSearch);
    window.addEventListener('headerCreateRPA', onCreate);
    return () => {
      window.removeEventListener('headerSearch', onSearch);
      window.removeEventListener('headerCreateRPA', onCreate);
    };
  }, [modalFormRef]);
  return { rpas, loading, error, refresh, searchValue, search };
};
