
/* ==========================================
   WORKNEST - PROJECT & TASK MANAGER
   Beginner-friendly JavaScript
========================================== */

const $ = (id) => document.getElementById(id);

const STORAGE = {
  users: "worknest_users",
  session: "worknest_session",
  data: "worknest_data",
  theme: "worknest_theme"
};

let currentUser = null;
let currentPage = "dashboard";
let authMode = "login";
let modalType = "";
let editingId = null;
let selectedProjectId = "";
let taskFilter = "all";
let searchTerm = "";
let toastTimer;
let currentTip = 0;

const tips = [
  "Break large projects into small, manageable tasks.",
  "Complete your most important task first.",
  "Set realistic deadlines to stay organized.",
  "Review your progress at the end of each day.",
  "Keep project descriptions clear and simple.",
  "Small steps every day lead to big results."
];

/* ==========================================
   STORAGE HELPERS
========================================== */

function getUsers() {
  return JSON.parse(localStorage.getItem(STORAGE.users) || "[]");
}

function saveUsers(users) {
  localStorage.setItem(STORAGE.users, JSON.stringify(users));
}

function getSession() {
  return JSON.parse(localStorage.getItem(STORAGE.session) || "null");
}

function getAllData() {
  return JSON.parse(localStorage.getItem(STORAGE.data) || "{}");
}

function saveAllData(data) {
  localStorage.setItem(STORAGE.data, JSON.stringify(data));
}

function getUserData() {
  const allData = getAllData();
  const key = currentUser ? currentUser.email : "";

  if (!allData[key]) {
    allData[key] = {
      projects: [],
      tasks: []
    };

    saveAllData(allData);
  }

  return allData[key];
}

function saveUserData(data) {
  const allData = getAllData();
  allData[currentUser.email] = data;
  saveAllData(allData);
}

function createId() {
  return Date.now().toString(36) +
    Math.random().toString(36).slice(2, 8);
}

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };

    return entities[character];
  });
}

function formatDate(date) {
  if (!date) return "No deadline";

  const parsed = new Date(date + "T00:00:00");

  if (Number.isNaN(parsed.getTime())) return "No deadline";

  return parsed.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

function todayString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function isOverdue(task) {
  return Boolean(
    task.dueDate &&
    task.dueDate < todayString() &&
    task.status !== "done"
  );
}

function getProjectName(projectId) {
  const project = getUserData().projects.find(
    (item) => item.id === projectId
  );

  return project ? project.name : "General";
}

/* ==========================================
   NOTIFICATIONS
========================================== */

function showToast(message) {
  const toast = $("toast");

  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2800);
}

/* ==========================================
   AUTHENTICATION UI
========================================== */

function setAuthMode(mode) {
  authMode = mode;

  const isSignup = mode === "signup";

  $("loginTab").classList.toggle("active", !isSignup);
  $("signupTab").classList.toggle("active", isSignup);

  $("nameField").classList.toggle("hidden", !isSignup);
  $("confirmField").classList.toggle("hidden", !isSignup);

  $("authHeading").textContent = isSignup
    ? "Create your account"
    : "Welcome back!";

  $("authDescription").textContent = isSignup
    ? "Create your account and organize your work."
    : "Sign in to continue managing your projects.";

  $("submitText").textContent = isSignup
    ? "Create account"
    : "Sign in";

  $("forgotPassword").classList.toggle("hidden", isSignup);

  $("password").setAttribute(
    "autocomplete",
    isSignup ? "new-password" : "current-password"
  );

  $("authMessage").textContent = "";

  clearAuthErrors();
}

function clearAuthErrors() {
  ["nameError", "emailError", "passwordError", "confirmError"]
    .forEach((id) => {
      $(id).textContent = "";
    });
}

function showAuthError(id, message) {
  $(id).textContent = message;
}

function validateAuthForm() {
  clearAuthErrors();

  let valid = true;

  const name = $("name").value.trim();
  const email = $("email").value.trim().toLowerCase();
  const password = $("password").value;
  const confirmPassword = $("confirmPassword").value;

  if (authMode === "signup" && name.length < 2) {
    showAuthError("nameError", "Please enter your full name.");
    valid = false;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showAuthError("emailError", "Enter a valid email address.");
    valid = false;
  }

  if (!password) {
    showAuthError("passwordError", "Please enter your password.");
    valid = false;
  } else if (authMode === "signup" && password.length < 6) {
    showAuthError(
      "passwordError",
      "Password must contain at least 6 characters."
    );
    valid = false;
  }

  if (authMode === "signup" && password !== confirmPassword) {
    showAuthError("confirmError", "Passwords do not match.");
    valid = false;
  }

  return valid;
}

function handleAuth(event) {
  event.preventDefault();

  if (!validateAuthForm()) return;

  const name = $("name").value.trim();
  const email = $("email").value.trim().toLowerCase();
  const password = $("password").value;
  const users = getUsers();

  if (authMode === "signup") {
    const existingUser = users.find(
      (user) => user.email === email
    );

    if (existingUser) {
      showAuthError("emailError", "This email is already registered.");
      return;
    }

    // Demo only: production apps must hash passwords on a server.
    const user = {
      id: createId(),
      name,
      email,
      password,
      createdAt: new Date().toISOString()
    };

    users.push(user);
    saveUsers(users);

    currentUser = {
      id: user.id,
      name: user.name,
      email: user.email
    };

    localStorage.setItem(
      STORAGE.session,
      JSON.stringify(currentUser)
    );

    getUserData();
    showApp();

    showToast("Welcome to WorkNest, " + name + "!");
    return;
  }

  const user = users.find(
    (item) => item.email === email && item.password === password
  );

  if (!user) {
    $("authMessage").textContent =
      "Incorrect email or password. Please try again.";
    return;
  }

  currentUser = {
    id: user.id,
    name: user.name,
    email: user.email
  };

  localStorage.setItem(
    STORAGE.session,
    JSON.stringify(currentUser)
  );

  getUserData();
  showApp();

  showToast("Welcome back, " + user.name + "!");
}

function logout() {
  localStorage.removeItem(STORAGE.session);
  currentUser = null;
  currentPage = "dashboard";

  $("appPage").classList.add("hidden");
  $("authPage").classList.remove("hidden");

  $("authForm").reset();
  setAuthMode("login");

  showToast("You have logged out.");
}

function showApp() {
  $("authPage").classList.add("hidden");
  $("appPage").classList.remove("hidden");

  updateUserProfile();
  renderPage();
}

function updateUserProfile() {
  if (!currentUser) return;

  $("userName").textContent = currentUser.name;
  $("userEmail").textContent = currentUser.email;

  $("userAvatar").textContent =
    currentUser.name.charAt(0).toUpperCase();
}

/* ==========================================
   SAMPLE DATA
========================================== */

function addSampleData() {
  const data = getUserData();

  if (data.projects.length || data.tasks.length) {
    showToast("Your workspace already has data.");
    return;
  }

  const projectOne = {
    id: createId(),
    name: "Website Redesign",
    description: "Improve the design and usability of the website.",
    color: "#8065df",
    createdAt: new Date().toISOString()
  };

  const projectTwo = {
    id: createId(),
    name: "College Project",
    description: "Complete the project documentation and presentation.",
    color: "#35a98a",
    createdAt: new Date().toISOString()
  };

  data.projects.push(projectOne, projectTwo);

  data.tasks.push(
    {
      id: createId(),
      title: "Create homepage layout",
      description: "Design the main website homepage.",
      projectId: projectOne.id,
      status: "done",
      priority: "high",
      dueDate: todayString(),
      createdAt: new Date().toISOString()
    },
    {
      id: createId(),
      title: "Prepare project report",
      description: "Write the first draft of the project report.",
      projectId: projectTwo.id,
      status: "in-progress",
      priority: "high",
      dueDate: todayString(),
      createdAt: new Date().toISOString()
    },
    {
      id: createId(),
      title: "Review documentation",
      description: "Check the project documentation for errors.",
      projectId: projectTwo.id,
      status: "todo",
      priority: "medium",
      dueDate: "",
      createdAt: new Date().toISOString()
    }
  );

  saveUserData(data);
  renderPage();
  showToast("Sample projects and tasks added!");
}

/* ==========================================
   PAGE NAVIGATION
========================================== */

function navigateTo(page) {
  const allowedPages = [
    "dashboard",
    "projects",
    "tasks",
    "kanban",
    "settings"
  ];

  if (!allowedPages.includes(page)) return;

  currentPage = page;
  searchTerm = "";

  if ($("searchInput")) {
    $("searchInput").value = "";
  }

  $("sidebar").classList.remove("open");

  renderPage();
}

function renderPage() {
  if (!currentUser) return;

  const titles = {
    dashboard: "Dashboard",
    projects: "My Projects",
    tasks: "My Tasks",
    kanban: "Kanban Board",
    settings: "Settings"
  };

  $("pageTitle").textContent = titles[currentPage] || "Dashboard";

  document.querySelectorAll("[data-page]").forEach((button) => {
    button.classList.toggle(
      "active",
      button.dataset.page === currentPage
    );
  });

  const renderers = {
    dashboard: renderDashboard,
    projects: renderProjects,
    tasks: renderTasks,
    kanban: renderKanban,
    settings: renderSettings
  };

  $("pageContent").innerHTML = renderers[currentPage]();

  $("projectCount").textContent = getUserData().projects.length;

  if ($("tipText")) {
    $("tipText").textContent = tips[currentTip];
  }
}

/* ==========================================
   SHARED HTML HELPERS
========================================== */

function emptyState(title, description, actionLabel, action) {
  return `
    <div class="empty-state">
      <div class="empty-state-icon">✦</div>
      <h3>${escapeHTML(title)}</h3>
      <p>${escapeHTML(description)}</p>
      ${
        actionLabel
          ? `<button class="primary-button" data-action="${action}">
              ${escapeHTML(actionLabel)}
            </button>`
          : ""
      }
    </div>
  `;
}

function pageIntro(title, description, buttonLabel, action) {
  return `
    <div class="page-intro">
      <div>
        <h2>${escapeHTML(title)}</h2>
        <p>${escapeHTML(description)}</p>
      </div>
      ${
        buttonLabel
          ? `<button class="primary-button" data-action="${action}">
              + ${escapeHTML(buttonLabel)}
            </button>`
          : ""
      }
    </div>
  `;
}

function getFilteredTasks(tasks) {
  let result = [...tasks];

  if (searchTerm) {
    const term = searchTerm.toLowerCase();

    result = result.filter((task) => {
      const projectName = getProjectName(task.projectId);

      return (
        task.title.toLowerCase().includes(term) ||
        (task.description || "").toLowerCase().includes(term) ||
        projectName.toLowerCase().includes(term)
      );
    });
  }

  return result;
}

function taskStatusLabel(status) {
  const labels = {
    todo: "To do",
    "in-progress": "In progress",
    done: "Completed"
  };

  return labels[status] || "To do";
}

function taskCard(task) {
  return `
    <article class="task-card">
      <div class="task-card-top">
        <label class="task-check">
          <input
            type="checkbox"
            data-action="toggle-task"
            data-id="${task.id}"
            ${task.status === "done" ? "checked" : ""}
            aria-label="Mark task complete"
          >
          <span></span>
        </label>

        <span class="priority priority-${escapeHTML(task.priority || "medium")}">
          ${escapeHTML((task.priority || "medium").toUpperCase())}
        </span>
      </div>

      <h3 class="${task.status === "done" ? "completed-task" : ""}">
        ${escapeHTML(task.title)}
      </h3>

      <p class="task-description">
        ${escapeHTML(task.description || "No description added.")}
      </p>

      <div class="task-card-footer">
        <span class="task-project">
          ${escapeHTML(getProjectName(task.projectId))}
        </span>
        <span class="${isOverdue(task) ? "overdue" : "task-date"}">
          ${escapeHTML(formatDate(task.dueDate))}
        </span>
      </div>

      <div class="task-card-actions">
        <button class="secondary-button"
          data-action="edit-task" data-id="${task.id}">
          Edit
        </button>
        <button class="secondary-button"
          data-action="cycle-status" data-id="${task.id}">
          Next status →
        </button>
        <button class="delete-button"
          data-action="delete-task" data-id="${task.id}">
          Delete
        </button>
      </div>
    </article>
  `;
}

function projectCard(project) {
  const data = getUserData();

  const projectTasks = data.tasks.filter(
    (task) => task.projectId === project.id
  );

  const completed = projectTasks.filter(
    (task) => task.status === "done"
  ).length;

  const progress = projectTasks.length
    ? Math.round((completed / projectTasks.length) * 100)
    : 0;

  return `
    <article class="project-card">
      <div class="project-card-top">
        <div class="project-color"
          style="background:${escapeHTML(project.color || "#8065df")}">
          ▦
        </div>

        <button class="more-button"
          data-action="edit-project" data-id="${project.id}">
          Edit
        </button>
      </div>

      <h3>${escapeHTML(project.name)}</h3>

      <p>${escapeHTML(project.description || "No description added.")}</p>

      <div class="project-progress-label">
        <span>Progress</span>
        <strong>${progress}%</strong>
      </div>

      <div class="progress-track">
        <div class="progress-fill"
          style="width:${progress}%;background:${escapeHTML(project.color || "#8065df")}">
        </div>
      </div>

      <div class="project-card-footer">
        <span>${projectTasks.length} tasks</span>
        <div>
          <button class="secondary-button"
            data-action="view-project-tasks" data-id="${project.id}">
            View tasks
          </button>
          <button class="delete-button"
            data-action="delete-project" data-id="${project.id}">
            Delete
          </button>
        </div>
      </div>
    </article>
  `;
}

/* ==========================================
   DASHBOARD
========================================== */

function renderDashboard() {
  const data = getUserData();
  const tasks = data.tasks;
  const projects = data.projects;

  const completed = tasks.filter(
    (task) => task.status === "done"
  ).length;

  const inProgress = tasks.filter(
    (task) => task.status === "in-progress"
  ).length;

  const pending = tasks.filter(
    (task) => task.status === "todo"
  ).length;

  const progress = tasks.length
    ? Math.round((completed / tasks.length) * 100)
    : 0;

  const recentTasks = [...tasks]
    .sort((a, b) => {
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    })
    .slice(0, 4);

  const projectCards = projects.slice(0, 3);

  return `
    <div class="welcome-section">
      <div>
        <p class="eyebrow">YOUR WORKSPACE AT A GLANCE</p>
        <h1>Hello, ${escapeHTML(currentUser.name.split(" ")[0])} 👋</h1>
        <p>Here's what's happening with your work today.</p>
      </div>

      <button class="primary-button"
        data-action="new-task">+ Create a task</button>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon purple">▦</div>
        <p>Total projects</p>
        <h2>${projects.length}</h2>
        <span>Your active workspaces</span>
      </div>

      <div class="stat-card">
        <div class="stat-icon orange">◷</div>
        <p>Pending tasks</p>
        <h2>${pending}</h2>
        <span>Waiting to be started</span>
      </div>

      <div class="stat-card">
        <div class="stat-icon blue">↗</div>
        <p>In progress</p>
        <h2>${inProgress}</h2>
        <span>Currently being worked on</span>
      </div>

      <div class="stat-card">
        <div class="stat-icon green">✓</div>
        <p>Completed tasks</p>
        <h2>${completed}</h2>
        <span>Tasks finished successfully</span>
      </div>
    </div>

    <div class="dashboard-progress">
      <div>
        <p class="eyebrow">YOUR PRODUCTIVITY</p>
        <h3>Overall task progress</h3>
        <p>Keep going. Every completed task counts!</p>
      </div>

      <div class="overall-progress">
        <div class="progress-circle"
          style="--progress:${progress * 3.6}deg">
          <span>${progress}%</span>
        </div>
      </div>

      <div class="progress-track">
        <div class="progress-fill" style="width:${progress}%"></div>
      </div>

      <div class="progress-summary">
        <span>${completed} completed</span>
        <span>${tasks.length} total tasks</span>
      </div>
    </div>

    <div class="section-heading">
      <div>
        <h2>My projects</h2>
        <p>Keep your work organized.</p>
      </div>
      <button class="text-button" data-action="view-projects">
        View all →
      </button>
    </div>

    ${
      projectCards.length
        ? `<div class="projects-grid">
            ${projectCards.map(projectCard).join("")}
          </div>`
        : emptyState(
            "No projects yet",
            "Create your first project to get started.",
            "Create project",
            "new-project"
          )
    }

    <div class="section-heading">
      <div>
        <h2>Recent tasks</h2>
        <p>Your latest tasks and activities.</p>
      </div>
      <button class="text-button" data-action="view-tasks">
        View all →
      </button>
    </div>

    ${
      recentTasks.length
        ? `<div class="tasks-grid">
            ${recentTasks.map(taskCard).join("")}
          </div>`
        : emptyState(
            "No tasks yet",
            "Add your first task and start making progress.",
            "Create task",
            "new-task"
          )
    }

    <div class="dashboard-actions">
      <button class="secondary-button"
        data-action="load-samples">Load sample data</button>
    </div>
  `;
}

/* ==========================================
   PROJECTS PAGE
========================================== */

function renderProjects() {
  const projects = getUserData().projects;

  const filtered = projects.filter((project) => {
    const text = (
      project.name + " " + (project.description || "")
    ).toLowerCase();

    return text.includes(searchTerm.toLowerCase());
  });

  return `
    ${pageIntro(
      "All projects",
      "Create, organize, and track your work.",
      "New project",
      "new-project"
    )}

    ${
      filtered.length
        ? `<div class="projects-grid">
            ${filtered.map(projectCard).join("")}
          </div>`
        : emptyState(
            searchTerm ? "No matching projects" : "No projects created",
            searchTerm
              ? "Try another search term."
              : "Create your first project to organize your work.",
            searchTerm ? "" : "Create project",
            "new-project"
          )
    }
  `;
}

/* ==========================================
   TASKS PAGE
========================================== */

function renderTasks() {
  const allTasks = getUserData().tasks;
  let tasks = getFilteredTasks(allTasks);

  if (taskFilter !== "all") {
    tasks = tasks.filter((task) => task.status === taskFilter);
  }

  return `
    ${pageIntro(
      "All tasks",
      "Manage deadlines, priorities, and task progress.",
      "New task",
      "new-task"
    )}

    <div class="task-filters">
      <label for="taskFilter">Filter tasks</label>
      <select id="taskFilter">
        <option value="all" ${taskFilter === "all" ? "selected" : ""}>All tasks</option>
        <option value="todo" ${taskFilter === "todo" ? "selected" : ""}>To do</option>
        <option value="in-progress" ${taskFilter === "in-progress" ? "selected" : ""}>In progress</option>
        <option value="done" ${taskFilter === "done" ? "selected" : ""}>Completed</option>
      </select>
    </div>

    ${
      tasks.length
        ? `<div class="tasks-grid">
            ${tasks.map(taskCard).join("")}
          </div>`
        : emptyState(
            "No tasks found",
            "Create a task or change your filters.",
            "Create task",
            "new-task"
          )
    }
  `;
}

/* ==========================================
   KANBAN BOARD
========================================== */

function renderKanban() {
  const tasks = getFilteredTasks(getUserData().tasks);

  const columns = [
    { id: "todo", title: "To do" },
    { id: "in-progress", title: "In progress" },
    { id: "done", title: "Completed" }
  ];

  return `
    ${pageIntro(
      "Kanban board",
      "Track your work by moving tasks through each stage.",
      "New task",
      "new-task"
    )}

    <div class="kanban-board">
      ${columns.map((column) => {
        const columnTasks = tasks.filter(
          (task) => task.status === column.id
        );

        return `
          <section class="kanban-column">
            <div class="kanban-column-heading">
              <h3>${column.title}</h3>
              <span>${columnTasks.length}</span>
            </div>

            <div class="kanban-column-content">
              ${
                columnTasks.length
                  ? columnTasks.map((task) => `
                      <article class="kanban-card">
                        <span class="priority priority-${escapeHTML(task.priority || "medium")}">
                          ${escapeHTML(task.priority || "medium")}
                        </span>

                        <h4>${escapeHTML(task.title)}</h4>

                        <p>${escapeHTML(task.description || "No description.")}</p>

                        <span class="kanban-project">
                          ${escapeHTML(getProjectName(task.projectId))}
                        </span>

                        <div class="kanban-card-actions">
                          <button class="secondary-button"
                            data-action="edit-task" data-id="${task.id}">
                            Edit
                          </button>
                          <button class="secondary-button"
                            data-action="cycle-status" data-id="${task.id}">
                            Move →
                          </button>
                        </div>
                      </article>
                    `).join("")
                  : `<p class="kanban-empty">No tasks here yet.</p>`
              }
            </div>
          </section>
        `;
      }).join("")}
    </div>
  `;
}

/* ==========================================
   SETTINGS PAGE
========================================== */

function renderSettings() {
  return `
    ${pageIntro(
      "Settings",
      "Manage your profile and workspace preferences.",
      "",
      ""
    )}

    <div class="settings-card">
      <div class="settings-heading">
        <div class="settings-icon">♙</div>
        <div>
          <h3>Your profile</h3>
          <p>Update your personal information.</p>
        </div>
      </div>

      <form id="settingsForm">
        <div class="form-group">
          <label for="settingsName">Full name</label>
          <input id="settingsName" type="text"
            value="${escapeHTML(currentUser.name)}" required>
        </div>

        <div class="form-group">
          <label for="settingsEmail">Email address</label>
          <input id="settingsEmail" type="email"
            value="${escapeHTML(currentUser.email)}" disabled>
        </div>

        <button type="submit" class="primary-button">
          Save profile
        </button>
      </form>
    </div>

    <div class="settings-card">
      <div class="settings-heading">
        <div class="settings-icon">◐</div>
        <div>
          <h3>Appearance</h3>
          <p>Choose the theme for your workspace.</p>
        </div>
      </div>

      <div class="theme-options">
        <button class="theme-choice"
          data-action="set-theme" data-theme="light">
          ☀ Light theme
        </button>
        <button class="theme-choice"
          data-action="set-theme" data-theme="dark">
          ☾ Dark theme
        </button>
      </div>
    </div>

    <div class="settings-card danger-zone">
      <div class="settings-heading">
        <div class="settings-icon">↻</div>
        <div>
          <h3>Workspace data</h3>
          <p>Load example data or reset your workspace.</p>
        </div>
      </div>

      <div class="settings-actions">
        <button class="secondary-button"
          data-action="load-samples">Load sample data</button>

        <button class="delete-button"
          data-action="reset-data">Reset workspace</button>
      </div>
    </div>
  `;
}

/* ==========================================
   MODAL OPENING
========================================== */

function openModal(type, id = null, projectId = "") {
  modalType = type;
  editingId = id;
  selectedProjectId = projectId;

  const data = getUserData();

  let item = null;

  if (type === "project" && id) {
    item = data.projects.find((project) => project.id === id);
  }

  if (type === "task" && id) {
    item = data.tasks.find((task) => task.id === id);
  }

  if (type === "task" && !data.projects.length) {
    if (!confirm("You have no projects yet. Create a task without a project?")) {
      return;
    }
  }

  const isProject = type === "project";

  $("modalTitle").textContent = item
    ? (isProject ? "Edit project" : "Edit task")
    : (isProject ? "Create new project" : "Create new task");

  const projectOptions = data.projects.map((project) => `
    <option value="${project.id}"
      ${(item?.projectId || projectId) === project.id ? "selected" : ""}>
      ${escapeHTML(project.name)}
    </option>
  `).join("");

  if (isProject) {
    $("modalFields").innerHTML = `
      <div class="form-group">
        <label for="itemName">Project name</label>
        <input id="itemName" type="text"
          placeholder="e.g. Website Redesign"
          value="${escapeHTML(item?.name || "")}" required>
      </div>

      <div class="form-group">
        <label for="itemDescription">Description</label>
        <textarea id="itemDescription" rows="3"
          placeholder="What is this project about?">${escapeHTML(item?.description || "")}</textarea>
      </div>

      <div class="form-group">
        <label for="itemColor">Project color</label>
        <select id="itemColor">
          <option value="#8065df">Lavender</option>
          <option value="#35a98a">Green</option>
          <option value="#ed9a4d">Orange</option>
          <option value="#4c91df">Blue</option>
          <option value="#e16c91">Pink</option>
        </select>
      </div>
    `;

    const colorSelect = $("itemColor");

    if (item?.color) {
      colorSelect.value = item.color;
    }
  } else {
    $("modalFields").innerHTML = `
      <div class="form-group">
        <label for="itemName">Task title</label>
        <input id="itemName" type="text"
          placeholder="e.g. Finish project report"
          value="${escapeHTML(item?.title || "")}" required>
      </div>

      <div class="form-group">
        <label for="itemDescription">Description</label>
        <textarea id="itemDescription" rows="3"
          placeholder="Add task details...">${escapeHTML(item?.description || "")}</textarea>
      </div>

      <div class="form-group">
        <label for="itemProject">Project</label>
        <select id="itemProject">
          <option value="">General / No project</option>
          ${projectOptions}
        </select>
      </div>

      <div class="form-group">
        <label for="itemPriority">Priority</label>
        <select id="itemPriority">
          <option value="low" ${item?.priority === "low" ? "selected" : ""}>Low</option>
          <option value="medium" ${!item || item.priority === "medium" ? "selected" : ""}>Medium</option>
          <option value="high" ${item?.priority === "high" ? "selected" : ""}>High</option>
        </select>
      </div>

      <div class="form-group">
        <label for="itemStatus">Status</label>
        <select id="itemStatus">
          <option value="todo" ${!item || item.status === "todo" ? "selected" : ""}>To do</option>
          <option value="in-progress" ${item?.status === "in-progress" ? "selected" : ""}>In progress</option>
          <option value="done" ${item?.status === "done" ? "selected" : ""}>Completed</option>
        </select>
      </div>

      <div class="form-group">
        <label for="itemDueDate">Deadline</label>
        <input id="itemDueDate" type="date"
          value="${escapeHTML(item?.dueDate || "")}">
      </div>
    `;
  }

  $("modal").classList.remove("hidden");
  $("itemName").focus();
}

function closeModal() {
  $("modal").classList.add("hidden");
  $("itemForm").reset();

  modalType = "";
  editingId = null;
  selectedProjectId = "";
}

/* ==========================================
   SAVE PROJECT OR TASK
========================================== */

function saveItem(event) {
  event.preventDefault();

  const data = getUserData();
  const name = $("itemName").value.trim();

  if (!name) {
    showToast("Please enter a name.");
    return;
  }

  if (modalType === "project") {
    const project = {
      id: editingId || createId(),
      name,
      description: $("itemDescription").value.trim(),
      color: $("itemColor").value,
      createdAt: new Date().toISOString()
    };

    if (editingId) {
      const index = data.projects.findIndex(
        (item) => item.id === editingId
      );

      if (index === -1) {
        showToast("Project could not be found.");
        return;
      }

      project.createdAt = data.projects[index].createdAt;
      data.projects[index] = project;

      showToast("Project updated successfully!");
    } else {
      data.projects.unshift(project);
      showToast("Project created successfully!");
    }
  }

  if (modalType === "task") {
    const task = {
      id: editingId || createId(),
      title: name,
      description: $("itemDescription").value.trim(),
      projectId: $("itemProject").value,
      priority: $("itemPriority").value,
      status: $("itemStatus").value,
      dueDate: $("itemDueDate").value,
      createdAt: new Date().toISOString()
    };

    if (editingId) {
      const index = data.tasks.findIndex(
        (item) => item.id === editingId
      );

      if (index === -1) {
        showToast("Task could not be found.");
        return;
      }

      task.createdAt = data.tasks[index].createdAt;
      data.tasks[index] = task;

      showToast("Task updated successfully!");
    } else {
      data.tasks.unshift(task);
      showToast("Task created successfully!");
    }
  }

  saveUserData(data);
  closeModal();
  renderPage();
}

/* ==========================================
   EDIT, DELETE AND UPDATE TASKS
========================================== */

function editProject(id) {
  openModal("project", id);
}

function editTask(id) {
  openModal("task", id);
}

function deleteProject(id) {
  const data = getUserData();
  const project = data.projects.find((item) => item.id === id);

  if (!project) return;

  const confirmed = confirm(
    `Delete "${project.name}" and its associated tasks?`
  );

  if (!confirmed) return;

  data.projects = data.projects.filter(
    (item) => item.id !== id
  );

  data.tasks = data.tasks.filter(
    (task) => task.projectId !== id
  );

  saveUserData(data);
  renderPage();

  showToast("Project deleted.");
}

function deleteTask(id) {
  const confirmed = confirm("Are you sure you want to delete this task?");

  if (!confirmed) return;

  const data = getUserData();

  data.tasks = data.tasks.filter(
    (task) => task.id !== id
  );

  saveUserData(data);
  renderPage();

  showToast("Task deleted.");
}

function toggleTask(id) {
  const data = getUserData();

  const task = data.tasks.find(
    (item) => item.id === id
  );

  if (!task) return;

  task.status = task.status === "done" ? "todo" : "done";

  saveUserData(data);
  renderPage();

  showToast(
    task.status === "done"
      ? "Great work! Task completed."
      : "Task moved back to To do."
  );
}

function cycleTaskStatus(id) {
  const data = getUserData();

  const task = data.tasks.find(
    (item) => item.id === id
  );

  if (!task) return;

  const statuses = ["todo", "in-progress", "done"];
  const currentIndex = statuses.indexOf(task.status);

  task.status = statuses[(currentIndex + 1) % statuses.length];

  saveUserData(data);
  renderPage();

  showToast("Task status: " + taskStatusLabel(task.status));
}

function viewProjectTasks(id) {
  selectedProjectId = id;
  currentPage = "tasks";
  taskFilter = "all";
  searchTerm = "";

  renderPage();

  const data = getUserData();
  const tasks = data.tasks.filter(
    (task) => task.projectId === id
  );

  $("pageTitle").textContent = getProjectName(id);

  $("pageContent").innerHTML = `
    ${pageIntro(
      getProjectName(id),
      "Tasks associated with this project.",
      "New task",
      "new-project-task"
    )}

    ${
      tasks.length
        ? `<div class="tasks-grid">${tasks.map(taskCard).join("")}</div>`
        : emptyState(
            "No tasks in this project",
            "Add the first task to this project.",
            "Create task",
            "new-project-task"
          )
    }

    <button class="secondary-button"
      data-action="view-projects">← Back to projects</button>
  `;

  document.querySelectorAll("[data-page]").forEach((button) => {
    button.classList.toggle("active", button.dataset.page === "tasks");
  });
}

/* ==========================================
   SETTINGS ACTIONS
========================================== */

function saveSettings(event) {
  event.preventDefault();

  const newName = $("settingsName").value.trim();

  if (newName.length < 2) {
    showToast("Please enter a valid name.");
    return;
  }

  const users = getUsers();
  const index = users.findIndex(
    (user) => user.email === currentUser.email
  );

  if (index === -1) return;

  users[index].name = newName;
  saveUsers(users);

  currentUser.name = newName;

  localStorage.setItem(
    STORAGE.session,
    JSON.stringify(currentUser)
  );

  updateUserProfile();
  renderPage();

  showToast("Profile updated successfully!");
}

function setTheme(theme) {
  const safeTheme = theme === "dark" ? "dark" : "light";

  document.body.dataset.theme = safeTheme;

  localStorage.setItem(STORAGE.theme, safeTheme);

  showToast(
    safeTheme === "dark"
      ? "Dark theme enabled."
      : "Light theme enabled."
  );
}

function applySavedTheme() {
  const theme = localStorage.getItem(STORAGE.theme) || "light";
  document.body.dataset.theme = theme;
}

function resetWorkspace() {
  const confirmed = confirm(
    "Reset your workspace? This will delete all your projects and tasks."
  );

  if (!confirmed) return;

  saveUserData({
    projects: [],
    tasks: []
  });

  renderPage();

  showToast("Your workspace has been reset.");
}

/* ==========================================
   ACTION BUTTON HANDLER
========================================== */

function handleAction(button) {
  const action = button.dataset.action;
  const id = button.dataset.id;

  switch (action) {
    case "new-project":
      openModal("project");
      break;

    case "new-task":
      openModal("task");
      break;

    case "new-project-task":
      openModal("task", null, selectedProjectId);
      break;

    case "edit-project":
      editProject(id);
      break;

    case "edit-task":
      editTask(id);
      break;

    case "delete-project":
      deleteProject(id);
      break;

    case "delete-task":
      deleteTask(id);
      break;

    case "toggle-task":
      toggleTask(id);
      break;

    case "cycle-status":
      cycleTaskStatus(id);
      break;

    case "view-projects":
      navigateTo("projects");
      break;

    case "view-tasks":
      navigateTo("tasks");
      break;

    case "view-project-tasks":
      viewProjectTasks(id);
      break;

    case "load-samples":
      addSampleData();
      break;

    case "reset-data":
      resetWorkspace();
      break;

    case "set-theme":
      setTheme(button.dataset.theme);
      break;
  }
}

/* ==========================================
   SEARCH
========================================== */

function handleSearch(value) {
  searchTerm = value.trim();

  if (
    currentPage !== "projects" &&
    currentPage !== "tasks" &&
    currentPage !== "kanban"
  ) {
    currentPage = "projects";
  }

  renderPage();

  const searchInput = $("searchInput");

  if (searchInput) {
    searchInput.value = value;
    searchInput.focus();
  }
}

/* ==========================================
   PASSWORD VISIBILITY
========================================== */

function togglePasswordVisibility() {
  const passwordInput = $("password");
  const button = $("togglePassword");

  if (passwordInput.type === "password") {
    passwordInput.type = "text";
    button.textContent = "Hide";
  } else {
    passwordInput.type = "password";
    button.textContent = "Show";
  }
}

/* ==========================================
   HELP TIPS
========================================== */

function nextHelpTip() {
  currentTip = (currentTip + 1) % tips.length;

  const tipText = $("tipText");

  tipText.style.opacity = "0";

  setTimeout(() => {
    tipText.textContent = tips[currentTip];
    tipText.style.opacity = "1";
  }, 150);
}

/* ==========================================
   EVENT LISTENERS
========================================== */

function setupEventListeners() {
  $("loginTab").addEventListener("click", () => {
    setAuthMode("login");
  });

  $("signupTab").addEventListener("click", () => {
    setAuthMode("signup");
  });

  $("authForm").addEventListener("submit", handleAuth);

  $("togglePassword").addEventListener(
    "click",
    togglePasswordVisibility
  );

  $("forgotPassword").addEventListener("click", () => {
    alert(
      "Password reset is not connected yet. For this demo, create a new account or sign in with your registered credentials."
    );
  });

  $("termsLink").addEventListener("click", (event) => {
    event.preventDefault();
    alert("Please use WorkNest responsibly. This is a student demo application.");
  });

  $("privacyLink").addEventListener("click", (event) => {
    event.preventDefault();
    alert("This demo stores its data locally in your browser.");
  });

  $("logoutButton").addEventListener("click", logout);

  $("closeModal").addEventListener("click", closeModal);
  $("cancelModal").addEventListener("click", closeModal);
  $("itemForm").addEventListener("submit", saveItem);

  $("modal").addEventListener("click", (event) => {
    if (event.target === $("modal")) {
      closeModal();
    }
  });

  $("quickAddButton").addEventListener("click", () => {
    openModal("task");
  });

  $("nextTip").addEventListener("click", nextHelpTip);

  $("searchInput").addEventListener("input", (event) => {
    handleSearch(event.target.value);
  });

  $("menuButton").addEventListener("click", () => {
    $("sidebar").classList.toggle("open");
  });

  document.addEventListener("click", (event) => {
    const pageButton = event.target.closest("[data-page]");

    if (pageButton) {
      event.preventDefault();
      navigateTo(pageButton.dataset.page);
      return;
    }

    const actionButton = event.target.closest("[data-action]");

    if (actionButton) {
      handleAction(actionButton);
    }
  });

  document.addEventListener("change", (event) => {
    if (event.target.id === "taskFilter") {
      taskFilter = event.target.value;
      renderPage();
    }
  });

  document.addEventListener("submit", (event) => {
    if (event.target.id === "settingsForm") {
      saveSettings(event);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (
      (event.ctrlKey || event.metaKey) &&
      event.key.toLowerCase() === "k"
    ) {
      event.preventDefault();
      $("searchInput").focus();
    }

    if (event.key === "Escape") {
      if (!$("modal").classList.contains("hidden")) {
        closeModal();
      }

      $("sidebar").classList.remove("open");
    }
  });
}

/* ==========================================
   APPLICATION STARTUP
========================================== */

function init() {
  applySavedTheme();
  setupEventListeners();

  const session = getSession();

  if (session && session.email) {
    const user = getUsers().find(
      (item) => item.email === session.email
    );

    if (user) {
      currentUser = {
        id: user.id,
        name: user.name,
        email: user.email
      };

      showApp();
      return;
    }

    localStorage.removeItem(STORAGE.session);
  }

  $("appPage").classList.add("hidden");
  $("authPage").classList.remove("hidden");

  setAuthMode("login");
}

document.addEventListener("DOMContentLoaded", init);
