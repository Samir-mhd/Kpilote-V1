export type AIRole = "system" | "user" | "assistant";

export type AIUniverse =
  | "manager"
  | "advisor"
  | "brief"
  | "coaching"
  | "challenge"
  | "email"
  | "prediction"
  | "motivation"
  | "unknown";

export type AISeverity = "info" | "success" | "warning" | "danger";

export type AIActionPriority = "low" | "medium" | "high" | "critical";

export interface AIMessage {
  role: AIRole;
  content: string;
}

export interface AIInsight {
  id: string;
  title: string;
  description: string;
  severity: AISeverity;
}

export interface AIAlert {
  id: string;
  title: string;
  description: string;
  severity: AISeverity;
}

export interface AIAction {
  id: string;
  title: string;
  description: string;
  priority: AIActionPriority;
  dueDate?: string;
}

export interface AIMetadata {
  universe: AIUniverse;
  generatedAt: string;
  engine?: string;
  model?: string;
  source?: string;
  confidence?: number;
}

export interface AIRequest<TContext = unknown> {
  universe: AIUniverse;
  prompt: string;
  context?: TContext;
  messages?: AIMessage[];
  metadata?: Record<string, unknown>;
}

export interface AIResponse<TData = unknown> {
  success: boolean;
  message: string;
  actions: AIAction[];
  insights: AIInsight[];
  alerts: AIAlert[];
  data?: TData;
  metadata: AIMetadata;
}

export interface AIProviderRequest<TContext = unknown> {
  prompt: string;
  context?: TContext;
  messages?: AIMessage[];
  metadata?: Record<string, unknown>;
}

export interface AIProviderResponse {
  content: string;
  model?: string;
  raw?: unknown;
}

export interface AIProvider {
  name: string;
  generate<TContext = unknown>(
    request: AIProviderRequest<TContext>
  ): Promise<AIProviderResponse>;
}

export interface PromptBuildInput<TContext = unknown> {
  universe: AIUniverse;
  userPrompt: string;
  context?: TContext;
  instructions?: string[];
}

export interface ContextBuildInput<TContext = unknown> {
  universe: AIUniverse;
  context?: TContext;
  metadata?: Record<string, unknown>;
}

export interface ParsedAIContent<TData = unknown> {
  message: string;
  actions?: AIAction[];
  insights?: AIInsight[];
  alerts?: AIAlert[];
  data?: TData;
  confidence?: number;
}

export interface ResponseParserInput {
  universe: AIUniverse;
  rawContent: string;
  providerName?: string;
  model?: string;
  engine?: string;
}

export type AIEngineName =
  | "ManagerAI"
  | "AdvisorAI"
  | "BriefEngine"
  | "ChallengeEngine"
  | "CoachingEngine"
  | "EmailEngine"
  | "MotivationEngine"
  | "PredictionEngine";