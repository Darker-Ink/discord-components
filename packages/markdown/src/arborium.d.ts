// The grammar packages ship JavaScript without declarations.
declare module '@arborium/*/grammar.js' {
  const init: (options: { module_or_path: unknown }) => Promise<unknown>;
  export default init;
  export const language_id: () => string;
  export const injection_languages: () => string[];
}
