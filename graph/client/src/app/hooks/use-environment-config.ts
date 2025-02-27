// nx-ignore-next-line
import type { ProjectGraphClientResponse } from 'nx/src/command-line/dep-graph';
import { useRef } from 'react';
import { AppConfig } from '../interfaces';

export function useEnvironmentConfig(): {
  exclude: string[];
  watch: boolean;
  localMode: 'serve' | 'build';
  projectGraphResponse?: ProjectGraphClientResponse;
  environment: 'dev' | 'watch' | 'release' | 'nx-console';
  appConfig: AppConfig;
  useXstateInspect: boolean;
} {
  const environmentConfig = useRef(getEnvironmentConfig());

  return environmentConfig.current;
}

export function getEnvironmentConfig() {
  return {
    exclude: window.exclude,
    watch: window.watch,
    localMode: window.localMode,
    projectGraphResponse: window.projectGraphResponse,
    environment: window.environment,
    appConfig: window.appConfig,
    useXstateInspect: window.useXstateInspect,
  };
}
