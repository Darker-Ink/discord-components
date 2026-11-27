import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import dts from 'vite-plugin-dts';
import { defineConfig, type Plugin, type UserConfig } from 'vite';

const REPO_ROOT = path.resolve(import.meta.dirname, '..');
const PACKAGES_DIR = path.join(REPO_ROOT, 'packages');

/** File name of the stylesheet each package extracts its CSS into (`dist/style.css`). */
export const STYLESHEET = 'style.css';

export interface LibraryOptions {
  /**
   * CSS imported by the package is not bundled: the imports stay in the JS and the files are copied to `dist`
   * as they are. Used by `@discord-mana/tokens`, whose CSS refers to its font files (under `copy`) by relative
   * URL.
   */
  keepCss?: boolean;
  /** Files or directories under `src` copied to the same path in `dist` verbatim. */
  copy?: string[];
  /**
   * Content of a `dist/style.css` written as is. For packages without CSS of their own that re-export other
   * packages; their JS doesn't import it (the re-exported packages already import their CSS).
   */
  stylesheet?: string;
  /** Entry points besides `src/index.ts`, as `{ name: path relative to src }` (e.g. subpath exports). */
  entries?: Record<string, string>;
  /**
   * `new URL('<dependency>/<file>', import.meta.url)` stays as written instead of being inlined as a data URL,
   * so the app's bundler resolves the file in the installed dependency. Used by `@discord-mana/markdown`, whose
   * code highlighting loads grammar files from optional peer dependencies.
   */
  keepDependencyUrls?: boolean;
}

const readJson = (file: string) => JSON.parse(fs.readFileSync(file, 'utf8'));

const isBareImport = (id: string) =>
  !id.startsWith('.') && !id.startsWith('/') && !id.startsWith('\0') && !path.isAbsolute(id);

/**
 * CSS module class names: `dm-` plus a hash of the file (relative to the repo, so it doesn't depend on where
 * the repo is checked out) and the class, which makes them stable across builds and machines.
 */
const scopedClassNames = () => {
  const seen = new Map<string, string>();
  return (local: string, filename: string) => {
    const file = path.relative(REPO_ROOT, filename.split('?')[0]).split(path.sep).join('/');
    const key = `${file}:${local}`;
    const digest = createHash('sha256').update(key).digest();
    const name = `dm-${digest.readUIntBE(0, 6).toString(36).padStart(10, '0')}`;
    const previous = seen.get(name);
    if (previous != null && previous !== key) throw new Error(`CSS class name collision: ${previous} and ${key}`);
    seen.set(name, key);
    return name;
  };
};

/**
 * Imports with `?url` of a file inside a dependency (e.g. a wasm runtime) become a file in `dist/assets` that
 * the module refers to with a relative `new URL(…, import.meta.url)`, which every modern bundler understands
 * (and Vite's dev server too, after pre-bundling the package). Vite's library mode would otherwise inline it as
 * a data URL, and `import.meta.ROLLUP_FILE_URL_*` renders as an absolute `/assets/…` path that only exists
 * on our own sites.
 */
const dependencyAssetUrls = (pkgDir: string): Plugin => {
  const require = createRequire(path.join(pkgDir, 'package.json'));
  // The id is the import specifier, not the resolved path, which would end up in the module's file name.
  const PREFIX = '\0dependency-asset:';
  const PLACEHOLDER = '__DISCORD_MANA_DEPENDENCY_ASSET__/';
  return {
    name: 'discord-mana:dependency-asset-urls',
    enforce: 'pre',
    resolveId(id) {
      if (!id.endsWith('?url') || !isBareImport(id)) return null;
      return PREFIX + id.slice(0, -'?url'.length);
    },
    load(id) {
      if (!id.startsWith(PREFIX)) return null;
      const spec = id.slice(PREFIX.length);
      const fileName = `assets/${path.basename(spec)}`;
      this.emitFile({ type: 'asset', fileName, source: fs.readFileSync(require.resolve(spec)) });
      return `export default new URL(/* @vite-ignore */ ${JSON.stringify(PLACEHOLDER + fileName)}, import.meta.url).href;`;
    },
    // Points the URL at the asset relative to wherever the module ends up in dist.
    renderChunk(code, chunk) {
      if (!code.includes(PLACEHOLDER)) return null;
      const dir = path.posix.dirname(chunk.fileName);
      const next = code.replace(
        /new URL\(\s*(?:\/\* @vite-ignore \*\/\s*)?(['"])__DISCORD_MANA_DEPENDENCY_ASSET__\/([^'"]+)\1/g,
        (_match, quote: string, fileName: string) => {
          const relative = path.posix.relative(dir, fileName);
          return `new URL(${quote}${relative.startsWith('.') ? relative : `./${relative}`}${quote}`;
        },
      );
      return { code: next, map: null };
    },
  };
};

/**
 * Without this, Vite's library mode inlines every `new URL('<dependency>/<file>', import.meta.url)` as a base64
 * data URL (248 MB for the markdown package's language entries). With it, the expression stays as written in
 * dist, so the app's bundler resolves the file in the installed (optional peer) dependency and emits it once,
 * only for the languages the app imports.
 */
const keepDependencyUrls = (): Plugin => {
  const MARK = '/* @vite-ignore */ ';
  return {
    name: 'discord-mana:keep-dependency-urls',
    enforce: 'pre',
    transform(code) {
      if (!code.includes('import.meta.url')) return null;
      const next = code.replace(
        /new URL\((['"])([^'"./][^'"]*)\1, import\.meta\.url\)/g,
        (match, quote: string, spec: string) =>
          isBareImport(spec) && !spec.includes(':')
            ? `new URL(${MARK}${quote}${spec}${quote}, import.meta.url)`
            : match,
      );
      return next === code ? null : { code: next, map: null };
    },
    // The bundler moves the comment onto its own line; drop it so the app's bundler handles the URL.
    renderChunk(code) {
      const next = code.replace(/new URL\(\s*\/\* @vite-ignore \*\/\s*(['"])/g, 'new URL($1');
      return next === code ? null : { code: next, map: null };
    },
  };
};

/**
 * Makes the entry modules that use CSS import the extracted stylesheet, so bundlers pick up the styles with the
 * JS. Entries without any (e.g. the builders' headless `core`) don't, so they also load where CSS can't, such
 * as plain Node.
 */
const importStylesheet = (): Plugin => ({
  name: 'discord-mana:import-stylesheet',
  enforce: 'post',
  generateBundle(_options, bundle) {
    if (!(STYLESHEET in bundle)) return;
    const usesCss = (entry: string) => {
      const seen = new Set<string>();
      const queue = [entry];
      while (queue.length > 0) {
        const id = queue.pop()!;
        if (seen.has(id)) continue;
        seen.add(id);
        if (/\.css($|\?)/.test(id)) return true;
        const info = this.getModuleInfo(id);
        if (info == null || info.isExternal) continue;
        queue.push(...info.importedIds, ...info.dynamicallyImportedIds);
      }
      return false;
    };
    for (const chunk of Object.values(bundle)) {
      // Imported after everything else so the package's CSS comes after its dependencies' CSS, as in development.
      if (chunk.type !== 'chunk' || !chunk.isEntry || chunk.facadeModuleId == null) continue;
      if (!usesCss(chunk.facadeModuleId)) continue;
      const relative = path.posix.relative(path.posix.dirname(chunk.fileName), STYLESHEET);
      chunk.code += `import '${relative.startsWith('.') ? relative : `./${relative}`}';\n`;
    }
  },
});

const emitStylesheet = (source: string): Plugin => ({
  name: 'discord-mana:emit-stylesheet',
  generateBundle() {
    this.emitFile({ type: 'asset', fileName: STYLESHEET, source });
  },
});

/** Emits the files under `target` (a file or a directory under `src`) to the same path in `dist`. */
const emitSourceFiles = (
  ctx: { emitFile: (file: { type: 'asset'; fileName: string; source: Uint8Array }) => string },
  srcDir: string,
  target: string,
  filter: (file: string) => boolean = () => true,
) => {
  const files = fs.statSync(target).isDirectory()
    ? fs
        .readdirSync(target, { recursive: true, withFileTypes: true })
        .filter((entry) => entry.isFile())
        .map((entry) => path.join(entry.parentPath, entry.name))
    : [target];
  for (const file of files) {
    if (!filter(file)) continue;
    const fileName = path.relative(srcDir, file).split(path.sep).join('/');
    ctx.emitFile({ type: 'asset', fileName, source: fs.readFileSync(file) });
  }
};

/** Leaves CSS imports in the JS untouched and copies the CSS files to `dist`. */
const keepCssFiles = (pkgDir: string): Plugin => {
  const srcDir = path.join(pkgDir, 'src');
  return {
    name: 'discord-mana:keep-css',
    enforce: 'pre',
    resolveId(id, importer) {
      if (!id.endsWith('.css') || importer == null) return null;
      return { id: id.startsWith('.') ? id : path.relative(path.dirname(importer), id), external: true };
    },
    generateBundle() {
      emitSourceFiles(this, srcDir, srcDir, (file) => file.endsWith('.css'));
    },
  };
};

const copyFiles = (pkgDir: string, copy: string[]): Plugin => {
  const srcDir = path.join(pkgDir, 'src');
  return {
    name: 'discord-mana:copy-files',
    generateBundle() {
      for (const target of copy) emitSourceFiles(this, srcDir, path.join(srcDir, target));
    },
  };
};

/**
 * Declarations are emitted per module like the JS. This adds the `.js` extensions ESM resolution needs to their
 * relative imports (`'./Button'` → `'./Button/index.js'`) and points CSS module imports at the emitted
 * `X.module.js`, writing an `X.module.d.ts` next to it.
 */
const declarationImports = (srcDir: string, outDir: string) => {
  const cssModules = new Set<string>();
  const beforeWriteFile = (filePath: string, content: string) => {
    // Declarations of imported JSON files (whole copies of the data) that no declaration refers to.
    if (filePath.endsWith('.json.d.ts')) return false;
    const dir = path.join(srcDir, path.relative(outDir, path.dirname(filePath)));
    const resolve = (spec: string) => {
      if (spec.endsWith('.module.css')) {
        const js = spec.replace(/\.css$/, '.js');
        cssModules.add(path.join(path.dirname(filePath), js));
        return js;
      }
      const target = path.join(dir, spec);
      if (['.ts', '.tsx', '.d.ts'].some((ext) => fs.existsSync(target + ext))) return `${spec}.js`;
      if (['index.ts', 'index.tsx'].some((index) => fs.existsSync(path.join(target, index)))) {
        return `${spec.replace(/\/$/, '')}/index.js`;
      }
      return spec;
    };
    return {
      content: content.replace(
        /(\bfrom\s+|\bimport\s*\(\s*|\bimport\s+)(['"])(\.{1,2}(?:\/[^'"]*)?)\2/g,
        (_match, prefix: string, quote: string, spec: string) => `${prefix}${quote}${resolve(spec)}${quote}`,
      ),
    };
  };
  const afterBuild = () => {
    for (const file of cssModules) {
      fs.writeFileSync(
        file.replace(/\.js$/, '.d.ts'),
        'declare const classes: Readonly<Record<string, string>>;\nexport default classes;\n',
      );
    }
  };
  return { beforeWriteFile, afterBuild };
};

export const defineLibraryConfig = (
  pkgDir: string,
  { keepCss = false, copy = [], stylesheet, entries = {}, keepDependencyUrls: keepUrls = false }: LibraryOptions = {},
) => {
  const srcDir = path.join(pkgDir, 'src');
  const outDir = path.join(pkgDir, 'dist');

  // Declarations of workspace dependencies come from their own (already built) `dist`, so they are imported
  // by package name (and subpath, e.g. `@discord-mana/markdown/internal`) instead of being re-emitted here.
  const workspacePackages: Record<string, string[]> = {};
  for (const name of fs.readdirSync(PACKAGES_DIR)) {
    const dir = path.join(PACKAGES_DIR, name);
    const manifest = path.join(dir, 'package.json');
    if (!fs.existsSync(manifest) || dir === pkgDir) continue;
    const { name: packageName, publishConfig } = readJson(manifest);
    workspacePackages[packageName] = [path.join(dir, 'dist/index.d.ts')];
    for (const [subpath, target] of Object.entries<string | { types?: string }>(publishConfig?.exports ?? {})) {
      if (subpath === '.' || typeof target === 'string' || target.types == null) continue;
      workspacePackages[packageName + subpath.slice(1)] = [path.join(dir, target.types)];
    }
  }

  const config: UserConfig = {
    root: pkgDir,
    publicDir: false,
    logLevel: 'warn',
    css: { modules: { generateScopedName: scopedClassNames() } },
    build: {
      outDir,
      emptyOutDir: true,
      target: 'es2023',
      minify: false,
      cssMinify: false,
      cssCodeSplit: false,
      lib: {
        entry: {
          index: path.join(srcDir, 'index.ts'),
          ...Object.fromEntries(Object.entries(entries).map(([name, file]) => [name, path.join(srcDir, file)])),
        },
        formats: ['es'],
        cssFileName: path.parse(STYLESHEET).name,
      },
      rolldownOptions: {
        // Every package import stays an import: workspace packages, React and third-party libraries are
        // dependencies of the published package rather than bundled into it.
        external: (id) => isBareImport(id) && !id.endsWith('?url'),
        checks: { pluginTimings: false },
        output: { preserveModules: true, preserveModulesRoot: srcDir, entryFileNames: '[name].js' },
      },
    },
    plugins: [
      ...(keepUrls ? [keepDependencyUrls()] : []),
      dependencyAssetUrls(pkgDir),
      ...(copy.length > 0 ? [copyFiles(pkgDir, copy)] : []),
      keepCss ? keepCssFiles(pkgDir) : stylesheet != null ? emitStylesheet(stylesheet) : importStylesheet(),
      dts({
        tsconfigPath: path.join(REPO_ROOT, 'tsconfig.base.json'),
        include: [path.join(srcDir, '**/*'), path.join(REPO_ROOT, 'types/**/*.d.ts')],
        entryRoot: srcDir,
        compilerOptions: { types: ['vite/client'], paths: workspacePackages },
        // Keep workspace packages as package imports instead of rewriting them to the `paths` above.
        pathsToAliases: false,
        afterDiagnostic: (diagnostics) => {
          if (diagnostics.length > 0) throw new Error('Type errors while generating declarations (see above)');
        },
        ...declarationImports(srcDir, outDir),
      }),
    ],
  };
  return defineConfig(config);
};
