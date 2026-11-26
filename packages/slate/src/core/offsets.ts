import type { Editor, Path, Point } from 'slate';
import { EditorUtils, PathUtils, TextUtils } from './slateUtils';

/** The point at an offset into a block's serialized children (`ElementUtils.serializeMarkdownChildren`). */
export const pointAtSerializedOffset = (
  editor: Editor,
  blockPath: Path,
  serialized: (string | null)[],
  offset: number,
): Point => {
  let position = 0;
  for (let i = 0; i < serialized.length; i++) {
    const text = serialized[i];
    if (text == null) continue;
    const end = position + text.length;
    if (offset <= end) {
      const path = PathUtils.child(blockPath, i);
      const [node] = EditorUtils.node(editor, path);
      if (TextUtils.isText(node)) return { path, offset: Math.min(Math.max(offset - position, 0), node.text.length) };
    }
    position = end;
  }
  const last = serialized.length - 1;
  return { path: PathUtils.child(blockPath, last), offset: serialized[last]?.length ?? 0 };
};
