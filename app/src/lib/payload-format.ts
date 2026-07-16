import { dump, load } from 'js-yaml';

export const PAYLOAD_FORMATS = ['RAW', 'JSON', 'XML', 'YAML'] as const;
export type PayloadFormat = (typeof PAYLOAD_FORMATS)[number];

export const formatPlaceholder: Record<PayloadFormat, string> = {
  RAW: 'Hello world',
  JSON: `{\n  "message": "Hello world"\n}`,
  XML: '<message>Hello world</message>',
  YAML: 'message: Hello world',
};

function tryFormatJson(payload: string) {
  try {
    return JSON.stringify(JSON.parse(payload), null, 2);
  } catch {
    return null;
  }
}

function tryFormatXml(payload: string) {
  try {
    const parser = new DOMParser();
    const xml = parser.parseFromString(payload, 'application/xml');
    if (xml.querySelector('parsererror')) return null;

    const formatNode = (node: Node, level = 0): string => {
      const indent = '  '.repeat(level);

      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.nodeValue?.trim();
        return text ? `${indent}${text}\n` : '';
      }
      if (node.nodeType === Node.COMMENT_NODE) {
        return `${indent}<!--${(node as Comment).nodeValue}-->\n`;
      }
      if (node.nodeType !== Node.ELEMENT_NODE) {
        return '';
      }

      const el = node as Element;
      const attrs = Array.from(el.attributes)
        .map((attr) => `${attr.name}=${JSON.stringify(attr.value)}`)
        .join(' ');
      const openTag = attrs ? `<${el.tagName} ${attrs}>` : `<${el.tagName}>`;
      const children = Array.from(el.childNodes)
        .map((child) => formatNode(child, level + 1))
        .join('');

      if (!children.trim()) {
        return `${indent}${openTag}</${el.tagName}>\n`;
      }
      return `${indent}${openTag}\n${children}${indent}</${el.tagName}>\n`;
    };

    if (!xml.documentElement) return null;
    return formatNode(xml.documentElement).trim();
  } catch {
    return null;
  }
}

function tryFormatYaml(payload: string) {
  try {
    const parsed = load(payload);
    return dump(parsed as unknown, { indent: 2, noRefs: true }).trim();
  } catch {
    const json = tryFormatJson(payload);
    if (!json) return null;
    try {
      return dump(JSON.parse(json), { indent: 2, noRefs: true }).trim();
    } catch {
      return null;
    }
  }
}

/** Pretty-print `payload` for the given format, or return null if it doesn't parse. */
export function tryFormatPayload(payload: string, format: PayloadFormat): string | null {
  switch (format) {
    case 'JSON':
      return tryFormatJson(payload);
    case 'XML':
      return tryFormatXml(payload);
    case 'YAML':
      return tryFormatYaml(payload);
    default:
      return payload;
  }
}

/** Like {@link tryFormatPayload} but falls back to the original text on failure. */
export function formatPayload(payload: string, format: PayloadFormat): string {
  if (!payload.trim()) return payload;
  return tryFormatPayload(payload, format) ?? payload;
}

/** True when `payload` is valid for `format` (RAW is always valid; empty is neutral). */
export function isValidPayload(payload: string, format: PayloadFormat): boolean {
  if (format === 'RAW' || !payload.trim()) return true;
  return tryFormatPayload(payload, format) !== null;
}
