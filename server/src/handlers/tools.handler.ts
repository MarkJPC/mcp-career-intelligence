/**
 * MCP Tools Handler
 * Handles tool listing and execution for career intelligence operations
 */

import Joi from 'joi';
import winston from 'winston';
import { Client } from '@notionhq/client';
import { BaseMCPHandler } from './base.handler';
import {
  JSONRPCRequest,
  MCPTool,
  MCPToolCall,
  MCPToolResult,
  MCPContent,
  MCPTextContent,
  MCPErrorCode
} from '@/types/mcp.types';

/**
 * Handler for the 'tools/list' method
 */
export class ToolsListHandler extends BaseMCPHandler<'tools/list'> {
  constructor(logger: winston.Logger) {
    super('tools/list', logger);
  }

  protected getParamsSchema(): Joi.ObjectSchema {
    return Joi.object({
      cursor: Joi.string().optional().description('Pagination cursor')
    });
  }

  protected async execute(): Promise<{ tools: MCPTool[]; nextCursor?: string }> {
    const tools: MCPTool[] = [
      {
        name: 'get_career_initiatives',
        description: 'Retrieve current career development initiatives from Notion database',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['Active', 'Completed', 'On Hold', 'Cancelled'],
              description: 'Filter by initiative status'
            },
            priority: {
              type: 'string',
              enum: ['High', 'Medium', 'Low'],
              description: 'Filter by priority level'
            },
            limit: {
              type: 'number',
              minimum: 1,
              maximum: 100,
              default: 20,
              description: 'Maximum number of initiatives to return'
            }
          },
          required: []
        }
      },
      {
        name: 'get_achievements',
        description: 'Fetch accomplishments and achievements from career database',
        inputSchema: {
          type: 'object',
          properties: {
            category: {
              type: 'string',
              enum: ['Technical/SWE', 'Business/Leadership', 'Academic', 'Networking'],
              description: 'Filter by achievement category'
            },
            skills: {
              type: 'array',
              items: { type: 'string' },
              description: 'Filter by skills used in achievements'
            },
            date_range: {
              type: 'object',
              properties: {
                start: { type: 'string', format: 'date' },
                end: { type: 'string', format: 'date' }
              },
              description: 'Date range filter'
            },
            limit: {
              type: 'number',
              minimum: 1,
              maximum: 100,
              default: 20,
              description: 'Maximum number of achievements to return'
            }
          },
          required: []
        }
      },
      {
        name: 'get_tasks',
        description: 'Get current career development tasks and action items',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['Not Started', 'In Progress', 'Completed', 'Blocked'],
              description: 'Filter by task status'
            },
            priority: {
              type: 'string',
              enum: ['High', 'Medium', 'Low'],
              description: 'Filter by priority level'
            },
            initiative_id: {
              type: 'string',
              description: 'Filter by related initiative ID'
            },
            due_date: {
              type: 'object',
              properties: {
                before: { type: 'string', format: 'date' },
                after: { type: 'string', format: 'date' }
              },
              description: 'Due date filter'
            },
            limit: {
              type: 'number',
              minimum: 1,
              maximum: 100,
              default: 20,
              description: 'Maximum number of tasks to return'
            }
          },
          required: []
        }
      },
      {
        name: 'search_career_data',
        description: 'Search across all career data (initiatives, achievements, tasks)',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              minLength: 1,
              description: 'Search query text'
            },
            data_types: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['initiatives', 'achievements', 'tasks']
              },
              default: ['initiatives', 'achievements', 'tasks'],
              description: 'Types of data to search'
            },
            limit: {
              type: 'number',
              minimum: 1,
              maximum: 100,
              default: 20,
              description: 'Maximum number of results to return'
            }
          },
          required: ['query']
        }
      },
      {
        name: 'get_skill_analysis',
        description: 'Analyze skills and competencies based on career data',
        inputSchema: {
          type: 'object',
          properties: {
            analysis_type: {
              type: 'string',
              enum: ['frequency', 'proficiency', 'growth', 'gaps'],
              default: 'frequency',
              description: 'Type of skill analysis to perform'
            },
            time_period: {
              type: 'object',
              properties: {
                start: { type: 'string', format: 'date' },
                end: { type: 'string', format: 'date' }
              },
              description: 'Time period for analysis'
            },
            target_role: {
              type: 'string',
              description: 'Target role for gap analysis'
            }
          },
          required: []
        }
      }
    ];

    this.logger.info('Returning available tools', { toolCount: tools.length });

    return {
      tools,
      // No pagination implemented for now
      nextCursor: undefined
    };
  }
}

/**
 * Handler for the 'tools/call' method
 */
export class ToolsCallHandler extends BaseMCPHandler<'tools/call'> {
  private notionClient: Client;

  constructor(logger: winston.Logger, notionClient: Client) {
    super('tools/call', logger);
    this.notionClient = notionClient;
  }

  protected getParamsSchema(): Joi.ObjectSchema {
    return Joi.object({
      name: Joi.string().required().description('Tool name to execute'),
      arguments: Joi.object().optional().description('Tool arguments'),
      progressToken: Joi.alternatives([Joi.string(), Joi.number()]).optional()
    });
  }

  protected async execute(
    params: MCPToolCall,
    request: JSONRPCRequest
  ): Promise<MCPToolResult> {
    this.logger.info('Executing tool', {
      toolName: params.name,
      arguments: this.sanitizeParams(params.arguments)
    });

    try {
      switch (params.name) {
        case 'get_career_initiatives':
          return await this.getCareerInitiatives(params.arguments || {});
        
        case 'get_achievements':
          return await this.getAchievements(params.arguments || {});
        
        case 'get_tasks':
          return await this.getTasks(params.arguments || {});
        
        case 'search_career_data':
          return await this.searchCareerData(params.arguments || {});
        
        case 'get_skill_analysis':
          return await this.getSkillAnalysis(params.arguments || {});
        
        default:
          throw this.createError(
            MCPErrorCode.METHOD_NOT_FOUND,
            `Unknown tool: ${params.name}`
          );
      }
    } catch (error) {
      this.logger.error('Tool execution failed', {
        toolName: params.name,
        error: error instanceof Error ? error.message : String(error)
      });

      if (error instanceof Error && error.message.includes('Notion API')) {
        return {
          content: [{
            type: 'text',
            text: `Tool execution failed: ${error.message}`
          }],
          isError: true
        };
      }

      throw error;
    }
  }

  /**
   * Get career initiatives from Notion
   */
  private async getCareerInitiatives(args: Record<string, unknown>): Promise<MCPToolResult> {
    const databaseId = process.env['NOTION_INITIATIVES_DB_ID'];
    if (!databaseId) {
      throw this.createError(
        MCPErrorCode.INTERNAL_ERROR,
        'Notion initiatives database ID not configured'
      );
    }

    try {
      const filter: any = {};
      
      if (args['status']) {
        filter.and = filter.and || [];
        filter.and.push({
          property: 'Status',
          status: { equals: args['status'] }
        });
      }

      if (args['priority']) {
        filter.and = filter.and || [];
        filter.and.push({
          property: 'Priority',
          select: { equals: args['priority'] }
        });
      }

      const response = await this.notionClient.databases.query({
        database_id: databaseId,
        filter: Object.keys(filter).length > 0 ? filter : undefined,
        sorts: [
          { property: 'Priority', direction: 'ascending' },
          { property: 'Date Started', direction: 'descending' }
        ],
        page_size: Math.min(Number(args['limit']) || 20, 100)
      });

      const initiatives = response.results.map(page => this.formatInitiative(page));
      
      const content: MCPTextContent = {
        type: 'text',
        text: JSON.stringify({
          initiatives,
          total: response.results.length,
          has_more: response.has_more
        }, null, 2)
      };

      return { content: [content] };

    } catch (error) {
      throw this.createError(
        MCPErrorCode.TOOL_EXECUTION_ERROR,
        `Failed to fetch initiatives: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get achievements from Notion
   */
  private async getAchievements(args: Record<string, unknown>): Promise<MCPToolResult> {
    const databaseId = process.env['NOTION_ACHIEVEMENTS_DB_ID'];
    if (!databaseId) {
      throw this.createError(
        MCPErrorCode.INTERNAL_ERROR,
        'Notion achievements database ID not configured'
      );
    }

    try {
      const filter: any = {};
      
      if (args['category']) {
        filter.and = filter.and || [];
        filter.and.push({
          property: 'Category',
          select: { equals: args['category'] }
        });
      }

      const response = await this.notionClient.databases.query({
        database_id: databaseId,
        filter: Object.keys(filter).length > 0 ? filter : undefined,
        sorts: [
          { property: 'Date', direction: 'descending' }
        ],
        page_size: Math.min(Number(args['limit']) || 20, 100)
      });

      const achievements = response.results.map(page => this.formatAchievement(page));
      
      const content: MCPTextContent = {
        type: 'text',
        text: JSON.stringify({
          achievements,
          total: response.results.length,
          has_more: response.has_more
        }, null, 2)
      };

      return { content: [content] };

    } catch (error) {
      throw this.createError(
        MCPErrorCode.TOOL_EXECUTION_ERROR,
        `Failed to fetch achievements: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get tasks from Notion
   */
  private async getTasks(args: Record<string, unknown>): Promise<MCPToolResult> {
    const databaseId = process.env['NOTION_TASKS_DB_ID'];
    if (!databaseId) {
      throw this.createError(
        MCPErrorCode.INTERNAL_ERROR,
        'Notion tasks database ID not configured'
      );
    }

    try {
      const filter: any = {};
      
      if (args['status']) {
        filter.and = filter.and || [];
        filter.and.push({
          property: 'Status',
          status: { equals: args['status'] }
        });
      }

      if (args['priority']) {
        filter.and = filter.and || [];
        filter.and.push({
          property: 'Priority',
          select: { equals: args['priority'] }
        });
      }

      const response = await this.notionClient.databases.query({
        database_id: databaseId,
        filter: Object.keys(filter).length > 0 ? filter : undefined,
        sorts: [
          { property: 'Due Date', direction: 'ascending' },
          { property: 'Priority', direction: 'ascending' }
        ],
        page_size: Math.min(Number(args['limit']) || 20, 100)
      });

      const tasks = response.results.map(page => this.formatTask(page));
      
      const content: MCPTextContent = {
        type: 'text',
        text: JSON.stringify({
          tasks,
          total: response.results.length,
          has_more: response.has_more
        }, null, 2)
      };

      return { content: [content] };

    } catch (error) {
      throw this.createError(
        MCPErrorCode.TOOL_EXECUTION_ERROR,
        `Failed to fetch tasks: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Search across career data
   */
  private async searchCareerData(args: Record<string, unknown>): Promise<MCPToolResult> {
    const query = args['query'] as string;
    const dataTypes = (args['data_types'] as string[]) || ['initiatives', 'achievements', 'tasks'];

    const results: any = {
      query,
      results: {}
    };

    // Search each requested data type
    for (const dataType of dataTypes) {
      try {
        switch (dataType) {
          case 'initiatives':
            if (process.env['NOTION_INITIATIVES_DB_ID']) {
              const response = await this.notionClient.databases.query({
                database_id: process.env['NOTION_INITIATIVES_DB_ID'],
                filter: {
                  or: [
                    { property: 'Name', title: { contains: query } },
                    { property: 'Description', rich_text: { contains: query } }
                  ]
                },
                page_size: 10
              });
              results.results.initiatives = response.results.map(page => this.formatInitiative(page));
            }
            break;

          case 'achievements':
            if (process.env['NOTION_ACHIEVEMENTS_DB_ID']) {
              const response = await this.notionClient.databases.query({
                database_id: process.env['NOTION_ACHIEVEMENTS_DB_ID'],
                filter: {
                  or: [
                    { property: 'Achievement', title: { contains: query } },
                    { property: 'Description', rich_text: { contains: query } }
                  ]
                },
                page_size: 10
              });
              results.results.achievements = response.results.map(page => this.formatAchievement(page));
            }
            break;

          case 'tasks':
            if (process.env['NOTION_TASKS_DB_ID']) {
              const response = await this.notionClient.databases.query({
                database_id: process.env['NOTION_TASKS_DB_ID'],
                filter: {
                  property: 'Task',
                  title: { contains: query }
                },
                page_size: 10
              });
              results.results.tasks = response.results.map(page => this.formatTask(page));
            }
            break;
        }
      } catch (error) {
        this.logger.warn(`Search failed for ${dataType}`, {
          error: error instanceof Error ? error.message : String(error)
        });
        results.results[dataType] = { error: `Search failed: ${error}` };
      }
    }

    const content: MCPTextContent = {
      type: 'text',
      text: JSON.stringify(results, null, 2)
    };

    return { content: [content] };
  }

  /**
   * Perform skill analysis
   */
  private async getSkillAnalysis(args: Record<string, unknown>): Promise<MCPToolResult> {
    // This would implement skill analysis logic based on career data
    // For now, return a placeholder
    const analysisType = args['analysis_type'] || 'frequency';

    const content: MCPTextContent = {
      type: 'text',
      text: JSON.stringify({
        analysis_type: analysisType,
        message: 'Skill analysis feature coming soon',
        placeholder_data: {
          top_skills: ['TypeScript', 'React', 'Node.js', 'Docker', 'AWS'],
          skill_frequency: {
            'TypeScript': 15,
            'React': 12,
            'Node.js': 10,
            'Docker': 8,
            'AWS': 7
          }
        }
      }, null, 2)
    };

    return { content: [content] };
  }

  /**
   * Format Notion initiative page for response
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

  /**
   * Format Notion achievement page for response
   */
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

  /**
   * Format Notion task page for response
   */
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

  /**
   * Helper methods for extracting Notion property values
   */
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