// nx-ignore-next-line
import type {
  ProjectGraphClientResponse,
  TaskGraphClientResponse,
} from 'nx/src/command-line/dep-graph';

export interface GraphListItem {
  id: string;
  label: string;
  projectGraphUrl: string;
  taskGraphUrl: string;
}

export interface WorkspaceLayout {
  libsDir: string;
  appsDir: string;
}

export interface ProjectGraphService {
  getHash: () => Promise<string>;
  getProjectGraph: (url: string) => Promise<ProjectGraphClientResponse>;
  getTaskGraph: (url: string) => Promise<TaskGraphClientResponse>;
}

export interface Environment {
  environment: 'dev' | 'watch' | 'release';
}

export interface AppConfig {
  showDebugger: boolean;
  showExperimentalFeatures: boolean;
  projects: GraphListItem[];
  defaultProject: string;
}

export interface GraphPerfReport {
  renderTime: number;
  numNodes: number;
  numEdges: number;
}
