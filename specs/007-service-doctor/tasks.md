# Implementation Tasks: Service Doctor

## Phase 1: Script Initialization & Static Checks
- [x] **Task 1.1**: Create `scripts/doctor/index.js` and add `service:doctor` to the root `package.json` scripts.
- [x] **Task 1.2**: Implement input validation to ensure a service name is provided (`pnpm service:doctor <service>`).
- [x] **Task 1.3**: Implement Docker Compose parsing (FR-002) to verify the service block exists and has required ENVs.
- [x] **Task 1.4**: Implement Gateway parsing (FR-004) to verify the proxy route is registered in `apps/gateway/src/index.ts`.

## Phase 2: Docker Runtime Checks
- [x] **Task 2.1**: Implement a check using `child_process.execSync` to run `docker ps` and verify the container is running and healthy (FR-003).

## Phase 3: Network & Async Checks
- [x] **Task 3.1**: Implement HTTP GET to the Gateway health endpoint (`/api/<service>/health/live`) and assert a 200 OK response (FR-005).
- [x] **Task 3.2**: Implement HTTP GET to the sync example endpoint (`/api/<service>/items`) and assert a successful response (FR-006).
- [x] **Task 3.3**: Implement the asynchronous validation (FR-007) by triggering an event (via HTTP if available) and reading the docker logs to confirm the consumer processed it.

## Phase 4: Output & Error Handling
- [x] **Task 4.1**: Format the console output to show a checklist of passing/failing steps.
- [x] **Task 4.2**: Implement actionable error messages (FR-008) for each potential point of failure.
