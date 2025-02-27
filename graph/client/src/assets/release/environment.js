window.exclude = [];
window.watch = false;
window.environment = 'release';
window.useXstateInspect = false;

window.appConfig = {
  showDebugger: false,
  showExperimentalFeatures: false,
  projects: [
    {
      id: 'local',
      label: 'local',
      projectGraphUrl: 'assets/project-graphs/e2e.json',
      taskGraphUrl: 'assets/task-graphs/e2e.json',
    },
  ],
  defaultProject: 'local',
};
