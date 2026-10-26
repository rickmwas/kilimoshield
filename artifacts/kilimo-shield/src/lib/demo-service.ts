import { useSyncExternalStore } from "react";
import type {
  ActivityItem,
  AuditEvent,
  AutomationTask,
  Buyer,
  BuyerListing,
  CheckInInput,
  Crop,
  CropAssessment,
  DeliveryEvent,
  DemoRole,
  DemoState,
  ExceptionRecord,
  Facility,
  FacilityRecommendation,
  Farmer,
  HarvestRequest,
  InventoryBatch,
  KilimoService,
  Notification,
  PaymentRecord,
  PurchaseOffer,
  ReleaseAuthorization,
  ServiceResult,
  StorageReservation,
  TransportEvent,
  TransportJob,
  TransportStatus,
  WorkflowStatus,
  WorkflowRun,
  WorkflowStep,
} from "./domain";
import type { CreateHarvestInput } from "./domain";

const STORAGE_KEY = "kilimoshield-demo-v1";
const DEMO_TIME = "2026-10-26T08:30:00+03:00";

const SEED_FARMERS: Farmer[] = [
  {
    id: "farmer-mary",
    name: "Mary Nyaboke",
    phone: "+254 712 340 581",
    county: "Kisii",
    location: "Suneka, Kisii County",
  },
  {
    id: "farmer-peter",
    name: "Peter Onchiri",
    phone: "+254 723 410 662",
    county: "Nyamira",
    location: "Nyamira Town, Nyamira County",
  },
  {
    id: "farmer-grace",
    name: "Grace Moraa",
    phone: "+254 701 552 843",
    county: "Kisii",
    location: "Keumbu, Kisii County",
  },
];

const SEED_FACILITIES: Facility[] = [
  {
    id: "facility-kisii-hub",
    name: "Kisii Fresh Hub",
    county: "Kisii",
    town: "Kisii",
    storageType: "Chilled produce room",
    supportedCrops: ["Avocado", "Banana", "Tomato"],
    capacityKg: 1500,
    availableKg: 620,
    reservedKg: 360,
    occupiedKg: 520,
    priceKshPerKgPerDay: 2.4,
    distanceKmFromKisii: 8.5,
    verificationStatus: "demo-listed",
    reliabilityEvidence: "Sample profile with seeded operating hours and crop compatibility.",
  },
  {
    id: "facility-nyamira-store",
    name: "Nyamira Cold Store",
    county: "Nyamira",
    town: "Nyamira Town",
    storageType: "Cold room",
    supportedCrops: ["Avocado", "Banana", "Maize"],
    capacityKg: 1100,
    availableKg: 368,
    reservedKg: 0,
    occupiedKg: 732,
    priceKshPerKgPerDay: 2.1,
    distanceKmFromKisii: 18,
    verificationStatus: "demo-listed",
    reliabilityEvidence: "Sample profile with seeded operating hours and crop compatibility.",
  },
  {
    id: "facility-suneka-centre",
    name: "Suneka Produce Centre",
    county: "Kisii",
    town: "Suneka",
    storageType: "Ventilated produce store",
    supportedCrops: ["Banana", "Tomato", "Beans"],
    capacityKg: 850,
    availableKg: 180,
    reservedKg: 100,
    occupiedKg: 570,
    priceKshPerKgPerDay: 2,
    distanceKmFromKisii: 12,
    verificationStatus: "verification-pending",
    reliabilityEvidence: "Sample listing; operator verification is pending in this demo.",
  },
  {
    id: "facility-kiogoro-shed",
    name: "Kiogoro Aggregation Shed",
    county: "Kisii",
    town: "Kiogoro",
    storageType: "Shaded aggregation area",
    supportedCrops: ["Avocado", "Tomato", "Potato"],
    capacityKg: 700,
    availableKg: 100,
    reservedKg: 0,
    occupiedKg: 600,
    priceKshPerKgPerDay: 1.8,
    distanceKmFromKisii: 16,
    verificationStatus: "demo-listed",
    reliabilityEvidence: "Sample profile; capacity and service details are simulated.",
  },
];

const SEED_TRANSPORTERS = [
  {
    id: "transporter-jane",
    name: "Jane's Produce Runs",
    phone: "+254 710 624 031",
    vehicleType: "Pickup truck",
    loadCapacityKg: 700,
    serviceAreas: ["Kisii", "Suneka", "Nyamira"],
    verificationStatus: "demo-listed" as const,
  },
  {
    id: "transporter-bosco",
    name: "Bosco Regional Logistics",
    phone: "+254 734 210 908",
    vehicleType: "5-ton truck",
    loadCapacityKg: 5000,
    serviceAreas: ["Kisii", "Nyamira", "Keroka"],
    verificationStatus: "demo-listed" as const,
  },
  {
    id: "transporter-kevin",
    name: "Kevin's Local Collection",
    phone: "+254 799 405 276",
    vehicleType: "Motorcycle",
    loadCapacityKg: 80,
    serviceAreas: ["Kisii", "Suneka"],
    verificationStatus: "verification-pending" as const,
  },
];

const SEED_BUYERS: Buyer[] = [
  {
    id: "buyer-gusii-coop",
    name: "Gusii Growers Cooperative",
    buyerType: "Cooperative",
    location: "Kisii",
    verificationStatus: "demo-listed",
    preferredCrops: ["Avocado", "Banana", "Beans"],
  },
  {
    id: "buyer-highland-produce",
    name: "Highland Produce Market",
    buyerType: "Retailer",
    location: "Nyamira",
    verificationStatus: "demo-listed",
    preferredCrops: ["Avocado", "Tomato", "Potato"],
  },
  {
    id: "buyer-lakeview-processors",
    name: "Lakeview Food Processors",
    buyerType: "Processor",
    location: "Kisii",
    verificationStatus: "verification-pending",
    preferredCrops: ["Tomato", "Banana", "Maize"],
  },
];

const seedAssessment = (
  id: string,
  crop: Crop,
  reportedQuantity: number,
  urgency: "standard" | "urgent" = "standard",
): CropAssessment => ({
  id,
  crop,
  reportedQuantity,
  unit: "kg",
  estimatedKgForMatching: reportedQuantity,
  urgency,
  visibleObservations:
    "Demo record: crop and condition were entered by the farmer; no image model assessed this sample.",
  limitations:
    "A photo cannot verify internal quality or exact shelf life. A facility must verify received weight and condition.",
  assessedAt: DEMO_TIME,
  isSimulated: true,
});

const seedStep = (
  id: string,
  label: string,
  status: WorkflowStep["status"],
  evidence?: string,
): WorkflowStep => ({
  id,
  label,
  status,
  occurredAt: status === "waiting" ? undefined : DEMO_TIME,
  evidence,
});

const seedState: DemoState = {
  schemaVersion: 1,
  activeRole: "ops",
  farmers: SEED_FARMERS,
  facilities: SEED_FACILITIES,
  transporters: SEED_TRANSPORTERS,
  buyers: SEED_BUYERS,
  harvestRequests: [
    {
      id: "harvest-hs-104",
      reference: "KH-104",
      farmerId: "farmer-mary",
      crop: "Avocado",
      quantity: 280,
      unit: "kg",
      estimatedKgForMatching: 280,
      location: "Suneka, Kisii County",
      note: "Ready for collection this week.",
      status: "awaiting_confirmation",
      assessment: seedAssessment("assessment-104", "Avocado", 280),
      recommendations: [
        {
          facilityId: "facility-kisii-hub",
          estimatedDistanceKm: 8.5,
          estimatedStorageCostPerDayKsh: 672,
          estimatedTransportCostKsh: 790,
          estimatedFirstDayTotalKsh: 1462,
          reason:
            "Crop-compatible and currently has enough sample capacity; lowest combined first-day estimate in this sample search.",
          isEstimate: true,
        },
        {
          facilityId: "facility-nyamira-store",
          estimatedDistanceKm: 18,
          estimatedStorageCostPerDayKsh: 588,
          estimatedTransportCostKsh: 1170,
          estimatedFirstDayTotalKsh: 1758,
          reason:
            "Crop-compatible alternative with enough sample capacity; estimated travel cost is higher.",
          isEstimate: true,
        },
      ],
      createdAt: "2026-10-26T07:45:00+03:00",
      updatedAt: DEMO_TIME,
    },
    {
      id: "harvest-hs-103",
      reference: "KH-103",
      farmerId: "farmer-peter",
      crop: "Tomato",
      quantity: 360,
      unit: "kg",
      estimatedKgForMatching: 360,
      location: "Nyamira Town, Nyamira County",
      note: "Collection window is open.",
      status: "booking_confirmed",
      assessment: seedAssessment("assessment-103", "Tomato", 360),
      recommendations: [
        {
          facilityId: "facility-kisii-hub",
          estimatedDistanceKm: 8.5,
          estimatedStorageCostPerDayKsh: 864,
          estimatedTransportCostKsh: 790,
          estimatedFirstDayTotalKsh: 1654,
          reason: "Crop-compatible option with sample capacity for the reported quantity.",
          isEstimate: true,
        },
      ],
      selectedFacilityId: "facility-kisii-hub",
      createdAt: "2026-10-25T16:15:00+03:00",
      updatedAt: "2026-10-26T07:20:00+03:00",
    },
    {
      id: "harvest-hs-102",
      reference: "KH-102",
      farmerId: "farmer-grace",
      crop: "Avocado",
      quantity: 240,
      unit: "kg",
      estimatedKgForMatching: 240,
      location: "Keumbu, Kisii County",
      note: "Sample delivery checked in with a quantity difference.",
      status: "received",
      assessment: seedAssessment("assessment-102", "Avocado", 240),
      recommendations: [
        {
          facilityId: "facility-nyamira-store",
          estimatedDistanceKm: 18,
          estimatedStorageCostPerDayKsh: 504,
          estimatedTransportCostKsh: 1170,
          estimatedFirstDayTotalKsh: 1674,
          reason: "Crop-compatible sample option selected for this completed booking.",
          isEstimate: true,
        },
      ],
      selectedFacilityId: "facility-nyamira-store",
      createdAt: "2026-10-24T11:00:00+03:00",
      updatedAt: "2026-10-25T15:40:00+03:00",
    },
    {
      id: "harvest-hs-105",
      reference: "KH-105",
      farmerId: "farmer-mary",
      crop: "Tomato",
      quantity: 900,
      unit: "kg",
      estimatedKgForMatching: 900,
      location: "Suneka, Kisii County",
      note: "Needs help finding enough suitable space.",
      status: "submitted",
      assessment: seedAssessment("assessment-105", "Tomato", 900, "urgent"),
      recommendations: [],
      createdAt: "2026-10-26T06:55:00+03:00",
      updatedAt: DEMO_TIME,
    },
  ],
  reservations: [
    {
      id: "reservation-103",
      harvestId: "harvest-hs-103",
      facilityId: "facility-kisii-hub",
      reservedKg: 360,
      status: "confirmed",
      confirmedAt: "2026-10-26T07:20:00+03:00",
    },
  ],
  transportJobs: [
    {
      id: "transport-job-201",
      reference: "TR-201",
      harvestId: "harvest-hs-103",
      facilityId: "facility-kisii-hub",
      status: "available",
      pickupArea: "Nyamira Town, Nyamira County",
      distanceKm: 29,
      vehicleRequirement: "Pickup truck or larger",
      loadKg: 360,
      feeKsh: 1850,
      etaLabel: "Sample window: today, 10:00–13:00 EAT",
      events: [
        {
          id: "transport-event-201-1",
          status: "available",
          label: "Delivery request created",
          occurredAt: "2026-10-26T07:20:00+03:00",
          isSimulated: true,
        },
      ],
    },
    {
      id: "transport-job-202",
      reference: "TR-202",
      harvestId: "harvest-hs-102",
      facilityId: "facility-nyamira-store",
      transporterId: "transporter-bosco",
      status: "facility_received",
      pickupArea: "Keumbu, Kisii County",
      distanceKm: 19,
      vehicleRequirement: "Pickup truck or larger",
      loadKg: 240,
      feeKsh: 1420,
      etaLabel: "Sample delivery completed",
      events: [
        {
          id: "transport-event-202-1",
          status: "accepted",
          label: "Transporter accepted",
          occurredAt: "2026-10-25T09:05:00+03:00",
          isSimulated: true,
        },
        {
          id: "transport-event-202-2",
          status: "picked_up",
          label: "Produce collected",
          occurredAt: "2026-10-25T10:10:00+03:00",
          isSimulated: true,
        },
        {
          id: "transport-event-202-3",
          status: "facility_received",
          label: "Facility check-in completed",
          occurredAt: "2026-10-25T15:40:00+03:00",
          isSimulated: true,
        },
      ],
    },
  ],
  deliveryEvents: [
    {
      id: "delivery-event-102",
      harvestId: "harvest-hs-102",
      jobId: "transport-job-202",
      facilityId: "facility-nyamira-store",
      reportedKg: 240,
      receivedKg: 222,
      condition: "Fair",
      decision: "partial",
      qualityGrade: "B — sample entry",
      discrepancyKg: 18,
      verifiedAt: "2026-10-25T15:40:00+03:00",
      verificationSource: "facility check-in",
    },
  ],
  inventoryBatches: [
    {
      id: "inventory-batch-301",
      reference: "KB-301",
      harvestId: "harvest-hs-102",
      farmerId: "farmer-grace",
      facilityId: "facility-nyamira-store",
      crop: "Avocado",
      receivedKg: 222,
      availableKg: 222,
      reservedForOffersKg: 120,
      receivedAt: "2026-10-25T15:40:00+03:00",
      condition: "Fair",
      qualityGrade: "B — sample entry",
      inventoryStatus: "partially_offered",
    },
    {
      id: "inventory-batch-302",
      reference: "KB-302",
      harvestId: "harvest-hs-101",
      farmerId: "farmer-peter",
      facilityId: "facility-kisii-hub",
      crop: "Banana",
      receivedKg: 340,
      availableKg: 340,
      reservedForOffersKg: 180,
      receivedAt: "2026-10-24T13:10:00+03:00",
      condition: "Good",
      qualityGrade: "A — sample entry",
      inventoryStatus: "partially_offered",
    },
  ],
  purchaseOffers: [
    {
      id: "offer-401",
      reference: "OF-401",
      batchId: "inventory-batch-301",
      buyerId: "buyer-gusii-coop",
      quantityKg: 120,
      priceKshPerKg: 78,
      status: "accepted",
      paymentStatus: "pending",
      releaseStatus: "pending",
      submittedAt: "2026-10-26T07:00:00+03:00",
      updatedAt: DEMO_TIME,
    },
    {
      id: "offer-402",
      reference: "OF-402",
      batchId: "inventory-batch-302",
      buyerId: "buyer-highland-produce",
      quantityKg: 180,
      priceKshPerKg: 64,
      status: "submitted",
      paymentStatus: "not_started",
      releaseStatus: "not_requested",
      submittedAt: "2026-10-26T07:35:00+03:00",
      updatedAt: DEMO_TIME,
    },
  ],
  paymentRecords: [
    {
      id: "payment-401",
      offerId: "offer-401",
      amountKsh: 9360,
      status: "pending",
      provider: "demo record only",
      updatedAt: DEMO_TIME,
    },
  ],
  releaseAuthorizations: [
    {
      id: "release-401",
      offerId: "offer-401",
      status: "pending",
      updatedAt: DEMO_TIME,
    },
  ],
  workflowRuns: [
    {
      id: "workflow-harvest-104",
      reference: "WF-104",
      entityType: "harvest",
      entityId: "harvest-hs-104",
      title: "Harvest matching · KH-104",
      status: "waiting_approval",
      currentStep: "Waiting for farmer to confirm a facility",
      startedAt: "2026-10-26T07:45:00+03:00",
      requiresHumanApproval: true,
      steps: [
        seedStep("wf104-1", "Harvest request received", "completed", "KH-104 · 280 kg avocado"),
        seedStep("wf104-2", "Demo assessment recorded", "completed", "Reported crop and quantity retained as unverified input."),
        seedStep("wf104-3", "Eligible storage compared", "completed", "2 compatible sample facilities have enough listed capacity."),
        seedStep("wf104-4", "Farmer confirmation", "waiting", "No reservation has been made."),
      ],
    },
    {
      id: "workflow-transport-201",
      reference: "WF-201",
      entityType: "transport",
      entityId: "transport-job-201",
      title: "Transport dispatch · TR-201",
      status: "running",
      currentStep: "Waiting for a suitable transporter to accept",
      startedAt: "2026-10-26T07:20:00+03:00",
      requiresHumanApproval: true,
      steps: [
        seedStep("wf201-1", "Delivery request created", "completed", "360 kg; pickup truck or larger."),
        seedStep("wf201-2", "Transporter response", "waiting", "No transporter acceptance is recorded."),
      ],
    },
    {
      id: "workflow-delivery-202",
      reference: "WF-202",
      entityType: "inventory",
      entityId: "inventory-batch-301",
      title: "Delivery reconciliation · KH-102",
      status: "needs_intervention",
      currentStep: "Quantity discrepancy needs review",
      startedAt: "2026-10-25T09:05:00+03:00",
      requiresHumanApproval: true,
      steps: [
        seedStep("wf202-1", "Transporter delivered", "completed", "Simulated delivery event recorded."),
        seedStep("wf202-2", "Facility check-in", "completed", "Facility recorded 222 kg against 240 kg reported."),
        seedStep("wf202-3", "Discrepancy review", "needs_intervention", "18 kg difference; facility verification is the source of received weight."),
      ],
    },
    {
      id: "workflow-offer-401",
      reference: "WF-401",
      entityType: "offer",
      entityId: "offer-401",
      title: "Offer settlement · OF-401",
      status: "waiting_approval",
      currentStep: "Payment confirmation is pending",
      startedAt: "2026-10-26T07:00:00+03:00",
      requiresHumanApproval: true,
      steps: [
        seedStep("wf401-1", "Buyer offer accepted", "completed", "120 kg at KSh 78/kg."),
        seedStep("wf401-2", "Payment verification", "waiting", "An accepted offer is not a confirmed payment."),
        seedStep("wf401-3", "Collection release", "waiting", "Physical release requires separate authorization."),
      ],
    },
  ],
  automationTasks: [
    {
      id: "task-intake-104",
      workflowId: "workflow-harvest-104",
      capability: "Harvest Intake",
      trigger: "Farmer submitted KH-104",
      status: "completed",
      currentStep: "Request normalized",
      inputSummary: "280 kg avocado · Suneka, Kisii",
      outputSummary: "Request saved with farmer-reported details.",
      recordsConsulted: ["KH-104", "farmer-mary"],
      decisionExplanation: "Input values were retained as reported; no external AI service was called.",
      requiresHumanApproval: false,
      attempts: 1,
      updatedAt: DEMO_TIME,
    },
    {
      id: "task-match-104",
      workflowId: "workflow-harvest-104",
      capability: "Storage Matching",
      trigger: "Harvest intake completed",
      status: "waiting",
      currentStep: "Recommendation awaiting confirmation",
      inputSummary: "280 kg avocado",
      outputSummary: "2 eligible sample facilities compared.",
      recordsConsulted: ["KH-104", "facility-kisii-hub", "facility-nyamira-store"],
      decisionExplanation:
        "The first option has enough listed crop-compatible capacity and the lower combined estimated first-day cost. All capacity and price values are sample data.",
      requiresHumanApproval: true,
      attempts: 1,
      updatedAt: DEMO_TIME,
    },
    {
      id: "task-dispatch-201",
      workflowId: "workflow-transport-201",
      capability: "Transport Dispatch",
      trigger: "Reservation confirmed for KH-103",
      status: "waiting",
      currentStep: "Waiting for transporter acceptance",
      inputSummary: "360 kg tomato · pickup truck or larger",
      outputSummary: "TR-201 is visible as an available sample job.",
      recordsConsulted: ["KH-103", "TR-201", "facility-kisii-hub"],
      decisionExplanation:
        "A delivery request was created; the platform has not assigned or dispatched a real vehicle.",
      requiresHumanApproval: true,
      attempts: 1,
      updatedAt: DEMO_TIME,
    },
    {
      id: "task-reconcile-202",
      workflowId: "workflow-delivery-202",
      capability: "Inventory Reconciliation",
      trigger: "Facility checked in KH-102",
      status: "needs_intervention",
      currentStep: "Quantity difference requires review",
      inputSummary: "240 kg reported",
      outputSummary: "222 kg recorded by facility check-in.",
      recordsConsulted: ["KH-102", "TR-202", "KB-301"],
      decisionExplanation:
        "The 18 kg discrepancy is based on the facility's recorded receipt, not the photo assessment.",
      requiresHumanApproval: true,
      attempts: 1,
      updatedAt: DEMO_TIME,
    },
    {
      id: "task-settlement-401",
      workflowId: "workflow-offer-401",
      capability: "Notification Coordinator",
      trigger: "Seller accepted offer OF-401",
      status: "waiting",
      currentStep: "Awaiting payment confirmation",
      inputSummary: "120 kg · KSh 9,360 total offer value",
      outputSummary: "Payment state is pending; release is not authorized.",
      recordsConsulted: ["OF-401", "payment-401", "release-401"],
      decisionExplanation:
        "Payment confirmation and physical collection authorization are separate records and actions.",
      requiresHumanApproval: true,
      attempts: 1,
      updatedAt: DEMO_TIME,
    },
  ],
  exceptions: [
    {
      id: "exception-no-capacity-105",
      reference: "EX-105",
      type: "no_capacity",
      severity: "urgent",
      title: "No single facility can fit 900 kg",
      description:
        "No crop-compatible sample facility currently lists enough available space for KH-105.",
      impact: "The request cannot be booked until capacity or the requested quantity changes.",
      ownerRole: "ops",
      relatedEntityType: "harvest",
      relatedEntityId: "harvest-hs-105",
      suggestedAction: "Review split-storage options or ask the farmer to revise the request.",
      status: "open",
      createdAt: "2026-10-26T06:55:00+03:00",
      updatedAt: DEMO_TIME,
    },
    {
      id: "exception-discrepancy-102",
      reference: "EX-102",
      type: "quantity_discrepancy",
      severity: "high",
      title: "18 kg difference at facility check-in",
      description:
        "KH-102 was reported at 240 kg; the facility recorded 222 kg received.",
      impact: "The inventory batch and any buyer terms must use the verified received quantity.",
      ownerRole: "facility",
      relatedEntityType: "inventory",
      relatedEntityId: "inventory-batch-301",
      suggestedAction: "Review the check-in record with the farmer before changing inventory.",
      status: "open",
      createdAt: "2026-10-25T15:40:00+03:00",
      updatedAt: DEMO_TIME,
    },
    {
      id: "exception-payment-401",
      reference: "EX-401",
      type: "payment_pending",
      severity: "normal",
      title: "Accepted offer has no confirmed payment",
      description: "OF-401 was accepted, but its sample payment record remains pending.",
      impact: "Do not release the inventory until payment is independently confirmed.",
      ownerRole: "ops",
      relatedEntityType: "offer",
      relatedEntityId: "offer-401",
      suggestedAction: "Record a demo payment confirmation only when reviewing that workflow step.",
      status: "open",
      createdAt: "2026-10-26T07:00:00+03:00",
      updatedAt: DEMO_TIME,
    },
  ],
  auditEvents: [
    {
      id: "audit-104",
      actor: "System demo",
      action: "Matched facilities",
      entityType: "harvest",
      entityId: "harvest-hs-104",
      occurredAt: DEMO_TIME,
      detail: "Compared two crop-compatible sample options; no capacity was reserved.",
    },
    {
      id: "audit-103",
      actor: "Farmer demo",
      action: "Confirmed storage reservation",
      entityType: "harvest",
      entityId: "harvest-hs-103",
      occurredAt: "2026-10-26T07:20:00+03:00",
      detail: "360 kg sample reservation; transport response is still pending.",
    },
    {
      id: "audit-102",
      actor: "Facility demo",
      action: "Checked in delivery",
      entityType: "harvest",
      entityId: "harvest-hs-102",
      occurredAt: "2026-10-25T15:40:00+03:00",
      detail: "Recorded 222 kg received against 240 kg reported.",
    },
  ],
  notifications: [
    {
      id: "notice-farmer-104",
      role: "farmer",
      title: "A storage option is ready to review",
      message: "KH-104 has two sample facility options. No reservation has been made.",
      relatedEntityId: "harvest-hs-104",
      createdAt: DEMO_TIME,
      read: false,
    },
    {
      id: "notice-transporter-201",
      role: "transporter",
      title: "A suitable sample job is available",
      message: "TR-201 requires a pickup truck or larger for 360 kg.",
      relatedEntityId: "transport-job-201",
      createdAt: DEMO_TIME,
      read: false,
    },
    {
      id: "notice-facility-102",
      role: "facility",
      title: "Review a delivery discrepancy",
      message: "KH-102 has an 18 kg difference between reported and received quantity.",
      relatedEntityId: "harvest-hs-102",
      createdAt: DEMO_TIME,
      read: false,
    },
  ],
  activities: [
    {
      id: "activity-104",
      label: "Storage options compared",
      detail: "KH-104 · two compatible sample facilities",
      occurredAt: DEMO_TIME,
      entityType: "harvest",
      entityId: "harvest-hs-104",
    },
    {
      id: "activity-103",
      label: "Transport request created",
      detail: "TR-201 · waiting for transporter acceptance",
      occurredAt: "2026-10-26T07:20:00+03:00",
      entityType: "transport",
      entityId: "transport-job-201",
    },
    {
      id: "activity-102",
      label: "Facility check-in recorded",
      detail: "KH-102 · 222 kg received",
      occurredAt: "2026-10-25T15:40:00+03:00",
      entityType: "inventory",
      entityId: "inventory-batch-301",
    },
  ],
};

const cloneSeed = (): DemoState =>
  JSON.parse(JSON.stringify(seedState)) as DemoState;

function isDemoState(value: unknown): value is DemoState {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<DemoState>;
  return (
    candidate.schemaVersion === 1 &&
    Array.isArray(candidate.farmers) &&
    Array.isArray(candidate.facilities) &&
    Array.isArray(candidate.harvestRequests) &&
    Array.isArray(candidate.transportJobs) &&
    Array.isArray(candidate.inventoryBatches) &&
    Array.isArray(candidate.purchaseOffers) &&
    Array.isArray(candidate.workflowRuns) &&
    Array.isArray(candidate.exceptions)
  );
}

function loadState(): DemoState {
  if (typeof window === "undefined") return cloneSeed();
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return cloneSeed();
    const parsed: unknown = JSON.parse(saved);
    if (isDemoState(parsed)) return parsed;
    return {
      ...cloneSeed(),
      persistenceNotice:
        "Saved demo data was not recognized. The sample records are shown; reset the demo to start cleanly.",
    };
  } catch {
    return {
      ...cloneSeed(),
      persistenceNotice:
        "Saved demo data could not be read. The sample records are shown; reset the demo to start cleanly.",
    };
  }
}

let currentState = loadState();
const listeners = new Set<() => void>();

export function getDemoState(): DemoState {
  return currentState;
}

export function subscribeDemoState(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useDemoState(): DemoState {
  return useSyncExternalStore(subscribeDemoState, getDemoState, getDemoState);
}

function commit(nextState: DemoState): boolean {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
    }
  } catch {
    return false;
  }
  currentState = nextState;
  listeners.forEach((listener) => listener());
  return true;
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key !== STORAGE_KEY || !event.newValue) return;
    try {
      const parsed: unknown = JSON.parse(event.newValue);
      if (isDemoState(parsed)) {
        currentState = parsed;
        listeners.forEach((listener) => listener());
      }
    } catch {
      // Keep the current in-memory state if another tab writes invalid data.
    }
  });
}

const makeId = (prefix: string): string => {
  const uuid =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}-${uuid}`;
};

const now = (): string => new Date().toISOString();
const ok = <T,>(data: T): ServiceResult<T> => ({ ok: true, data });
const fail = <T,>(error: string): ServiceResult<T> => ({ ok: false, error });

function addActivity(
  state: DemoState,
  actor: string,
  action: string,
  detail: string,
  entityType: string,
  entityId: string,
): DemoState {
  const timestamp = now();
  const audit: AuditEvent = {
    id: makeId("audit"),
    actor,
    action,
    entityType,
    entityId,
    occurredAt: timestamp,
    detail,
  };
  const activity: ActivityItem = {
    id: makeId("activity"),
    label: action,
    detail,
    occurredAt: timestamp,
    entityType,
    entityId,
  };
  return {
    ...state,
    auditEvents: [audit, ...state.auditEvents],
    activities: [activity, ...state.activities],
  };
}

function addNotification(
  state: DemoState,
  role: DemoRole,
  title: string,
  message: string,
  relatedEntityId?: string,
): DemoState {
  const notification: Notification = {
    id: makeId("notice"),
    role,
    title,
    message,
    relatedEntityId,
    createdAt: now(),
    read: false,
  };
  return { ...state, notifications: [notification, ...state.notifications] };
}

function getCrateKg(crop: Crop): number {
  if (crop === "Maize" || crop === "Beans") return 25;
  if (crop === "Tomato") return 20;
  return 20;
}

function findRecommendations(
  facilities: Facility[],
  crop: Crop,
  quantityKg: number,
): FacilityRecommendation[] {
  return facilities
    .filter(
      (facility) =>
        facility.supportedCrops.includes(crop) &&
        facility.availableKg >= quantityKg,
    )
    .map((facility) => {
      const storageCost = Math.round(
        quantityKg * facility.priceKshPerKgPerDay,
      );
      const transportCost = Math.round(
        450 + facility.distanceKmFromKisii * 40,
      );
      return {
        facilityId: facility.id,
        estimatedDistanceKm: facility.distanceKmFromKisii,
        estimatedStorageCostPerDayKsh: storageCost,
        estimatedTransportCostKsh: transportCost,
        estimatedFirstDayTotalKsh: storageCost + transportCost,
        reason:
          "Crop-compatible and has enough listed sample capacity; ranked using the combined estimated first-day storage and transport cost.",
        isEstimate: true as const,
      };
    })
    .sort(
      (left, right) =>
        left.estimatedFirstDayTotalKsh - right.estimatedFirstDayTotalKsh,
    );
}

function createAssessment(
  input: CreateHarvestInput,
  estimatedKg: number,
): CropAssessment {
  const urgency =
    /urgent|ripe|today|quick/i.test(input.note ?? "") ? "urgent" : "standard";
  return {
    id: makeId("assessment"),
    crop: input.crop,
    reportedQuantity: input.quantity,
    unit: input.unit,
    estimatedKgForMatching: estimatedKg,
    urgency,
    visibleObservations:
      "Demo estimate based on the crop, quantity, and note entered. No image-recognition model is connected.",
    limitations:
      "A photo cannot confirm internal quality or exact shelf life. The receiving facility must verify weight and condition.",
    assessedAt: now(),
    isSimulated: true,
  };
}

function updateRun(
  state: DemoState,
  entityId: string,
  patch: Partial<WorkflowRun>,
): WorkflowRun[] {
  return state.workflowRuns.map((run) =>
    run.entityId === entityId ? { ...run, ...patch } : run,
  );
}

function notifyCommitFailure<T>(): ServiceResult<T> {
  return fail(
    "This demo change could not be saved in this browser. Check local storage availability and try again.",
  );
}

export function switchDemoRole(role: DemoRole): ServiceResult<DemoRole> {
  const next = { ...currentState, activeRole: role };
  if (!commit(next)) return notifyCommitFailure();
  return ok(role);
}

export function resetDemo(): ServiceResult<DemoState> {
  const next = cloneSeed();
  if (!commit(next)) return notifyCommitFailure();
  return ok(next);
}

export function createHarvestRequest(
  input: CreateHarvestInput,
): ServiceResult<HarvestRequest> {
  if (currentState.activeRole !== "farmer") {
    return fail("Switch to the farmer demo role to submit a harvest request.");
  }
  if (!Number.isFinite(input.quantity) || input.quantity <= 0) {
    return fail("Enter a quantity greater than zero.");
  }
  if (!input.location.trim()) return fail("Add a pickup location.");

  const farmerId = input.farmerId ?? "farmer-mary";
  const farmer = currentState.farmers.find((item) => item.id === farmerId);
  if (!farmer) return fail("The selected farmer is not available in this demo.");

  const estimatedKg =
    input.unit === "crate"
      ? Math.round(input.quantity * getCrateKg(input.crop))
      : Math.round(input.quantity);
  const recommendations = findRecommendations(
    currentState.facilities,
    input.crop,
    estimatedKg,
  );
  const timestamp = now();
  const assessment = createAssessment(input, estimatedKg);
  const request: HarvestRequest = {
    id: makeId("harvest"),
  reference: `KH-${request.id.slice(-6).toUpperCase()}`,
    farmerId,
    crop: input.crop,
    quantity: input.quantity,
    unit: input.unit,
    estimatedKgForMatching: estimatedKg,
    unitConversionNote:
      input.unit === "crate"
        ? `Matching estimate uses ${getCrateKg(input.crop)} kg per crate in this demo; facility check-in determines actual weight.`
        : undefined,
    location: input.location.trim(),
    note: input.note?.trim() ?? "",
    photoName: input.photoName,
    status: recommendations.length > 0 ? "awaiting_confirmation" : "submitted",
    assessment,
    recommendations,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  const workflowId = makeId("workflow");
  const run: WorkflowRun = {
    id: workflowId,
    reference: `WF-${request.reference}`,
    entityType: "harvest",
    entityId: request.id,
    title: `Harvest intake · ${request.reference}`,
    status: recommendations.length > 0 ? "waiting_approval" : "needs_intervention",
    currentStep:
      recommendations.length > 0
        ? "Waiting for farmer to confirm a facility"
        : "No suitable single facility found",
    startedAt: timestamp,
    requiresHumanApproval: recommendations.length > 0,
    steps: [
      {
        id: makeId("step"),
        label: "Harvest request received",
        status: "completed",
        occurredAt: timestamp,
        evidence: `${estimatedKg} kg estimated for matching from farmer-reported quantity.`,
      },
      {
        id: makeId("step"),
        label: "Demo assessment recorded",
        status: "completed",
        occurredAt: timestamp,
        evidence: "No external model or image service was called.",
      },
      {
        id: makeId("step"),
        label: "Storage matching",
        status: recommendations.length > 0 ? "completed" : "needs_intervention",
        occurredAt: timestamp,
        evidence: recommendations.length
          ? `${recommendations.length} crop-compatible sample option(s) have enough listed capacity.`
          : "No crop-compatible sample facility has enough listed capacity.",
      },
      {
        id: makeId("step"),
        label: "Farmer confirmation",
        status: recommendations.length > 0 ? "waiting" : "needs_intervention",
        evidence: recommendations.length
          ? "No reservation has been made."
          : "A person must review or revise the request.",
      },
    ],
  };
  const task: AutomationTask = {
    id: makeId("task"),
    workflowId,
    capability: "Storage Matching",
    trigger: `Farmer submitted ${request.reference}`,
    status: recommendations.length > 0 ? "waiting" : "needs_intervention",
    currentStep:
      recommendations.length > 0
        ? "Recommendation awaiting farmer review"
        : "No suitable facility found",
    inputSummary: `${estimatedKg} kg ${input.crop} · ${input.location.trim()}`,
    outputSummary: recommendations.length
      ? `${recommendations.length} sample option(s) ranked by estimated first-day cost.`
      : "No single sample facility has enough compatible capacity.",
    recordsConsulted: [request.reference, ...currentState.facilities.map((item) => item.id)],
    decisionExplanation:
      "Matching uses seeded crop compatibility, listed capacity, and estimated storage and transport costs. It does not reserve capacity.",
    requiresHumanApproval: true,
    attempts: 1,
    updatedAt: timestamp,
  };
  let next: DemoState = {
    ...currentState,
    harvestRequests: [request, ...currentState.harvestRequests],
    workflowRuns: [run, ...currentState.workflowRuns],
    automationTasks: [task, ...currentState.automationTasks],
  };
  next = addActivity(
    next,
    "Farmer demo",
    "Harvest request submitted",
    `${request.reference} · ${estimatedKg} kg matching estimate · sample workflow`,
    "harvest",
    request.id,
  );
  next = addNotification(
    next,
    recommendations.length > 0 ? "farmer" : "ops",
    recommendations.length > 0
      ? "Storage options are ready to review"
      : "A harvest request needs help",
    recommendations.length > 0
      ? `${request.reference} has ${recommendations.length} sample option(s); no booking has been made.`
      : `${request.reference} has no suitable single-facility match.`,
    request.id,
  );

  if (recommendations.length === 0) {
    const exception: ExceptionRecord = {
      id: makeId("exception"),
      reference: `EX-${request.reference}`,
      type: "no_capacity",
      severity: assessment.urgency === "urgent" ? "urgent" : "high",
      title: `No single facility can fit ${estimatedKg} kg`,
      description: `No crop-compatible sample facility currently lists enough capacity for ${request.reference}.`,
      impact: "The request cannot be booked until capacity or the requested quantity changes.",
      ownerRole: "ops",
      relatedEntityType: "harvest",
      relatedEntityId: request.id,
      suggestedAction: "Review split-storage options or ask the farmer to revise the request.",
      status: "open",
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    next = { ...next, exceptions: [exception, ...next.exceptions] };
  }

  if (!commit(next)) return notifyCommitFailure();
  return ok(request);
}

export function confirmReservation(
  harvestId: string,
  facilityId: string,
): ServiceResult<StorageReservation> {
  if (currentState.activeRole !== "farmer") {
    return fail("Switch to the farmer demo role to confirm a storage reservation.");
  }
  const request = currentState.harvestRequests.find((item) => item.id === harvestId);
  const facility = currentState.facilities.find((item) => item.id === facilityId);
  if (!request || !facility) return fail("The harvest or facility could not be found.");
  if (!["awaiting_confirmation", "assessed"].includes(request.status)) {
    return fail("This request is not waiting for a storage confirmation.");
  }
  if (!facility.supportedCrops.includes(request.crop)) {
    return fail(`${facility.name} is not listed as compatible with ${request.crop}.`);
  }
  if (facility.availableKg < request.estimatedKgForMatching) {
    return fail("The listed capacity has changed. Choose another option or retry matching.");
  }

  const timestamp = now();
  const reservation: StorageReservation = {
    id: makeId("reservation"),
    harvestId,
    facilityId,
    reservedKg: request.estimatedKgForMatching,
    status: "confirmed",
    confirmedAt: timestamp,
  };
  const job: TransportJob = {
    id: makeId("transport"),
    reference: `TR-${String(currentState.transportJobs.length + 203).padStart(3, "0")}`,
    harvestId,
    facilityId,
    status: "available",
    pickupArea: request.location,
    distanceKm: Math.max(5, Math.round(facility.distanceKmFromKisii * 1.4)),
    vehicleRequirement:
      request.estimatedKgForMatching > 500
        ? "5-ton truck"
        : request.estimatedKgForMatching > 100
          ? "Pickup truck or larger"
          : "Suitable vehicle for the listed load",
    loadKg: request.estimatedKgForMatching,
    feeKsh: Math.round(450 + facility.distanceKmFromKisii * 40),
    etaLabel: "Sample pickup window to be confirmed",
    events: [
      {
        id: makeId("transport-event"),
        status: "available",
        label: "Delivery request created",
        occurredAt: timestamp,
        isSimulated: true,
      },
    ],
  };
  const workflowId = makeId("workflow");
  const workflow: WorkflowRun = {
    id: workflowId,
    reference: `WF-${job.reference}`,
    entityType: "transport",
    entityId: job.id,
    title: `Transport dispatch · ${job.reference}`,
    status: "running",
    currentStep: "Waiting for transporter acceptance",
    startedAt: timestamp,
    requiresHumanApproval: true,
    steps: [
      {
        id: makeId("step"),
        label: "Capacity reserved",
        status: "completed",
        occurredAt: timestamp,
        evidence: `${request.estimatedKgForMatching} kg held at ${facility.name}.`,
      },
      {
        id: makeId("step"),
        label: "Transport request created",
        status: "completed",
        occurredAt: timestamp,
        evidence: "A sample job is available; no transporter has accepted it.",
      },
      {
        id: makeId("step"),
        label: "Transporter acceptance",
        status: "waiting",
        evidence: "A suitable transporter must accept the job.",
      },
    ],
  };
  const task: AutomationTask = {
    id: makeId("task"),
    workflowId,
    capability: "Transport Dispatch",
    trigger: `Farmer confirmed storage for ${request.reference}`,
    status: "waiting",
    currentStep: "Waiting for a suitable transporter",
    inputSummary: `${job.loadKg} kg · ${job.vehicleRequirement}`,
    outputSummary: `${job.reference} created with a sample fee estimate of KSh ${job.feeKsh.toLocaleString()}.`,
    recordsConsulted: [request.reference, facility.id, job.id],
    decisionExplanation:
      "Capacity is reserved only after farmer confirmation. The transport job is not assigned or accepted automatically.",
    requiresHumanApproval: true,
    attempts: 1,
    updatedAt: timestamp,
  };
  let next: DemoState = {
    ...currentState,
    facilities: currentState.facilities.map((item) =>
      item.id === facilityId
        ? {
            ...item,
            availableKg: item.availableKg - reservation.reservedKg,
            reservedKg: item.reservedKg + reservation.reservedKg,
          }
        : item,
    ),
    harvestRequests: currentState.harvestRequests.map((item) =>
      item.id === harvestId
        ? {
            ...item,
            status: "booking_confirmed",
            selectedFacilityId: facilityId,
            updatedAt: timestamp,
          }
        : item,
    ),
    reservations: [reservation, ...currentState.reservations],
    transportJobs: [job, ...currentState.transportJobs],
    workflowRuns: [workflow, ...currentState.workflowRuns],
    automationTasks: [task, ...currentState.automationTasks],
  };
  next = {
    ...next,
    workflowRuns: next.workflowRuns.map((run) =>
      run.entityId === harvestId
        ? {
            ...run,
            status: "running",
            currentStep: "Reservation confirmed; transport request created",
            requiresHumanApproval: true,
            steps: run.steps.map((step) =>
              step.label === "Farmer confirmation"
                ? {
                    ...step,
                    status: "completed",
                    occurredAt: timestamp,
                    evidence: `Farmer confirmed ${facility.name}; ${job.reference} is awaiting transporter acceptance.`,
                  }
                : step,
            ),
          }
        : run,
    ),
  };
  next = addActivity(
    next,
    "Farmer demo",
    "Storage reservation confirmed",
    `${request.reference} · ${reservation.reservedKg} kg at ${facility.name}; ${job.reference} awaits transport acceptance.`,
    "harvest",
    harvestId,
  );
  next = addNotification(
    next,
    "transporter",
    "A sample transport job is available",
    `${job.reference} needs ${job.vehicleRequirement} for ${job.loadKg} kg.`,
    job.id,
  );
  if (!commit(next)) return notifyCommitFailure();
  return ok(reservation);
}

const TRANSPORT_TRANSITIONS: Record<TransportStatus, TransportStatus | null> = {
  available: "accepted",
  accepted: "en_route_to_pickup",
  en_route_to_pickup: "arrived_at_pickup",
  arrived_at_pickup: "picked_up",
  picked_up: "in_transit",
  in_transit: "delivered",
  delivered: null,
  facility_received: null,
  cancelled: null,
};

const TRANSPORT_LABELS: Record<TransportStatus, string> = {
  available: "Available",
  accepted: "Accepted by transporter",
  en_route_to_pickup: "En route to pickup",
  arrived_at_pickup: "Arrived at pickup",
  picked_up: "Produce collected",
  in_transit: "En route to facility",
  delivered: "Delivered · awaiting facility check-in",
  facility_received: "Facility receipt confirmed",
  cancelled: "Cancelled",
};

export function getNextTransportStatus(
  status: TransportStatus,
): TransportStatus | null {
  return TRANSPORT_TRANSITIONS[status];
}

export function updateTransportStatus(
  jobId: string,
  nextStatus: TransportStatus,
): ServiceResult<TransportJob> {
  if (currentState.activeRole !== "transporter") {
    return fail("Switch to the transporter demo role to update a delivery job.");
  }
  const job = currentState.transportJobs.find((item) => item.id === jobId);
  if (!job) return fail("Transport job not found.");
  if (TRANSPORT_TRANSITIONS[job.status] !== nextStatus) {
    return fail(
      `This job cannot move from ${TRANSPORT_LABELS[job.status]} to ${TRANSPORT_LABELS[nextStatus]}.`,
    );
  }
  const timestamp = now();
  const transporterId =
    nextStatus === "accepted"
      ? job.transporterId ?? "transporter-jane"
      : job.transporterId;
  const event: TransportEvent = {
    id: makeId("transport-event"),
    status: nextStatus,
    label: TRANSPORT_LABELS[nextStatus],
    occurredAt: timestamp,
    isSimulated: true,
  };
  const updatedJob: TransportJob = {
    ...job,
    status: nextStatus,
    transporterId,
    events: [...job.events, event],
  };
  const request = currentState.harvestRequests.find(
    (item) => item.id === job.harvestId,
  );
  const workflowStatus: WorkflowStatus =
    nextStatus === "delivered" ? "waiting_approval" : "running";
  let next: DemoState = {
    ...currentState,
    transportJobs: currentState.transportJobs.map((item) =>
      item.id === jobId ? updatedJob : item,
    ),
    harvestRequests: currentState.harvestRequests.map((item) =>
      item.id === job.harvestId &&
      ["accepted", "en_route_to_pickup", "arrived_at_pickup", "picked_up", "in_transit", "delivered"].includes(nextStatus)
        ? { ...item, status: "in_transport", updatedAt: timestamp }
        : item,
    ),
    workflowRuns: currentState.workflowRuns.map((run) =>
      run.entityId === jobId
        ? {
            ...run,
            status: workflowStatus,
            currentStep:
              nextStatus === "delivered"
                ? "Waiting for facility check-in"
                : TRANSPORT_LABELS[nextStatus],
            steps: [
              ...run.steps.map((step) =>
                step.status === "waiting"
                  ? { ...step, status: "completed" as const, occurredAt: timestamp }
                  : step,
              ),
              {
                id: makeId("step"),
                label: TRANSPORT_LABELS[nextStatus],
                status: nextStatus === "delivered" ? "waiting" : "completed",
                occurredAt: nextStatus === "delivered" ? undefined : timestamp,
                evidence:
                  nextStatus === "delivered"
                    ? "Facility staff must record actual received weight and condition."
                    : `Transport progress entered in demo mode at ${timestamp}.`,
              },
            ],
          }
        : run,
    ),
    automationTasks: currentState.automationTasks.map((task) =>
      task.workflowId ===
      currentState.workflowRuns.find((run) => run.entityId === jobId)?.id
        ? {
            ...task,
            status: nextStatus === "delivered" ? "waiting" : "completed",
            currentStep:
              nextStatus === "delivered"
                ? "Waiting for facility check-in"
                : TRANSPORT_LABELS[nextStatus],
            outputSummary: `Demo progress recorded: ${TRANSPORT_LABELS[nextStatus]}.`,
            updatedAt: timestamp,
          }
        : task,
    ),
  };
  next = addActivity(
    next,
    nextStatus === "accepted" ? "Transporter demo" : "Transporter demo",
    TRANSPORT_LABELS[nextStatus],
    `${job.reference} · simulated progress; no live GPS or real dispatch.`,
    "transport",
    jobId,
  );
  if (request) {
    next = addNotification(
      next,
      "farmer",
      nextStatus === "accepted"
        ? "A transporter accepted the sample job"
        : "Delivery status updated",
      `${job.reference}: ${TRANSPORT_LABELS[nextStatus]}. Progress is simulated.`,
      job.harvestId,
    );
  }
  if (!commit(next)) return notifyCommitFailure();
  return ok(updatedJob);
}

export function checkInDelivery(
  jobId: string,
  input: CheckInInput,
): ServiceResult<DeliveryEvent> {
  if (currentState.activeRole !== "facility") {
    return fail("Switch to the facility demo role to record a delivery check-in.");
  }
  const job = currentState.transportJobs.find((item) => item.id === jobId);
  if (!job) return fail("Transport job not found.");
  if (job.status !== "delivered") {
    return fail("Facility check-in is available after the transporter marks delivery.");
  }
  if (!Number.isFinite(input.receivedKg) || input.receivedKg < 0) {
    return fail("Enter a valid received weight.");
  }
  const request = currentState.harvestRequests.find(
    (item) => item.id === job.harvestId,
  );
  const reservation = currentState.reservations.find(
    (item) => item.harvestId === job.harvestId && item.status === "confirmed",
  );
  const facility = currentState.facilities.find(
    (item) => item.id === job.facilityId,
  );
  if (!request || !reservation || !facility) {
    return fail("The related booking or facility record is missing.");
  }
  const decision =
    input.decision ??
    (input.receivedKg === 0
      ? "rejected"
      : input.receivedKg < request.estimatedKgForMatching
        ? "partial"
        : "accepted");
  if (decision === "rejected" && input.receivedKg !== 0) {
    return fail("A rejected delivery must record zero accepted kilograms.");
  }
  if (decision === "accepted" && input.receivedKg <= 0) {
    return fail("Record a positive received weight for an accepted delivery.");
  }
  if (
    decision === "partial" &&
    (input.receivedKg <= 0 ||
      input.receivedKg >= request.estimatedKgForMatching)
  ) {
    return fail(
      "A partial check-in must record a positive quantity below the reported amount.",
    );
  }
  if (
    decision === "accepted" &&
    input.receivedKg < request.estimatedKgForMatching
  ) {
    return fail(
      "The received quantity is below the reported amount. Record this as a partial check-in.",
    );
  }
  if (input.receivedKg > reservation.reservedKg) {
    const extraKg = input.receivedKg - reservation.reservedKg;
    if (facility.availableKg < extraKg) {
      return fail(
        `The facility has only ${facility.availableKg} kg of unreserved sample capacity for any quantity above the booking.`,
      );
    }
  }

  const discrepancyKg = Math.round(
    (request.estimatedKgForMatching - input.receivedKg) * 10,
  ) / 10;
  const needsException =
    decision === "rejected" ||
    Math.abs(discrepancyKg) > 0 ||
    input.condition === "Needs attention";
  const timestamp = now();
  const delivery: DeliveryEvent = {
    id: makeId("delivery"),
    harvestId: request.id,
    jobId,
    facilityId: facility.id,
    reportedKg: request.estimatedKgForMatching,
    receivedKg: input.receivedKg,
    condition: input.condition,
    decision,
    qualityGrade: input.qualityGrade?.trim() || undefined,
    discrepancyKg,
    verifiedAt: timestamp,
    verificationSource: "facility check-in",
  };
  const releasedReservationKg = reservation.reservedKg;
  const extraKg = Math.max(0, input.receivedKg - releasedReservationKg);
  const returnedKg = Math.max(0, releasedReservationKg - input.receivedKg);
  const nextAvailableKg = facility.availableKg + returnedKg - extraKg;
  const nextOccupiedKg = facility.occupiedKg + input.receivedKg;
  let next: DemoState = {
    ...currentState,
    facilities: currentState.facilities.map((item) =>
      item.id === facility.id
        ? {
            ...item,
            availableKg: nextAvailableKg,
            reservedKg: Math.max(0, item.reservedKg - releasedReservationKg),
            occupiedKg: nextOccupiedKg,
          }
        : item,
    ),
    reservations: currentState.reservations.map((item) =>
      item.id === reservation.id
        ? {
            ...item,
            status: decision === "rejected" ? "cancelled" : "checked_in",
          }
        : item,
    ),
    transportJobs: currentState.transportJobs.map((item) =>
      item.id === jobId
        ? {
            ...item,
            status: "facility_received",
            events: [
              ...item.events,
              {
                id: makeId("transport-event"),
                status: "facility_received",
                label: "Facility check-in completed",
                occurredAt: timestamp,
                isSimulated: true,
              },
            ],
          }
        : item,
    ),
    harvestRequests: currentState.harvestRequests.map((item) =>
      item.id === request.id
        ? {
            ...item,
            status: decision === "rejected" ? "rejected" : "received",
            updatedAt: timestamp,
          }
        : item,
    ),
    deliveryEvents: [delivery, ...currentState.deliveryEvents],
  };
  if (decision !== "rejected") {
    const batch: InventoryBatch = {
      id: makeId("inventory"),
      reference: `KB-${String(currentState.inventoryBatches.length + 303).padStart(3, "0")}`,
      harvestId: request.id,
      farmerId: request.farmerId,
      facilityId: facility.id,
      crop: request.crop,
      receivedKg: input.receivedKg,
      availableKg: input.receivedKg,
      reservedForOffersKg: 0,
      receivedAt: timestamp,
      condition: input.condition,
      qualityGrade: input.qualityGrade?.trim() || undefined,
      inventoryStatus: "available",
    };
    next = {
      ...next,
      inventoryBatches: [batch, ...next.inventoryBatches],
      workflowRuns: next.workflowRuns.map((run) =>
        run.entityId === jobId || run.entityId === request.id
          ? {
              ...run,
              status:
                needsException
                  ? "needs_intervention"
                  : "completed",
              currentStep:
                needsException
                  ? "Check-in recorded; review discrepancy"
                  : "Facility check-in completed",
              steps: [
                ...run.steps,
                {
                  id: makeId("step"),
                  label: "Facility check-in recorded",
                  status: needsException ? "needs_intervention" : "completed",
                  occurredAt: timestamp,
                  evidence: `${input.receivedKg} kg recorded by facility staff.`,
                },
              ],
            }
          : run,
      ),
    };
  } else {
    next = {
      ...next,
      workflowRuns: next.workflowRuns.map((run) =>
        run.entityId === jobId
          ? {
              ...run,
              status: "needs_intervention",
              currentStep: "Delivery rejected; follow-up required",
              requiresHumanApproval: true,
            }
          : run,
      ),
    };
  }

  if (needsException) {
    const exception: ExceptionRecord = {
      id: makeId("exception"),
      reference: `EX-${request.reference}`,
      type: "quantity_discrepancy",
      severity: input.condition === "Needs attention" ? "high" : "normal",
      title:
        decision === "rejected"
          ? "Facility rejected the delivery"
          : `${Math.abs(discrepancyKg)} kg check-in difference`,
      description: `${request.reference}: ${request.estimatedKgForMatching} kg was reported and ${input.receivedKg} kg was recorded by the facility.`,
      impact:
        decision === "rejected"
          ? "No inventory batch was created; the booking capacity was released."
          : "The facility's verified receipt is the inventory quantity; review the difference with the farmer.",
      ownerRole: "ops",
      relatedEntityType: "harvest",
      relatedEntityId: request.id,
      suggestedAction: "Review facility notes and agree the next step with the farmer.",
      status: "open",
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    next = { ...next, exceptions: [exception, ...next.exceptions] };
  }
  next = addActivity(
    next,
    "Facility demo",
    decision === "rejected" ? "Delivery rejected at check-in" : "Facility check-in recorded",
    `${request.reference} · ${input.receivedKg} kg received; sample verification.`,
    "inventory",
    request.id,
  );
  next = addNotification(
    next,
    "farmer",
    decision === "rejected" ? "Facility did not accept the delivery" : "Produce received at the facility",
    decision === "rejected"
      ? `${request.reference} needs follow-up; no inventory was created.`
      : `${request.reference}: facility recorded ${input.receivedKg} kg. The value is facility-verified in this demo.`,
    request.id,
  );
  if (!commit(next)) return notifyCommitFailure();
  return ok(delivery);
}

export function getBuyerListings(state = currentState): BuyerListing[] {
  return state.inventoryBatches
    .filter((batch) => batch.availableKg > 0)
    .map((batch) => {
      const facility = state.facilities.find(
        (item) => item.id === batch.facilityId,
      );
      const seller = state.farmers.find((item) => item.id === batch.farmerId);
      if (!facility || !seller) return null;
      return {
        batch,
        facility,
        seller,
        availableToOfferKg: Math.max(
          0,
          batch.availableKg - batch.reservedForOffersKg,
        ),
      };
    })
    .filter((listing): listing is BuyerListing => listing !== null)
    .sort((left, right) => left.batch.crop.localeCompare(right.batch.crop));
}

export function createPurchaseOffer(input: {
  batchId: string;
  buyerId: string;
  quantityKg: number;
  priceKshPerKg: number;
}): ServiceResult<PurchaseOffer> {
  if (currentState.activeRole !== "buyer") {
    return fail("Switch to the buyer demo role to submit a purchase offer.");
  }
  if (!Number.isFinite(input.quantityKg) || input.quantityKg <= 0) {
    return fail("Enter an offer quantity greater than zero.");
  }
  if (!Number.isFinite(input.priceKshPerKg) || input.priceKshPerKg <= 0) {
    return fail("Enter a price greater than zero.");
  }
  const batch = currentState.inventoryBatches.find(
    (item) => item.id === input.batchId,
  );
  const buyer = currentState.buyers.find((item) => item.id === input.buyerId);
  if (!batch || !buyer) return fail("The listing or buyer could not be found.");
  const availableToOffer = batch.availableKg - batch.reservedForOffersKg;
  if (!buyer.preferredCrops.includes(batch.crop)) {
    return fail(`${buyer.name} is not listed as sourcing ${batch.crop} in this demo.`);
  }
  if (input.quantityKg > availableToOffer) {
    return fail(
      `Only ${availableToOffer} kg is currently free for another offer; this prevents double-offering stock.`,
    );
  }
  const timestamp = now();
  const offer: PurchaseOffer = {
    id: makeId("offer"),
    reference: `OF-${String(currentState.purchaseOffers.length + 403).padStart(3, "0")}`,
    batchId: input.batchId,
    buyerId: input.buyerId,
    quantityKg: input.quantityKg,
    priceKshPerKg: input.priceKshPerKg,
    status: "submitted",
    paymentStatus: "not_started",
    releaseStatus: "not_requested",
    submittedAt: timestamp,
    updatedAt: timestamp,
  };
  let next: DemoState = {
    ...currentState,
    inventoryBatches: currentState.inventoryBatches.map((item) =>
      item.id === batch.id
        ? {
            ...item,
            reservedForOffersKg: item.reservedForOffersKg + offer.quantityKg,
            inventoryStatus:
              item.reservedForOffersKg + offer.quantityKg >= item.availableKg
                ? "fully_offered"
                : "partially_offered",
          }
        : item,
    ),
    purchaseOffers: [offer, ...currentState.purchaseOffers],
  };
  next = addActivity(
    next,
    "Buyer demo",
    "Purchase offer submitted",
    `${offer.reference} · ${offer.quantityKg} kg at KSh ${offer.priceKshPerKg}/kg; seller response is pending.`,
    "offer",
    offer.id,
  );
  next = addNotification(
    next,
    "farmer",
    "A buyer submitted an offer",
    `${offer.reference} is waiting for the seller's decision.`,
    offer.id,
  );
  if (!commit(next)) return notifyCommitFailure();
  return ok(offer);
}

export function respondToPurchaseOffer(
  offerId: string,
  decision: "accepted" | "rejected",
): ServiceResult<PurchaseOffer> {
  if (currentState.activeRole !== "farmer") {
    return fail("Switch to the farmer demo role to respond to a seller offer.");
  }
  const offer = currentState.purchaseOffers.find((item) => item.id === offerId);
  if (!offer) return fail("Purchase offer not found.");
  if (offer.status !== "submitted") {
    return fail("Only a submitted offer can be accepted or rejected.");
  }
  const timestamp = now();
  const updated: PurchaseOffer = {
    ...offer,
    status: decision,
    paymentStatus: decision === "accepted" ? "pending" : "not_started",
    releaseStatus: decision === "accepted" ? "pending" : "not_requested",
    updatedAt: timestamp,
  };
  let next: DemoState = {
    ...currentState,
    purchaseOffers: currentState.purchaseOffers.map((item) =>
      item.id === offerId ? updated : item,
    ),
    inventoryBatches: currentState.inventoryBatches.map((batch) =>
      batch.id === offer.batchId && decision === "rejected"
        ? {
            ...batch,
            reservedForOffersKg: Math.max(
              0,
              batch.reservedForOffersKg - offer.quantityKg,
            ),
            inventoryStatus:
              batch.availableKg <=
              Math.max(0, batch.reservedForOffersKg - offer.quantityKg)
                ? "fully_offered"
                : "available",
          }
        : batch,
    ),
  };
  if (decision === "accepted") {
    const amountKsh = offer.quantityKg * offer.priceKshPerKg;
    const payment: PaymentRecord = {
      id: makeId("payment"),
      offerId,
      amountKsh,
      status: "pending",
      provider: "demo record only",
      updatedAt: timestamp,
    };
    const release: ReleaseAuthorization = {
      id: makeId("release"),
      offerId,
      status: "pending",
      updatedAt: timestamp,
    };
    next = {
      ...next,
      paymentRecords: [payment, ...next.paymentRecords],
      releaseAuthorizations: [release, ...next.releaseAuthorizations],
    };
  }
  next = addActivity(
    next,
    "Seller demo",
    `Purchase offer ${decision}`,
    `${offer.reference} · payment and collection are still separate steps.`,
    "offer",
    offerId,
  );
  if (!commit(next)) return notifyCommitFailure();
  return ok(updated);
}

export function confirmPayment(offerId: string): ServiceResult<PaymentRecord> {
  if (currentState.activeRole !== "ops") {
    return fail("Switch to the operations demo role to record payment verification.");
  }
  const offer = currentState.purchaseOffers.find((item) => item.id === offerId);
  if (!offer || offer.status !== "accepted") {
    return fail("Payment can only be recorded for an accepted offer.");
  }
  const existing = currentState.paymentRecords.find(
    (item) => item.offerId === offerId,
  );
  if (!existing || existing.status !== "pending") {
    return fail("There is no pending sample payment record to confirm.");
  }
  const timestamp = now();
  const payment = { ...existing, status: "confirmed" as const, updatedAt: timestamp };
  let next: DemoState = {
    ...currentState,
    paymentRecords: currentState.paymentRecords.map((item) =>
      item.id === existing.id ? payment : item,
    ),
    purchaseOffers: currentState.purchaseOffers.map((item) =>
      item.id === offerId
        ? { ...item, paymentStatus: "confirmed", updatedAt: timestamp }
        : item,
    ),
  };
  next = addActivity(
    next,
    "Operations demo",
    "Demo payment marked confirmed",
    `${offer.reference} · KSh ${payment.amountKsh.toLocaleString()}; no money was moved.`,
    "payment",
    payment.id,
  );
  if (!commit(next)) return notifyCommitFailure();
  return ok(payment);
}

export function authorizeInventoryRelease(
  offerId: string,
): ServiceResult<ReleaseAuthorization> {
  if (currentState.activeRole !== "ops") {
    return fail("Switch to the operations demo role to authorize inventory release.");
  }
  const offer = currentState.purchaseOffers.find((item) => item.id === offerId);
  if (!offer || offer.status !== "accepted") {
    return fail("Only an accepted offer can proceed to release authorization.");
  }
  if (offer.paymentStatus !== "confirmed") {
    return fail("Confirm payment before authorizing physical inventory release.");
  }
  const existing = currentState.releaseAuthorizations.find(
    (item) => item.offerId === offerId,
  );
  if (!existing || existing.status !== "pending") {
    return fail("There is no pending release authorization for this offer.");
  }
  const timestamp = now();
  const authorization: ReleaseAuthorization = {
    ...existing,
    status: "authorized",
    authorizedBy: "Operations demo",
    updatedAt: timestamp,
  };
  let next: DemoState = {
    ...currentState,
    releaseAuthorizations: currentState.releaseAuthorizations.map((item) =>
      item.id === existing.id ? authorization : item,
    ),
    purchaseOffers: currentState.purchaseOffers.map((item) =>
      item.id === offerId
        ? { ...item, releaseStatus: "authorized", updatedAt: timestamp }
        : item,
    ),
  };
  next = addActivity(
    next,
    "Operations demo",
    "Inventory release authorized",
    `${offer.reference} · payment is confirmed; collection is not yet recorded.`,
    "release",
    authorization.id,
  );
  if (!commit(next)) return notifyCommitFailure();
  return ok(authorization);
}

export function confirmCollection(
  offerId: string,
): ServiceResult<PurchaseOffer> {
  if (currentState.activeRole !== "facility") {
    return fail("Switch to the facility demo role to record physical collection.");
  }
  const offer = currentState.purchaseOffers.find((item) => item.id === offerId);
  if (!offer || offer.status !== "accepted") {
    return fail("Only an accepted offer can be collected.");
  }
  if (offer.paymentStatus !== "confirmed") {
    return fail("Collection cannot be recorded before payment confirmation.");
  }
  if (offer.releaseStatus !== "authorized") {
    return fail("Collection cannot be recorded before release authorization.");
  }
  const batch = currentState.inventoryBatches.find(
    (item) => item.id === offer.batchId,
  );
  if (!batch || batch.availableKg < offer.quantityKg) {
    return fail("The inventory quantity is no longer available for collection.");
  }
  const timestamp = now();
  const updated: PurchaseOffer = {
    ...offer,
    status: "completed",
    releaseStatus: "collected",
    updatedAt: timestamp,
  };
  let next: DemoState = {
    ...currentState,
    purchaseOffers: currentState.purchaseOffers.map((item) =>
      item.id === offerId ? updated : item,
    ),
    inventoryBatches: currentState.inventoryBatches.map((item) =>
      item.id === batch.id
        ? {
            ...item,
            availableKg: item.availableKg - offer.quantityKg,
            reservedForOffersKg: Math.max(
              0,
              item.reservedForOffersKg - offer.quantityKg,
            ),
            inventoryStatus:
              item.availableKg - offer.quantityKg <= 0
                ? "released"
                : item.reservedForOffersKg - offer.quantityKg > 0
                  ? "partially_offered"
                  : "available",
          }
        : item,
    ),
    facilities: currentState.facilities.map((item) =>
      item.id === batch.facilityId
        ? {
            ...item,
            occupiedKg: Math.max(0, item.occupiedKg - offer.quantityKg),
            availableKg: item.availableKg + offer.quantityKg,
          }
        : item,
    ),
    releaseAuthorizations: currentState.releaseAuthorizations.map((item) =>
      item.offerId === offerId
        ? { ...item, status: "collected", updatedAt: timestamp }
        : item,
    ),
  };
  next = addActivity(
    next,
    "Facility demo",
    "Collection recorded",
    `${offer.reference} · ${offer.quantityKg} kg released after payment and authorization.`,
    "offer",
    offerId,
  );
  if (!commit(next)) return notifyCommitFailure();
  return ok(updated);
}

export function resolveException(
  exceptionId: string,
  resolution: string,
): ServiceResult<ExceptionRecord> {
  const exception = currentState.exceptions.find(
    (item) => item.id === exceptionId,
  );
  if (!exception) return fail("Exception not found.");
  if (exception.status === "resolved") return fail("This exception is already resolved.");
  if (currentState.activeRole !== "ops" && currentState.activeRole !== exception.ownerRole) {
    return fail(`Switch to ${exception.ownerRole} or operations to resolve this case.`);
  }
  if (!resolution.trim()) return fail("Add a short resolution note before closing the case.");
  const timestamp = now();
  const updated: ExceptionRecord = {
    ...exception,
    status: "resolved",
    resolution: resolution.trim(),
    updatedAt: timestamp,
  };
  let next: DemoState = {
    ...currentState,
    exceptions: currentState.exceptions.map((item) =>
      item.id === exceptionId ? updated : item,
    ),
  };
  next = addActivity(
    next,
    `${currentState.activeRole} demo`,
    "Exception resolved",
    `${exception.reference} · ${resolution.trim()}`,
    "exception",
    exception.id,
  );
  if (!commit(next)) return notifyCommitFailure();
  return ok(updated);
}

export function retryWorkflow(workflowId: string): ServiceResult<WorkflowRun> {
  if (currentState.activeRole !== "ops") {
    return fail("Switch to the operations demo role to retry a workflow.");
  }
  const workflow = currentState.workflowRuns.find(
    (item) => item.id === workflowId,
  );
  if (!workflow) return fail("Workflow run not found.");
  const request = currentState.harvestRequests.find(
    (item) => item.id === workflow.entityId,
  );
  if (!request || workflow.entityType !== "harvest") {
    return fail("This demo can retry storage matching for harvest workflows only.");
  }
  const timestamp = now();
  const recommendations = findRecommendations(
    currentState.facilities,
    request.crop,
    request.estimatedKgForMatching,
  );
  const attempts =
    (currentState.automationTasks.find((item) => item.workflowId === workflowId)
      ?.attempts ?? 0) + 1;
  if (recommendations.length === 0) {
    const updatedRun: WorkflowRun = {
      ...workflow,
      status: "needs_intervention",
      currentStep: "No suitable single facility found on retry",
      steps: [
        ...workflow.steps,
        {
          id: makeId("step"),
          label: "Storage matching retried",
          status: "needs_intervention",
          occurredAt: timestamp,
          evidence:
            "Current sample capacity still does not fit the whole request. No reservation or split booking was created.",
        },
      ],
    };
    let next: DemoState = {
      ...currentState,
      workflowRuns: currentState.workflowRuns.map((item) =>
        item.id === workflowId ? updatedRun : item,
      ),
      automationTasks: currentState.automationTasks.map((item) =>
        item.workflowId === workflowId
          ? {
              ...item,
              status: "needs_intervention",
              currentStep: "Human review required",
              attempts,
              lastError: "No eligible single-facility option found.",
              updatedAt: timestamp,
            }
          : item,
      ),
    };
    next = addActivity(
      next,
      "Operations demo",
      "Storage matching retried",
      `${request.reference} · no single-facility option found; no capacity changed.`,
      "workflow",
      workflowId,
    );
    if (!commit(next)) return notifyCommitFailure();
    return fail("No suitable single facility has enough listed capacity. No booking was made.");
  }

  const updatedRun: WorkflowRun = {
    ...workflow,
    status: "waiting_approval",
    currentStep: "New options are waiting for farmer confirmation",
    requiresHumanApproval: true,
    steps: [
      ...workflow.steps,
      {
        id: makeId("step"),
        label: "Storage matching retried",
        status: "completed",
        occurredAt: timestamp,
        evidence: `${recommendations.length} eligible sample option(s) found; no reservation was made.`,
      },
    ],
  };
  let next: DemoState = {
    ...currentState,
    harvestRequests: currentState.harvestRequests.map((item) =>
      item.id === request.id
        ? {
            ...item,
            recommendations,
            status: "awaiting_confirmation",
            updatedAt: timestamp,
          }
        : item,
    ),
    workflowRuns: currentState.workflowRuns.map((item) =>
      item.id === workflowId ? updatedRun : item,
    ),
    automationTasks: currentState.automationTasks.map((item) =>
      item.workflowId === workflowId
        ? {
            ...item,
            status: "waiting",
            currentStep: "Recommendation awaiting farmer confirmation",
            outputSummary: `${recommendations.length} eligible sample option(s) found on retry.`,
            attempts,
            lastError: undefined,
            updatedAt: timestamp,
          }
        : item,
    ),
    exceptions: currentState.exceptions.map((item) =>
      item.relatedEntityId === request.id &&
      item.type === "no_capacity" &&
      item.status !== "resolved"
        ? {
            ...item,
            status: "resolved",
            resolution: "A new eligible sample option was found on retry.",
            updatedAt: timestamp,
          }
        : item,
    ),
  };
  next = addActivity(
    next,
    "Operations demo",
    "Storage matching retried",
    `${request.reference} · ${recommendations.length} sample option(s) found; awaiting farmer confirmation.`,
    "workflow",
    workflowId,
  );
  if (!commit(next)) return notifyCommitFailure();
  return ok(updatedRun);
}

export const demoService: KilimoService = {
  getState: getDemoState,
  subscribe: subscribeDemoState,
  switchRole: switchDemoRole,
  reset: resetDemo,
  createHarvestRequest,
  confirmReservation,
  updateTransportStatus,
  getNextTransportStatus,
  checkInDelivery,
  getBuyerListings,
  createPurchaseOffer,
  respondToPurchaseOffer,
  confirmPayment,
  authorizeInventoryRelease,
  confirmCollection,
  resolveException,
  retryWorkflow,
};
