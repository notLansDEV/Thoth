Thoth/
├── docs/
│   ├── app_overview.md
│   ├── design/
│   │   ├── dashboard.md
│   │   ├── projects.md
│   │   ├── kanban.md
│   │   ├── bugs.md
│   │   ├── markdown.md
│   │   ├── calendar.md
│   │   ├── milestones.md
│   │   └── reports.md
│   └── previews/
│       ├── dashboard_preview.html
│       ├── projects_preview.html
│       ├── kanban_preview.html
│       ├── bugs_preview.html
│       └── reports_preview.html
│
├── public/
│   ├── favicon.svg
│   └── icons.svg
│
├── src/
│   ├── assets/
│   │   ├── images/
│   │   └── icons/
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppLayout.jsx
│   │   │   ├── Topbar.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   └── Breadcrumb.jsx
│   │   │
│   │   ├── ui/
│   │   │   ├── Button.jsx
│   │   │   ├── Input.jsx
│   │   │   ├── Modal.jsx
│   │   │   ├── Badge.jsx
│   │   │   ├── Avatar.jsx
│   │   │   ├── Dropdown.jsx
│   │   │   ├── ProgressBar.jsx
│   │   │   └── EmptyState.jsx
│   │   │
│   │   └── common/
│   │       ├── Search.jsx
│   │       ├── ProjectBadge.jsx
│   │       ├── StatusBadge.jsx
│   │       ├── PriorityBadge.jsx
│   │       └── UserAvatar.jsx
│   │
│   ├── features/
│   │   ├── dashboard/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── components/
│   │   │   │   ├── StatsCards.jsx
│   │   │   │   ├── ProjectOverview.jsx
│   │   │   │   ├── RecentActivity.jsx
│   │   │   │   └── RecentBugs.jsx
│   │   │   └── dashboard.service.js
│   │   │
│   │   ├── projects/
│   │   │   ├── Projects.jsx
│   │   │   ├── ProjectDetails.jsx
│   │   │   ├── components/
│   │   │   │   ├── ProjectCard.jsx
│   │   │   │   ├── ProjectList.jsx
│   │   │   │   └── ProjectForm.jsx
│   │   │   └── projects.service.js
│   │   │
│   │   ├── kanban/
│   │   │   ├── Kanban.jsx
│   │   │   ├── components/
│   │   │   │   ├── KanbanBoard.jsx
│   │   │   │   ├── KanbanColumn.jsx
│   │   │   │   ├── KanbanCard.jsx
│   │   │   │   ├── KanbanToolbar.jsx
│   │   │   │   └── DragOverlay.jsx
│   │   │   └── kanban.service.js
│   │   │
│   │   ├── tasks/
│   │   │   ├── Tasks.jsx
│   │   │   ├── TaskDetails.jsx
│   │   │   ├── components/
│   │   │   │   ├── TaskCard.jsx
│   │   │   │   ├── TaskForm.jsx
│   │   │   │   └── Checklist.jsx
│   │   │   └── tasks.service.js
│   │   │
│   │   ├── bugs/
│   │   │   ├── Bugs.jsx
│   │   │   ├── BugDetails.jsx
│   │   │   ├── components/
│   │   │   │   ├── BugTable.jsx
│   │   │   │   ├── BugDetailsPanel.jsx
│   │   │   │   ├── BugForm.jsx
│   │   │   │   ├── BugStatus.jsx
│   │   │   │   └── BugPriority.jsx
│   │   │   └── bugs.service.js
│   │   │
│   │   ├── markdown/
│   │   │   ├── Markdown.jsx
│   │   │   ├── MarkdownEditor.jsx
│   │   │   ├── MarkdownPreview.jsx
│   │   │   ├── MarkdownToolbar.jsx
│   │   │   └── markdown.service.js
│   │   │
│   │   ├── calendar/
│   │   │   ├── Calendar.jsx
│   │   │   ├── components/
│   │   │   │   ├── CalendarGrid.jsx
│   │   │   │   ├── CalendarEvent.jsx
│   │   │   │   └── CalendarToolbar.jsx
│   │   │   └── calendar.service.js
│   │   │
│   │   ├── milestones/
│   │   │   ├── Milestones.jsx
│   │   │   ├── MilestoneDetails.jsx
│   │   │   ├── components/
│   │   │   │   ├── MilestoneCard.jsx
│   │   │   │   └── MilestoneProgress.jsx
│   │   │   └── milestones.service.js
│   │   │
│   │   ├── reports/
│   │   │   ├── Reports.jsx
│   │   │   ├── DailyReport.jsx
│   │   │   ├── ReportEditor.jsx
│   │   │   ├── ReportPreview.jsx
│   │   │   └── reports.service.js
│   │   │
│   │   ├── workspaces/
│   │   │   ├── Workspaces.jsx
│   │   │   ├── WorkspaceDetails.jsx
│   │   │   └── workspaces.service.js
│   │   │
│   │   └── settings/
│   │       ├── Settings.jsx
│   │       ├── components/
│   │       │   ├── GeneralSettings.jsx
│   │       │   ├── WorkspaceSettings.jsx
│   │       │   └── DataSettings.jsx
│   │       └── settings.service.js
│   │
│   ├── db/
│   │   ├── database.js
│   │   ├── schema.sql
│   │   ├── migrations/
│   │   └── repositories/
│   │       ├── project.repository.js
│   │       ├── task.repository.js
│   │       ├── bug.repository.js
│   │       ├── milestone.repository.js
│   │       ├── report.repository.js
│   │       ├── workspace.repository.js
│   │       └── activity.repository.js
│   │
│   ├── lib/
│   │   ├── markdown/
│   │   │   ├── parser.js
│   │   │   ├── renderer.js
│   │   │   └── serializer.js
│   │   ├── date.js
│   │   ├── storage.js
│   │   └── utils.js
│   │
│   ├── hooks/
│   │   ├── useProjects.js
│   │   ├── useTasks.js
│   │   ├── useBugs.js
│   │   ├── useKanban.js
│   │   ├── useReports.js
│   │   └── useWorkspace.js
│   │
│   ├── stores/
│   │   ├── workspace.store.js
│   │   ├── project.store.js
│   │   ├── kanban.store.js
│   │   └── ui.store.js
│   │
│   ├── routes/
│   │   └── AppRoutes.jsx
│   │
│   ├── App.jsx
│   ├── App.css
│   ├── index.css
│   └── main.jsx
│
├── .gitignore
├── eslint.config.js
├── index.html
├── package.json
├── package-lock.json
├── README.md
└── vite.config.js
