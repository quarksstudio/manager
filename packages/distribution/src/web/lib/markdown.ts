import sanitizeHtml from 'sanitize-html';
import { marked } from 'marked';
/** Identical allowlist in SSR and browsers; raw scripts and unsafe URLs are removed. */
export function renderMarkdown(source: string): string {
  return sanitizeHtml(
    marked.parse(source, { gfm: true, breaks: true }) as string,
    {
      allowedTags: [
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
        'td',
        'th',
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
      ],
      allowedAttributes: {
        a: ['href', 'title', 'target', 'rel'],
        img: ['src', 'alt', 'title'],
        input: ['type', 'checked', 'disabled'],
        '*': ['align'],
      },
      allowedSchemes: ['http', 'https', 'mailto'],
      allowProtocolRelative: false,
      transformTags: {
        a: sanitizeHtml.simpleTransform('a', {
          target: '_blank',
          rel: 'noopener noreferrer',
        }),
      },
    },
  );
}
