# projectOne

This repository contains a sub-agent collaboration setup for a standard software team.

## Key Files
- `sub-agents.yaml`: machine-readable team configuration
- `docs/agent-collaboration.md`: process and handoff guide
- `docs/*.md`: execution templates for each phase
- `dashboard/`: realtime web dashboard for agent tasks and progress

## Start Here
1. Fill `docs/prd.md`
2. Freeze interfaces in `docs/api.yaml`
3. Execute handoffs using `Context/Input/Output/Risks/Next`

## Realtime Agent Dashboard
1. Run `node dashboard/server.js`
2. Open `http://localhost:4173`
3. Update an agent status in realtime:

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri http://localhost:4173/api/agent-update `
  -ContentType "application/json" `
  -Body '{"id":"backend","status":"in_progress","currentTask":"Finalize API","progress":72,"blockedBy":"","eta":"2026-03-18"}'
```

The page listens to `/events` with Server-Sent Events and updates automatically.
