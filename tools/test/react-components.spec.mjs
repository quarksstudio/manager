import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';

function components(source, filename) {
  const ast = ts.createSourceFile(
    filename,
    source,
    ts.ScriptTarget.Latest,
    true,
    filename.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const names = [];
  function renders(node) {
    if (
      ts.isJsxElement(node) ||
      ts.isJsxSelfClosingElement(node) ||
      ts.isJsxFragment(node)
    )
      return true;
    if (
      ts.isCallExpression(node) &&
      /^(React\.)?createElement$/.test(node.expression.getText(ast))
    )
      return true;
    return ts.forEachChild(node, renders) === true;
  }
  function returnsReact(node) {
    if (ts.isClassDeclaration(node))
      return node.members.some(
        (member) => member.name?.getText(ast) === 'render',
      );
    function returned(child) {
      if (ts.isReturnStatement(child))
        return !!child.expression && renders(child.expression);
      if (ts.isFunctionLike(child)) return false;
      return ts.forEachChild(child, returned) === true;
    }
    return !!node.body && returned(node.body);
  }
  function visit(node) {
    if (
      (ts.isFunctionDeclaration(node) ||
        ts.isClassDeclaration(node) ||
        ts.isVariableDeclaration(node)) &&
      node.name &&
      ts.isIdentifier(node.name) &&
      /^[A-Z]/.test(node.name.text) &&
      (ts.isVariableDeclaration(node)
        ? renders(node.initializer ?? node)
        : returnsReact(node))
    ) {
      names.push(node.name.text);
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  return names;
}
function files(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (
      [
        'node_modules',
        'dist',
        'test',
        'tests',
        '__tests__',
        '.astro',
        '.git',
      ].includes(entry.name)
    )
      return [];
    const path = join(directory, entry.name);
    return entry.isDirectory()
      ? files(path)
      : /\.[jt]sx?$/.test(path) && !/\.(spec|test)\./.test(path)
        ? [path]
        : [];
  });
}

test('component detector includes JSX, createElement, memo and forwardRef', () => {
  assert.deepEqual(
    components(
      `
    function View() { return <div />; }
    const Wrapped = memo(() => <View />);
    const Ref = forwardRef((props, ref) => <div ref={ref} />);
    function Provider() { return createElement(Context.Provider, {}, null); }
    const renderItem = () => <span />;
    function Action() { renderAction(createElement(View)); }
    function WithCallback() { consume(() => <View />); return null; }
  `,
      'example.tsx',
    ),
    ['View', 'Wrapped', 'Ref', 'Provider'],
  );
});

test('production React files declare at most one component', () => {
  const violations = ['packages', 'apps', 'tools']
    .flatMap(files)
    .flatMap((file) => {
      const names = components(readFileSync(file, 'utf8'), file);
      return names.length > 1 ? [`${file}: ${names.join(', ')}`] : [];
    });
  assert.deepEqual(violations, []);
});
