export const HYDRATED_ATTR = 'data-rwc-hydrated';

export const isHydratedElement = (el: Element) => el.closest(`[${HYDRATED_ATTR}]`) !== null;

export const markHydratedNodes = (nodes: Node[]) => {
  for (const node of nodes) {
    if (node instanceof Element) {
      node.setAttribute(HYDRATED_ATTR, '');
    }
  }
};

export const clearHydrationMarks = (root: ParentNode) => {
  if (root instanceof Element && root.hasAttribute(HYDRATED_ATTR)) {
    root.removeAttribute(HYDRATED_ATTR);
  }
  const marked = root.querySelectorAll(`[${HYDRATED_ATTR}]`);
  for (const el of marked) {
    el.removeAttribute(HYDRATED_ATTR);
  }
};
