/**
 * Base handler for MCP protocol operations
 * Provides common functionality and error handling for all MCP handlers
 */

import winston from 'winston';
import Joi from 'joi';
import {
  JSONRPCRequest,
  JSONRPCResponse,
  MCPError,
  MCPErrorCode,
  MCPMethod,
  MCPMethodParams,
  MCPMethodResults
} from '@/types/mcp.types';

/**
 * Base class for all MCP protocol handlers
 */
export abstract class BaseMCPHandler<T extends MCPMethod> {
  protected logger: winston.Logger;
  protected method: T;

  constructor(method: T, logger: winston.Logger) {
    this.method = method;
    this.logger = logger.child({ handler: method });
  }

  /**
   * Handle MCP request with comprehensive error handling and validation
   */
  async handle(request: JSONRPCRequest): Promise<JSONRPCResponse<MCPMethodResults[T]>> {
    const startTime = Date.now();
    const requestId = request.id;

    this.logger.info('Handling MCP request', {
      method: this.method,
      requestId,
      params: this.sanitizeParams(request.params)
    });

    try {
      // Validate request structure
      this.validateRequest(request);

      // Validate method-specific parameters
      const validatedParams = this.validateParams(request.params);

      // Execute the handler logic
      const result = await this.execute(validatedParams, request);

      // Log successful completion
      const duration = Date.now() - startTime;
      this.logger.info('MCP request completed successfully', {
        method: this.method,
        requestId,
        duration
      });

      return {
        jsonrpc: '2.0',
        id: requestId,
        result
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      
      if (error instanceof MCPError) {
        this.logger.warn('MCP request failed with known error', {
          method: this.method,
          requestId,
          duration,
          errorCode: error.code,
          errorMessage: error.message
        });

        return {
          jsonrpc: '2.0',
          id: requestId,
          error: error.toJSONRPCError()
        };
      }

      // Handle unexpected errors
      this.logger.error('MCP request failed with unexpected error', {
        method: this.method,
        requestId,
        duration,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });

      return {
        jsonrpc: '2.0',
        id: requestId,
        error: {
          code: MCPErrorCode.INTERNAL_ERROR,
          message: 'Internal server error',
          data: process.env['NODE_ENV'] === 'development' ? {
            originalError: error instanceof Error ? error.message : String(error)
          } : undefined
        }
      };
    }
  }

  /**
   * Validate basic request structure
   */
  protected validateRequest(request: JSONRPCRequest): void {
    if (!request) {
      throw new MCPError(
        MCPErrorCode.INVALID_REQUEST,
        'Request is required'
      );
    }

    if (request.jsonrpc !== '2.0') {
      throw new MCPError(
        MCPErrorCode.INVALID_REQUEST,
        'Invalid JSON-RPC version'
      );
    }

    if (request.method !== this.method) {
      throw new MCPError(
        MCPErrorCode.METHOD_NOT_FOUND,
        `Expected method '${this.method}', got '${request.method}'`
      );
    }
  }

  /**
   * Validate method-specific parameters using Joi schema
   */
  protected validateParams(params: unknown): MCPMethodParams[T] {
    const schema = this.getParamsSchema();
    
    if (!schema) {
      return (params || {}) as MCPMethodParams[T];
    }

    const { error, value } = schema.validate(params);
    
    if (error) {
      throw new MCPError(
        MCPErrorCode.INVALID_PARAMS,
        `Parameter validation failed: ${error.message}`,
        { validationDetails: error.details }
      );
    }

    return value as MCPMethodParams[T];
  }

  /**
   * Sanitize parameters for logging (remove sensitive data)
   */
  protected sanitizeParams(params: unknown): unknown {
    if (!params || typeof params !== 'object') {
      return params;
    }

    const sanitized = { ...params as Record<string, unknown> };
    
    // Remove sensitive fields
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization'];
    
    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  /**
   * Get Joi schema for parameter validation (to be implemented by subclasses)
   */
  protected abstract getParamsSchema(): Joi.ObjectSchema | null;

  /**
   * Execute the actual handler logic (to be implemented by subclasses)
   */
  protected abstract execute(
    params: MCPMethodParams[T],
    request: JSONRPCRequest
  ): Promise<MCPMethodResults[T]>;

  /**
   * Create standardized error for common scenarios
   */
  protected createError(
    code: MCPErrorCode,
    message: string,
    data?: unknown
  ): MCPError {
    return new MCPError(code, message, data);
  }

  /**
   * Check if the handler supports the given method
   */
  supportsMethod(method: string): method is T {
    return method === this.method;
  }
}

/**
 * Handler registry for managing MCP handlers
 */
export class MCPHandlerRegistry {
  private handlers = new Map<MCPMethod, BaseMCPHandler<any>>();
  private logger: winston.Logger;

  constructor(logger: winston.Logger) {
    this.logger = logger.child({ component: 'handler-registry' });
  }

  /**
   * Register a handler for a specific method
   */
  register<T extends MCPMethod>(handler: BaseMCPHandler<T>): void {
    const method = handler['method'];
    
    if (this.handlers.has(method)) {
      throw new Error(`Handler for method '${method}' is already registered`);
    }

    this.handlers.set(method, handler);
    this.logger.info('Handler registered', { method });
  }

  /**
   * Get handler for a specific method
   */
  getHandler(method: MCPMethod): BaseMCPHandler<any> | undefined {
    return this.handlers.get(method);
  }

  /**
   * Handle MCP request by routing to appropriate handler
   */
  async handleRequest(request: JSONRPCRequest): Promise<JSONRPCResponse> {
    const handler = this.getHandler(request.method as MCPMethod);
    
    if (!handler) {
      this.logger.warn('No handler found for method', { method: request.method });
      
      return {
        jsonrpc: '2.0',
        id: request.id,
        error: {
          code: MCPErrorCode.METHOD_NOT_FOUND,
          message: `Method '${request.method}' not found`
        }
      };
    }

    return handler.handle(request);
  }

  /**
   * Get all registered methods
   */
  getRegisteredMethods(): MCPMethod[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * Check if a method is registered
   */
  hasHandler(method: MCPMethod): boolean {
    return this.handlers.has(method);
  }

  /**
   * Unregister a handler
   */
  unregister(method: MCPMethod): boolean {
    const removed = this.handlers.delete(method);
    if (removed) {
      this.logger.info('Handler unregistered', { method });
    }
    return removed;
  }

  /**
   * Clear all handlers
   */
  clear(): void {
    this.handlers.clear();
    this.logger.info('All handlers cleared');
  }
}