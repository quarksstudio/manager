import DOMPurify from 'dompurify';
import { marked } from 'marked';

const ALLOWED_TAGS = [
  'p',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'ul',
  'ol',
  'li',
  'pre',
  'code',
  'blockquote',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
  'a',
  'strong',
  'em',
  'b',
  'i',
  'del',
  'hr',
  'br',
  'img',
  'input',
];

const ALLOWED_ATTR = [
  'href',
  'title',
  'align',
  'src',
  'alt',
  'type',
  'checked',
  'disabled',
];

/**
 * Only explicit protocols and relative destinations are acceptable. This also
 * blocks data: URIs (including SVG payloads in links).
 */
const SAFE_LINK = /^(?:(?:https?|mailto):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i;

/**
 * Renders Markdown to sanitized HTML. Embedded HTML is disabled: any raw HTML
 * author content that is not produced by the Markdown grammar is stripped, and
 * links are rewritten to open safely in a new tab.
 */
export function renderMarkdown(source: string): string {
  const html = marked.parse(source, { gfm: true, breaks: true }) as string;
  const sanitized = DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOWED_URI_REGEXP: SAFE_LINK,
  });
  const doc = new DOMParser().parseFromString(sanitized, 'text/html');
  doc.querySelectorAll('a').forEach((link) => {
    const href = link.getAttribute('href') ?? '';
    if (!SAFE_LINK.test(href)) {
      link.remove();
      return;
    }
    link.setAttribute('target', '_blank');
    link.setAttribute('rel', 'noopener noreferrer');
  });
  doc.querySelectorAll('img').forEach((image) => {
    const src = image.getAttribute('src') ?? '';
    if (!SAFE_LINK.test(src)) {
      image.remove();
    }
  });
  return doc.body ? doc.body.innerHTML : sanitized;
}
