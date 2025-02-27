import type { Tree } from '@nrwl/devkit';
import {
  joinPathFragments,
  normalizePath,
  offsetFromRoot,
  visitNotIgnoredFiles,
} from '@nrwl/devkit';
import { dirname } from 'path';
import type { GeneratorOptions } from '../../schema';
import type {
  MigrationProjectConfiguration,
  Target,
  ValidationError,
  ValidationResult,
  WorkspaceRootFileTypesInfo,
} from '../../utilities';
import { arrayToString, Logger } from '../../utilities';
import type { BuilderMigratorClassType } from '../builders';
import { BuilderMigrator } from '../builders';
import { Migrator } from '../migrator';

export abstract class ProjectMigrator<
  TargetType extends string = string
> extends Migrator {
  public get projectName(): string {
    return this.project.name;
  }

  protected builderMigrators: BuilderMigrator[];
  protected readonly targetNames: Partial<Record<TargetType, string>> = {};

  constructor(
    tree: Tree,
    protected readonly options: GeneratorOptions,
    protected readonly targets: Record<TargetType, Target>,
    project: MigrationProjectConfiguration,
    rootDir: string,
    logger?: Logger,
    // TODO(leo): this will replace `targets` and become required once the full
    // refactor is done.
    supportedBuilderMigrators?: BuilderMigratorClassType[]
  ) {
    super(tree, project.config, logger ?? new Logger(project.name));

    this.project = {
      name: project.name,
      oldRoot: this.projectConfig.root ?? '',
      oldSourceRoot:
        this.projectConfig.sourceRoot ||
        joinPathFragments(this.projectConfig.root ?? '', 'src'),
      newRoot: `${rootDir}/${project.name}`,
      newSourceRoot: `${rootDir}/${project.name}/src`,
    };

    this.collectTargetNames();
    this.createBuilderMigrators(supportedBuilderMigrators);
  }

  getWorkspaceRootFileTypesInfo(): WorkspaceRootFileTypesInfo {
    const workspaceRootFileTypesInfo: WorkspaceRootFileTypesInfo = {
      eslint:
        Boolean(this.projectConfig.targets?.lint) ||
        this.tree.exists(`${this.projectConfig.root}/.eslintrc.json`),
      karma: this.builderMigrators.some(
        (migrator) =>
          migrator.rootFileType === 'karma' && migrator.isBuilderUsed()
      ),
    };

    return workspaceRootFileTypesInfo;
  }

  override validate(): ValidationResult {
    const errors: ValidationError[] = [];

    // check project root
    if (
      this.projectConfig.root === undefined ||
      this.projectConfig.root === null
    ) {
      errors.push({
        message:
          'The project root is not defined in the project configuration.',
        hint:
          `Make sure the value for "projects.${this.project.name}.root" is set ` +
          `or remove the project if it is not valid.`,
      });
    } else if (
      this.projectConfig.root !== '' &&
      !this.tree.exists(this.projectConfig.root)
    ) {
      errors.push({
        message: `The project root "${this.project.oldRoot}" could not be found.`,
        hint:
          `Make sure the value for "projects.${this.project.name}.root" is correct ` +
          `or remove the project if it is not valid.`,
      });
    }

    // check project source root
    if (
      this.projectConfig.sourceRoot &&
      !this.tree.exists(this.projectConfig.sourceRoot)
    ) {
      errors.push({
        message: `The project source root "${this.project.oldSourceRoot}" could not be found.`,
        hint:
          `Make sure the value for "projects.${this.project.name}.sourceRoot" is correct ` +
          `or remove the project if it is not valid.`,
      });
    }

    // check for usage of unsupported builders
    const allSupportedBuilders = [
      ...Object.values<Target>(this.targets)
        .map((x) => x.builders)
        .flat(),
    ];
    allSupportedBuilders.push(
      ...this.builderMigrators.map((migrator) => migrator.builderName)
    );
    const unsupportedBuilders: [target: string, builder: string][] = [];

    Object.entries(this.projectConfig.targets ?? {}).forEach(
      ([targetName, target]) => {
        if (!allSupportedBuilders.includes(target.executor)) {
          unsupportedBuilders.push([targetName, target.executor]);
        }
      }
    );

    if (unsupportedBuilders.length) {
      errors.push({
        messageGroup: {
          title: 'Unsupported builders',
          messages: unsupportedBuilders.map(
            ([target, builder]) =>
              `The "${target}" target is using an unsupported builder "${builder}".`
          ),
        },
        hint: `The supported builders for ${
          this.projectConfig.projectType === 'library'
            ? 'libraries'
            : 'applications'
        } are: ${arrayToString(allSupportedBuilders)}.`,
      });
    }

    // check for multiple targets for the same type of target
    const targetTypes = Object.keys(this.targets) as TargetType[];
    const targetsByType: Record<TargetType, string[]> = Object.entries(
      this.projectConfig.targets ?? {}
    ).reduce(
      (acc, [target, { executor }]) => {
        targetTypes.forEach((targetType) => {
          if (this.targets[targetType].builders.includes(executor)) {
            acc[targetType].push(target);
            return acc;
          }
        });

        return acc;
      },
      targetTypes.reduce(
        (acc, targetType) => ({ ...acc, [targetType]: [] }),
        {} as Record<TargetType, string[]>
      )
    );
    targetTypes.forEach((targetType) => {
      if (
        this.targets[targetType].acceptMultipleDefinitions ||
        targetsByType[targetType].length <= 1
      ) {
        return;
      }

      errors.push({
        message: `There is more than one target using a builder that is used to ${targetType} the project (${arrayToString(
          targetsByType[targetType]
        )}).`,
        hint: `Make sure the project only has one target with a builder that is used to ${targetType} the project.`,
      });
    });

    return errors.length ? errors : null;
  }

  protected convertEsLintConfigExtendToNewPath(
    eslintConfigPath: string,
    extendPath: string
  ): string {
    if (!extendPath.startsWith('..')) {
      // we only need to adjust paths that are on a different directory, files
      // in the same directory are moved together so their relative paths are
      // not changed
      return extendPath;
    }

    return joinPathFragments(
      offsetFromRoot(this.project.newRoot),
      dirname(eslintConfigPath),
      extendPath
    );
  }

  protected convertRootPath(originalPath: string): string {
    return originalPath?.startsWith(this.project.oldRoot)
      ? joinPathFragments(
          this.project.newRoot,
          originalPath.replace(this.project.oldRoot, '')
        )
      : originalPath;
  }

  protected convertPath(originalPath: string): string {
    if (originalPath?.startsWith(this.project.oldSourceRoot)) {
      return joinPathFragments(
        this.project.newSourceRoot,
        originalPath.replace(this.project.oldSourceRoot, '')
      );
    }

    if (originalPath?.startsWith(this.project.oldRoot)) {
      return joinPathFragments(
        this.project.newRoot,
        originalPath.replace(this.project.oldRoot, '')
      );
    }

    return originalPath;
  }

  protected moveDir(from: string, to: string): void {
    visitNotIgnoredFiles(this.tree, from, (file) => {
      this.moveFile(file, normalizePath(file).replace(from, to), true);
    });
  }

  private collectTargetNames(): void {
    const targetTypes = Object.keys(this.targets) as TargetType[];

    Object.entries(this.projectConfig.targets ?? {}).forEach(
      ([targetName, target]) => {
        targetTypes.forEach((targetType) => {
          if (
            !this.targetNames[targetType] &&
            this.targets[targetType].builders.includes(target.executor)
          ) {
            this.targetNames[targetType] = targetName;
          }
        });
      }
    );
  }

  private createBuilderMigrators(
    supportedBuilderMigrators?: BuilderMigratorClassType[]
  ): void {
    if (!supportedBuilderMigrators) {
      this.builderMigrators = [];
      return;
    }

    this.builderMigrators = supportedBuilderMigrators.map(
      (migratorClass) =>
        new migratorClass(
          this.tree,
          this.project,
          this.projectConfig,
          this.logger
        )
    );
  }
}
