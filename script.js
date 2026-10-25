
"use strict";

/* ---------- BASIC HELPERS ---------- */

const $ = (id) => document.getElementById(id);

const authPage = $("authPage");
const appPage = $("appPage");
const pageContent = $("pageContent");
const modal = $("modal");
const formFields = $("formFields");

let user = null;
let projects = [];
let tasks = [];
let editingId = null;
let editingType = null;
let currentPage = "dashboard";

const pageDetails = {
  dashboard: {
    title: "Dashboard",
    subtitle: "Here's what's happening in your workspace.",
    helpTitle: "Your workspace at a glance",
    helpText: "Check your progress here. Use Add New to create a project or task."
  },
  projects: {
    title: "Projects",
    subtitle: "Keep your work organized in one place.",
    helpTitle: "How to use Projects",
    helpText: "Click Add New to create a project. Use Edit to update it, or Delete to remove it and its tasks."
  },
  tasks: {
    title: "My Tasks",
    subtitle: "Manage your daily work and deadlines.",
    helpTitle: "How to use Tasks",
    helpText: "Add a task, select its project and priority, then mark it complete using the checkbox."
  },
  kanban: {
    title: "Kanban Board",
    subtitle: "See the progress of every task.",
    helpTitle: "How to use the board",
    helpText: "Use the status dropdown on any card to move a task between To Do, In Progress, and Done."
  },
  settings: {
    title: "Settings",
    subtitle: "Personalize your WorkNest experience.",
    helpTitle: "Your settings",
    helpText: "Change your display name, switch themes, or log out from this page."
  }
};

function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function readData(key, fallback) {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
}

function showToast(message) {
  const toast = $("toast");
  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2500);
}

function dateAfter(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function prettyDate(value) {
  if (!value) return "No due date";
  const date = new Date(value + "T00:00:00");
  if (Number.isNaN(date.getTime())) return "No due date";
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

function projectName(id) {
  const project = projects.find((item) => item.id === id);
  return project ? project.name : "No project";
}

function getUsers() {
  return readData("worknestUsers", []);
}

function saveUsers(users) {
  try {
    localStorage.setItem("worknestUsers", JSON.stringify(users));
    return true;
  } catch {
    showToast("Unable to save account in this browser.");
    return false;
  }
}

function dataKey(type) {
  return `worknest_${type}_${user.email.toLowerCase()}`;
}

function saveData() {
  try {
    localStorage.setItem(dataKey("projects"), JSON.stringify(projects));
    localStorage.setItem(dataKey("tasks"), JSON.stringify(tasks));
  } catch {
    showToast("Unable to save. Browser storage may be full.");
  }
}

function loadData() {
  projects = readData(dataKey("projects"), null);
  tasks = readData(dataKey("tasks"), null);

  if (!Array.isArray(projects) || !Array.isArray(tasks)) {
    createSampleData();
    saveData();
  }
}

function createSampleData() {
  projects = [
    {
      id: makeId(),
      name: "My Portfolio",
      description: "Build a portfolio to show my skills and work.",
      status: "In Progress"
    },
    {
      id: makeId(),
      name: "College Project",
      description: "Complete the semester project.",
      status: "Planning"
    }
  ];

  tasks = [
    {
      id: makeId(),
      title: "Design portfolio homepage",
      description: "Plan the layout and colors.",
      projectId: projects[0].id,
      priority: "High",
      status: "In Progress",
      dueDate: dateAfter(2)
    },
    {
      id: makeId(),
      title: "Prepare project presentation",
      description: "Create slides for the college project.",
      projectId: projects[1].id,
      priority: "Medium",
      status: "To Do",
      dueDate: dateAfter(4)
    },
    {
      id: makeId(),
      title: "Review project requirements",
      description: "Check the required features.",
      projectId: projects[1].id,
      priority: "Low",
      status: "Done",
      dueDate: dateAfter(-1)
    }
  ];
}

/* ---------- LOGIN AND SIGN UP ---------- */

function showAuthForm(which) {
  const login = which === "login";
  $("loginForm").classList.toggle("hidden", !login);
  $("signupForm").classList.toggle("hidden", login);
  $("loginTab").classList.toggle("active", login);
  $("signupTab").classList.toggle("active", !login);
}

$("loginTab").addEventListener("click", () => showAuthForm("login"));
$("signupTab").addEventListener("click", () => showAuthForm("signup"));
$("showSignup").addEventListener("click", () => showAuthForm("signup"));
$("showLogin").addEventListener("click", () => showAuthForm("login"));

$("signupForm").addEventListener("submit", (event) => {
  event.preventDefault();

  const name = $("signupName").value.trim();
  const email = $("signupEmail").value.trim().toLowerCase();
  const password = $("signupPassword").value;

  if (name.length < 2) {
    showToast("Please enter your name.");
    return;
  }

  if (password.length < 6) {
    showToast("Use at least 6 characters for your password.");
    return;
  }

  const users = getUsers();

  if (users.some((item) => item.email.toLowerCase() === email)) {
    showToast("This email already has an account. Please log in.");
    showAuthForm("login");
    $("loginEmail").value = email;
    return;
  }

  // Demo authentication only: real applications should use a secure backend.
  users.push({ name, email, password });

  if (!saveUsers(users)) return;

  user = { name, email };
  localStorage.setItem("worknestSession", email);
  createSampleData();
  saveData();
  enterApp();
  $("signupForm").reset();
  showToast("Account created successfully!");
});

$("loginForm").addEventListener("submit", (event) => {
  event.preventDefault();

  const email = $("loginEmail").value.trim().toLowerCase();
  const password = $("loginPassword").value;
  const account = getUsers().find((item) =>
    item.email.toLowerCase() === email && item.password === password
  );

  if (!account) {
    showToast("Incorrect email or password.");
    return;
  }

  user = { name: account.name, email: account.email };
  localStorage.setItem("worknestSession", email);
  loadData();
  enterApp();
  $("loginForm").reset();
  showToast("Welcome back, " + account.name.split(" ")[0] + "!");
});

function enterApp() {
  authPage.classList.add("hidden");
  appPage.classList.remove("hidden");
  updateProfile();
  goToPage("dashboard");
}

function updateProfile() {
  if (!user) return;

  $("userName").textContent = user.name;
  $("userEmail").textContent = user.email;
  $("userAvatar").textContent = user.name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function logout() {
  localStorage.removeItem("worknestSession");
  user = null;
  projects = [];
  tasks = [];
  appPage.classList.add("hidden");
  authPage.classList.remove("hidden");
  $("sidebar").classList.remove("open");
  $("searchInput").value = "";
  showAuthForm("login");
  showToast("You have logged out.");
}

$("logoutButton").addEventListener("click", () => {
  if (confirm("Are you sure you want to log out?")) logout();
});

/* ---------- NAVIGATION ---------- */

document.querySelectorAll("[data-page]").forEach((button) => {
  button.addEventListener("click", () => {
    goToPage(button.dataset.page);
    $("sidebar").classList.remove("open");
  });
});

function goToPage(page) {
  currentPage = page;
  $("searchInput").value = "";
  renderPage();
}

$("menuButton").addEventListener("click", () => {
  $("sidebar").classList.toggle("open");
});

$("addButton").addEventListener("click", () => {
  if (currentPage === "projects") openProjectForm();
  else if (currentPage === "settings") showToast("You are viewing your settings.");
  else openTaskForm();
});

/* ---------- RENDER PAGES ---------- */

function renderPage() {
  const info = pageDetails[currentPage];

  $("currentPageName").textContent = info.title;
  $("pageTitle").textContent = info.title;
  $("pageSubtitle").textContent = info.subtitle;
  $("helpTitle").textContent = info.helpTitle;
  $("helpText").textContent = info.helpText;

  document.querySelectorAll("[data-page]").forEach((button) => {
    button.classList.toggle("active", button.dataset.page === currentPage);
  });

  $("addButton").classList.toggle("hidden", currentPage === "settings");
  $("addButton").textContent = currentPage === "projects"
    ? "＋ New Project"
    : "＋ New Task";

  if (currentPage === "dashboard") pageContent.innerHTML = renderDashboard();
  if (currentPage === "projects") pageContent.innerHTML = renderProjects();
  if (currentPage === "tasks") pageContent.innerHTML = renderTasks();
  if (currentPage === "kanban") pageContent.innerHTML = renderKanban();
  if (currentPage === "settings") pageContent.innerHTML = renderSettings();

  bindPageEvents();
}

function bindPageEvents() {
  pageContent.querySelectorAll("[data-edit-project]").forEach((button) => {
    button.addEventListener("click", () => {
      const project = projects.find((item) => item.id === button.dataset.editProject);
      if (project) openProjectForm(project);
    });
  });

  pageContent.querySelectorAll("[data-delete-project]").forEach((button) => {
    button.addEventListener("click", () => deleteProject(button.dataset.deleteProject));
  });

  pageContent.querySelectorAll("[data-edit-task]").forEach((button) => {
    button.addEventListener("click", () => {
      const task = tasks.find((item) => item.id === button.dataset.editTask);
      if (task) openTaskForm(task);
    });
  });

  pageContent.querySelectorAll("[data-delete-task]").forEach((button) => {
    button.addEventListener("click", () => deleteTask(button.dataset.deleteTask));
  });

  pageContent.querySelectorAll("[data-complete-task]").forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      const task = tasks.find((item) => item.id === checkbox.dataset.completeTask);
      if (!task) return;

      task.status = checkbox.checked ? "Done" : "To Do";
      saveData();
      renderPage();
      showToast(checkbox.checked ? "Task completed!" : "Task marked as To Do.");
    });
  });

  pageContent.querySelectorAll("[data-status]").forEach((select) => {
    select.addEventListener("change", () => {
      const task = tasks.find((item) => item.id === select.dataset.status);
      if (!task) return;

      task.status = select.value;
      saveData();
      renderPage();
      showToast("Task status updated.");
    });
  });

  const profileForm = $("profileForm");
  if (profileForm) {
    profileForm.addEventListener("submit", saveProfile);
  }

  const themeToggle = $("themeToggle");
  if (themeToggle) {
    themeToggle.addEventListener("change", () => {
      setTheme(themeToggle.checked);
      showToast(themeToggle.checked ? "Dark theme enabled." : "Light theme enabled.");
    });
  }

  const settingsLogout = $("settingsLogout");
  if (settingsLogout) {
    settingsLogout.addEventListener("click", () => {
      if (confirm("Are you sure you want to log out?")) logout();
    });
  }

  const resetButton = $("resetButton");
  if (resetButton) resetButton.addEventListener("click", resetData);
}

/* ---------- DASHBOARD ---------- */

function renderDashboard() {
  const completed = tasks.filter((task) => task.status === "Done").length;
  const pending = tasks.length - completed;
  const upcoming = tasks.filter((task) =>
    task.status !== "Done" && task.dueDate && task.dueDate >= dateAfter(0)
  ).length;

  return `
    <div class="grid stats">
      ${statCard("Total Projects", projects.length, "▣", "All your projects")}
      ${statCard("Total Tasks", tasks.length, "✓", "Across all projects")}
      ${statCard("Pending Tasks", pending, "◷", "Still to be completed")}
      ${statCard("Completed Tasks", completed, "✦", "Great progress!")}
    </div>

    <div class="grid dashboard-grid">
      <section class="card">
        <div class="card-heading">
          <h3>My Projects</h3>
          <button class="link-button" data-go="projects">View all →</button>
        </div>
        ${projects.length ? projects.slice(0, 5).map((project) => {
          const related = tasks.filter((task) => task.projectId === project.id);
          const done = related.filter((task) => task.status === "Done").length;
          const percent = related.length ? Math.round(done / related.length * 100) : 0;

          return `
            <div class="project-line">
              <div class="project-line-top">
                <div class="project-symbol">${escapeHTML(project.name.charAt(0).toUpperCase())}</div>
                <div class="project-line-info">
                  <strong>${escapeHTML(project.name)}</strong>
                  <span>${related.length} tasks · ${percent}% complete</span>
                </div>
              </div>
              <div class="progress"><div class="progress-fill" style="width:${percent}%"></div></div>
            </div>
          `;
        }).join("") : emptyState("No projects yet", "Create a project to get started.", "projects", "Create Project")}
        <button class="button secondary" data-add-project>＋ New Project</button>
      </section>

      <section class="card">
        <div class="card-heading">
          <h3>Tasks to Focus On</h3>
          <button class="link-button" data-go="tasks">View all →</button>
        </div>
        ${tasks.filter((task) => task.status !== "Done").slice(0, 5).map((task) => `
          <div class="focus-task">
            <span class="project-symbol">✓</span>
            <div>
              <strong>${escapeHTML(task.title)}</strong>
              <span>${escapeHTML(projectName(task.projectId))} · ${prettyDate(task.dueDate)}</span>
            </div>
          </div>
        `).join("") || `<p class="muted">You're all caught up. Add a new task when you're ready.</p>`}
        <button class="button primary" data-add-task>＋ New Task</button>
      </section>
    </div>
  `;
}

function statCard(title, value, icon, note) {
  return `
    <div class="card">
      <div class="stat-label">${title}<span class="stat-icon">${icon}</span></div>
      <div class="stat-number">${value}</div>
      <div class="stat-note">${note}</div>
    </div>
  `;
}

/* ---------- PROJECTS ---------- */

function renderProjects() {
  const query = $("searchInput").value.toLowerCase().trim();
  const filtered = projects.filter((project) =>
    (project.name + " " + project.description).toLowerCase().includes(query)
  );

  if (!filtered.length) {
    return emptyState(
      projects.length ? "No matching projects" : "Your workspace is ready",
      projects.length ? "Try another search." : "Create your first project to organize your work.",
      "projects",
      "Create Project"
    );
  }

  return `
    <div class="grid project-grid">
      ${filtered.map((project) => {
        const related = tasks.filter((task) => task.projectId === project.id);
        const completed = related.filter((task) => task.status === "Done").length;
        const percent = related.length ? Math.round(completed / related.length * 100) : 0;

        return `
          <article class="card project-card">
            <div class="project-card-top">
              <div class="project-symbol">${escapeHTML(project.name.charAt(0).toUpperCase())}</div>
              <span class="badge ${project.status === "Completed" ? "green" : ""}">${escapeHTML(project.status)}</span>
            </div>
            <h3>${escapeHTML(project.name)}</h3>
            <p>${escapeHTML(project.description || "No description added.")}</p>
            <div class="progress"><div class="progress-fill" style="width:${percent}%"></div></div>
            <p>${completed} of ${related.length} tasks completed</p>
            <div class="card-actions">
              <button class="small-button" data-edit-project="${project.id}">Edit</button>
              <button class="small-button delete" data-delete-project="${project.id}">Delete</button>
            </div>
          </article>
        `;
      }).join("")}
    </div>
  `;
}

/* ---------- TASKS ---------- */

function renderTasks() {
  const query = $("searchInput").value.toLowerCase().trim();
  const filtered = tasks.filter((task) =>
    (task.title + " " + task.description + " " + projectName(task.projectId))
      .toLowerCase().includes(query)
  );

  return filtered.length ? `
    <div class="task-list">
      ${filtered.map(taskCard).join("")}
    </div>
  ` : emptyState(
    tasks.length ? "No matching tasks" : "No tasks yet",
    tasks.length ? "Try a different search." : "Add your first task to get started.",
    "tasks",
    "Create Task"
  );
}

function taskCard(task) {
  const priorityClass = task.priority === "High" ? "red" :
    task.priority === "Medium" ? "orange" : "green";

  return `
    <article class="task-row ${task.status === "Done" ? "completed" : ""}">
      <input type="checkbox" class="task-checkbox" data-complete-task="${task.id}"
        ${task.status === "Done" ? "checked" : ""}
        aria-label="Complete ${escapeHTML(task.title)}">
      <div class="task-info">
        <strong>${escapeHTML(task.title)}</strong>
        <p>${escapeHTML(task.description || "No description")}</p>
        <div class="task-meta">
          <span class="badge">${escapeHTML(projectName(task.projectId))}</span>
          <span class="badge ${priorityClass}">${escapeHTML(task.priority)}</span>
          <span class="badge">${escapeHTML(task.status)}</span>
          <span class="task-date">${prettyDate(task.dueDate)}</span>
        </div>
      </div>
      <div class="task-buttons">
        <button class="small-button" data-edit-task="${task.id}">Edit</button>
        <button class="small-button delete" data-delete-task="${task.id}">×</button>
      </div>
    </article>
  `;
}

/* ---------- KANBAN ---------- */

function renderKanban() {
  const statuses = ["To Do", "In Progress", "Done"];

  return `
    <div class="grid kanban-grid">
      ${statuses.map((status) => {
        const columnTasks = tasks.filter((task) => task.status === status);

        return `
          <section class="kanban-column">
            <div class="kanban-heading">
              <span>${status}</span>
              <span class="kanban-count">${columnTasks.length}</span>
            </div>
            <div class="kanban-list">
              ${columnTasks.map((task) => `
                <article class="kanban-task">
                  <span class="badge ${task.priority === "High" ? "red" : task.priority === "Medium" ? "orange" : "green"}">${escapeHTML(task.priority)}</span>
                  <strong>${escapeHTML(task.title)}</strong>
                  <small>${escapeHTML(projectName(task.projectId))}</small>
                  <p class="task-date">${prettyDate(task.dueDate)}</p>
                  <label class="field">
                    <span class="muted">Status</span>
                    <select data-status="${task.id}" aria-label="Change task status">
                      ${statusOption("To Do", status === task.status)}
                      ${statusOption("In Progress", status === task.status)}
                      ${statusOption("Done", status === task.status)}
                    </select>
                  </label>
                  <button class="small-button" data-edit-task="${task.id}">Edit task</button>
                </article>
              `).join("") || `<p class="muted">No tasks here.</p>`}
            </div>
          </section>
        `;
      }).join("")}
    </div>
  `;
}

function statusOption(value, selected) {
  return `<option value="${value}" ${selected ? "selected" : ""}>${value}</option>`;
}

/* ---------- SETTINGS ---------- */

function renderSettings() {
  const dark = document.body.classList.contains("dark");

  return `
    <div class="grid settings-grid">
      <section class="card settings-card">
        <h3>My Profile</h3>
        <p>Update the name shown in your workspace.</p>
        <form id="profileForm">
          <div class="field">
            <label for="profileName">Your name</label>
            <input id="profileName" value="${escapeHTML(user.name)}" minlength="2" required>
          </div>
          <div class="field">
            <label>Email address</label>
            <input value="${escapeHTML(user.email)}" disabled>
          </div>
          <button class="button primary" type="submit">Save Name</button>
        </form>
      </section>

      <section class="card settings-card">
        <h3>Preferences</h3>
        <p>Choose your preferred appearance.</p>
        <div class="setting-row">
          <div>
            <strong>Dark theme</strong>
            <p>Switch between light and dark appearance.</p>
          </div>
          <input type="checkbox" id="themeToggle" ${dark ? "checked" : ""} aria-label="Dark theme">
        </div>
        <div class="setting-row">
          <div>
            <strong>Reset demo data</strong>
            <p>Restore sample projects and tasks.</p>
          </div>
          <button id="resetButton" class="small-button">Reset</button>
        </div>
        <div class="setting-row">
          <div>
            <strong>Log out</strong>
            <p>Leave your WorkNest session.</p>
          </div>
          <button id="settingsLogout" class="small-button">Log Out</button>
        </div>
      </section>
    </div>
  `;
}

function saveProfile(event) {
  event.preventDefault();

  const name = $("profileName").value.trim();
  if (name.length < 2) {
    showToast("Please enter a valid name.");
    return;
  }

  const users = getUsers();
  const account = users.find((item) => item.email.toLowerCase() === user.email.toLowerCase());

  if (!account) {
    showToast("Account not found. Please log in again.");
    return;
  }

  account.name = name;
  if (!saveUsers(users)) return;

  user.name = name;
  updateProfile();
  renderPage();
  showToast("Name updated successfully.");
}

function setTheme(dark) {
  document.body.classList.toggle("dark", dark);
  if (user) {
    localStorage.setItem(
      "worknestTheme_" + user.email.toLowerCase(),
      dark ? "dark" : "light"
    );
  }
}

function loadTheme() {
  if (!user) return;
  const theme = localStorage.getItem("worknestTheme_" + user.email.toLowerCase());
  document.body.classList.toggle("dark", theme === "dark");
}

function resetData() {
  if (!confirm("Replace your current projects and tasks with sample data?")) return;
  createSampleData();
  saveData();
  renderPage();
  showToast("Demo data restored.");
}

/* ---------- ADD AND EDIT FORMS ---------- */

function openProjectForm(project = null) {
  editingType = "project";
  editingId = project ? project.id : null;

  $("modalTitle").textContent = project ? "Edit Project" : "New Project";
  $("modalSubtitle").textContent = "Give your project a name and purpose.";

  formFields.innerHTML = `
    <div class="form-field">
      <label for="itemName">Project name *</label>
      <input id="itemName" maxlength="80" required value="${escapeHTML(project?.name || "")}" placeholder="e.g. My Portfolio">
    </div>
    <div class="form-field">
      <label for="itemDescription">Description</label>
      <textarea id="itemDescription" maxlength="300" placeholder="What is this project about?">${escapeHTML(project?.description || "")}</textarea>
    </div>
    <div class="form-field">
      <label for="itemStatus">Status</label>
      <select id="itemStatus">
        ${statusOption("Planning", project?.status === "Planning" || !project)}
        ${statusOption("In Progress", project?.status === "In Progress")}
        ${statusOption("Completed", project?.status === "Completed")}
      </select>
    </div>
  `;

  openModal();
}

function openTaskForm(task = null) {
  if (!projects.length) {
    showToast("Create a project first, then add a task.");
    goToPage("projects");
    return;
  }

  editingType = "task";
  editingId = task ? task.id : null;

  $("modalTitle").textContent = task ? "Edit Task" : "New Task";
  $("modalSubtitle").textContent = "Add a task to one of your projects.";

  formFields.innerHTML = `
    <div class="form-field">
      <label for="itemName">Task title *</label>
      <input id="itemName" maxlength="100" required value="${escapeHTML(task?.title || "")}" placeholder="e.g. Finish homepage">
    </div>
    <div class="form-field">
      <label for="itemDescription">Description</label>
      <textarea id="itemDescription" maxlength="300" placeholder="Add a short description">${escapeHTML(task?.description || "")}</textarea>
    </div>
    <div class="form-field">
      <label for="itemProject">Project *</label>
      <select id="itemProject" required>
        ${projects.map((project) => `
          <option value="${project.id}" ${(task?.projectId || projects[0].id) === project.id ? "selected" : ""}>
            ${escapeHTML(project.name)}
          </option>
        `).join("")}
      </select>
    </div>
    <div class="form-field">
      <label for="itemPriority">Priority</label>
      <select id="itemPriority">
        ${statusOption("Low", task?.priority === "Low")}
        ${statusOption("Medium", !task || task.priority === "Medium")}
        ${statusOption("High", task?.priority === "High")}
      </select>
    </div>
    <div class="form-field">
      <label for="itemStatus">Status</label>
      <select id="itemStatus">
        ${statusOption("To Do", !task || task.status === "To Do")}
        ${statusOption("In Progress", task?.status === "In Progress")}
        ${statusOption("Done", task?.status === "Done")}
      </select>
    </div>
    <div class="form-field">
      <label for="itemDate">Due date</label>
      <input id="itemDate" type="date" value="${escapeHTML(task?.dueDate || "")}">
    </div>
  `;

  openModal();
}

function openModal() {
  modal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
  $("itemName").focus();
}

function closeModal() {
  modal.classList.add("hidden");
  document.body.style.overflow = "";
  $("itemForm").reset();
  formFields.innerHTML = "";
  editingId = null;
  editingType = null;
}

$("closeModal").addEventListener("click", closeModal);
$("cancelModal").addEventListener("click", closeModal);

modal.addEventListener("click", (event) => {
  if (event.target === modal) closeModal();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !modal.classList.contains("hidden")) closeModal();
});

$("itemForm").addEventListener("submit", (event) => {
  event.preventDefault();

  const name = $("itemName").value.trim();
  const description = $("itemDescription").value.trim();
  if (!name) {
    showToast("Please enter a name.");
    return;
  }

  if (editingType === "project") {
    saveProject(name, description);
  } else if (editingType === "task") {
    saveTask(name, description);
  }
});

function saveProject(name, description) {
  const status = $("itemStatus").value;

  if (editingId) {
    const project = projects.find((item) => item.id === editingId);
    if (!project) return;
    Object.assign(project, { name, description, status });
    showToast("Project updated.");
  } else {
    projects.unshift({ id: makeId(), name, description, status });
    showToast("Project created.");
  }

  saveData();
  closeModal();
  renderPage();
}

function saveTask(name, description) {
  const projectId = $("itemProject").value;
  const priority = $("itemPriority").value;
  const status = $("itemStatus").value;
  const dueDate = $("itemDate").value;

  if (!projects.some((project) => project.id === projectId)) {
    showToast("Please select a valid project.");
    return;
  }

  if (editingId) {
    const task = tasks.find((item) => item.id === editingId);
    if (!task) return;
    Object.assign(task, { title: name, description, projectId, priority, status, dueDate });
    showToast("Task updated.");
  } else {
    tasks.unshift({ id: makeId(), title: name, description, projectId, priority, status, dueDate });
    showToast("Task created.");
  }

  saveData();
  closeModal();
  renderPage();
}

/* ---------- DELETE ---------- */

function deleteTask(id) {
  const task = tasks.find((item) => item.id === id);
  if (!task) return;

  if (!confirm(`Delete "${task.title}"? This cannot be undone.`)) return;

  tasks = tasks.filter((item) => item.id !== id);
  saveData();
  renderPage();
  showToast("Task deleted.");
}

function deleteProject(id) {
  const project = projects.find((item) => item.id === id);
  if (!project) return;

  const related = tasks.filter((task) => task.projectId === id).length;
  const message = related
    ? `Delete "${project.name}" and its ${related} task(s)?`
    : `Delete "${project.name}"?`;

  if (!confirm(message)) return;

  projects = projects.filter((item) => item.id !== id);
  tasks = tasks.filter((task) => task.projectId !== id);

  saveData();
  renderPage();
  showToast("Project deleted.");
}

/* ---------- EMPTY STATES ---------- */

function emptyState(title, description, page, buttonText) {
  return `
    <div class="empty-state">
      <span>✦</span>
      <h3>${escapeHTML(title)}</h3>
      <p>${escapeHTML(description)}</p>
      <button class="button primary" data-empty-page="${page}">${escapeHTML(buttonText)}</button>
    </div>
  `;
}

/* ---------- SEARCH AND QUICK BUTTONS ---------- */

$("searchInput").addEventListener("input", () => {
  if (currentPage === "projects" || currentPage === "tasks") renderPage();
});

pageContent.addEventListener("click", (event) => {
  const goButton = event.target.closest("[data-go]");
  const addProject = event.target.closest("[data-add-project]");
  const addTask = event.target.closest("[data-add-task]");
  const emptyButton = event.target.closest("[data-empty-page]");

  if (goButton) goToPage(goButton.dataset.go);
  if (addProject) openProjectForm();
  if (addTask) openTaskForm();

  if (emptyButton) {
    const target = emptyButton.dataset.emptyPage;
    if (target === "projects") {
      goToPage("projects");
      openProjectForm();
    } else {
      goToPage("tasks");
      openTaskForm();
    }
  }
});

/* ---------- START APP ---------- */

function startApp() {
  const email = localStorage.getItem("worknestSession");
  if (!email) return;

  const account = getUsers().find((item) =>
    item.email.toLowerCase() === email.toLowerCase()
  );

  if (!account) {
    localStorage.removeItem("worknestSession");
    return;
  }

  user = { name: account.name, email: account.email };
  loadData();
  loadTheme();
  enterApp();
}

startApp();
