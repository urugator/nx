import { readJson } from '@nrwl/devkit';
import type { Tree, NxJsonConfiguration } from '@nrwl/devkit';
import Ajv from 'ajv';
import { workspaceGenerator } from './workspace';
import { createTree } from '@nrwl/devkit/testing';
import { Preset } from '../utils/presets';
import * as nxSchema from '../../../../nx/schemas/nx-schema.json';

describe('@nrwl/workspace:workspace', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTree();
  });

  it('should create files', async () => {
    await workspaceGenerator(tree, {
      name: 'proj',
      directory: 'proj',
      cli: 'nx',
      preset: Preset.Empty,
      defaultBase: 'main',
    });
    expect(tree.exists('/proj/nx.json')).toBe(true);
    expect(tree.exists('/proj/workspace.json')).toBe(false);
    expect(tree.exists('/proj/.prettierrc')).toBe(true);
    expect(tree.exists('/proj/.prettierignore')).toBe(true);
  });

  it('should create nx.json', async () => {
    const ajv = new Ajv();

    await workspaceGenerator(tree, {
      name: 'proj',
      directory: 'proj',
      cli: 'nx',
      preset: Preset.Empty,
      defaultBase: 'main',
    });
    const nxJson = readJson<NxJsonConfiguration>(tree, '/proj/nx.json');
    expect(nxJson).toMatchInlineSnapshot(`
      Object {
        "$schema": "./node_modules/nx/schemas/nx-schema.json",
        "npmScope": "proj",
        "targetDefaults": Object {
          "build": Object {
            "dependsOn": Array [
              "^build",
            ],
          },
        },
        "tasksRunnerOptions": Object {
          "default": Object {
            "options": Object {
              "cacheableOperations": Array [
                "build",
                "lint",
                "test",
                "e2e",
              ],
            },
            "runner": "nx/tasks-runners/default",
          },
        },
      }
    `);
    const validateNxJson = ajv.compile(nxSchema);
    expect(validateNxJson(nxJson)).toEqual(true);
  });

  it('should setup named inputs and target defaults for non-empty presets', async () => {
    await workspaceGenerator(tree, {
      name: 'proj',
      directory: 'proj',
      cli: 'nx',
      preset: Preset.React,
      defaultBase: 'main',
    });
    const nxJson = readJson<NxJsonConfiguration>(tree, '/proj/nx.json');
    expect(nxJson).toMatchInlineSnapshot(`
      Object {
        "$schema": "./node_modules/nx/schemas/nx-schema.json",
        "namedInputs": Object {
          "default": Array [
            "{projectRoot}/**/*",
            "sharedGlobals",
          ],
          "production": Array [
            "default",
          ],
          "sharedGlobals": Array [],
        },
        "npmScope": "proj",
        "targetDefaults": Object {
          "build": Object {
            "dependsOn": Array [
              "^build",
            ],
            "inputs": Array [
              "production",
              "^production",
            ],
          },
        },
        "tasksRunnerOptions": Object {
          "default": Object {
            "options": Object {
              "cacheableOperations": Array [
                "build",
                "lint",
                "test",
                "e2e",
              ],
            },
            "runner": "nx/tasks-runners/default",
          },
        },
      }
    `);
  });

  it('should create a prettierrc file', async () => {
    await workspaceGenerator(tree, {
      name: 'proj',
      directory: 'proj',
      cli: 'nx',
      preset: Preset.Empty,
      defaultBase: 'main',
    });
    expect(tree.read('proj/.prettierrc', 'utf-8')).toMatchSnapshot();
  });

  it('should recommend vscode extensions', async () => {
    await workspaceGenerator(tree, {
      name: 'proj',
      directory: 'proj',
      cli: 'nx',
      preset: Preset.Empty,
      defaultBase: 'main',
    });
    const recommendations = readJson<{ recommendations: string[] }>(
      tree,
      'proj/.vscode/extensions.json'
    ).recommendations;

    expect(recommendations).toMatchSnapshot();
  });

  it('should recommend vscode extensions (angular)', async () => {
    await workspaceGenerator(tree, {
      name: 'proj',
      directory: 'proj',
      cli: 'angular',
      preset: Preset.Empty,
      defaultBase: 'main',
    });
    const recommendations = readJson<{ recommendations: string[] }>(
      tree,
      'proj/.vscode/extensions.json'
    ).recommendations;

    expect(recommendations).toMatchSnapshot();
  });

  it('should add decorate-angular-cli when used with angular cli', async () => {
    await workspaceGenerator(tree, {
      name: 'proj',
      directory: 'proj',
      cli: 'angular',
      preset: Preset.Empty,
      defaultBase: 'main',
    });
    expect(tree.exists('/proj/decorate-angular-cli.js')).toBe(true);

    const { scripts } = readJson(tree, '/proj/package.json');
    expect(scripts).toMatchInlineSnapshot(`
      Object {
        "build": "nx build",
        "ng": "nx",
        "postinstall": "node ./decorate-angular-cli.js",
        "start": "nx serve",
        "test": "nx test",
      }
    `);
  });

  it('should not add decorate-angular-cli when used with nx cli', async () => {
    await workspaceGenerator(tree, {
      name: 'proj',
      directory: 'proj',
      cli: 'nx',
      preset: Preset.Empty,
      defaultBase: 'main',
    });
    expect(tree.exists('/proj/decorate-angular-cli.js')).toBe(false);

    const { scripts } = readJson(tree, '/proj/package.json');
    expect(scripts).toMatchInlineSnapshot(`
      Object {
        "build": "nx build",
        "start": "nx serve",
        "test": "nx test",
      }
    `);
  });

  it('should create a workspace using NPM preset (npm package manager)', async () => {
    tree.write('/proj/package.json', JSON.stringify({}));
    await workspaceGenerator(tree, {
      name: 'proj',
      directory: 'proj',
      cli: 'nx',
      preset: Preset.NPM,
      defaultBase: 'main',
      packageManager: 'npm',
    });
    expect(tree.exists('/proj/packages/.gitkeep')).toBe(true);
    expect(tree.exists('/proj/apps/.gitkeep')).toBe(false);
    expect(tree.exists('/proj/libs/.gitkeep')).toBe(false);
    const nx = readJson(tree, '/proj/nx.json');
    expect(nx).toMatchInlineSnapshot(`
      Object {
        "$schema": "./node_modules/nx/schemas/nx-schema.json",
        "extends": "nx/presets/npm.json",
        "tasksRunnerOptions": Object {
          "default": Object {
            "options": Object {
              "cacheableOperations": Array [
                "build",
                "lint",
                "test",
                "e2e",
              ],
            },
            "runner": "nx/tasks-runners/default",
          },
        },
      }
    `);

    const packageJson = readJson(tree, '/proj/package.json');
    expect(packageJson).toMatchInlineSnapshot(`
      Object {
        "dependencies": Object {},
        "devDependencies": Object {
          "nx": "0.0.1",
          "prettier": "^2.6.2",
        },
        "license": "MIT",
        "name": "proj",
        "private": true,
        "scripts": Object {},
        "version": "0.0.0",
        "workspaces": Array [
          "packages/*",
        ],
      }
    `);
  });

  it('should create a workspace using NPM preset (pnpm package manager)', async () => {
    tree.write('/proj/package.json', JSON.stringify({}));
    await workspaceGenerator(tree, {
      name: 'proj',
      directory: 'proj',
      cli: 'nx',
      preset: Preset.NPM,
      defaultBase: 'main',
      packageManager: 'pnpm',
    });
    const packageJson = readJson(tree, '/proj/package.json');
    expect(packageJson).toMatchInlineSnapshot(`
      Object {
        "dependencies": Object {},
        "devDependencies": Object {
          "nx": "0.0.1",
          "prettier": "^2.6.2",
        },
        "license": "MIT",
        "name": "proj",
        "private": true,
        "scripts": Object {},
        "version": "0.0.0",
      }
    `);
    const pnpm = tree.read('/proj/pnpm-workspace.yaml').toString();
    expect(pnpm).toContain('packages/*');
  });
});
