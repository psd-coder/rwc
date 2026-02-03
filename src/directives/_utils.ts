type TemplateSetup =
  | { isTemplate: true; template: HTMLTemplateElement; placeholder: null }
  | { isTemplate: false; template: HTMLTemplateElement; placeholder: Comment };

export function setupTemplate(el: Element, directiveName: string): TemplateSetup | null {
  if (el instanceof HTMLTemplateElement) {
    return { isTemplate: true, template: el, placeholder: null };
  }

  const parent = el.parentNode;
  if (!parent) return null;

  const placeholder = document.createComment(directiveName);
  parent.insertBefore(placeholder, el);
  el.removeAttribute(directiveName);
  const template = document.createElement('template');
  template.content.append(el);
  return { isTemplate: false, template, placeholder };
}
