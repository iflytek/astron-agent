export const shouldIgnoreWorkflowShortcut = (
  event: Pick<Event, 'target'>
): boolean => {
  const target = event.target instanceof Element ? event.target : null;
  // Inspector and dialog clicks must not authorize canvas operations.
  if (!target?.closest('[data-workflow-canvas]')) return true;
  if (
    (target instanceof HTMLElement && target.isContentEditable) ||
    target.closest(
      'input, textarea, select, button, [role="dialog"], [role="listbox"], [role="option"], [role="menu"], .ant-drawer, .ant-modal, .ant-select-dropdown, .ant-dropdown, .ant-popover, .monaco-editor, .monaco-inputbox, [contenteditable="true"], [contenteditable="plaintext-only"]'
    )
  )
    return true;

  // React Flow gives each keyboard-focusable node role="button". Its canvas
  // shortcuts remain available; controls nested inside that node stay excluded.
  const button = target.closest('[role="button"]');
  return Boolean(button && !button.matches('.react-flow__node'));
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
