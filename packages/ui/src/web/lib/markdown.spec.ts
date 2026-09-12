import { renderMarkdown } from './markdown';

describe('renderMarkdown', () => {
  it('renders basic markdown', () => {
    const html = renderMarkdown('# Hello\n\nSome *text* with `code`.');
    expect(html).toContain('<h1>Hello</h1>');
    expect(html).toContain('<em>text</em>');
    expect(html).toContain('<code>code</code>');
  });

  it('drops raw script tags', () => {
    const html = renderMarkdown(
      'hello <script>window.pwned = true</script> world',
    );
    expect(html).not.toContain('script');
    expect(html).not.toContain('pwned');
  });

  it('strips unsafe attributes and schemes', () => {
    const html = renderMarkdown(
      '[x](javascript:alert(1)) and ![img](data:image/svg+xml;base64,AAAA)',
    );
    expect(html).not.toContain('javascript:');
    expect(html).not.toContain('data:image');
  });

  it('opens external links in a new tab', () => {
    const html = renderMarkdown('[docs](https://example.com/docs)');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it('keeps relative links', () => {
    const html = renderMarkdown('[local](./setup)');
    expect(html).toContain('href="./setup"');
  });

  it('preserves tables', () => {
    const html = renderMarkdown('| a | b |\n|---|---|\n| 1 | 2 |');
    expect(html).toContain('<table>');
    expect(html).toContain('<th>a</th>');
  });

  it('renders an empty source to an empty string', () => {
    expect(renderMarkdown('')).toHaveLength(0);
  });
});
