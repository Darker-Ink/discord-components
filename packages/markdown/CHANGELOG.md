# @discord-mana/markdown

## 1.0.1

### Patch Changes

- 073cb6a: Builder fixes, and American English throughout.

  - **builders:** color pickers (and other popouts opened from a node's toolbar) no longer close when you pick something in them, or after uploading a file from one. An empty button label shows a "Label" placeholder while selected, and selecting a button goes straight to typing its label. Separators, empty text displays and empty embeds are easy to select (invisible hit areas that don't change layout; about 44px on touch screens).
  - **All packages:** labels, validation messages, docs and comments use American English ("Color", "Accent color", "No color", "canceled"…). The builder's `Embed color` / `Accent color` labels and the issue messages for colors changed accordingly.

- Updated dependencies [073cb6a]
  - @discord-mana/messages@1.0.1
  - @discord-mana/components@1.0.1
  - @discord-mana/icons@1.0.1
  - @discord-mana/tokens@1.0.1

## 1.0.0

### Major Changes

- 5d1a7da: First stable release.

### Patch Changes

- Updated dependencies [5d1a7da]
  - @discord-mana/tokens@1.0.0
  - @discord-mana/icons@1.0.0
  - @discord-mana/components@1.0.0
  - @discord-mana/messages@1.0.0
