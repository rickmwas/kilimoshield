export type DemoRole =
  | "farmer"
  | "facility"
  | "transporter"
  | "buyer"
  | "ops";

export type Crop =
  | "Avocado"
  | "Banana"
  | "Maize"
  | "Tomato"
  | "Beans"
  | "Potato";

export type QuantityUnit = "kg" | "crate";

export type HarvestStatus =
  | "submitted"
  | "assessed"
  | "awaiting_confirmation"
  | "booking_confirmed"
  | "in_transport"
  | "received"
  | "rejected"
  | "cancelled";

export type TransportStatus =
  | "available"
  | "accepted"
  | "en_route_to_pickup"
  | "arrived_at_pickup"
  | "picked_up"
  | "in_transit"
  | "delivered"
  | "facility_received"
  | "cancelled";

export type OfferStatus =
  | "submitted"
  | "accepted"
  | "rejected"
  | "withdrawn"
  | "expired"
  | "completed";

export type PaymentStatus =
  | "not_started"
  | "pending"
  | "confirmed"
  | "failed"
  | "refunded";

export type ReleaseStatus = "not_requested" | "pending" | "authorized" | "collected";

export type WorkflowStatus =
  | "completed"
  | "running"
  | "waiting_approval"
  | "needs_intervention"
  | "failed"
  | "cancelled";

export type AutomationTaskStatus =
  | "completed"
  | "running"
  | "waiting"
  | "needs_intervention"
  | "failed"
  | "cancelled";

export type ExceptionStatus = "open" | "investigating" | "resolved";
export type ExceptionSeverity = "urgent" | "high" | "normal";

export interface Farmer {
  id: string;
  name: string;
  phone: string;
  county: "Kisii" | "Nyamira";
  location: string;
}

export interface Facility {
  id: string;
  name: string;
  county: "Kisii" | "Nyamira";
  town: string;
  storageType: string;
  supportedCrops: Crop[];
  capacityKg: number;
  availableKg: number;
  reservedKg: number;
  occupiedKg: number;
  priceKshPerKgPerDay: number;
  distanceKmFromKisii: number;
  verificationStatus: "demo-listed" | "verification-pending";
  reliabilityEvidence: string;
}

export interface StorageArea {
  id: string;
  facilityId: string;
  name: string;
  storageType: string;
  supportedCrops: Crop[];
  capacityKg: number;
  availableKg: number;
  reservedKg: number;
  occupiedKg: number;
}

export interface CapacitySnapshot {
  facilityId: string;
  availableKg: number;
  reservedKg: number;
  occupiedKg: number;
  capacityKg: number;
  capturedAt: string;
  isSimulated: boolean;
}

export interface Transporter {
  id: string;
  name: string;
  phone: string;
  vehicleType: string;
  loadCapacityKg: number;
  serviceAreas: string[];
  verificationStatus: "demo-listed" | "verification-pending";
}

export interface Buyer {
  id: string;
  name: string;
  buyerType: "Cooperative" | "Retailer" | "Processor";
  location: string;
  verificationStatus: "demo-listed" | "verification-pending";
  preferredCrops: Crop[];
}

export interface CropAssessment {
  id: string;
  crop: Crop;
  reportedQuantity: number;
  unit: QuantityUnit;
  estimatedKgForMatching: number;
  urgency: "standard" | "urgent";
  visibleObservations: string;
  limitations: string;
  assessedAt: string;
  isSimulated: true;
}

export interface FacilityRecommendation {
  facilityId: string;
  estimatedDistanceKm: number;
  estimatedStorageCostPerDayKsh: number;
  estimatedTransportCostKsh: number;
  estimatedFirstDayTotalKsh: number;
  reason: string;
  isEstimate: true;
}

export interface HarvestRequest {
  id: string;
  reference: string;
  farmerId: string;
  crop: Crop;
  quantity: number;
  unit: QuantityUnit;
  estimatedKgForMatching: number;
  unitConversionNote?: string;
  location: string;
  note: string;
  photoName?: string;
  status: HarvestStatus;
  assessment: CropAssessment;
  recommendations: FacilityRecommendation[];
  selectedFacilityId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StorageReservation {
  id: string;
  harvestId: string;
  facilityId: string;
  reservedKg: number;
  status: "confirmed" | "checked_in" | "cancelled" | "expired";
  confirmedAt: string;
}

export interface TransportEvent {
  id: string;
  status: TransportStatus;
  label: string;
  occurredAt: string;
  isSimulated: true;
}

export interface TransportJob {
  id: string;
  reference: string;
  harvestId: string;
  facilityId: string;
  transporterId?: string;
  status: TransportStatus;
  pickupArea: string;
  distanceKm: number;
  vehicleRequirement: string;
  loadKg: number;
  feeKsh: number;
  etaLabel: string;
  events: TransportEvent[];
}

export interface DeliveryEvent {
  id: string;
  harvestId: string;
  jobId: string;
  facilityId: string;
  reportedKg: number;
  receivedKg: number;
  condition: "Good" | "Fair" | "Needs attention";
  decision: "accepted" | "partial" | "rejected";
  qualityGrade?: string;
  discrepancyKg: number;
  verifiedAt: string;
  verificationSource: "facility check-in";
}

export interface InventoryBatch {
  id: string;
  reference: string;
  harvestId: string;
  farmerId: string;
  facilityId: string;
  crop: Crop;
  receivedKg: number;
  availableKg: number;
  reservedForOffersKg: number;
  receivedAt: string;
  condition: "Good" | "Fair" | "Needs attention";
  qualityGrade?: string;
  inventoryStatus: "available" | "partially_offered" | "fully_offered" | "released";
}

export interface BuyerListing {
  batch: InventoryBatch;
  facility: Facility;
  seller: Farmer;
  availableToOfferKg: number;
}

export interface PurchaseOffer {
  id: string;
  reference: string;
  batchId: string;
  buyerId: string;
  quantityKg: number;
  priceKshPerKg: number;
  status: OfferStatus;
  paymentStatus: PaymentStatus;
  releaseStatus: ReleaseStatus;
  submittedAt: string;
  updatedAt: string;
}

export interface PaymentRecord {
  id: string;
  offerId: string;
  amountKsh: number;
  status: PaymentStatus;
  provider: "demo record only";
  updatedAt: string;
}

export interface ReleaseAuthorization {
  id: string;
  offerId: string;
  status: "pending" | "authorized" | "collected";
  authorizedBy?: string;
  updatedAt: string;
}

export interface WorkflowStep {
  id: string;
  label: string;
  status: "completed" | "running" | "waiting" | "needs_intervention" | "failed";
  occurredAt?: string;
  evidence?: string;
}

export interface WorkflowRun {
  id: string;
  reference: string;
  entityType: "harvest" | "transport" | "inventory" | "offer";
  entityId: string;
  title: string;
  status: WorkflowStatus;
  currentStep: string;
  startedAt: string;
  requiresHumanApproval: boolean;
  steps: WorkflowStep[];
}

export interface AutomationTask {
  id: string;
  workflowId: string;
  capability:
    | "Harvest Intake"
    | "Crop Assessment"
    | "Storage Matching"
    | "Capacity Reservation"
    | "Transport Dispatch"
    | "Delivery Monitoring"
    | "Inventory Reconciliation"
    | "Buyer Matching"
    | "Notification Coordinator"
    | "Exception Management";
  trigger: string;
  status: AutomationTaskStatus;
  currentStep: string;
  inputSummary: string;
  outputSummary: string;
  recordsConsulted: string[];
  decisionExplanation: string;
  requiresHumanApproval: boolean;
  attempts: number;
  lastError?: string;
  updatedAt: string;
}

export interface ExceptionRecord {
  id: string;
  reference: string;
  type:
    | "no_capacity"
    | "quantity_discrepancy"
    | "transporter_delay"
    | "payment_pending"
    | "release_authorization";
  severity: ExceptionSeverity;
  title: string;
  description: string;
  impact: string;
  ownerRole: DemoRole;
  relatedEntityType: "harvest" | "transport" | "inventory" | "offer";
  relatedEntityId: string;
  suggestedAction: string;
  status: ExceptionStatus;
  resolution?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditEvent {
  id: string;
  actor: string;
  action: string;
  entityType: string;
  entityId: string;
  occurredAt: string;
  detail: string;
}

export interface Notification {
  id: string;
  role: DemoRole;
  title: string;
  message: string;
  relatedEntityId?: string;
  createdAt: string;
  read: boolean;
}

export interface ActivityItem {
  id: string;
  label: string;
  detail: string;
  occurredAt: string;
  entityType: string;
  entityId: string;
}

export interface DemoState {
  schemaVersion: 1;
  activeRole: DemoRole;
  farmers: Farmer[];
  facilities: Facility[];
  transporters: Transporter[];
  buyers: Buyer[];
  harvestRequests: HarvestRequest[];
  reservations: StorageReservation[];
  transportJobs: TransportJob[];
  deliveryEvents: DeliveryEvent[];
  inventoryBatches: InventoryBatch[];
  purchaseOffers: PurchaseOffer[];
  paymentRecords: PaymentRecord[];
  releaseAuthorizations: ReleaseAuthorization[];
  workflowRuns: WorkflowRun[];
  automationTasks: AutomationTask[];
  exceptions: ExceptionRecord[];
  auditEvents: AuditEvent[];
  notifications: Notification[];
  activities: ActivityItem[];
  persistenceNotice?: string;
}

export interface CreateHarvestInput {
  crop: Crop;
  quantity: number;
  unit: QuantityUnit;
  location: string;
  note?: string;
  photoName?: string;
  farmerId?: string;
}

export interface CheckInInput {
  receivedKg: number;
  condition: "Good" | "Fair" | "Needs attention";
  decision?: "accepted" | "partial" | "rejected";
  qualityGrade?: string;
}

export type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export interface ApiError {
  status: number;
  code: string;
  message: string;
  details?: unknown;
  requestId?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  hasNextPage: boolean;
}

export type ServiceCall<T> = ServiceResult<T> | Promise<ServiceResult<T>>;

export interface KilimoService {
  getState(): DemoState;
  subscribe(listener: () => void): () => void;
  switchRole(role: DemoRole): ServiceCall<DemoRole>;
  reset(): ServiceCall<DemoState>;
  createHarvestRequest(input: CreateHarvestInput): ServiceCall<HarvestRequest>;
  confirmReservation(
    harvestId: string,
    facilityId: string,
  ): ServiceCall<StorageReservation>;
  updateTransportStatus(
    jobId: string,
    nextStatus: TransportStatus,
  ): ServiceCall<TransportJob>;
  getNextTransportStatus(status: TransportStatus): TransportStatus | null;
  checkInDelivery(
    jobId: string,
    input: CheckInInput,
  ): ServiceCall<DeliveryEvent>;
  getBuyerListings(state?: DemoState): BuyerListing[];
  createPurchaseOffer(input: {
    batchId: string;
    buyerId: string;
    quantityKg: number;
    priceKshPerKg: number;
  }): ServiceCall<PurchaseOffer>;
  respondToPurchaseOffer(
    offerId: string,
    decision: "accepted" | "rejected",
  ): ServiceCall<PurchaseOffer>;
  confirmPayment(offerId: string): ServiceCall<PaymentRecord>;
  authorizeInventoryRelease(
    offerId: string,
  ): ServiceCall<ReleaseAuthorization>;
  confirmCollection(offerId: string): ServiceCall<PurchaseOffer>;
  resolveException(
    exceptionId: string,
    resolution: string,
  ): ServiceCall<ExceptionRecord>;
  retryWorkflow(workflowId: string): ServiceCall<WorkflowRun>;
}
