export const shouldIgnoreWorkflowShortcut = (
  event: Pick<Event, 'target'>
): boolean => {
  const target = event.target instanceof HTMLElement ? event.target : null;
  // Inspector and dialog clicks must not authorize canvas operations.
  if (!target?.closest('[data-workflow-canvas]')) return true;
  return Boolean(
    target.isContentEditable ||
      target.closest(
        'input, textarea, select, button, [role="button"], [role="dialog"], [role="listbox"], [role="option"], [role="menu"], .ant-drawer, .ant-modal, .ant-select-dropdown, .ant-dropdown, .ant-popover, .monaco-editor, .monaco-inputbox, [contenteditable="true"]'
      )
  );
};

export const createWorkflowShortcutScope = () => {
  let canvasInteraction = false;
  return {
    trackInteraction(event: Pick<Event, 'target'>): void {
      canvasInteraction = !shouldIgnoreWorkflowShortcut(event);
    },
    shouldIgnore(event: KeyboardEvent): boolean {
      return !canvasInteraction || shouldIgnoreWorkflowShortcut(event);
    },
  };
};
