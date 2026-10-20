// dom.js — the only place that talks to the SVG document.
export const NS = 'http://www.w3.org/2000/svg';

export function el(tag, attrs, parent) {
  const e = document.createElementNS(NS, tag);
  if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}

export function V(e, on) {
  e.setAttribute('visibility', on ? 'visible' : 'hidden');
}

export function S(e, x, y) {
  e.setAttribute('x2', x);
  e.setAttribute('y2', y);
}

export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}
