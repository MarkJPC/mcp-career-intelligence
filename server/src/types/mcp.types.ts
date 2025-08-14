/**
 * Complete TypeScript types for Model Context Protocol (MCP)
 * Based on MCP specification v1.0
 * Includes comprehensive type safety for all MCP operations
 */

/**
 * Base JSON-RPC 2.0 types
 */
export interface JSONRPCRequest {
  jsonrpc: '2.0';
  id: string | number | null;
  method: string;
  params?: Record<string, unknown>;
}

export interface JSONRPCResponse<T = unknown> {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: T;
  error?: JSONRPCError;
}

export interface JSONRPCError {
  code: number;
  message: string;
  data?: unknown;
}

export interface JSONRPCNotification {
  jsonrpc: '2.0';
  method: string;
  params?: Record<string, unknown>;
}

/**
 * MCP Protocol Version and Capabilities
 */
export interface MCPCapabilities {
  experimental?: Record<string, unknown>;
  sampling?: Record<string, unknown>;
  tools?: {
    listChanged?: boolean;
  };
  resources?: {
    subscribe?: boolean;
    listChanged?: boolean;
  };
  prompts?: {
    listChanged?: boolean;
  };
  logging?: Record<string, unknown>;
}

export interface MCPClientCapabilities extends MCPCapabilities {
  roots?: {
    listChanged?: boolean;
  };
}

export interface MCPServerCapabilities extends MCPCapabilities {
  // Server-specific capabilities
}

/**
 * MCP Initialization
 */
export interface InitializeParams {
  protocolVersion: string;
  capabilities: MCPClientCapabilities;
  clientInfo: {
    name: string;
    version: string;
  };
}

export interface InitializeResult {
  protocolVersion: string;
  capabilities: MCPServerCapabilities;
  serverInfo: {
    name: string;
    version: string;
  };
  instructions?: string;
}

/**
 * MCP Resource Types
 */
export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface MCPResourceContents {
  uri: string;
  mimeType?: string;
  text?: string;
  blob?: string;
}

export interface MCPResourceTemplate {
  uriTemplate: string;
  name: string;
  description?: string;
  mimeType?: string;
}

/**
 * MCP Tool Types
 */
export interface MCPTool {
  name: string;
  description?: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface MCPToolCall {
  name: string;
  arguments?: Record<string, unknown>;
}

export interface MCPToolResult {
  content: MCPContent[];
  isError?: boolean;
}

/**
 * MCP Content Types
 */
export type MCPContent = MCPTextContent | MCPImageContent | MCPResourceContent;

export interface MCPTextContent {
  type: 'text';
  text: string;
}

export interface MCPImageContent {
  type: 'image';
  data: string;
  mimeType: string;
}

export interface MCPResourceContent {
  type: 'resource';
  resource: {
    uri: string;
    text?: string;
    blob?: string;
    mimeType?: string;
  };
}

/**
 * MCP Prompt Types
 */
export interface MCPPrompt {
  name: string;
  description?: string;
  arguments?: MCPPromptArgument[];
}

export interface MCPPromptArgument {
  name: string;
  description?: string;
  required?: boolean;
}

export interface MCPPromptMessage {
  role: 'user' | 'assistant';
  content: MCPContent;
}

export interface MCPGetPromptResult {
  description?: string;
  messages: MCPPromptMessage[];
}

/**
 * MCP Sampling Types
 */
export interface MCPSamplingMessage {
  role: 'user' | 'assistant';
  content: MCPContent;
}

export interface MCPCreateMessageParams {
  messages: MCPSamplingMessage[];
  modelPreferences?: {
    hints?: {
      name?: string;
    }[];
    costPriority?: number;
    speedPriority?: number;
    intelligencePriority?: number;
  };
  systemPrompt?: string;
  includeContext?: 'none' | 'thisServer' | 'allServers';
  temperature?: number;
  maxTokens: number;
  stopSequences?: string[];
  metadata?: Record<string, unknown>;
}

export interface MCPCreateMessageResult {
  role: 'assistant';
  content: MCPContent;
  model: string;
  stopReason?: 'endTurn' | 'stopSequence' | 'maxTokens';
}

/**
 * MCP Logging Types
 */
export type MCPLogLevel = 'debug' | 'info' | 'notice' | 'warning' | 'error' | 'critical' | 'alert' | 'emergency';

export interface MCPLogMessage {
  level: MCPLogLevel;
  data?: unknown;
  logger?: string;
}

/**
 * MCP Ping/Progress Types
 */
export interface MCPProgressToken {
  progressToken: string | number;
}

export interface MCPProgress {
  progressToken: string | number;
  progress: number;
  total?: number;
}

/**
 * MCP Method Names
 */
export type MCPMethod =
  | 'initialize'
  | 'initialized'
  | 'ping'
  | 'resources/list'
  | 'resources/templates/list'
  | 'resources/read'
  | 'resources/subscribe'
  | 'resources/unsubscribe'
  | 'tools/list'
  | 'tools/call'
  | 'prompts/list'
  | 'prompts/get'
  | 'sampling/createMessage'
  | 'logging/setLevel'
  | 'notifications/initialized'
  | 'notifications/progress'
  | 'notifications/message'
  | 'notifications/resources/updated'
  | 'notifications/resources/list_changed'
  | 'notifications/tools/list_changed'
  | 'notifications/prompts/list_changed';

/**
 * MCP Request/Response Mapping
 */
export interface MCPMethodParams {
  'initialize': InitializeParams;
  'initialized': Record<string, never>;
  'ping': Record<string, never>;
  'resources/list': { cursor?: string };
  'resources/templates/list': { cursor?: string };
  'resources/read': { uri: string };
  'resources/subscribe': { uri: string };
  'resources/unsubscribe': { uri: string };
  'tools/list': { cursor?: string };
  'tools/call': MCPToolCall & MCPProgressToken;
  'prompts/list': { cursor?: string };
  'prompts/get': { name: string; arguments?: Record<string, unknown> };
  'sampling/createMessage': MCPCreateMessageParams;
  'logging/setLevel': { level: MCPLogLevel };
  'notifications/initialized': Record<string, never>;
  'notifications/progress': MCPProgress;
  'notifications/message': MCPLogMessage;
  'notifications/resources/updated': { uri: string };
  'notifications/resources/list_changed': Record<string, never>;
  'notifications/tools/list_changed': Record<string, never>;
  'notifications/prompts/list_changed': Record<string, never>;
}

export interface MCPMethodResults {
  'initialize': InitializeResult;
  'initialized': Record<string, never>;
  'ping': Record<string, never>;
  'resources/list': { resources: MCPResource[]; nextCursor?: string };
  'resources/templates/list': { resourceTemplates: MCPResourceTemplate[]; nextCursor?: string };
  'resources/read': { contents: MCPResourceContents[] };
  'resources/subscribe': Record<string, never>;
  'resources/unsubscribe': Record<string, never>;
  'tools/list': { tools: MCPTool[]; nextCursor?: string };
  'tools/call': MCPToolResult;
  'prompts/list': { prompts: MCPPrompt[]; nextCursor?: string };
  'prompts/get': MCPGetPromptResult;
  'sampling/createMessage': MCPCreateMessageResult;
  'logging/setLevel': Record<string, never>;
  'notifications/initialized': Record<string, never>;
  'notifications/progress': Record<string, never>;
  'notifications/message': Record<string, never>;
  'notifications/resources/updated': Record<string, never>;
  'notifications/resources/list_changed': Record<string, never>;
  'notifications/tools/list_changed': Record<string, never>;
  'notifications/prompts/list_changed': Record<string, never>;
}

/**
 * Helper type for strongly typed MCP requests
 */
export type MCPRequest<T extends MCPMethod> = JSONRPCRequest & {
  method: T;
  params: MCPMethodParams[T];
};

/**
 * Helper type for strongly typed MCP responses
 */
export type MCPResponse<T extends MCPMethod> = JSONRPCResponse<MCPMethodResults[T]>;

/**
 * Transport layer types
 */
export type MCPTransportType = 'stdio' | 'websocket' | 'sse';

export interface MCPTransportConfig {
  type: MCPTransportType;
  options?: Record<string, unknown>;
}

/**
 * Server configuration types
 */
export interface MCPServerConfig {
  name: string;
  version: string;
  transport: MCPTransportConfig;
  capabilities: MCPServerCapabilities;
  maxRequestSize?: number;
  requestTimeout?: number;
  enableLogging?: boolean;
  logLevel?: MCPLogLevel;
}

/**
 * Error codes for MCP protocol
 */
export enum MCPErrorCode {
  // Standard JSON-RPC 2.0 errors
  PARSE_ERROR = -32700,
  INVALID_REQUEST = -32600,
  METHOD_NOT_FOUND = -32601,
  INVALID_PARAMS = -32602,
  INTERNAL_ERROR = -32603,
  
  // MCP-specific errors
  INITIALIZATION_FAILED = -32000,
  RESOURCE_NOT_FOUND = -32001,
  TOOL_EXECUTION_ERROR = -32002,
  PROMPT_NOT_FOUND = -32003,
  SAMPLING_ERROR = -32004,
  TRANSPORT_ERROR = -32005,
  VALIDATION_ERROR = -32006,
  AUTHORIZATION_ERROR = -32007,
  RATE_LIMIT_ERROR = -32008,
  TIMEOUT_ERROR = -32009
}

/**
 * Custom error class for MCP operations
 */
export class MCPError extends Error {
  constructor(
    public code: MCPErrorCode,
    message: string,
    public data?: unknown
  ) {
    super(message);
    this.name = 'MCPError';
  }

  toJSONRPCError(): JSONRPCError {
    return {
      code: this.code,
      message: this.message,
      data: this.data
    };
  }
}