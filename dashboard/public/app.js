const overallProgressEl = document.getElementById("overall-progress");
const overallBarEl = document.getElementById("overall-bar");
const activeCountEl = document.getElementById("active-count");
const blockedCountEl = document.getElementById("blocked-count");
const phaseNameEl = document.getElementById("phase-name");
const lastUpdatedEl = document.getElementById("last-updated");
const liveDotEl = document.getElementById("live-dot");
const liveStateEl = document.getElementById("live-state");
const gridEl = document.getElementById("agent-grid");
const cardTpl = document.getElementById("agent-card-template");

function render(status) {
  const project = status.project || {};
  const agents = status.agents || [];
  const running = agents.filter((x) => x.status === "in_progress").length;
  const blocked = agents.filter((x) => x.status === "blocked").length;
  const currentPhase = detectPhase(agents);

  overallProgressEl.textContent = `${project.overallProgress ?? 0}%`;
  overallBarEl.style.width = `${project.overallProgress ?? 0}%`;
  activeCountEl.textContent = `${running} / ${agents.length}`;
  blockedCountEl.textContent = `Blocked: ${blocked}`;
  phaseNameEl.textContent = currentPhase;
  lastUpdatedEl.textContent = `Last update: ${formatTime(project.lastUpdated)}`;

  gridEl.innerHTML = "";
  for (const agent of agents) {
    const fragment = cardTpl.content.cloneNode(true);
    const card = fragment.querySelector(".agent-card");
    const nameEl = fragment.querySelector(".agent-name");
    const statusEl = fragment.querySelector(".status-pill");
    const taskEl = fragment.querySelector(".task-line");
    const barEl = fragment.querySelector(".agent-bar");
    const progressEl = fragment.querySelector(".progress-text");
    const etaEl = fragment.querySelector(".eta-text");
    const blockerEl = fragment.querySelector(".blocker-line");

    nameEl.textContent = agent.name || agent.id;
    statusEl.textContent = normalizeStatus(agent.status);
    taskEl.textContent = `Current: ${agent.currentTask || "-"}`;
    barEl.style.width = `${agent.progress || 0}%`;
    progressEl.textContent = `Progress ${agent.progress || 0}%`;
    etaEl.textContent = `ETA ${agent.eta || "-"}`;
    blockerEl.textContent = `Blocker: ${agent.blockedBy || "None"}`;
    statusEl.style.color = pickStatusColor(agent.status);
    statusEl.style.borderColor = pickStatusColor(agent.status);
    card.dataset.agentId = agent.id;

    gridEl.appendChild(fragment);
  }
}

function pickStatusColor(status) {
  if (status === "done") return "#22d3a5";
  if (status === "blocked") return "#ff6b6b";
  if (status === "in_progress") return "#ffd166";
  return "#9fb8c1";
}

function normalizeStatus(status) {
  if (status === "in_progress") return "In Progress";
  if (status === "blocked") return "Blocked";
  if (status === "done") return "Done";
  if (status === "todo") return "Todo";
  return status || "Unknown";
}

function detectPhase(agents) {
  const running = agents.find((x) => x.status === "in_progress");
  if (running) return running.name;
  const blocked = agents.find((x) => x.status === "blocked");
  if (blocked) return `${blocked.name} (Blocked)`;
  return "Planning";
}

function formatTime(value) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

async function bootstrap() {
  try {
    const res = await fetch("/api/status", { cache: "no-store" });
    const initial = await res.json();
    render(initial);
  } catch (error) {
    liveStateEl.textContent = "Offline";
    liveDotEl.style.background = "#ff6b6b";
  }

  const source = new EventSource("/events");
  source.onopen = () => {
    liveStateEl.textContent = "Live";
    liveDotEl.style.background = "#22d3a5";
    liveDotEl.style.boxShadow = "0 0 12px #22d3a5";
  };
  source.onmessage = (event) => {
    try {
      const payload = JSON.parse(event.data);
      render(payload);
    } catch {
      // ignore malformed event
    }
  };
  source.onerror = () => {
    liveStateEl.textContent = "Reconnecting...";
    liveDotEl.style.background = "#ffd166";
    liveDotEl.style.boxShadow = "0 0 12px #ffd166";
  };
}

bootstrap();
