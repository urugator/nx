import { GraphPerfReport } from '../../interfaces';
// nx-ignore-next-line
import {
  ProjectGraphDependency,
  ProjectGraphProjectNode,
} from 'nx/src/config/project-graph';
import { ActionObject, ActorRef, State, StateNodeConfig } from 'xstate';
import { GraphRenderEvents, RouteEvents } from '../../machines/interfaces';

// The hierarchical schema for the states
export interface ProjectGraphSchema {
  states: {
    idle: {};
    unselected: {};
    focused: {};
    textFiltered: {};
    customSelected: {};
    tracing: {};
  };
}

export type TracingAlgorithmType = 'shortest' | 'all';

// The events that the machine handles
export type ProjectGraphMachineEvents =
  | {
      type: 'setSelectedProjectsFromGraph';
      selectedProjectNames: string[];
      perfReport: GraphPerfReport;
    }
  | { type: 'selectProject'; projectName: string }
  | { type: 'deselectProject'; projectName: string }
  | { type: 'selectProjects'; projectNames: string[] }
  | { type: 'deselectProjects'; projectNames: string[] }
  | { type: 'selectAll' }
  | { type: 'deselectAll' }
  | { type: 'selectAffected' }
  | { type: 'setGroupByFolder'; groupByFolder: boolean }
  | { type: 'setTracingStart'; projectName: string }
  | { type: 'setTracingEnd'; projectName: string }
  | { type: 'clearTraceStart' }
  | { type: 'clearTraceEnd' }
  | { type: 'setTracingAlgorithm'; algorithm: TracingAlgorithmType }
  | { type: 'setCollapseEdges'; collapseEdges: boolean }
  | { type: 'setIncludeProjectsByPath'; includeProjectsByPath: boolean }
  | { type: 'incrementSearchDepth' }
  | { type: 'decrementSearchDepth' }
  | { type: 'setSearchDepthEnabled'; searchDepthEnabled: boolean }
  | { type: 'setSearchDepth'; searchDepth: number }
  | { type: 'focusProject'; projectName: string }
  | { type: 'unfocusProject' }
  | { type: 'filterByText'; search: string }
  | { type: 'clearTextFilter' }
  | {
      type: 'notifyProjectGraphSetProjects';
      projects: ProjectGraphProjectNode[];
      dependencies: Record<string, ProjectGraphDependency[]>;
      affectedProjects: string[];
      workspaceLayout: {
        libsDir: string;
        appsDir: string;
      };
    }
  | {
      type: 'updateGraph';
      projects: ProjectGraphProjectNode[];
      dependencies: Record<string, ProjectGraphDependency[]>;
    };

// The context (extended state) of the machine
export interface ProjectGraphContext {
  projects: ProjectGraphProjectNode[];
  dependencies: Record<string, ProjectGraphDependency[]>;
  affectedProjects: string[];
  selectedProjects: string[];
  focusedProject: string | null;
  textFilter: string;
  includePath: boolean;
  searchDepth: number;
  searchDepthEnabled: boolean;
  groupByFolder: boolean;
  collapseEdges: boolean;
  workspaceLayout: {
    libsDir: string;
    appsDir: string;
  };
  graphActor: ActorRef<GraphRenderEvents>;
  routeSetterActor: ActorRef<RouteEvents>;
  routeListenerActor: ActorRef<ProjectGraphMachineEvents>;
  lastPerfReport: GraphPerfReport;
  tracing: {
    start: string;
    end: string;
    algorithm: TracingAlgorithmType;
  };
}

export type ProjectGraphStateNodeConfig = StateNodeConfig<
  ProjectGraphContext,
  {},
  ProjectGraphMachineEvents,
  ActionObject<ProjectGraphContext, ProjectGraphMachineEvents>
>;

export type ProjectGraphState = State<
  ProjectGraphContext,
  ProjectGraphMachineEvents,
  any,
  {
    value: any;
    context: ProjectGraphContext;
  }
>;
