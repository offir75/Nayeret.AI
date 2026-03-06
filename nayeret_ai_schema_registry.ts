
/**
 * Nayeret AI schema registry
 * Auto-generated starter registry for document classification + extraction
 *
 * Related JSON assets:
 * - nayeret_document_taxonomy_v2_israel_us_global.json
 * - nayeret_classification_rules_v1.json
 * - nayeret_llm_extraction_prompt_pack_v1.json
 */

export type UICategory =
  | "Identity"
  | "Money"
  | "Bills & Receipts"
  | "Insurance & Contracts"
  | "Trips & Tickets";

export type ConfidenceBand = "high" | "medium" | "low";

export interface ExtractionFieldSchema {
  description: string;
  data_type:
    | "string"
    | "date"
    | "currency_amount"
    | "currency_code"
    | "iso_country";
  required: boolean;
}

export interface SemanticSignals {
  keywords_he: string[];
  keywords_en: string[];
  layout_hints: string[];
  vendor_examples: string[];
  ocr_patterns: string[];
}

export interface TaxonomyDefinition {
  taxonomy: string;
  classification: string;
  group: string;
  ui_category: UICategory;
  matching_description: string;
  semantic_signals: SemanticSignals;
  extraction_schema: Record<string, ExtractionFieldSchema>;
}

export interface ClassificationWeights {
  keyword_match: number;
  vendor_match: number;
  ocr_pattern_match: number;
  layout_hint_match: number;
  title_match: number;
  language_hint_match: number;
}

export interface NegativeSignalRule {
  signal: string;
  description: string;
  penalty: number;
}

export interface ConfidenceThresholds {
  high_confidence: number;
  medium_confidence: number;
  low_confidence: number;
}

export interface FallbackRule {
  condition: string;
  action: "classify_as_generic_document" | "fallback_to_group" | "fallback_to_ui_category";
}

export interface DuplicateDetectionConfig {
  method: string;
  checks: string[];
  duplicate_score_threshold: number;
}

export interface ClassificationRules {
  schema_version: string;
  description: string;
  pipeline_steps: string[];
  scoring_weights: ClassificationWeights;
  negative_signals: NegativeSignalRule[];
  confidence_thresholds: ConfidenceThresholds;
  fallback_logic: FallbackRule[];
  duplicate_detection: DuplicateDetectionConfig;
  document_lifecycle_rules: {
    expiry_detection_fields: string[];
    reminder_offsets_days: number[];
    event_detection_fields: string[];
  };
}

export interface PromptOutputContract {
  format: "json";
  top_level_fields: Record<string, string>;
}

export interface ExtractionPromptTemplate {
  template_id: string;
  name: string;
  target_taxonomies: string[];
  description: string;
  system_prompt: string;
  extraction_instructions: string[];
  hallucination_guards: string[];
  output_contract: PromptOutputContract;
}

export interface ExtractionPromptPack {
  schema_version: string;
  package_name: string;
  supported_languages: string[];
  templates: ExtractionPromptTemplate[];
  global_runtime_rules: {
    preferred_output_language: string;
    date_normalization: string;
    currency_normalization: string;
    null_policy: string;
    evidence_policy: string;
  };
}

export interface CandidateScoreBreakdown {
  taxonomy: string;
  keywordScore: number;
  vendorScore: number;
  patternScore: number;
  layoutScore: number;
  titleScore: number;
  languageScore: number;
  penaltyScore: number;
  totalScore: number;
  normalizedConfidence: number;
}

export interface ClassificationInput {
  text: string;
  title?: string | null;
  detectedLanguage?: string | null;
  layoutHints?: string[];
}

export interface ClassificationResult {
  taxonomy: string | null;
  group: string | null;
  uiCategory: UICategory | null;
  confidence: number;
  confidenceBand: ConfidenceBand;
  fallbackApplied: boolean;
  breakdown: CandidateScoreBreakdown[];
}

export interface ExtractedFieldValue {
  value: unknown;
  confidence: number;
  evidence?: string | null;
}

export interface ExtractionResult {
  taxonomy: string;
  language: string;
  document_summary: string;
  extracted_fields: Record<string, ExtractedFieldValue>;
  field_evidence: Record<string, string | null>;
  warnings: string[];
}

/**
 * Minimal starter registry.
 * Add / generate the full JSON payloads at runtime or compile time.
 */
export const UI_CATEGORIES: UICategory[] = [
  "Identity",
  "Money",
  "Bills & Receipts",
  "Insurance & Contracts",
  "Trips & Tickets",
];

export const TAXONOMY_TO_TEMPLATE: Record<string, string> = {
  "Passport": "passport_extractor",
  "National ID Card": "national_id_extractor",
  "ID Supplement / Address Slip": "national_id_extractor",
  "Driver License": "drivers_license_extractor",
  "Electricity Bill": "utility_bill_extractor",
  "Water Bill": "utility_bill_extractor",
  "Gas Bill": "utility_bill_extractor",
  "Internet Bill": "utility_bill_extractor",
  "Telecom Bill": "utility_bill_extractor",
  "Cable / TV Bill": "utility_bill_extractor",
  "Municipality Tax Bill": "utility_bill_extractor",
  "Bank Statement": "bank_statement_extractor",
  "Savings Account Statement": "bank_statement_extractor",
  "Business Bank Statement": "bank_statement_extractor",
  "Credit Card Statement": "credit_card_statement_extractor",
  "Debit Card Statement": "credit_card_statement_extractor",
  "Loan Statement": "loan_mortgage_extractor",
  "Mortgage Statement": "loan_mortgage_extractor",
  "Mortgage Contract": "loan_mortgage_extractor",
  "Escrow Statement": "loan_mortgage_extractor",
  "Phone Installment Plan": "loan_mortgage_extractor",
  "Pay Slip": "payslip_extractor",
  "Bonus Statement": "payslip_extractor",
  "Timesheet": "payslip_extractor",
  "Employment Verification Letter": "payslip_extractor",
  "Offer Letter": "payslip_extractor",
  "Investment Statement": "investment_extractor",
  "Pension Statement": "investment_extractor",
  "Provident Fund Statement": "investment_extractor",
  "Education Fund Statement": "investment_extractor",
  "Trade Confirmation": "investment_extractor",
  "Dividend Notice": "investment_extractor",
  "Cryptocurrency Statement": "investment_extractor",
  "Stock Option Grant": "investment_extractor",
  "Tax Return": "tax_extractor",
  "Tax Assessment Notice": "tax_extractor",
  "Tax Payment Receipt": "tax_extractor",
  "Property Tax Statement": "tax_extractor",
  "Retail Receipt": "generic_receipt_extractor",
  "Online Order Confirmation": "generic_receipt_extractor",
  "Online Purchase Receipt": "generic_receipt_extractor",
  "Supermarket Receipt": "generic_receipt_extractor",
  "Restaurant Receipt": "generic_receipt_extractor",
  "Fuel Receipt": "generic_receipt_extractor",
  "Pharmacy Receipt": "generic_receipt_extractor",
  "Electronics Receipt": "generic_receipt_extractor",
  "Clothing Receipt": "generic_receipt_extractor",
  "Service Receipt": "generic_receipt_extractor",
  "Repair Receipt": "generic_receipt_extractor",
  "Return / Refund Receipt": "generic_receipt_extractor",
  "Charitable Donation Receipt": "generic_receipt_extractor",
  "Childcare Receipt": "generic_receipt_extractor",
  "Therapy Receipt": "generic_receipt_extractor",
  "PayPal Receipt": "generic_receipt_extractor",
  "Stripe Receipt": "generic_receipt_extractor",
  "Apple App Store Receipt": "generic_receipt_extractor",
  "Google Play Receipt": "generic_receipt_extractor",
  "Amazon Order Invoice": "generic_receipt_extractor",
  "Utility Refund Notice": "generic_receipt_extractor",
  "Travel Expense Receipt": "generic_receipt_extractor",
  "Baggage Fee Receipt": "generic_receipt_extractor",
  "Airline Receipt": "generic_receipt_extractor",
  "Warranty Certificate": "warranty_extractor",
  "Home Appliance Warranty": "warranty_extractor",
  "Car Warranty": "warranty_extractor",
  "Health Insurance Policy": "insurance_policy_extractor",
  "Supplementary Health Insurance": "insurance_policy_extractor",
  "Life Insurance Policy": "insurance_policy_extractor",
  "Home Insurance Policy": "insurance_policy_extractor",
  "Car Insurance Policy": "insurance_policy_extractor",
  "Travel Insurance Policy": "insurance_policy_extractor",
  "Dental Insurance Policy": "insurance_policy_extractor",
  "Disability Insurance Policy": "insurance_policy_extractor",
  "Pet Insurance Policy": "insurance_policy_extractor",
  "Business Liability Insurance": "insurance_policy_extractor",
  "Coverage Renewal Notice": "insurance_policy_extractor",
  "Policy Quote": "insurance_policy_extractor",
  "Insurance Claim Form": "insurance_claim_extractor",
  "Reimbursement Approval": "insurance_claim_extractor",
  "Reimbursement Rejection Notice": "insurance_claim_extractor",
  "Vehicle Registration": "vehicle_document_extractor",
  "Vehicle Inspection Reminder": "vehicle_document_extractor",
  "Vehicle Service Record": "vehicle_document_extractor",
  "Vehicle Purchase Invoice": "vehicle_document_extractor",
  "Vehicle Sale Agreement": "vehicle_document_extractor",
  "Driver Points Statement": "vehicle_document_extractor",
  "Parking Permit": "vehicle_document_extractor",
  "Parking Subscription Bill": "vehicle_document_extractor",
  "Toll Charge Notice": "vehicle_document_extractor",
  "Parking Ticket": "fine_ticket_extractor",
  "Traffic Fine": "fine_ticket_extractor",
  "Fine / Penalty Notice": "fine_ticket_extractor",
  "Municipal Notice": "fine_ticket_extractor",
  "Flight Ticket": "travel_reservation_extractor",
  "Boarding Pass": "travel_reservation_extractor",
  "Hotel Reservation": "travel_reservation_extractor",
  "Vacation Rental Reservation": "travel_reservation_extractor",
  "Car Rental Reservation": "travel_reservation_extractor",
  "Cruise Ticket": "travel_reservation_extractor",
  "Train Ticket": "travel_reservation_extractor",
  "Bus Ticket": "travel_reservation_extractor",
  "Ferry Ticket": "travel_reservation_extractor",
  "Travel Itinerary": "travel_reservation_extractor",
  "Hotel Invoice": "travel_reservation_extractor",
  "Travel Insurance Certificate": "travel_reservation_extractor",
  "Concert Ticket": "event_ticket_extractor",
  "Theater Ticket": "event_ticket_extractor",
  "Sports Ticket": "event_ticket_extractor",
  "Cinema Ticket": "event_ticket_extractor",
  "Museum / Attraction Ticket": "event_ticket_extractor",
  "Event QR Pass": "event_ticket_extractor",
  "Season Ticket": "event_ticket_extractor",
  "Festival Ticket": "event_ticket_extractor",
  "Restaurant Reservation": "reservation_misc_extractor",
  "Appointment Confirmation": "reservation_misc_extractor",
  "Camp Registration": "reservation_misc_extractor",
  "Tour / Activity Booking": "reservation_misc_extractor",
  "Parking Reservation": "reservation_misc_extractor",
  "Booking Confirmation Email": "reservation_misc_extractor",
  "Prescription": "medical_record_extractor",
  "Lab Test Result": "medical_record_extractor",
  "Vaccination Record": "medical_record_extractor",
  "Hospital Discharge Summary": "medical_record_extractor",
  "Immunization Certificate": "medical_record_extractor",
  "Medical Referral": "medical_record_extractor",
  "Imaging Result": "medical_record_extractor",
  "Dental Treatment Plan": "medical_record_extractor",
  "Pet Vaccination Record": "medical_record_extractor",
  "Medical Invoice": "medical_invoice_extractor",
  "Hospital Bill": "medical_invoice_extractor",
  "Dental Invoice": "medical_invoice_extractor",
  "Orthotics Receipt": "medical_invoice_extractor",
  "Pet Medical Invoice": "medical_invoice_extractor",
  "School Report Card": "education_extractor",
  "Course Certificate": "education_extractor",
  "Diploma": "education_extractor",
  "Child School Document": "education_extractor",
  "Gift Card": "gift_credit_extractor",
  "Store Credit Voucher": "gift_credit_extractor",
  "Airline Voucher": "gift_credit_extractor",
  "Hotel Voucher": "gift_credit_extractor",
  "Loyalty Points Statement": "gift_credit_extractor",
  "Cashback Statement": "gift_credit_extractor",
  "Software Subscription Invoice": "subscription_extractor",
  "Gym Membership Agreement": "subscription_extractor",
  "Streaming Subscription Receipt": "subscription_extractor",
  "Software License Key": "subscription_extractor",
  "Invoice to Client": "business_doc_extractor",
  "Expense Invoice": "business_doc_extractor",
  "Purchase Order": "business_doc_extractor",
  "Expense Report": "business_doc_extractor",
  "Merchant Settlement Report": "business_doc_extractor",
  "Vendor Contract": "business_doc_extractor",
  "Freelance Contract": "business_doc_extractor",
  "Consulting Agreement": "business_doc_extractor",
  "Maintenance Contract": "business_doc_extractor",
  "Government Form / Application": "government_notice_extractor",
  "Immigration Approval Letter": "government_notice_extractor",
  "Background Check Report": "government_notice_extractor",
  "Passport Renewal Reminder": "government_notice_extractor",
};

export function getConfidenceBand(
  confidence: number,
  thresholds: ConfidenceThresholds
): ConfidenceBand {
  if (confidence >= thresholds.high_confidence) return "high";
  if (confidence >= thresholds.medium_confidence) return "medium";
  return "low";
}

export function pickExtractorTemplateId(taxonomy: string | null | undefined): string {
  if (!taxonomy) return "generic_document_fallback";
  return TAXONOMY_TO_TEMPLATE[taxonomy] ?? "generic_document_fallback";
}

export function buildNormalizedConfidence(
  rawScore: number,
  maxPossibleScore: number
): number {
  if (maxPossibleScore <= 0) return 0;
  const normalized = rawScore / maxPossibleScore;
  return Math.max(0, Math.min(1, normalized));
}

export function simpleScoreCandidate(
  input: ClassificationInput,
  def: TaxonomyDefinition,
  weights: ClassificationWeights
): CandidateScoreBreakdown {
  const text = (input.text || "").toLowerCase();
  const title = (input.title || "").toLowerCase();
  const layoutHints = (input.layoutHints || []).map(x => x.toLowerCase());
  const detectedLanguage = (input.detectedLanguage || "").toLowerCase();

  const containsAny = (items: string[]) => items.some(item => text.includes(item.toLowerCase()));
  const titleContainsAny = (items: string[]) => items.some(item => title.includes(item.toLowerCase()));
  const layoutContainsAny = (items: string[]) =>
    items.some(item => layoutHints.some(h => h.includes(item.toLowerCase())));
  const regexMatches = def.semantic_signals.ocr_patterns.filter(pattern => {
    try {
      return new RegExp(pattern, "i").test(input.text);
    } catch {
      return false;
    }
  }).length;

  const keywordScore =
    (containsAny(def.semantic_signals.keywords_he) ? weights.keyword_match : 0) +
    (containsAny(def.semantic_signals.keywords_en) ? weights.keyword_match : 0);

  const vendorScore = containsAny(def.semantic_signals.vendor_examples)
    ? weights.vendor_match
    : 0;

  const patternScore = regexMatches > 0 ? weights.ocr_pattern_match : 0;

  const layoutScore = layoutContainsAny(def.semantic_signals.layout_hints)
    ? weights.layout_hint_match
    : 0;

  const titleScore =
    titleContainsAny([
      def.taxonomy,
      ...def.semantic_signals.keywords_en,
      ...def.semantic_signals.keywords_he,
    ])
      ? weights.title_match
      : 0;

  const languageScore =
    detectedLanguage.startsWith("he") && def.semantic_signals.keywords_he.length > 0
      ? weights.language_hint_match
      : detectedLanguage.startsWith("en") && def.semantic_signals.keywords_en.length > 0
      ? weights.language_hint_match
      : 0;

  const penaltyScore = 0;
  const totalScore =
    keywordScore + vendorScore + patternScore + layoutScore + titleScore + languageScore + penaltyScore;

  const theoreticalMax =
    weights.keyword_match * 2 +
    weights.vendor_match +
    weights.ocr_pattern_match +
    weights.layout_hint_match +
    weights.title_match +
    weights.language_hint_match;

  return {
    taxonomy: def.taxonomy,
    keywordScore,
    vendorScore,
    patternScore,
    layoutScore,
    titleScore,
    languageScore,
    penaltyScore,
    totalScore,
    normalizedConfidence: buildNormalizedConfidence(totalScore, theoreticalMax),
  };
}

export function classifyDocument(
  input: ClassificationInput,
  taxonomyDefinitions: TaxonomyDefinition[],
  rules: ClassificationRules
): ClassificationResult {
  const breakdown = taxonomyDefinitions
    .map(def => simpleScoreCandidate(input, def, rules.scoring_weights))
    .sort((a, b) => b.normalizedConfidence - a.normalizedConfidence);

  const best = breakdown[0];
  if (!best || best.normalizedConfidence < rules.confidence_thresholds.low_confidence) {
    return {
      taxonomy: null,
      group: null,
      uiCategory: null,
      confidence: best?.normalizedConfidence ?? 0,
      confidenceBand: getConfidenceBand(best?.normalizedConfidence ?? 0, rules.confidence_thresholds),
      fallbackApplied: true,
      breakdown,
    };
  }

  const matchedDef = taxonomyDefinitions.find(d => d.taxonomy === best.taxonomy) ?? null;

  return {
    taxonomy: matchedDef?.taxonomy ?? null,
    group: matchedDef?.group ?? null,
    uiCategory: matchedDef?.ui_category ?? null,
    confidence: best.normalizedConfidence,
    confidenceBand: getConfidenceBand(best.normalizedConfidence, rules.confidence_thresholds),
    fallbackApplied: false,
    breakdown,
  };
}

export function buildExtractorRequest(params: {
  taxonomy: string | null;
  promptPack: ExtractionPromptPack;
  ocrText: string;
  layoutHints?: string[];
  filename?: string | null;
}) {
  const templateId = pickExtractorTemplateId(params.taxonomy);
  const template =
    params.promptPack.templates.find(t => t.template_id === templateId) ??
    params.promptPack.templates.find(t => t.template_id === "generic_document_fallback");

  if (!template) {
    throw new Error("No extraction template found, including fallback.");
  }

  return {
    template_id: template.template_id,
    system_prompt: template.system_prompt,
    instructions: template.extraction_instructions,
    hallucination_guards: template.hallucination_guards,
    output_contract: template.output_contract,
    runtime_context: {
      taxonomy: params.taxonomy,
      filename: params.filename ?? null,
      layout_hints: params.layoutHints ?? [],
      ocr_text: params.ocrText,
    },
  };
}

/**
 * Usage example:
 *
 * import taxonomyJson from "./nayeret_document_taxonomy_v2_israel_us_global.json";
 * import rulesJson from "./nayeret_classification_rules_v1.json";
 * import promptPackJson from "./nayeret_llm_extraction_prompt_pack_v1.json";
 *
 * const result = classifyDocument(
 *   { text: ocrText, title: fileName, detectedLanguage: "he" },
 *   taxonomyJson.documents,
 *   rulesJson
 * );
 *
 * const extractorRequest = buildExtractorRequest({
 *   taxonomy: result.taxonomy,
 *   promptPack: promptPackJson,
 *   ocrText,
 *   filename: fileName,
 * });
 */
