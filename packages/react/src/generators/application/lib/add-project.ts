import { NormalizedSchema } from '../schema';
import {
  addProjectConfiguration,
  joinPathFragments,
  ProjectConfiguration,
  TargetConfiguration,
} from '@nrwl/devkit';

export function addProject(host, options: NormalizedSchema) {
  const project: ProjectConfiguration = {
    root: options.appProjectRoot,
    sourceRoot: `${options.appProjectRoot}/src`,
    projectType: 'application',
    targets: {
      build: createBuildTarget(options),
      serve: createServeTarget(options),
    },
    tags: options.parsedTags,
  };

  addProjectConfiguration(
    host,
    options.projectName,
    {
      ...project,
    },
    options.standaloneConfig
  );
}

function maybeJs(options: NormalizedSchema, path: string): string {
  return options.js && (path.endsWith('.ts') || path.endsWith('.tsx'))
    ? path.replace(/\.tsx?$/, '.js')
    : path;
}

function createBuildTarget(options: NormalizedSchema): TargetConfiguration {
  return {
    executor: '@nrwl/webpack:webpack',
    outputs: ['{options.outputPath}'],
    defaultConfiguration: 'production',
    options: {
      compiler: options.compiler ?? 'babel',
      outputPath: joinPathFragments(
        'dist',
        options.appProjectRoot != '.'
          ? options.appProjectRoot
          : options.projectName
      ),
      index: joinPathFragments(options.appProjectRoot, 'src/index.html'),
      baseHref: '/',
      main: joinPathFragments(
        options.appProjectRoot,
        maybeJs(options, `src/main.tsx`)
      ),
      polyfills: joinPathFragments(
        options.appProjectRoot,
        maybeJs(options, 'src/polyfills.ts')
      ),
      tsConfig: joinPathFragments(options.appProjectRoot, 'tsconfig.app.json'),
      assets: [
        joinPathFragments(options.appProjectRoot, 'src/favicon.ico'),
        joinPathFragments(options.appProjectRoot, 'src/assets'),
      ],
      styles:
        options.styledModule || !options.hasStyles
          ? []
          : [
              joinPathFragments(
                options.appProjectRoot,
                `src/styles.${options.style}`
              ),
            ],
      scripts: [],
      webpackConfig: '@nrwl/react/plugins/webpack',
    },
    configurations: {
      development: {
        extractLicenses: false,
        optimization: false,
        sourceMap: true,
        vendorChunk: true,
      },
      production: {
        fileReplacements: [
          {
            replace: joinPathFragments(
              options.appProjectRoot,
              maybeJs(options, `src/environments/environment.ts`)
            ),
            with: joinPathFragments(
              options.appProjectRoot,
              maybeJs(options, `src/environments/environment.prod.ts`)
            ),
          },
        ],
        optimization: true,
        outputHashing: 'all',
        sourceMap: false,
        namedChunks: false,
        extractLicenses: true,
        vendorChunk: false,
      },
    },
  };
}

function createServeTarget(options: NormalizedSchema): TargetConfiguration {
  return {
    executor: '@nrwl/webpack:dev-server',
    defaultConfiguration: 'development',
    options: {
      buildTarget: `${options.projectName}:build`,
      hmr: true,
    },
    configurations: {
      development: {
        buildTarget: `${options.projectName}:build:development`,
      },
      production: {
        buildTarget: `${options.projectName}:build:production`,
        hmr: false,
      },
    },
  };
}
