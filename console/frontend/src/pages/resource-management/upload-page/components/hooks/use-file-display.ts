import { useState, useEffect } from 'react';

interface UseFileDisplayProps {
  showMore: boolean;
  setShowMore: (show: boolean) => void;
}

export const useFileDisplay = (): UseFileDisplayProps & {
  clickOutside: () => void;
} => {
  const [showMore, setShowMore] = useState(false);

  const clickOutside = (): void => {
    setShowMore(false);
  };

  useEffect(() => {
    document.documentElement.addEventListener('click', clickOutside);
    return (): void =>
      document.documentElement.removeEventListener('click', clickOutside);
  }, []);

  return {
    showMore,
    setShowMore,
    clickOutside,
  };
};
