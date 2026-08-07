import React, { useState, useEffect, useRef } from 'react';

export const useKnowledgeSelect = (): {
  open: boolean;
  setOpen: (open: boolean) => void;
  knowledgeSelectRef: React.RefObject<HTMLDivElement>;
} => {
  const [open, setOpen] = useState(false);
  const knowledgeSelectRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent): void => {
      if (
        knowledgeSelectRef.current &&
        !knowledgeSelectRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };

    window.addEventListener('click', handleClickOutside);

    return (): void => {
      window.removeEventListener('click', handleClickOutside);
    };
  }, []);

  return {
    open,
    setOpen,
    knowledgeSelectRef,
  };
};
