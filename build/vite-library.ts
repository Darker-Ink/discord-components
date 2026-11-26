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
   * CSS imported by the package is not bundled: the imports stay in the JS and the files (with everything
   * under `copy`) are copied to `dist` as they are. Used by `@discord-mana/tokens`, whose CSS refers to its
   * font files by relative URL.
   */
  keepCss?: boolean;
  /** Directories under `src` copied to `dist` verbatim. */
  copy?: string[];
  /**
   * Content of a `dist/style.css` written as is. For packages without CSS of their own that re-export other
   * packages; their JS doesn't import it (the re-exported packages already import their CSS).
   */
  stylesheet?: string;
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
 * the module refers to with `new URL(…, import.meta.url)`, which every modern bundler understands. Vite's
 * library mode would otherwise inline it as a data URL.
 */
const dependencyAssetUrls = (pkgDir: string): Plugin => {
  const require = createRequire(path.join(pkgDir, 'package.json'));
  const PREFIX = '\0dependency-asset:';
  return {
    name: 'discord-mana:dependency-asset-urls',
    enforce: 'pre',
    resolveId(id) {
      if (!id.endsWith('?url') || !isBareImport(id)) return null;
      return PREFIX + require.resolve(id.slice(0, -'?url'.length));
    },
    load(id) {
      if (!id.startsWith(PREFIX)) return null;
      const file = id.slice(PREFIX.length);
      const ref = this.emitFile({
        type: 'asset',
        fileName: `assets/${path.basename(file)}`,
        source: fs.readFileSync(file),
      });
      return `export default import.meta.ROLLUP_FILE_URL_${ref};`;
    },
  };
};

/** Makes the entry module import the extracted stylesheet, so bundlers pick up the styles with the JS. */
const importStylesheet = (): Plugin => ({
  name: 'discord-mana:import-stylesheet',
  enforce: 'post',
  generateBundle(_options, bundle) {
    if (!(STYLESHEET in bundle)) return;
    for (const chunk of Object.values(bundle)) {
      // Imported after everything else so the package's CSS comes after its dependencies' CSS, as in development.
      if (chunk.type === 'chunk' && chunk.isEntry) chunk.code += `import './${STYLESHEET}';\n`;
    }
  },
});

const emitStylesheet = (source: string): Plugin => ({
  name: 'discord-mana:emit-stylesheet',
  generateBundle() {
    this.emitFile({ type: 'asset', fileName: STYLESHEET, source });
  },
});

/** Leaves CSS imports in the JS untouched and copies the CSS files (and `copy` directories) to `dist`. */
const keepCssFiles = (pkgDir: string, copy: string[]): Plugin => {
  const srcDir = path.join(pkgDir, 'src');
  return {
    name: 'discord-mana:keep-css',
    enforce: 'pre',
    resolveId(id, importer) {
      if (!id.endsWith('.css') || importer == null) return null;
      return { id: id.startsWith('.') ? id : path.relative(path.dirname(importer), id), external: true };
    },
    generateBundle() {
      const emit = (dir: string, filter: (file: string) => boolean) => {
        for (const entry of fs.readdirSync(dir, { recursive: true, withFileTypes: true })) {
          if (!entry.isFile()) continue;
          const file = path.join(entry.parentPath, entry.name);
          if (!filter(file)) continue;
          const fileName = path.relative(srcDir, file).split(path.sep).join('/');
          this.emitFile({ type: 'asset', fileName, source: fs.readFileSync(file) });
        }
      };
      emit(srcDir, (file) => file.endsWith('.css'));
      for (const dir of copy) emit(path.join(srcDir, dir), () => true);
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
  { keepCss = false, copy = [], stylesheet }: LibraryOptions = {},
) => {
  const srcDir = path.join(pkgDir, 'src');
  const outDir = path.join(pkgDir, 'dist');

  // Declarations of workspace dependencies come from their own (already built) `dist`, so they are imported
  // by package name instead of being re-emitted here.
  const workspacePackages: Record<string, string[]> = {};
  for (const name of fs.readdirSync(PACKAGES_DIR)) {
    const manifest = path.join(PACKAGES_DIR, name, 'package.json');
    if (!fs.existsSync(manifest) || path.join(PACKAGES_DIR, name) === pkgDir) continue;
    workspacePackages[readJson(manifest).name] = [path.join(PACKAGES_DIR, name, 'dist/index.d.ts')];
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
      lib: { entry: path.join(srcDir, 'index.ts'), formats: ['es'], cssFileName: path.parse(STYLESHEET).name },
      rolldownOptions: {
        // Every package import stays an import: workspace packages, React and third-party libraries are
        // dependencies of the published package rather than bundled into it.
        external: (id) => isBareImport(id) && !id.endsWith('?url'),
        checks: { pluginTimings: false },
        output: { preserveModules: true, preserveModulesRoot: srcDir, entryFileNames: '[name].js' },
      },
    },
    plugins: [
      dependencyAssetUrls(pkgDir),
      keepCss ? keepCssFiles(pkgDir, copy) : stylesheet != null ? emitStylesheet(stylesheet) : importStylesheet(),
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
