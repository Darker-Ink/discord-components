---
'@discord-mana/builders': patch
'@discord-mana/messages': patch
'@discord-mana/components': patch
'@discord-mana/markdown': patch
'@discord-mana/slate': patch
'@discord-mana/icons': patch
---

Builder fixes, and American English throughout.

- **builders:** color pickers (and other popouts opened from a node's toolbar) no longer close when you pick something in them, or after uploading a file from one. An empty button label shows a "Label" placeholder while selected, and selecting a button goes straight to typing its label. Separators, empty text displays and empty embeds are easy to select (invisible hit areas that don't change layout; about 44px on touch screens).
- **All packages:** labels, validation messages, docs and comments use American English ("Color", "Accent color", "No color", "canceled"…). The builder's `Embed color` / `Accent color` labels and the issue messages for colors changed accordingly.
