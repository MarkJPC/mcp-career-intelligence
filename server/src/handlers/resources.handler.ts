/**
 * MCP Resources Handler
 * Handles resource listing, reading, and subscription for career data resources
 */

import Joi from 'joi';
import winston from 'winston';
import { Client } from '@notionhq/client';
import { BaseMCPHandler } from './base.handler';
import {
  JSONRPCRequest,
  MCPResource,
  MCPResourceContents,
  MCPResourceTemplate,
  MCPErrorCode
} from '@/types/mcp.types';

/**
 * Handler for the 'resources/list' method
 */
export class ResourcesListHandler extends BaseMCPHandler<'resources/list'> {
  constructor(logger: winston.Logger) {
    super('resources/list', logger);
  }

  protected getParamsSchema(): Joi.ObjectSchema {
    return Joi.object({
      cursor: Joi.string().optional().description('Pagination cursor')
    });
  }

  protected async execute(): Promise<{ resources: MCPResource[]; nextCursor: string }> {
    const resources: MCPResource[] = [
      {
        uri: 'notion://initiatives',
        name: 'Career Initiatives',
        description: 'Current career development initiatives and projects',
        mimeType: 'application/json'
      },
      {
        uri: 'notion://achievements',
        name: 'Career Achievements',
        description: 'Comprehensive record of career accomplishments',
        mimeType: 'application/json'
      },
      {
        uri: 'notion://tasks',
        name: 'Career Tasks',
        description: 'Action items and tasks for career development',
        mimeType: 'application/json'
      },
      {
        uri: 'notion://career-summary',
        name: 'Career Summary',
        description: 'Comprehensive career overview and analysis',
        mimeType: 'text/markdown'
      }
    ];

    this.logger.info('Returning available resources', { resourceCount: resources.length });

    return {
      resources,
      nextCursor: 'cursor-123'
    };
  }
}

/**
 * Handler for the 'resources/templates/list' method
 */
export class ResourceTemplatesListHandler extends BaseMCPHandler<'resources/templates/list'> {
  constructor(logger: winston.Logger) {
    super('resources/templates/list', logger);
  }

  protected getParamsSchema(): Joi.ObjectSchema {
    return Joi.object({
      cursor: Joi.string().optional().description('Pagination cursor')
    });
  }

  protected async execute(): Promise<{ resourceTemplates: MCPResourceTemplate[]; nextCursor?: string }> {
    const resourceTemplates: MCPResourceTemplate[] = [
      {
        uriTemplate: 'notion://initiatives/{id}',
        name: 'Specific Initiative',
        description: 'Individual career initiative by ID',
        mimeType: 'application/json'
      },
      {
        uriTemplate: 'notion://achievements/{id}',
        name: 'Specific Achievement',
        description: 'Individual achievement by ID',
        mimeType: 'application/json'
      },
      {
        uriTemplate: 'notion://tasks/{id}',
        name: 'Specific Task',
        description: 'Individual task by ID',
        mimeType: 'application/json'
      },
      {
        uriTemplate: 'notion://search/{query}',
        name: 'Career Data Search',
        description: 'Search results across all career data',
        mimeType: 'application/json'
      }
    ];

    this.logger.info('Returning resource templates', { templateCount: resourceTemplates.length });

    return {
      resourceTemplates,
      nextCursor: undefined
    };
  }
}

/**
 * Handler for the 'resources/read' method
 */
export class ResourcesReadHandler extends BaseMCPHandler<'resources/read'> {
  private notionClient: Client;

  constructor(logger: winston.Logger, notionClient: Client) {
    super('resources/read', logger);
    this.notionClient = notionClient;
  }

  protected getParamsSchema(): Joi.ObjectSchema {
    return Joi.object({
      uri: Joi.string().required().description('Resource URI to read')
    });
  }

  protected async execute(
    params: { uri: string }
  ): Promise<{ contents: MCPResourceContents[] }> {
    this.logger.info('Reading resource', { uri: params.uri });

    const uri = params.uri;
    
    if (!uri.startsWith('notion://')) {
      throw this.createError(
        MCPErrorCode.RESOURCE_NOT_FOUND,
        `Unsupported URI scheme: ${uri}`
      );
    }

    const path = uri.replace('notion://', '');
    const pathParts = path.split('/');
    const resourceType = pathParts[0];

    try {
      switch (resourceType) {
        case 'initiatives':
          return await this.readInitiatives(pathParts);
        
        case 'achievements':
          return await this.readAchievements(pathParts);
        
        case 'tasks':
          return await this.readTasks(pathParts);
        
        case 'career-summary':
          return await this.readCareerSummary();
        
        case 'search':
          if (pathParts.length < 2) {
            throw this.createError(
              MCPErrorCode.INVALID_PARAMS,
              'Search query required'
            );
          }
          return await this.readSearchResults(decodeURIComponent(pathParts[1]));
        
        default:
          throw this.createError(
            MCPErrorCode.RESOURCE_NOT_FOUND,
            `Unknown resource type: ${resourceType}`
          );
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('Notion API')) {
        throw this.createError(
          MCPErrorCode.INTERNAL_ERROR,
          `Failed to read resource: ${error.message}`
        );
      }
      throw error;
    }
  }

  /**
   * Read initiatives resource
   */
  private async readInitiatives(pathParts: string[]): Promise<{ contents: MCPResourceContents[] }> {
    const databaseId = process.env.NOTION_INITIATIVES_DB_ID;
    if (!databaseId) {
      throw this.createError(
        MCPErrorCode.INTERNAL_ERROR,
        'Notion initiatives database ID not configured'
      );
    }

    if (pathParts.length > 1) {
      // Read specific initiative
      const initiativeId = pathParts[1];
      const page = await this.notionClient.pages.retrieve({ page_id: initiativeId });
      
      return {
        contents: [{
          uri: `notion://initiatives/${initiativeId}`,
          mimeType: 'application/json',
          text: JSON.stringify(this.formatInitiative(page), null, 2)
        }]
      };
    }

    // Read all initiatives
    const response = await this.notionClient.databases.query({
      database_id: databaseId,
      sorts: [
        { property: 'Priority', direction: 'ascending' },
        { property: 'Date Started', direction: 'descending' }
      ]
    });

    const initiatives = response.results.map(page => this.formatInitiative(page));

    return {
      contents: [{
        uri: 'notion://initiatives',
        mimeType: 'application/json',
        text: JSON.stringify({
          initiatives,
          total: initiatives.length,
          last_updated: new Date().toISOString()
        }, null, 2)
      }]
    };
  }

  /**
   * Read achievements resource
   */
  private async readAchievements(pathParts: string[]): Promise<{ contents: MCPResourceContents[] }> {
    const databaseId = process.env.NOTION_ACHIEVEMENTS_DB_ID;
    if (!databaseId) {
      throw this.createError(
        MCPErrorCode.INTERNAL_ERROR,
        'Notion achievements database ID not configured'
      );
    }

    if (pathParts.length > 1) {
      // Read specific achievement
      const achievementId = pathParts[1];
      const page = await this.notionClient.pages.retrieve({ page_id: achievementId });
      
      return {
        contents: [{
          uri: `notion://achievements/${achievementId}`,
          mimeType: 'application/json',
          text: JSON.stringify(this.formatAchievement(page), null, 2)
        }]
      };
    }

    // Read all achievements
    const response = await this.notionClient.databases.query({
      database_id: databaseId,
      sorts: [
        { property: 'Date', direction: 'descending' }
      ]
    });

    const achievements = response.results.map(page => this.formatAchievement(page));

    return {
      contents: [{
        uri: 'notion://achievements',
        mimeType: 'application/json',
        text: JSON.stringify({
          achievements,
          total: achievements.length,
          last_updated: new Date().toISOString()
        }, null, 2)
      }]
    };
  }

  /**
   * Read tasks resource
   */
  private async readTasks(pathParts: string[]): Promise<{ contents: MCPResourceContents[] }> {
    const databaseId = process.env.NOTION_TASKS_DB_ID;
    if (!databaseId) {
      throw this.createError(
        MCPErrorCode.INTERNAL_ERROR,
        'Notion tasks database ID not configured'
      );
    }

    if (pathParts.length > 1) {
      // Read specific task
      const taskId = pathParts[1];
      const page = await this.notionClient.pages.retrieve({ page_id: taskId });
      
      return {
        contents: [{
          uri: `notion://tasks/${taskId}`,
          mimeType: 'application/json',
          text: JSON.stringify(this.formatTask(page), null, 2)
        }]
      };
    }

    // Read all tasks
    const response = await this.notionClient.databases.query({
      database_id: databaseId,
      sorts: [
        { property: 'Due Date', direction: 'ascending' },
        { property: 'Priority', direction: 'ascending' }
      ]
    });

    const tasks = response.results.map(page => this.formatTask(page));

    return {
      contents: [{
        uri: 'notion://tasks',
        mimeType: 'application/json',
        text: JSON.stringify({
          tasks,
          total: tasks.length,
          last_updated: new Date().toISOString()
        }, null, 2)
      }]
    };
  }

  /**
   * Read career summary resource
   */
  private async readCareerSummary(): Promise<{ contents: MCPResourceContents[] }> {
    // Generate a comprehensive career summary in markdown format
    const summary = `# Mark Cena - Career Intelligence Summary

## Overview
CS student (3.7 GPA, graduating 2026) at University of Calgary with demonstrated backend engineering capabilities and systems-level thinking. Currently positioned for backend roles in Calgary's tech ecosystem.

## Current Role
**Power Platform Developer Intern** at Intelbyte Corp
- Developing automation solutions and backend integrations
- Working with enterprise-grade platforms and APIs

## Technical Expertise
### Backend Development
- **Languages:** TypeScript, C#, JavaScript, Python
- **Frameworks:** Node.js, .NET, Express, React
- **Databases:** SQL Server, PostgreSQL, Notion API
- **DevOps:** Docker, Git, CI/CD pipelines

### Systems & Architecture
- **API Design:** RESTful services, MCP protocol implementation
- **Integration:** Third-party APIs, webhook systems
- **Development Tools:** Building developer tools and CLI applications

## Career Trajectory
### 2024 - Present: Intelbyte Corp
Power Platform Developer Intern focusing on automation and backend systems

### 2023: Previous Experience
- **Grey Bruce Plumbing:** React/TypeScript development
- **GEOPSI:** C#/.NET backend development

## Strategic Positioning
This career intelligence platform demonstrates:
1. **Systems Thinking:** Custom MCP server architecture
2. **Developer Tools:** Building tools that other developers use
3. **Production Readiness:** Docker, comprehensive testing, monitoring
4. **Backend Focus:** API design, data integration, server architecture

*Last updated: ${new Date().toISOString()}*
`;

    return {
      contents: [{
        uri: 'notion://career-summary',
        mimeType: 'text/markdown',
        text: summary
      }]
    };
  }

  /**
   * Read search results resource
   */
  private async readSearchResults(query: string): Promise<{ contents: MCPResourceContents[] }> {
    // Implement search across all databases
    const results: any = {
      query,
      results: {},
      search_time: new Date().toISOString()
    };

    // Search initiatives
    if (process.env.NOTION_INITIATIVES_DB_ID) {
      try {
        const response = await this.notionClient.databases.query({
          database_id: process.env.NOTION_INITIATIVES_DB_ID,
          filter: {
            or: [
              { property: 'Name', title: { contains: query } },
              { property: 'Description', rich_text: { contains: query } }
            ]
          },
          page_size: 10
        });
        results.results.initiatives = response.results.map(page => this.formatInitiative(page));
      } catch (error) {
        results.results.initiatives = { error: 'Search failed' };
      }
    }

    // Search achievements
    if (process.env.NOTION_ACHIEVEMENTS_DB_ID) {
      try {
        const response = await this.notionClient.databases.query({
          database_id: process.env.NOTION_ACHIEVEMENTS_DB_ID,
          filter: {
            or: [
              { property: 'Achievement', title: { contains: query } },
              { property: 'Description', rich_text: { contains: query } }
            ]
          },
          page_size: 10
        });
        results.results.achievements = response.results.map(page => this.formatAchievement(page));
      } catch (error) {
        results.results.achievements = { error: 'Search failed' };
      }
    }

    // Search tasks
    if (process.env.NOTION_TASKS_DB_ID) {
      try {
        const response = await this.notionClient.databases.query({
          database_id: process.env.NOTION_TASKS_DB_ID,
          filter: {
            property: 'Task',
            title: { contains: query }
          },
          page_size: 10
        });
        results.results.tasks = response.results.map(page => this.formatTask(page));
      } catch (error) {
        results.results.tasks = { error: 'Search failed' };
      }
    }

    return {
      contents: [{
        uri: `notion://search/${encodeURIComponent(query)}`,
        mimeType: 'application/json',
        text: JSON.stringify(results, null, 2)
      }]
    };
  }

  /**
   * Format methods (shared with tools handler)
   */
  private formatInitiative(page: any): any {
    const properties = page.properties;
    return {
      id: page.id,
      name: this.extractTitle(properties.Name),
      status: this.extractSelect(properties.Status),
      priority: this.extractSelect(properties.Priority),
      description: this.extractRichText(properties.Description),
      date_started: this.extractDate(properties['Date Started']),
      date_completed: this.extractDate(properties['Date Completed']),
      created_time: page.created_time,
      last_edited_time: page.last_edited_time
    };
  }

  private formatAchievement(page: any): any {
    const properties = page.properties;
    return {
      id: page.id,
      achievement: this.extractTitle(properties.Achievement),
      description: this.extractRichText(properties.Description),
      category: this.extractSelect(properties.Category),
      skills_used: this.extractMultiSelect(properties['Skills Used']),
      date: this.extractDate(properties.Date),
      created_time: page.created_time,
      last_edited_time: page.last_edited_time
    };
  }

  private formatTask(page: any): any {
    const properties = page.properties;
    return {
      id: page.id,
      task: this.extractTitle(properties.Task),
      status: this.extractSelect(properties.Status),
      priority: this.extractSelect(properties.Priority),
      due_date: this.extractDate(properties['Due Date']),
      tags: this.extractMultiSelect(properties.Tags),
      created_time: page.created_time,
      last_edited_time: page.last_edited_time
    };
  }

  private extractTitle(property: any): string {
    return property?.title?.[0]?.plain_text || '';
  }

  private extractRichText(property: any): string {
    return property?.rich_text?.map((rt: any) => rt.plain_text).join('') || '';
  }

  private extractSelect(property: any): string {
    return property?.select?.name || '';
  }

  private extractMultiSelect(property: any): string[] {
    return property?.multi_select?.map((ms: any) => ms.name) || [];
  }

  private extractDate(property: any): string | null {
    return property?.date?.start || null;
  }
}

/**
 * Handler for the 'resources/subscribe' method
 */
export class ResourcesSubscribeHandler extends BaseMCPHandler<'resources/subscribe'> {
  constructor(logger: winston.Logger) {
    super('resources/subscribe', logger);
  }

  protected getParamsSchema(): Joi.ObjectSchema {
    return Joi.object({
      uri: Joi.string().required().description('Resource URI to subscribe to')
    });
  }

  protected async execute(params: { uri: string }): Promise<Record<string, never>> {
    this.logger.info('Subscribing to resource', { uri: params.uri });
    
    // For now, just acknowledge the subscription
    // In a full implementation, this would set up change notifications
    
    return {};
  }
}

/**
 * Handler for the 'resources/unsubscribe' method
 */
export class ResourcesUnsubscribeHandler extends BaseMCPHandler<'resources/unsubscribe'> {
  constructor(logger: winston.Logger) {
    super('resources/unsubscribe', logger);
  }

  protected getParamsSchema(): Joi.ObjectSchema {
    return Joi.object({
      uri: Joi.string().required().description('Resource URI to unsubscribe from')
    });
  }

  protected async execute(params: { uri: string }): Promise<Record<string, never>> {
    this.logger.info('Unsubscribing from resource', { uri: params.uri });
    
    // For now, just acknowledge the unsubscription
    
    return {};
  }
}