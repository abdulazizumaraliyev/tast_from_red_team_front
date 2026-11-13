export type ScopeBase = "all" | "active";

export interface ScopeInfo {
  base: ScopeBase;
  label: string;
  description: string;
  applied_filters: Record<string, unknown>;
}

export interface VolumeStats {
  records: number;
  user_messages: number;
  assistant_messages: number;
  other_role_messages: number;
  distinct_usersid_hash: number;
  deleted_at_filled: number;
  deleted_at_null: number;
  empty_user_texts: number;
  empty_assistant_texts: number;
}

export interface DatesInfo {
  created_at_min: string | null;
  created_at_max: string | null;
  created_at_null: number;
  timezone_note: string;
}

export interface MonthStat {
  month: string;
  records: number;
  user_messages: number;
}

export interface LanguageStat {
  language: string | null;
  records: number;
  user_messages: number;
  share_of_records: number;
}

export interface MissingField {
  field: string;
  total: number;
  null_count: number;
  empty_count: number;
  missing_share: number;
  mostly_missing: boolean;
}

export interface TopUser {
  usersid_hash: string;
  records: number;
  share_of_records: number;
}

export interface ActivityConcentration {
  max_records_per_hash: number;
  top_1_share: number;
  top_5_share: number;
  top_10_share: number;
  top_users: TopUser[];
}

export interface ImportCheck {
  name: string;
  expected: number;
  actual: number;
  ok: boolean;
}

export interface Limitation {
  code: string;
  text: string;
}

export interface StatsSummary {
  scope: ScopeInfo;
  volume: VolumeStats;
  dates: DatesInfo;
  by_month: MonthStat[];
  languages: LanguageStat[];
  missing_fields: MissingField[];
  activity_concentration: ActivityConcentration;
  import_check: ImportCheck[];
  data_notes: string[];
  limitations: Limitation[];
}

export interface OptionRow {
  value: string | null;
  records: number;
  user_messages?: number;
}

export interface FilterOptions {
  scope: ScopeInfo;
  scopes: { value: ScopeBase; label: string; description: string }[];
  roles: OptionRow[];
  languages: OptionRow[];
  created_at_min: string | null;
  created_at_max: string | null;
  notes: string[];
}

export interface MessageListItem {
  id: number;
  usersid_hash: string;
  role: string;
  text: string | null;
  actions: string | null;
  created_at: string | null;
  deleted_at: string | null;
  user_language: string | null;
}

export interface MessagesPage {
  items: MessageListItem[];
  total: number;
  page: number;
  size: number;
  pages: number;
  has_next: boolean;
  has_previous: boolean;
  scope: string;
  applied_filters: Record<string, unknown>;
}

export interface MessageDetail {
  id: number;
  usersid_hash: string;
  role: string;
  text: string | null;
  actions: string | null;
  created_at: string | null;
  updated_at: string | null;
  deleted_at: string | null;
  time_stt: number | null;
  time_gpt: number | null;
  time_cache: number | null;
  user_language: string | null;
  personality: string | null;
  type: string | null;
  internet: string | null;
  user_request_type: string | null;
  ai_response_type: string | null;
  stt_quality: string | null;
  ai_quality: string | null;
  notes: string[];
}

export interface ContextItem {
  id: number;
  role: string;
  text: string | null;
  actions: string | null;
  created_at: string | null;
  deleted_at: string | null;
  user_language: string | null;
  is_target: boolean;
  offset: number;
  gap_seconds: number | null;
}

export interface MessageContext {
  target_id: number;
  usersid_hash: string;
  scope: string;
  before: number;
  after: number;
  window_minutes: number | null;
  rule: string;
  disclaimer: string;
  items: ContextItem[];
}

export type CardKind = "need" | "hypothesis" | string;
export type CardStatus = "draft" | "verified" | string;

export interface CardListItem {
  slug: string;
  kind: CardKind;
  title: string;
  summary: string;
  status: CardStatus;
  verdict: string | null;
  matching_user_messages: number;
  distinct_usersid_hash: number;
  denominator_user_messages: number;
  share_of_user_messages: number;
}

export interface CardList {
  scope: ScopeInfo;
  items: CardListItem[];
}

export interface CardLanguageRow {
  language: string | null;
  matching_user_messages: number;
  distinct_usersid_hash: number;
  user_messages_in_language: number;
  share_of_language: number;
}

export interface CardMonthRow {
  month: string;
  matching_user_messages: number;
}

export interface CardTopUser {
  usersid_hash: string;
  matching_user_messages: number;
  share_of_matches: number;
}

export interface CardWithoutTopUser {
  excluded_usersid_hash: string;
  matching_before: number;
  matching_after: number;
  distinct_after: number;
  denominator_after: number;
  share_before: number;
  share_after: number;
}

export interface CardStats {
  scope: ScopeInfo;
  unit: string;
  base_description: string;
  denominator_user_messages: number;
  matching_user_messages: number;
  distinct_usersid_hash: number;
  share_of_user_messages: number;
  by_language: CardLanguageRow[];
  by_month: CardMonthRow[];
  top_users: CardTopUser[];
  without_top_user: CardWithoutTopUser | null;
  notes: string[];
}

export interface CardExample {
  id: number;
  role?: string;
  text: string | null;
  created_at: string | null;
  user_language?: string | null;
  usersid_hash?: string;
  deleted_at?: string | null;
  matches_rule?: boolean;
  reason?: string;
}

export interface AmbiguousExample extends CardExample {
  explanation?: string;
}

export interface CardDetail extends CardListItem {
  observation: string;
  rule_text: string;
  alternative_explanations: string[];
  proposal: string;
  limitations: string[];
  stats: CardStats;
  examples: CardExample[];
  ambiguous_examples: AmbiguousExample[];
  missing_example_ids: number[];
  examples_note: string;
}

export interface CardMessagesPage {
  items: MessageListItem[];
  total: number;
  page: number;
  size: number;
  pages: number;
  has_next: boolean;
  has_previous: boolean;
  card_slug: string;
  rule_text: string;
  scope: string;
  applied_filters: Record<string, unknown>;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  phone: string | null;
  is_active: boolean;
  is_verified: boolean;
  is_superuser: boolean;
  has_password: boolean;
  plan: string;
  type: string;
  trial_ends_at: string | null;
  is_trial_active: boolean;
  trial_days_left: number;
  last_login_at: string | null;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface MessageQuery {
  scope: ScopeBase;
  page?: number;
  size?: number;
  role?: string | null;
  q?: string | null;
  date_from?: string | null;
  date_to?: string | null;
  user_language__in?: string[] | null;
  order_by?: string[];
}

/* ------------------------------ import ------------------------------ */

/** POST /thread-histories/import/file muvaffaqiyatli javobi. */
export interface ImportResult {
  received: number;
  inserted: number;
  skipped: number;
}

/** Backend `error.details` ichidagi bitta xato (fayl bazaga yozilmagan). */
export interface ImportIssue {
  position: number | null;
  id: number | null;
  field: string | null;
  message: string;
}