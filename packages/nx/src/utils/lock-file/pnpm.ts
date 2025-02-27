import {
  LockFileData,
  PackageDependency,
  PackageVersions,
} from './lock-file-type';
import { load, dump } from '@zkochan/js-yaml';
import {
  sortObject,
  hashString,
  isRootVersion,
  TransitiveLookupFunctionInput,
} from './utils';
import { satisfies } from 'semver';

type PackageMeta = {
  key: string;
  specifier?: string;
  isDevDependency?: boolean;
  isDependency?: boolean;
  dependencyDetails: Record<string, Record<string, string>>;
};

type Dependencies = Record<string, Omit<PackageDependency, 'packageMeta'>>;

type VersionInfoWithInlineSpecifier = {
  version: string;
  specifier: string;
};

type PnpmLockFile = {
  lockfileVersion: string;
  specifiers?: Record<string, string>;
  dependencies?: Record<
    string,
    string | { version: string; specifier: string }
  >;
  devDependencies?: Record<
    string,
    string | { version: string; specifier: string }
  >;
  packages: Dependencies;
};

const LOCKFILE_YAML_FORMAT = {
  blankLines: true,
  lineWidth: 1000,
  noCompatMode: true,
  noRefs: true,
  sortKeys: false,
};

/**
 * Parses pnpm-lock.yaml file to `LockFileData` object
 *
 * @param lockFile
 * @returns
 */
export function parsePnpmLockFile(lockFile: string): LockFileData {
  const data: PnpmLockFile = load(lockFile);
  const { dependencies, devDependencies, packages, specifiers, ...metadata } =
    data;

  return {
    dependencies: mapPackages(
      dependencies,
      devDependencies,
      specifiers,
      packages,
      metadata.lockfileVersion.toString().endsWith('inlineSpecifiers')
    ),
    lockFileMetadata: { ...metadata },
    hash: hashString(lockFile),
  };
}

function mapPackages(
  dependencies: Record<string, string | VersionInfoWithInlineSpecifier>,
  devDependencies: Record<string, string | VersionInfoWithInlineSpecifier>,
  specifiers: Record<string, string>,
  packages: Dependencies,
  inlineSpecifiers: boolean
): LockFileData['dependencies'] {
  const mappedPackages: LockFileData['dependencies'] = {};

  Object.entries(packages).forEach(([key, value]) => {
    // construct packageMeta object
    const meta = mapMetaInformation(
      { dependencies, devDependencies, specifiers },
      inlineSpecifiers,
      key,
      value
    );

    // create new key
    const version = key.split('/').pop().split('_')[0];
    const packageName = key.slice(1, key.lastIndexOf('/'));
    const newKey = `${packageName}@${version}`;

    if (!mappedPackages[packageName]) {
      mappedPackages[packageName] = {};
    }
    if (mappedPackages[packageName][newKey]) {
      mappedPackages[packageName][newKey].packageMeta.push(meta);
    } else {
      mappedPackages[packageName][newKey] = {
        ...value,
        version,
        packageMeta: [meta],
      };
    }
  });
  Object.keys(mappedPackages).forEach((packageName) => {
    const versions = mappedPackages[packageName];
    const versionKeys = Object.keys(versions);

    if (versionKeys.length === 1) {
      versions[versionKeys[0]].rootVersion = true;
    } else {
      const rootVersionKey = versionKeys.find((v) =>
        isRootVersion(packageName, versions[v].version)
      );
      // this should never happen, but just in case
      if (rootVersionKey) {
        versions[rootVersionKey].rootVersion = true;
      }
    }
  });

  return mappedPackages;
}

// maps packageMeta based on dependencies, devDependencies and (inline) specifiers
function mapMetaInformation(
  {
    dependencies,
    devDependencies,
    specifiers,
  }: Omit<PnpmLockFile, 'lockfileVersion' | 'packages'>,
  hasInlineSpefiers,
  key: string,
  dependencyDetails: Omit<PackageDependency, 'packageMeta'>
): PackageMeta {
  const matchingVersion = key.split('/').pop();
  const packageName = key.slice(1, key.lastIndexOf('/'));

  const isDependency = isVersionMatch(
    dependencies?.[packageName],
    matchingVersion,
    hasInlineSpefiers
  );
  const isDevDependency = isVersionMatch(
    devDependencies?.[packageName],
    matchingVersion,
    hasInlineSpefiers
  );

  let specifier;
  if (isDependency || isDevDependency) {
    if (hasInlineSpefiers) {
      specifier =
        getSpecifier(dependencies?.[packageName]) ||
        getSpecifier(devDependencies?.[packageName]);
    } else {
      if (isDependency || isDevDependency) {
        specifier = specifiers[packageName];
      }
    }
  }

  return {
    key,
    isDependency,
    isDevDependency,
    specifier,
    dependencyDetails: {
      ...(dependencyDetails.dependencies && {
        dependencies: dependencyDetails.dependencies,
      }),
      ...(dependencyDetails.peerDependencies && {
        peerDependencies: dependencyDetails.peerDependencies,
      }),
    },
  };
}

// version match for dependencies w/ or w/o inline specifier
function isVersionMatch(
  versionInfo: string | { version: string; specifier: string },
  matchingVersion,
  hasInlineSpefiers
): boolean {
  if (!versionInfo) {
    return false;
  }
  if (!hasInlineSpefiers) {
    return versionInfo === matchingVersion;
  }

  return (
    (versionInfo as VersionInfoWithInlineSpecifier).version === matchingVersion
  );
}

function getSpecifier(
  versionInfo: string | { version: string; specifier: string }
): string {
  return (
    versionInfo && (versionInfo as VersionInfoWithInlineSpecifier).specifier
  );
}

/**
 * Generates pnpm-lock.yml file from `LockFileData` object
 *
 * @param lockFile
 * @returns
 */
export function stringifyPnpmLockFile(lockFileData: LockFileData): string {
  const pnpmLockFile = unmapLockFile(lockFileData);

  return dump(pnpmLockFile, LOCKFILE_YAML_FORMAT);
}

// revert lock file to it's original state
function unmapLockFile(lockFileData: LockFileData): PnpmLockFile {
  const devDependencies: Record<
    string,
    string | VersionInfoWithInlineSpecifier
  > = {};
  const dependencies: Record<string, string | VersionInfoWithInlineSpecifier> =
    {};
  const packages: Dependencies = {};
  const specifiers: Record<string, string> = {};
  const inlineSpecifiers = lockFileData.lockFileMetadata.lockfileVersion
    .toString()
    .endsWith('inlineSpecifiers');

  const packageNames = Object.keys(lockFileData.dependencies);
  for (let i = 0; i < packageNames.length; i++) {
    const packageName = packageNames[i];
    const versions = Object.values(lockFileData.dependencies[packageName]);

    versions.forEach(({ packageMeta, version: _, rootVersion, ...rest }) => {
      (packageMeta as PackageMeta[]).forEach((meta) => {
        const { key, specifier } = meta;

        let version;
        if (inlineSpecifiers) {
          version = { specifier, version: key.slice(key.lastIndexOf('/') + 1) };
        } else {
          version = key.slice(key.lastIndexOf('/') + 1);

          if (specifier) {
            specifiers[packageName] = specifier;
          }
        }

        if (meta.isDependency) {
          dependencies[packageName] = version;
        }
        if (meta.isDevDependency) {
          devDependencies[packageName] = version;
        }
        packages[key] = {
          ...rest,
          ...meta.dependencyDetails,
        };
      });
    });
  }

  return {
    ...(lockFileData.lockFileMetadata as { lockfileVersion: string }),
    specifiers: sortObject(specifiers),
    dependencies: sortObject(dependencies),
    devDependencies: sortObject(devDependencies),
    packages: sortObject(packages),
  };
}

/**
 * Returns matching version of the dependency
 */
export function transitiveDependencyPnpmLookup({
  versions,
  version,
}: TransitiveLookupFunctionInput): PackageDependency {
  // pnpm's dependencies always point to the exact version so this block is only for insurrance
  return Object.values(versions).find((v) => satisfies(v.version, version));
}

/**
 * Prunes the lock file data based on the list of packages and their transitive dependencies
 *
 * @param lockFileData
 * @returns
 */
export function prunePnpmLockFile(
  lockFileData: LockFileData,
  packages: string[],
  projectName?: string
): LockFileData {
  console.warn(
    `Pruning pnpm is not yet supported.
Returning entire lock file.`
  );
  return lockFileData;
  // const dependencies = pruneDependencies(
  //   lockFileData.dependencies,
  //   packages,
  //   projectName
  // );
  // const prunedLockFileData = {
  //   lockFileMetadata: lockFileData.lockFileMetadata,
  //   dependencies,
  //   hash: '',
  // };
  // return prunedLockFileData;
}

// iterate over packages to collect the affected tree of dependencies
function pruneDependencies(
  dependencies: LockFileData['dependencies'],
  packages: string[],
  projectName?: string
): LockFileData['dependencies'] {
  const result: LockFileData['dependencies'] = {};

  packages.forEach((packageName) => {
    if (dependencies[packageName]) {
      const [key, value] = Object.entries(dependencies[packageName]).find(
        ([_, v]) => v.rootVersion
      );
      result[packageName] = result[packageName] || {};
      result[packageName][key] = value;
      pruneTransitiveDependencies([packageName], dependencies, result, value);
    } else {
      console.warn(
        `Could not find ${packageName} in the lock file. Skipping...`
      );
    }
  });

  return result;
}

// find all transitive dependencies of already pruned packages
// and adds them to the collection
// recursively prune their dependencies
function pruneTransitiveDependencies(
  parentPackages: string[],
  dependencies: LockFileData['dependencies'],
  prunedDeps: LockFileData['dependencies'],
  value: PackageDependency
): void {}
