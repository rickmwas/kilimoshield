# KilimoShield frontend → backend handoff

This document describes the current demo boundary and a proposed integration path. The proposed endpoints below do not exist yet.

## Current architecture

- React + Vite application; Wouter handles client-side routes.
- `src/lib/domain.ts` contains the frontend domain types and lifecycle enums.
- `src/lib/demo-service.ts` is the only source of demo data and business mutations.
- UI components should read the shared store through `useDemoState()` and call service operations rather than keeping separate copies of workflow records.
- The deterministic mock state is stored in browser local storage under `kilimoshield-demo-v1`. It synchronizes changes across same-origin tabs where browser storage events are available.
- Resetting the demo restores the seeded sample scenario. A browser storage failure returns an explicit error instead of reporting a successful save.

The service implementation is intentionally local. It is a replaceable demo adapter, not a backend, database, authentication system, or production agent runtime.

## Domain and lifecycle notes

The frontend models farmers, facilities, transporters, buyers, harvest requests, crop assessments, facility recommendations, reservations, transport jobs, delivery events, inventory batches, purchase offers, payment records, release authorizations, workflow runs, automation tasks, exceptions, audit events, notifications, and activity items.

Key lifecycle boundaries:

- A harvest request is submitted and assessed before a facility recommendation is shown. Assessment text is simulated and cannot establish shelf life or internal quality.
- A recommendation is not a reservation. Capacity changes only after a farmer confirms a compatible, sufficiently capacitated facility.
- Reservation creates an available transport job. It does not assign a driver, dispatch a vehicle, or imply acceptance.
- Transport events are manually advanced demo states; they are not live GPS updates.
- Facility check-in is the authority for received weight in the demo. A difference can create an exception. Accepted quantity creates inventory; rejected quantity does not.
- A submitted buyer offer holds sample quantity to prevent double-offering. Seller acceptance does not confirm payment.
- Payment confirmation, release authorization, and collection are distinct records and transitions. Collection is blocked until payment and release are both confirmed.
- Every consequential demo transition adds an audit/activity record. These records are not tamper-proof or production-grade.

For crate-based intake, the mock uses an explicitly disclosed matching estimate of 20 kg per crate for most crops and 25 kg for maize/beans. The facility must record actual weight.

## Current mock behavior

| Capability | Demo behavior | Production work still needed |
| --- | --- | --- |
| Harvest intake | Validates crop, quantity, unit, and pickup location; saves a photo filename only | Secure image upload/storage, participant identity, server validation |
| Crop assessment | Uses reported crop, quantity, and urgency note; says no image model was called | Approved image model, calibration, consent, uncertainty and safety evaluation |
| Storage matching | Ranks seeded crop-compatible facilities with enough sample capacity by estimated first-day cost | Authoritative availability, verified price/crop data, distance/routing source |
| Reservation | Rechecks sample capacity and updates shared sample capacity after farmer confirmation | Atomic server-side reservation, locking, idempotency and expiry |
| Transport | Enforces forward-only demo transitions and load/vehicle details | Real transporter eligibility, dispatch, communication and signed proof |
| Check-in | Records facility-entered weight/condition; reconciles reserved/occupied/available capacity | Evidence retention, role authorization, dispute process and server audit |
| Buyer offers | Prevents over-offering the same sample stock; supports submitted/accepted/rejected | Verified buyer/seller identities, offer expiry, transaction concurrency |
| Payment and release | Local records only; payment must be confirmed before separate release authorization | Payment provider integration, reconciliation, fraud controls, authorized release |
| Automation console | Displays deterministic task/workflow records and observable decision evidence | Durable job queue, agent orchestration, retries, monitoring and operator permissions |
| Exceptions | Supports review and resolution notes in shared demo state | Escalation policy, assignment, notifications and audited server-side resolution |

No external AI, payment, SMS, dispatch, or GPS service is called in this demo. All facility, capacity, buyer, route, price, and workflow records are sample data.

## Frontend service boundary

The current named operations in `demo-service.ts` are:

- `createHarvestRequest`
- `confirmReservation`
- `updateTransportStatus`
- `checkInDelivery`
- `getBuyerListings`
- `createPurchaseOffer`
- `respondToPurchaseOffer`
- `confirmPayment`
- `authorizeInventoryRelease`
- `confirmCollection`
- `resolveException`
- `retryWorkflow`

They return `ServiceResult<T>` with either `{ ok: true, data }` or `{ ok: false, error }`. Preserve these workflow distinctions when replacing the mock implementation. The UI should display returned errors and must not show success when `ok` is false.

## Proposed API mapping (not implemented)

Use one configurable frontend base URL, such as `VITE_KILIMO_API_BASE_URL`; do not hard-code development hosts in pages. These paths are suggestions for the backend team to refine:

| Frontend operation | Proposed endpoint |
| --- | --- |
| Create/list/get harvest requests | `POST/GET /v1/harvest-requests`, `GET /v1/harvest-requests/{id}` |
| Request/read crop assessment | `POST /v1/harvest-requests/{id}/assessments`, `GET /v1/harvest-requests/{id}/assessments/latest` |
| Search facility options | `POST /v1/facility-matches` |
| Confirm/cancel reservation | `POST /v1/reservations`, `POST /v1/reservations/{id}/cancel` |
| List/create/advance transport jobs | `GET/POST /v1/transport-jobs`, `POST /v1/transport-jobs/{id}/events` |
| Facility check-in | `POST /v1/transport-jobs/{id}/check-ins` |
| Read inventory and buyer listings | `GET /v1/inventory-batches`, `GET /v1/buyer-listings` |
| Create/respond to offers | `POST /v1/purchase-offers`, `POST /v1/purchase-offers/{id}/responses` |
| Confirm payment | `POST /v1/purchase-offers/{id}/payment-confirmations` |
| Authorize collection/release | `POST /v1/purchase-offers/{id}/release-authorizations`, `POST /v1/purchase-offers/{id}/collections` |
| Operations workflows and exceptions | `GET /v1/workflows`, `GET /v1/automation-tasks`, `GET /v1/exceptions`, `POST /v1/exceptions/{id}/resolutions`, `POST /v1/workflows/{id}/retries` |
| Audit and notifications | `GET /v1/audit-events`, `GET /v1/notifications` |

Use entity-oriented request/response schemas with server-generated IDs, timestamps, actor identity, explicit lifecycle states, pagination, and structured errors. Do not treat these proposed paths as an existing contract.

## Authorization and approval assumptions

The role switcher is a demo convenience, not authentication or authorization. Production identity, role membership, facility tenancy, seller authority, buyer verification, and every permission check must be enforced by the backend.

The backend should require explicit authorization for:

1. A farmer confirming or cancelling a storage reservation.
2. A transporter accepting a job and recording pickup/delivery events.
3. Facility staff recording actual receipt, condition, and quality grade.
4. A seller accepting or rejecting a buyer offer.
5. An authorized finance actor confirming payment.
6. An authorized facility actor releasing inventory and recording collection.
7. An operations actor resolving exceptions or retrying a workflow.

The browser must not be trusted for capacity, price, ownership, payment status, received weight, permissions, workflow completion, or audit history. Enforce capacity and offer quantity atomically on the server, use idempotency keys for consequential writes, and append immutable actor-attributed audit events.

## Adapter replacement order

1. Agree the actual API schemas, authentication model, authorization rules, and error envelope with the backend implementation.
2. Add typed request/response contracts and a single configurable HTTP client with timeouts, auth-header injection, validation errors, and structured domain errors.
3. Implement an HTTP adapter behind the same frontend service boundary; keep the mock adapter available for deterministic demos.
4. Replace demo-only role switching with real authenticated identity and server-derived permissions.
5. Reconcile data from server responses after every mutation and add a freshness path for state other actors can change.
6. Add integration tests for concurrent capacity reservations, over-offering, duplicate requests, payment/release separation, and actor permissions before using the service for real transactions.

## Known assumptions

- All names, phone numbers, facilities, capacities, prices, distances, offers, and operational events in the demo are fictional sample records.
- The seeded geography is illustrative of the Gusii region; no live GPS, routes, or facility availability is claimed.
- No Swahili translations are included yet; the domain labels should remain localizable.
- Image bytes are not uploaded or stored by the current mock service.
