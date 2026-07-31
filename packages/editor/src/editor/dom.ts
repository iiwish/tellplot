export interface ElementOptions {
  readonly className?: string;
  readonly text?: string;
  readonly attributes?: Readonly<Record<string, string>>;
}

export function element<K extends keyof HTMLElementTagNameMap>(
  document: Document,
  tag: K,
  options: ElementOptions = {},
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (options.className !== undefined) {
    node.className = options.className;
  }
  if (options.text !== undefined) {
    node.textContent = options.text;
  }
  for (const [name, value] of Object.entries(options.attributes ?? {})) {
    node.setAttribute(name, value);
  }
  return node;
}

export function button(
  document: Document,
  label: string,
  options: { readonly className?: string; readonly symbol?: string } = {},
): HTMLButtonElement {
  const node = element(document, 'button', {
    ...(options.className === undefined ? {} : { className: options.className }),
    attributes: { type: 'button', 'aria-label': label, title: label },
  });
  node.textContent = options.symbol ?? label;
  return node;
}

export function setOptionalAttribute(node: Element, name: string, value: string | undefined): void {
  if (value === undefined) {
    node.removeAttribute(name);
  } else {
    node.setAttribute(name, value);
  }
}
