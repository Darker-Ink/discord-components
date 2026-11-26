# @discord-mana/builders

A message builder for Discord: an editable UI for embeds and Components v2 with drag and drop, and a headless
core with Discord's validation rules, a document model with undo/redo, JSON import/export and a webhook client.

```sh
npm install @discord-mana/builders
```

`@discord-mana/builders` exports everything. `@discord-mana/builders/core` exports only the headless part (no
UI, no CSS) for apps that bring their own editor.

## Quick start

```tsx
import { MessageBuilderProvider, useMessageBuilder, sendWebhookMessage } from '@discord-mana/builders';

const Editor = () => {
  const builder = useMessageBuilder({ defaultValue: { content: 'Hello!' } });
  return (
    <MessageBuilderProvider builder={builder}>
      {/* your editor, or the UI components from this package */}
      <button disabled={builder.issues.some((i) => i.severity === 'error')} onClick={() => send(builder.toJSON())}>
        Send
      </button>
    </MessageBuilderProvider>
  );
};

const send = (payload) => sendWebhookMessage('https://discord.com/api/webhooks/…', payload);
```

## Editor UI

The whole builder in one component:

```tsx
import { MessageBuilder } from '@discord-mana/builders';
import '@discord-mana/builders/style.css'; // only when you import from dist; the umbrella package includes it

<AppRoot theme={ThemeTypes.DARK}>
  <MessageBuilder
    defaultValue={{ content: 'Hello!' }} // a payload or a BuilderDocument; or `value` + `onChange`
    mode="classic" // or "cv2"; changing it converts the message
    resolvers={resolvers} // users, roles, channels, emoji, avatars (as for <Message>)
    author={{ username: 'Captain Hook', avatarUrl: null }} // the webhook's own name and avatar
    webhookStorageKey="my-app:webhook" // offer to remember the webhook URL (opt-in, localStorage)
  />
</AppRoot>;
```

It is a palette, the message drawn exactly like `@discord-mana/messages` draws it (in a channel), and a side
panel with Issues, JSON and Send tabs. Everything is also exported on its own, to lay out yourself inside a
`BuilderProvider` (which takes the same options as `MessageBuilderProvider`, or `builder={useMessageBuilder(…)}`):

| Component                                    | What it is                                                                                                                                                                                                                                                          |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `BuilderCanvas`                              | The message, editable in place. Unselected it is pixel-identical to `<Message>` with the same JSON (checked by `scripts/builder-parity.mjs`).                                                                                                                       |
| `EditableEmbed`, `EditableEmbedField`        | One rich embed (and field): the client's embed markup with every part editable, a colour bar that opens a colour picker, and faint "add" placeholders for missing parts while selected.                                                                             |
| `EditableComponents`, `EditableComponent`    | The message's components through `@discord-mana/messages`' own `ActionRow`, `Section`, `Container`, `TextDisplay`, `MediaGallery`…, each wrapped in an editing frame.                                                                                               |
| `ComponentPalette`                           | What can be added, for the current mode. Drag an item to the canvas, or click it to add it next to the selection. Items with nowhere to go are dimmed.                                                                                                              |
| `ValidationPanel`                            | Errors and warnings from the core with meters for the totals. Clicking one selects the node and focuses the text at fault.                                                                                                                                          |
| `JsonPanel`                                  | The live payload, highlighted and editable (it applies as soon as it is valid JSON; invalid JSON is pointed out by line and column). Copy, download, import a file or drop one on it.                                                                               |
| `WebhookPanel`                               | Sends with `sendWebhookMessage`, from the browser. Thread, thread name, username and avatar overrides; Discord's answer, with its field errors linked to the nodes. Looks the webhook up to report its name, avatar and whether an app owns it (`onWebhookChange`). |
| `BuilderPanels`                              | The three panels as Mana `Tabs`.                                                                                                                                                                                                                                    |
| `BuilderModeSwitch`, `BuilderHistoryButtons` | Classic / Components v2, and undo / redo.                                                                                                                                                                                                                           |
| `BuilderChannel`                             | A channel's header bar and scroller around the canvas.                                                                                                                                                                                                              |
| `BuilderTextField`, `BuilderPlainTextField`  | The in-place text editors: markdown (`InlineEditor` from `@discord-mana/slate`, with the client's rule set for the field) or plain text, saving as you type.                                                                                                        |
| `NodeFrame`, `useNodeFrame`, `NodeToolbar*`  | The building blocks for editing your own kind of node: selection, focus, keyboard commands, dragging, issue outline and a toolbar.                                                                                                                                  |

**Editing.** Text is edited where it renders: click a title, a field, a button's label or a Text Display and
type. There are no inputs and no confirm buttons; every keystroke is saved into the document (consecutive
typing in one field is one undo step). Settings that have no text on screen (a button's style, emoji and URL,
a select's options, media URLs, a separator's spacing, a section's accessory, a container's accent colour and
spoiler) are in small popouts from the selected node's toolbar, drawn like the client's message hover bar.
Text near its limit gets a counter while you type; text over it, or invalid, gets a red underline and the
problem on hover; nodes with problems get a red outline and a marker.

**Drag and drop** uses `@dnd-kit/core`: it has pointer and keyboard sensors, screen reader instructions and a
drag overlay, which a native HTML5 drag-and-drop library can't give keyboard users. Drops are only offered
where the core's `canMove`/`canInsert` allow them: the nearest valid place in the innermost list under the
pointer gets a line (or a box, for an empty list). Embeds, fields, top-level components, container children
and buttons in a row move on the canvas; select options and gallery items are reordered in their editors
(`@dnd-kit/sortable`).

**Keyboard.** Tab to a node (it gets a focus ring and is selected). Enter edits its first text, Escape goes to
the parent, the arrow keys move between siblings, Alt+arrows move the node, Space picks it up to move it with
the arrow keys (Space drops, Escape cancels), Ctrl/⌘+D duplicates, Delete removes, Shift+F10 opens its menu
(also on right-click), and Ctrl/⌘+Z / Ctrl/⌘+Shift+Z undo and redo, in text too.

Media in a payload you send has no size, so the canvas measures images and videos to lay them out like
Discord's response would (`prepareEmbed`, `prepareComponents`); the document and the JSON keep exactly what was
written.

## Document model

A `BuilderDocument` is the message payload as a tree in which every node has a stable `uid`, used for React
keys, drag and drop and selection. Nodes are API objects in snake_case, exactly as in the payload, so they can
be passed to `@discord-mana/messages` directly. The internal id is `uid` because components already have the
API's numeric `id`.

```ts
interface BuilderDocument {
  uid: 'root';
  mode: 'classic' | 'cv2'; // cv2 = IS_COMPONENTS_V2; the flag is derived from the mode
  content: string;
  username?, avatar_url?, tts?, flags?, allowed_mentions?, thread_name?, applied_tags?, attachments?, poll?, …;
  embeds: EmbedNode[]; // APIEmbed & { uid, fields: EmbedFieldNode[] }
  components: TopLevelComponentNode[]; // API components & { uid }, children too
  extra?: Record<string, unknown>; // unknown payload keys, written back unchanged
}
```

Children live in **slots**, the properties that hold them: `embeds` and `components` (the message), `fields`
(an embed), `components` (action row, section, container), `accessory` (a section, at most one), `options` (a
string select) and `items` (a media gallery). `findNode(doc, uid)` returns
`{ node, kind, parentId, slot, index, path }`. It is O(1), using an index cached per document. Embeds, fields,
options and gallery items have no `type`, so `kind` is how you tell them apart.

Every operation shares structure: it copies only the node it changes and that node's ancestors. Untouched
nodes keep their identity, so `memo` and selectors stay cheap.

| Function                                                    | Description                                                                                                      |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `fromJSON(payload)`                                         | Payload (or a received message object) → document. Tolerant; drops response-only fields.                         |
| `toJSON(doc)`                                               | Document → payload. Strips uids and empty optional values; required fields stay so validation can report them.   |
| `nodeToAPI(doc, uid)`, `nodeToJSON(node, kind)`             | The API object of one subtree, memoised per node (what `toJSON` is built from).                                  |
| `parseMessageJSON(text)`                                    | `{ doc, errors }` from pasted JSON (payloads, messages, Discohook backups).                                      |
| `createDocument(mode?)`, `createNode(templateType)`         | Empty document; a new node with defaults (`'embed'`, `'field'`, `'button'`, `'link-button'`, `'section'`, …).    |
| `insertNode(doc, target, nodeOrType, kind?)`                | `{ doc, uid, reason? }`. `target = { parentId, slot?, index? }`; `parentId: null` is the message.                |
| `updateNode(doc, uid, patch)`, `updateMessage(doc, patch)`  | Shallow merge into API fields; `undefined` deletes a key. Changing `type` reshapes the child slots.              |
| `removeNode`, `moveNode(doc, uid, target)`, `duplicateNode` | A move's `index` is the final position, as in `arrayMove`. A duplicate gets unique `custom_id`s and no API `id`. |
| `setMode(doc, mode, { convert = true })`                    | Classic ↔ Components v2. Converts embeds ↔ containers; `convert: false` drops what the new mode can't show.      |
| `canMove(doc, uid, target)`, `checkMove`                    | Nesting and capacity rules (see below); `check*` returns `{ ok, reason }`. Cheap enough for every dragover.      |
| `canInsert(doc, nodeOrType, target)`, `checkInsert`         | The same check, for a node that doesn't exist yet (palette drops).                                               |
| `allowedTemplates(doc, target)`                             | Template types that fit at a target right now, for "add" menus.                                                  |
| `assignComponentIds(components)`                            | Fills in missing component `id`s the way the API does.                                                           |

The editing rules: an action row holds up to 5 buttons or one select; a section holds 1–3 text displays and
one button or thumbnail accessory; a container holds action rows, text displays, sections, media galleries,
files and separators. The top level of a classic message holds embeds (up to 10) and up to 5 action rows;
the top level of a Components v2 message holds no embeds, any layout or content component, and at most 40
components counting nested ones. Embeds hold up to 25 fields, string selects 25 options, and galleries 10 items.

## Store and React

```ts
const store = createBuilderStore(initialDocOrPayload, { onChange, validation, limit: 100, coalesceMs: 600 });
store.actions.insert(parentId, slot, index, 'button', { select: true }); // → uid | null
store.actions.update(uid, { label: 'Hi' }, { coalesce? }); // typing in one field within 600 ms is one undo step
store.actions.updateMessage({ username: 'Bot' }); store.actions.setContent('…');
store.actions.move(uid, { parentId, slot, index }); // → boolean
store.actions.duplicate(uid); store.actions.remove(uid); store.actions.setMode('cv2');
store.actions.replace(payload); store.actions.select(uid);
store.actions.undo(); store.actions.redo();
store.actions.checkpoint(); // end the current coalesced step (e.g. on blur)
store.actions.batch(() => { … }); // several changes, one undo step
store.getIssues(); store.getStats(); store.toJSON();
```

`builderReducer(state, action)` is the same logic as a plain reducer.

| Hook                                       | Returns                                                                                                                                                                                                 |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `useMessageBuilder(options \| initial)`    | `{ store, doc, selection, issues, stats, actions, dispatch, undo, redo, canUndo, canRedo, toJSON }`. Options: `value` + `onChange` (controlled) or `defaultValue`, `validation`, `limit`, `coalesceMs`. |
| `<MessageBuilderProvider builder={…}>`     | Context for the hooks below; without `builder` it creates one from the same options.                                                                                                                    |
| `useBuilderNode(uid)`                      | One node; re-renders only when that subtree changes.                                                                                                                                                    |
| `useNodeLocation(uid)`                     | `findNode` result for one node.                                                                                                                                                                         |
| `useNodeIssues(uid, { deep })`             | Issues of one node (or its subtree); the array stays the same until they change.                                                                                                                        |
| `useBuilderSelector(fn, isEqual?)`         | Any derived value of `(state, store)`.                                                                                                                                                                  |
| `useBuilderActions()`, `useBuilderStore()` | The actions and store (stable).                                                                                                                                                                         |
| `useBuilderSelection()`                    | `[uid, select]`.                                                                                                                                                                                        |
| `useBuilderIssues()`, `useDocumentStats()` | All issues; totals for counters.                                                                                                                                                                        |
| `useBuilder()`                             | The whole API from context (re-renders on every change).                                                                                                                                                |

## Validation

```ts
validateMessage(payload, {
  mode: 'auto', // or 'classic' / 'cv2'; auto reads IS_COMPONENTS_V2 from flags
  target: 'webhook', // or 'message' (Create Message) / 'interaction'; changes the allowed flags and fields
  applicationOwnedWebhook, // false: interactive components are errors; undefined: warnings; true: allowed
  files: ['cat.png'], // names of files you'll upload, to check attachment:// references
  threadId, // the thread_id you'll send to (thread_name can't be combined with it)
}); // → ValidationIssue[]

interface ValidationIssue {
  path: (string | number)[]; // ['embeds', 0, 'fields', 2, 'value']
  code: string; // MAX_LENGTH, REQUIRED, INVALID_URL, DUPLICATE_CUSTOM_ID, COMPONENT_COUNT, …
  message: string; // 'Description is too long (4121/4096)'
  severity: 'error' | 'warning';
  limit?: number;
  actual?: number;
  nodeId?: string; // validateDocument only: the deepest node ('root' for the message)
  field?: string; // validateDocument only: 'author.name', 'media.url', …
}
```

`validateDocument(doc, options)` validates `toJSON(doc)` and maps each issue to a node, memoised per document.
For counters there is `getLimit(kind, field)` (`getLimit('embed', 'title')` → 256,
`getLimit('message', 'content')` → 2000), `getDocumentStats(doc)` (embed characters out of 6000, components out
of 40, text display characters out of 4000…), `countEmbedCharacters` and `characterLength`, which counts code
points, the way Discord counts. The individual validators are exported too: `validateEmbed`,
`validateComponent`, `validateButton`, `validateSelect`, `validateAllowedMentions` and `validatePoll`.

### Limits

Every value is in `limits` and its source in `limitSources` (files and headings of
[discord-api-docs](https://github.com/discord/discord-api-docs), under `developers/`). Values marked _inferred_
aren't in the docs.

| Rule                                                              | Limit                                                                           | Source                                                               |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Content                                                           | 2000                                                                            | resources/message.mdx, Create Message                                |
| Embeds per message                                                | 10                                                                              | resources/message.mdx, Create Message                                |
| Embed title / description                                         | 256 / 4096                                                                      | resources/message.mdx, Embed Limits                                  |
| Fields, field name / value                                        | 25, 256 / 1024                                                                  | resources/message.mdx, Embed Limits                                  |
| Footer text / author name                                         | 2048 / 256                                                                      | resources/message.mdx, Embed Limits                                  |
| All embeds together                                               | 6000 (trimmed)                                                                  | resources/message.mdx, Embed Limits                                  |
| Embed colour                                                      | 0–0xFFFFFF (_inferred_ from the container docs)                                 | components/reference.mdx, Container Structure                        |
| Embed image/thumbnail URL, author/footer icon                     | http(s) or attachment://                                                        | resources/message.mdx, Embed Image/Author/Footer Structure           |
| Author URL                                                        | http(s); embed URL http(s) (_inferred_)                                         | resources/message.mdx, Embed Author Structure                        |
| Ignored embed fields                                              | type, provider, video, image width/height/proxy_url                             | resources/webhook.mdx, Execute Webhook                               |
| Flags                                                             | webhook: 4, 4096, 32768; message: also 8192; interaction: also 8192 and 64      | webhook.mdx / message.mdx / receiving-and-responding.mdx             |
| Components v2 forbids                                             | content, embeds, poll, stickers                                                 | resources/message.mdx, Create Message (footnote)                     |
| Components per CV2 message                                        | 40, nested included                                                             | components/reference.mdx intro; change-log "Raised Component Limits" |
| Classic top level                                                 | up to 5 action rows                                                             | components/reference.mdx, Legacy Message Component Behavior          |
| Action row                                                        | 5 buttons or 1 select                                                           | components/reference.mdx, Action Row                                 |
| Section                                                           | 1–3 text displays + button/thumbnail accessory                                  | components/reference.mdx, Section                                    |
| Container children                                                | action row, text display, section, gallery, file, separator; ≥1 (_inferred_)    | components/reference.mdx, Container                                  |
| Text display                                                      | 4000 each, 4000 in total                                                        | components/reference.mdx, Text Display                               |
| Media gallery                                                     | 1–10 items, description 1024                                                    | components/reference.mdx, Media Gallery                              |
| Thumbnail                                                         | description 1024, images only                                                   | components/reference.mdx, Thumbnail                                  |
| File                                                              | attachment:// only                                                              | components/reference.mdx, File                                       |
| Separator spacing                                                 | 1 or 2                                                                          | components/reference.mdx, Separator                                  |
| Container accent colour                                           | 0–0xFFFFFF or null                                                              | components/reference.mdx, Container                                  |
| Component `id`                                                    | unique, 32-bit (signed max _inferred_), 0 = unset                               | components/reference.mdx, Anatomy of a Component                     |
| `custom_id`                                                       | 1–100, unique per message                                                       | components/reference.mdx, Custom ID                                  |
| Button label / URL                                                | 80 / 512                                                                        | components/reference.mdx, Button Structure                           |
| Button styles                                                     | link: url, no custom_id; premium: sku_id only; others: custom_id, no url/sku_id | components/reference.mdx, Button                                     |
| Button label or emoji                                             | required (_inferred_)                                                           | —                                                                    |
| Select options                                                    | 1 (_inferred_)–25; label/value/description 100                                  | components/reference.mdx, String Select                              |
| Select placeholder / min / max values                             | 150 / 0–25 / 1–25                                                               | components/reference.mdx, String Select                              |
| default_values                                                    | count within min/max; user/role/channel types                                   | components/reference.mdx, User Select                                |
| Unique option values, defaults ≤ max_values, max_values ≤ options | _inferred_                                                                      | —                                                                    |
| Webhook username                                                  | 80, no "clyde"/"discord" (_inferred_ from webhook names)                        | resources/webhook.mdx, Create Webhook                                |
| Thread name / applied tags                                        | 100 (_inferred_) / 5                                                            | resources/channel.mdx, Start Thread in Forum or Media Channel        |
| Allowed mentions                                                  | 100 users, 100 roles; `parse` exclusive with lists                              | resources/message.mdx, Allowed Mentions Object                       |
| Poll                                                              | question 300, 1–10 answers of 55, 32 days                                       | resources/poll.mdx                                                   |
| Non-app webhooks                                                  | no interactive components; `with_components=true` needed                        | resources/webhook.mdx, Execute Webhook                               |

## Restrictions

A builder can allow less than Discord does. Pass `restrictions` to `useMessageBuilder`, `createBuilderStore`
or `MessageBuilderProvider` (and `<MessageBuilder>`), or to the pure functions as `{ restrictions }`. They
can turn things off and lower limits, never loosen Discord's.

A tag builder, for example, allows text in Components v2 messages only, with no files or custom
username:

```tsx
import { MessageBuilder, mergeRestrictions, restrictionPresets } from '@discord-mana/builders';

const tagRules = mergeRestrictions(restrictionPresets.textOnly, {
  modes: ['cv2'],
  counts: { container: 1 },
  message: { username: false, avatar_url: false },
  limits: { textDisplay: 1000, components: 10 },
});

<MessageBuilder restrictions={tagRules} defaultValue={tag} onChange={save} />;
```

```ts
interface BuilderRestrictions {
  modes?: ('classic' | 'cv2')[]; // default: both
  components?: { [name in ComponentName | 'default']?: boolean }; // { file: false } or { default: false, textDisplay: true }
  embeds?: boolean | { [part in EmbedPart]?: boolean }; // false, or { image: false, fields: false }
  message?: { [field in MessageField]?: boolean }; // content, username, avatar_url, tts, thread_name, applied_tags, allowed_mentions, poll, attachments, flags
  counts?: { [name in ComponentName]?: number }; // { container: 1, button: 3 }
  limits?: RestrictionLimits; // content, embeds, embedTitle, embedDescription, embedFields, fieldName, fieldValue, footerText,
  //                             authorName, embedTotal, components, textDisplay, textDisplayTotal, buttonLabel,
  //                             actionRowButtons, sectionComponents, galleryItems, selectOptions, username, threadName
}
```

The names for components are:

- **Layout and content:** `actionRow`, `section`, `textDisplay`, `thumbnail`, `mediaGallery`, `file`, `separator`, `container`.
- **Each button style:** `primaryButton`, `secondaryButton`, `successButton`, `dangerButton`, `linkButton`, `premiumButton`, with `button` for all of them.
- **Each select:** `stringSelect`, `userSelect`, `roleSelect`, `mentionableSelect`, `channelSelect`, with `select` for all of them.

A specific name wins over its group, and a group over `default`. So `{ button: false, linkButton: true }`
allows only link buttons. Embed parts are `title`, `description`, `url`, `color`, `timestamp`, `author`,
`footer`, `image`, `thumbnail` and `fields`.

How restrictions are applied:

- **Editing:**
  - `canInsert`, `canMove`, `allowedTemplates`, `insertNode`, `duplicateNode` and the store's actions refuse what isn't allowed, with a reason such as "Files aren't allowed in this builder".
  - `setMode` doesn't switch to a mode that isn't allowed, and cleans up the converted result.
  - Templates adapt: a new section gets a thumbnail when buttons are off.
  - An empty document starts in an allowed mode.
- **Validation:**
  - `fromJSON` keeps everything. `validateMessage(payload, { restrictions })` and `validateDocument` then report each disallowed piece as an error with `restricted: true`.
  - The codes are `MODE_NOT_ALLOWED`, `FIELD_NOT_ALLOWED`, `EMBEDS_NOT_ALLOWED`, `EMBED_FIELD_NOT_ALLOWED`, `COMPONENT_NOT_ALLOWED` and `MAX_COUNT`, plus the usual `MAX_LENGTH`/`MAX_ITEMS`/… with the lower limit, which replace Discord's issue for the same field.
- **Cleanup:** `sanitize(doc, restrictions)` (or `store.sanitize()`, one undo step) removes what isn't allowed:
  - a disallowed mode is converted;
  - disallowed fields, embed parts and components are dropped, and the text of a disallowed container or section is moved up;
  - counts and list limits drop the extra items;
  - text isn't shortened.
- **Questions the UI can ask cheaply:**
  - About the restrictions alone: `isComponentAllowed(r, nameOrComponent)`, `isTemplateAllowed(type, r)` (to hide palette items), `isModeAllowed`, `allowedModes`, `areEmbedsAllowed`, `isEmbedPartAllowed` and `isMessageFieldAllowed`.
  - About limits: `effectiveLimit(r, key)`, `getLimit(kind, field, r)` and `getDocumentStats(doc, r)`.
  - About a place in the current document, from the store: `store.checkInsert`, `store.checkMove` and `store.allowedTemplates`.
  - React hooks: `useAllowedTemplates(target)` and `useBuilderRestrictions()`.

Presets: `restrictionPresets.textOnly` allows text displays, containers, separators and embeds without images
or thumbnails, and no files or polls. `restrictionPresets.nonInteractive` allows what webhooks not owned by an
application can send: link buttons and no selects. Combine presets with `mergeRestrictions(...)`; the strictest
rule wins.

## Webhooks

```ts
const result = await sendWebhookMessage(webhookUrl, payload, {
  threadId,
  threadName,
  username,
  avatarUrl,
  files: [file, { name: 'cat.png', data: blob, description: 'A cat' }], // multipart, payload_json + attachments
  wait: true, // return the message
  withComponents: 'auto', // adds ?with_components=true when the payload has components
  maxRetryDelay: 5000, // retry a 429 once when retry_after is shorter
  signal,
  fetch,
});
if (result.ok) result.message;
else (result.message, result.issues, result.status, result.code, result.body, result.retryAfter);
```

It never throws. Discord's nested form errors come back as `issues` with the same paths as `validateMessage`,
and network or CORS failures are `status: 0`. Also exported: `editWebhookMessage(url, messageId, payload,
options)`, `parseWebhookUrl(url)` (discord.com, discordapp.com, canary./ptb., optional `/v{n}`, `thread_id`
from the query string), `buildWebhookRequest` (the request without sending it) and `parseDiscordErrors`.

## Tests

```sh
pnpm --filter @discord-mana/builders test
```
