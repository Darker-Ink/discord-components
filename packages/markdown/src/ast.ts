/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ASTNode } from './simpleMarkdown';

// The client's post-processing of parsed markdown: flattening, merging text, and the node limit.

const BAILED = {} as ASTNode;

/** Merges adjacent text nodes, drops validation-only data and unwraps nodes nested in a node of the same type. */
export const flattenAST = (state: { isSlate?: boolean }, ast: any, parent: ASTNode | null = null): any => {
  if (Array.isArray(ast)) {
    const result: ASTNode[] = [];
    for (const node of ast) {
      const flattened = flattenAST(state, node, parent);
      if (Array.isArray(flattened)) for (const child of flattened) result.push(child);
      else result.push(flattened);
    }
    if (!state.isSlate) {
      let previous: ASTNode | null = null;
      for (let i = 0; i < result.length; i++) {
        const node = result[i];
        if (
          previous == null ||
          previous.type !== 'text' ||
          previous.type !== node.type ||
          typeof previous.content !== 'string' ||
          typeof node.content !== 'string'
        ) {
          previous = node;
          continue;
        }
        previous.content += node.content;
        result.splice(i, 1);
        i--;
      }
    }
    return result;
  }
  if (ast.content != null) ast.content = flattenAST(state, ast.content, ast);
  if (ast.type === 'inlineCode') delete ast.validationChildContent;
  if (ast.type === 'list')
    ast.items = ast.items.map((item: any) => (Array.isArray(item) ? flattenAST(state, item, null) : item));
  return parent != null && ast.type === parent.type ? ast.content : ast;
};

/** Cuts the AST after 200 non-text nodes (the client renders the rest as plain text). */
export const limitAST = (
  ast: any,
  counter: { limit: number; hasBailedAst: boolean } = { limit: 200, hasBailedAst: false },
): { ast: any; hasBailedAst: boolean } => {
  if (Array.isArray(ast)) {
    const length = ast.length;
    for (let i = 0; i < length; i++) {
      const { ast: node } = limitAST(ast[i], counter);
      if (node === BAILED) {
        counter.hasBailedAst = true;
        ast.length = i;
        break;
      }
      ast[i] = node;
    }
  } else if (ast.type !== 'text') {
    counter.limit -= 1;
    if (counter.limit <= 0) {
      counter.hasBailedAst = true;
      return { ast: BAILED, hasBailedAst: true };
    }
    if (Array.isArray(ast.content)) ast.content = limitAST(ast.content, counter).ast;
    if (ast.type === 'list') ast.items = ast.items.map((item: any) => limitAST(item, counter).ast);
  }
  return { ast, hasBailedAst: counter.hasBailedAst };
};

/** The plain text of an AST (masked link titles fall back to it). */
export const astToString = (ast: any): string => {
  const parts: string[] = [];
  const collect = (node: any) => {
    if (Array.isArray(node)) node.forEach(collect);
    else if (typeof node.content === 'string') parts.push(node.content);
    else if (node.content != null) collect(node.content);
  };
  collect(ast);
  return parts.join('');
};

/** Calls the visitor for every node, list items included. */
export const walkAST = (ast: any, visit: (node: ASTNode) => void) => {
  if (Array.isArray(ast)) {
    for (const node of ast) walkAST(node, visit);
    return;
  }
  visit(ast);
  if (Array.isArray(ast.content)) walkAST(ast.content, visit);
  if (ast.type === 'list') walkAST(ast.items, visit);
};
