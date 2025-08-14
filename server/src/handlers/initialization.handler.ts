/**
 * MCP Initialization Handler
 * Handles the initialize and initialized methods for MCP protocol handshake
 */

import Joi from 'joi';
import winston from 'winston';
import { BaseMCPHandler } from './base.handler';
import {
  JSONRPCRequest,
  InitializeParams,
  InitializeResult,
  MCPServerCapabilities,
  MCPErrorCode
} from '@/types/mcp.types';

/**
 * Handler for the 'initialize' method
 */
export class InitializeHandler extends BaseMCPHandler<'initialize'> {
  private serverInfo: {
    name: string;
    version: string;
  };

  constructor(logger: winston.Logger, serverInfo: { name: string; version: string }) {
    super('initialize', logger);
    this.serverInfo = serverInfo;
  }

  protected getParamsSchema(): Joi.ObjectSchema {
    return Joi.object({
      protocolVersion: Joi.string().required().description('MCP protocol version'),
      capabilities: Joi.object({
        experimental: Joi.object().optional(),
        sampling: Joi.object().optional(),
        tools: Joi.object({
          listChanged: Joi.boolean().optional()
        }).optional(),
        resources: Joi.object({
          subscribe: Joi.boolean().optional(),
          listChanged: Joi.boolean().optional()
        }).optional(),
        prompts: Joi.object({
          listChanged: Joi.boolean().optional()
        }).optional(),
        logging: Joi.object().optional(),
        roots: Joi.object({
          listChanged: Joi.boolean().optional()
        }).optional()
      }).required().description('Client capabilities'),
      clientInfo: Joi.object({
        name: Joi.string().required(),
        version: Joi.string().required()
      }).required().description('Client information')
    });
  }

  protected async execute(
    params: InitializeParams,
    request: JSONRPCRequest
  ): Promise<InitializeResult> {
    this.logger.info('Initializing MCP server', {
      clientName: params.clientInfo.name,
      clientVersion: params.clientInfo.version,
      protocolVersion: params.protocolVersion,
      clientCapabilities: params.capabilities
    });

    // Validate protocol version compatibility
    if (!this.isProtocolVersionSupported(params.protocolVersion)) {
      throw this.createError(
        MCPErrorCode.INITIALIZATION_FAILED,
        `Unsupported protocol version: ${params.protocolVersion}. Supported versions: 2024-11-05`,
        { supportedVersions: ['2024-11-05'] }
      );
    }

    // Define server capabilities based on what we support
    const serverCapabilities: MCPServerCapabilities = {
      tools: {
        listChanged: true
      },
      resources: {
        subscribe: true,
        listChanged: true
      },
      prompts: {
        listChanged: true
      },
      logging: {}
    };

    const result: InitializeResult = {
      protocolVersion: '2024-11-05',
      capabilities: serverCapabilities,
      serverInfo: this.serverInfo,
      instructions: this.getServerInstructions()
    };

    this.logger.info('MCP server initialized successfully', {
      serverCapabilities,
      clientInfo: params.clientInfo
    });

    return result;
  }

  /**
   * Check if the requested protocol version is supported
   */
  private isProtocolVersionSupported(version: string): boolean {
    const supportedVersions = ['2024-11-05'];
    return supportedVersions.includes(version);
  }

  /**
   * Get server instructions for the client
   */
  private getServerInstructions(): string {
    return `
# MCP Career Intelligence Server

This server provides access to Mark Cena's career intelligence data through the Notion API.

## Available Tools:
- **get_career_initiatives**: Retrieve current career development initiatives
- **get_achievements**: Fetch accomplishments and achievements
- **get_tasks**: Get current career development tasks
- **search_career_data**: Search across all career data
- **get_skill_analysis**: Analyze skills and competencies

## Available Resources:
- **notion://initiatives**: Career initiatives database
- **notion://achievements**: Achievements database  
- **notion://tasks**: Tasks database

## Available Prompts:
- **career_summary**: Generate a comprehensive career summary
- **skill_gap_analysis**: Analyze skill gaps for target roles
- **interview_preparation**: Prepare for technical interviews

The server integrates with Notion API to provide real-time access to career development data for both Claude.ai integration and portfolio presentation.
    `.trim();
  }
}

/**
 * Handler for the 'initialized' method
 */
export class InitializedHandler extends BaseMCPHandler<'initialized'> {
  constructor(logger: winston.Logger) {
    super('initialized', logger);
  }

  protected getParamsSchema(): Joi.ObjectSchema | null {
    // The initialized method has no parameters
    return null;
  }

  protected async execute(): Promise<Record<string, never>> {
    this.logger.info('Client initialization complete');
    
    // The initialized notification confirms that the client has completed initialization
    // This is where we could trigger any post-initialization setup if needed
    
    return {};
  }
}