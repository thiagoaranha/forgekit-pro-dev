# Service Standards Compliance Data Model

This model defines review entities for service-standard compliance, not runtime persistence tables.

## 1) Service Compliance Profile

Represents one service under compliance review.

| Field | Type | Description |
|---|---|---|
| `serviceName` | String | Unique service identifier in ForgeKit. |
| `serviceVersion` | String | Version or commit reference under review. |
| `runtimeType` | Enum | `http`, `rpc`, `event-consumer`, `hybrid`. |
| `entrypoint` | String | Startup entrypoint path used for run/build/test workflows. |
| `documentationRefs` | String[] | Paths to service docs used as reviewer inputs. |

## 2) Layer Boundary Evidence

Captures compliance for transport/application/domain/infrastructure boundaries.

| Field | Type | Description |
|---|---|---|
| `layerNames` | String[] | Declared service layers (must include transport, application, domain, infrastructure). |
| `dependencyDirectionValid` | Boolean | Confirms inward dependency direction and no cyclic coupling. |
| `transportModelMappingPresent` | Boolean | Confirms transport models are mapped before domain usage. |
| `boundaryNotes` | String | Reviewer notes for leakage or ambiguity. |

## 3) Configuration Contract Evidence

Captures config and secret-handling compliance.

| Field | Type | Description |
|---|---|---|
| `configSchemaRef` | String | Path to config schema or equivalent validation contract. |
| `startupValidationEnabled` | Boolean | Confirms fail-fast validation at startup. |
| `requiredVariablesDocumented` | Boolean | Confirms required/optional defaults are documented. |
| `secretHandlingCompliant` | Boolean | Confirms no hardcoded secrets and safe secret sources. |

## 4) Observability Contract Evidence

Captures logs, correlation, metrics, and health signals.

| Field | Type | Description |
|---|---|---|
| `structuredLoggingEnabled` | Boolean | Logs are machine-parseable and include required fields. |
| `correlationPropagationValid` | Boolean | Correlation ID continuity across request/message paths. |
| `metricsContractRef` | String | Metrics endpoint or instrumentation reference. |
| `livenessContractRef` | String | Path or endpoint definition for liveness signal. |
| `readinessContractRef` | String | Path or endpoint definition for readiness signal. |

## 5) Error Contract Evidence

Captures outward-facing error stability and sanitization.

| Field | Type | Description |
|---|---|---|
| `errorShapeValid` | Boolean | Outward errors follow `code`, `message`, `traceId` structure. |
| `sanitizationValid` | Boolean | Internal details and sensitive data are not exposed externally. |
| `traceIdentifierType` | Enum | `correlationId`, `traceId`, `requestId`, `other-standardized`. |
| `errorSemanticsDocumented` | Boolean | Business/validation/dependency/internal failure classes are documented. |

## 6) Test Evidence

Captures quality, determinism, and coverage obligations.

| Field | Type | Description |
|---|---|---|
| `unitSuitePresent` | Boolean | Unit tests for business and domain logic exist. |
| `integrationSuitePresent` | Boolean | Integration tests for contracts/adapters exist. |
| `criticalPathsDirectlyTested` | Boolean | Critical business logic has direct test coverage. |
| `lineCoveragePercent` | Number | Automated line coverage percentage for review target. |
| `determinismValidated` | Boolean | No flaky or order-dependent test behavior detected. |

## 7) Interface Contract Evidence

Captures API/event obligations.

| Field | Type | Description |
|---|---|---|
| `apiContractDocumented` | Boolean | External API contract is documented and reviewable. |
| `apiVersioningStrategy` | String | Versioning strategy for external/inter-service contracts. |
| `inputBoundaryValidationValid` | Boolean | External input validation is enforced. |
| `eventContractDocumented` | Boolean | Event contracts are documented when events are produced/consumed. |
| `idempotentConsumerEvidence` | Boolean | Event consumers are idempotent for at-least-once delivery. |

## 8) Compliance Decision Record

Represents reviewer output for approval gating.

| Field | Type | Description |
|---|---|---|
| `reviewId` | String | Unique compliance review identifier. |
| `serviceProfileRef` | String | Reference to reviewed service compliance profile. |
| `failedRequirementRefs` | String[] | Requirement IDs not satisfied (e.g., FR-015). |
| `decision` | Enum | `approved`, `approved-with-conditions`, `rejected`. |
| `remediationTasks` | String[] | Required follow-up tasks with owners. |
| `reviewDate` | String | Review timestamp in ISO format. |
