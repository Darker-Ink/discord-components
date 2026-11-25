// Generates packages/icons/src/generated/<Name>.tsx and packages/icons/src/index.ts from the cached build.
//
// Discord ships every icon as its own webpack module exporting one component under its real name
// (`PotionIcon`, `CirclePlusIcon`, …). They all share one shape:
//
//   let { size = "md", width, height, color = tokens.colors.X, colorClass = "", ...rest } = props,
//       dims = getIconSize(size), w = dims?.width ?? width, h = dims?.height ?? height;
//   return jsx("svg", { ...a11y(rest), xmlns, width: w, height: h, fill: "none", viewBox, children });
//
// with literal SVG children whose `fill` is `typeof c == "string" ? c : c.css` for each color prop.
// Anything that doesn't fit the shape fails loudly so a new build can't silently produce wrong icons.
//
//   node scripts/extract-icons.mjs
import fs from 'node:fs';
import path from 'node:path';
import * as acorn from 'acorn';
import * as prettier from 'prettier';

const CACHE = path.resolve('.cache');
const MODULES = path.join(CACHE, 'modules');
const PACKAGE = path.resolve('packages/icons/src');
const OUT = path.join(PACKAGE, 'generated');

// Shared helpers the icons require: the size map lookup, the a11y defaults and the color tokens.
const SIZE_MODULES = new Set(['27989', '260612']);
const A11Y_MODULES = new Set(['996682', '953727']);
const TOKENS_MODULE = '646514';

const html = fs.readFileSync(path.join(CACHE, 'app.html'), 'utf8');
const build = html.match(/BUILD_NUMBER":"(\d+)"/)?.[1];

const fail = (where, message) => {
  throw new Error(`${where}: ${message}`);
};

// `var x = n(123)` bindings of a module, so token and helper references can be checked by module id.
const requireBindings = (ast, src) => {
  const req = src.match(/^\((?:function)?\s*\(([\w$]*),?([\w$]*),?([\w$]*)\)/)?.[3];
  const bindings = new Map();
  const visit = (node) => {
    if (!node || typeof node.type !== 'string') return;
    if (
      node.type === 'VariableDeclarator' &&
      node.id.type === 'Identifier' &&
      node.init?.type === 'CallExpression' &&
      node.init.callee.type === 'Identifier' &&
      node.init.callee.name === req &&
      node.init.arguments[0]?.type === 'Literal'
    )
      bindings.set(node.id.name, String(node.init.arguments[0].value));
    for (const key in node) {
      const child = node[key];
      if (Array.isArray(child)) child.forEach(visit);
      else if (child && typeof child.type === 'string') visit(child);
    }
  };
  visit(ast);
  return bindings;
};

const findIconFunctions = (ast) => {
  const found = [];
  const visit = (node) => {
    if (!node || typeof node.type !== 'string') return;
    if (node.type === 'Property' && node.value.type === 'FunctionExpression') {
      const name = node.key.name ?? node.key.value;
      const first = node.value.body.body[0];
      const destructuresSize =
        first?.type === 'VariableDeclaration' &&
        first.declarations[0].id.type === 'ObjectPattern' &&
        first.declarations[0].id.properties.some((p) => p.key?.name === 'size');
      if (/^[A-Z]\w*Icon$/.test(name) && destructuresSize) found.push({ name, fn: node.value });
    }
    for (const key in node) {
      const child = node[key];
      if (Array.isArray(child)) child.forEach(visit);
      else if (child && typeof child.type === 'string') visit(child);
    }
  };
  visit(ast);
  return found;
};

const tokenCss = (name) => `var(--${name.toLowerCase().replace(/_/g, '-')})`;

const parseIcon = (moduleId, name, fn, src, bindings) => {
  const where = `${name} (${moduleId})`;
  const text = (node) => src.slice(node.start, node.end);
  const [decl, ret, ...extra] = fn.body.body;
  if (extra.length || decl.type !== 'VariableDeclaration' || ret?.type !== 'ReturnStatement')
    fail(where, 'unexpected function body');
  const [propsDecl, sizeDecl, widthDecl, heightDecl, ...more] = decl.declarations;
  if (more.length) fail(where, 'unexpected declarations');

  // Destructured props: name, default, local identifier.
  const props = [];
  const locals = new Map(); // local identifier -> { kind, prop }
  let rest;
  for (const p of propsDecl.id.properties) {
    if (p.type === 'RestElement') {
      rest = p.argument.name;
      continue;
    }
    const prop = p.key.name ?? p.key.value;
    let local = p.value;
    let defaultValue;
    if (local.type === 'AssignmentPattern') {
      const right = local.right;
      local = local.left;
      if (right.type === 'Literal' && typeof right.value === 'string') defaultValue = right.value;
      else if (
        right.type === 'MemberExpression' &&
        /^[\w$]+\.A\.colors\.[A-Z0-9_]+$/.test(text(right)) &&
        bindings.get(right.object.object.object.name) === TOKENS_MODULE
      )
        defaultValue = tokenCss(right.property.name);
      else fail(where, `unexpected default for ${prop}: ${text(right)}`);
    }
    props.push({ prop, defaultValue });
    locals.set(local.name, prop);
  }
  if (!rest) fail(where, 'no rest props');
  const [first, second, third] = props;
  if (first?.prop !== 'size' || first.defaultValue !== 'md' || second?.prop !== 'width' || third?.prop !== 'height')
    fail(where, 'unexpected size/width/height props');
  const colorProps = props.slice(3);
  for (const { prop } of colorProps)
    if (!/^(|secondary|tertiary|quaternary)(color|Color)(Class)?$/.test(prop)) fail(where, `unexpected prop ${prop}`);

  // dims = J(size), w = dims?.width ?? width, h = dims?.height ?? height
  const sizeCall = sizeDecl.init;
  if (
    sizeCall.type !== 'CallExpression' ||
    !SIZE_MODULES.has(bindings.get(sizeCall.callee.expressions?.[1]?.object?.name)) ||
    locals.get(sizeCall.arguments[0].name) !== 'size'
  )
    fail(where, 'unexpected size lookup');
  const derived = new Map();
  for (const [d, dim] of [
    [widthDecl, 'width'],
    [heightDecl, 'height'],
  ]) {
    const expected = `${sizeDecl.id.name}?.${dim}??`;
    const init = text(d.init).replace(/\s/g, '');
    if (!init.startsWith(expected) || locals.get(init.slice(expected.length)) !== dim)
      fail(where, `unexpected ${dim} derivation`);
    derived.set(d.id.name, `dimensions?.${dim} ?? ${dim}`);
  }

  // Ids (masks, gradients) are static single letters in Discord's markup; we make them unique per instance.
  const ids = new Set();
  const usedColorProps = new Set();

  const valueOf = (key, node) => {
    if (node.type === 'Literal' && typeof node.value === 'string') return { literal: node.value };
    if (node.type === 'Identifier') {
      if (derived.has(node.name)) return { expr: derived.get(node.name) };
      const prop = locals.get(node.name);
      if (prop && /Class$/.test(prop) && key === 'className') {
        usedColorProps.add(prop);
        return { expr: prop };
      }
    }
    // "string" == typeof c ? c : c.css
    if (node.type === 'ConditionalExpression') {
      const local = node.consequent.name;
      const prop = locals.get(local);
      if (
        prop &&
        text(node.test).replace(/\s/g, '') === `"string"==typeof${local}` &&
        text(node.alternate) === `${local}.css`
      ) {
        usedColorProps.add(prop);
        return { expr: `resolveIconColor(${prop})` };
      }
    }
    fail(where, `unexpected value for ${key}: ${text(node)}`);
  };

  // Converts a jsx()/jsxs() call tree into an element tree.
  const element = (node) => {
    if (node.type !== 'CallExpression' || !/^\(?0,\s*[\w$]+\.jsxs?\)?$/.test(text(node.callee)))
      fail(where, `unexpected child ${text(node).slice(0, 60)}`);
    const [tag, attrs] = node.arguments;
    if (tag.type !== 'Literal' || attrs.type !== 'ObjectExpression') fail(where, 'unexpected element');
    const el = { tag: tag.value, attrs: [], children: [] };
    for (const p of attrs.properties) {
      if (p.type === 'SpreadElement') {
        const call = p.argument;
        if (
          tag.value !== 'svg' ||
          call.type !== 'CallExpression' ||
          !A11Y_MODULES.has(bindings.get(call.callee.expressions?.[1]?.object?.name)) ||
          call.arguments[0]?.name !== rest
        )
          fail(where, 'unexpected spread');
        el.attrs.push({ spread: 'iconA11yProps(props)' });
        continue;
      }
      const key = p.key.name ?? p.key.value;
      if (key === 'children') {
        const kids = p.value.type === 'ArrayExpression' ? p.value.elements : [p.value];
        el.children.push(...kids.map(element));
        continue;
      }
      const value = valueOf(key, p.value);
      if (key === 'id') ids.add(value.literal);
      el.attrs.push({ key, ...value });
    }
    return el;
  };
  const root = element(ret.argument);
  if (root.tag !== 'svg' || !root.attrs[0]?.spread) fail(where, 'root is not an <svg> with spread props');
  for (const { prop } of colorProps) if (!usedColorProps.has(prop)) fail(where, `color prop ${prop} is never used`);

  return { name, moduleId, props: colorProps, root, ids };
};

const attrSource = (attr, ids) => {
  if (attr.spread) return `{...${attr.spread}}`;
  if (attr.expr) return `${attr.key}={${attr.expr}}`;
  let value = attr.literal;
  if (ids.size) {
    const local = (id) => (ids.has(id) ? '${id}' + id : null);
    let rewritten = null;
    if (attr.key === 'id' && local(value)) rewritten = local(value);
    else if (attr.key === 'xlinkHref' && value.startsWith('#') && local(value.slice(1)))
      rewritten = '#' + local(value.slice(1));
    else if (/url\(#\w+\)/.test(value))
      rewritten = value.replace(/url\(#(\w+)\)/g, (m, id) => (ids.has(id) ? `url(#\${id}${id})` : m));
    if (rewritten != null && rewritten !== value) return `${attr.key}={\`${rewritten}\`}`;
  }
  if (/["{}<>\\\n]/.test(value)) return `${attr.key}={${JSON.stringify(value)}}`;
  return `${attr.key}="${value}"`;
};

const elementSource = (el, ids) => {
  const attrs = el.attrs.map((a) => attrSource(a, ids)).join(' ');
  if (!el.children.length) return `<${el.tag} ${attrs} />`;
  return `<${el.tag} ${attrs}>${el.children.map((c) => elementSource(c, ids)).join('')}</${el.tag}>`;
};

const header = `// Generated by scripts/extract-icons.mjs from Discord build ${build}. Do not edit by hand.\n\n`;

const iconSource = (icon) => {
  const colorNames = icon.props.map((p) => p.prop);
  const params = [
    `size = 'md'`,
    'width',
    'height',
    ...icon.props.map(({ prop, defaultValue }) =>
      defaultValue === undefined ? prop : `${prop} = ${JSON.stringify(defaultValue)}`,
    ),
    '...props',
  ];
  const propsType = colorNames.length ? `IconProps<${colorNames.map((n) => `'${n}'`).join(' | ')}>` : 'IconProps';
  const helpers = ['getIconSize', 'iconA11yProps'];
  if (icon.props.some((p) => !/Class$/.test(p.prop))) helpers.push('resolveIconColor');
  const reactImport = icon.ids.size ? `import { useId } from 'react';\n` : '';
  const body = [
    icon.ids.size ? 'const id = useId();' : '',
    'const dimensions = getIconSize(size);',
    `return (${elementSource(icon.root, icon.ids)});`,
  ].join('\n');
  return `${header}${reactImport}import { ${helpers.join(', ')}, type IconProps } from '../icon';

export const ${icon.name} = ({ ${params.join(', ')} }: ${propsType}) => {
${body}
};
${icon.name}.displayName = '${icon.name}';
`;
};

// 1. Find every icon module.
const icons = [];
for (const file of fs.readdirSync(MODULES).sort()) {
  const raw = fs.readFileSync(path.join(MODULES, file), 'utf8');
  if (!/[{,][A-Z]\w*Icon:function/.test(raw)) continue;
  const src = raw.replace(/^\/\/.*\n/, '');
  const ast = acorn.parseExpressionAt(src, 0, { ecmaVersion: 'latest' });
  const moduleId = file.replace(/\.js$/, '');
  const found = findIconFunctions(ast);
  if (!found.length) continue;
  const bindings = requireBindings(ast, src);
  for (const { name, fn } of found) icons.push(parseIcon(moduleId, name, fn, src, bindings));
}
icons.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
const seen = new Set();
for (const icon of icons) {
  if (seen.has(icon.name)) throw new Error(`duplicate icon ${icon.name}`);
  seen.add(icon.name);
}

// 2. Write one file per icon, then the index.
const prettierConfig = (await prettier.resolveConfig(path.join(PACKAGE, 'index.ts'))) ?? {};
const format = (source, filepath) => prettier.format(source, { ...prettierConfig, filepath });

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
for (const icon of icons) {
  const file = path.join(OUT, `${icon.name}.tsx`);
  fs.writeFileSync(file, await format(iconSource(icon), file));
}

const index = `${header}export { IconSizes, getIconSize, resolveIconColor, iconA11yProps } from './icon';
export type { IconColor, IconProps, IconSize } from './icon';

${icons.map((icon) => `export { ${icon.name} } from './generated/${icon.name}';`).join('\n')}
`;
fs.writeFileSync(path.join(PACKAGE, 'index.ts'), await format(index, path.join(PACKAGE, 'index.ts')));

const special = icons.filter((i) => i.ids.size).map((i) => i.name);
const fixed = icons.filter((i) => !i.props.length).map((i) => i.name);
const multi = icons.filter((i) => i.props.filter((p) => !/Class$/.test(p.prop)).length > 1).map((i) => i.name);
console.log(`${icons.length} icons written to ${path.relative(process.cwd(), OUT)}`);
console.log(`  ${multi.length} with secondary colors: ${multi.join(', ')}`);
console.log(`  ${fixed.length} with fixed colors only`);
console.log(`  ${special.length} with ids made unique per instance`);
