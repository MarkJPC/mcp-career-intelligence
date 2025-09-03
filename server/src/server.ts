/**
 * MCP Career Intelligence Server
 * Production-ready MCP server with Express + Socket.io integration
 * Provides career intelligence tools and resources via Notion API
 */

import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { Client as NotionClient } from '@notionhq/client';
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import NodeCache from 'node-cache';
import dotenv from 'dotenv';

import {
  MCPTransportFactory,
  MCPTransportManager,
  WebSocketTransport
} from './mcp/transport';
import {
  MCPHandlerRegistry,
  InitializeHandler,
  InitializedHandler,
  ToolsListHandler,
  ToolsCallHandler,
  ResourcesListHandler,
  ResourceTemplatesListHandler,
  ResourcesReadHandler,
  ResourcesSubscribeHandler,
  ResourcesUnsubscribeHandler
} from './handlers';
import {
  JSONRPCRequest,
  MCPServerConfig,
  MCPErrorCode,
  MCPError
} from './types/mcp.types';

// Load environment variables
dotenv.config();

/**
 * MCP Career Intelligence Server class
 */
export class MCPCareerIntelligenceServer {
  private app: express.Application;
  private httpServer: ReturnType<typeof createServer>;
  private io!: SocketIOServer;
  private logger!: winston.Logger;
  private notionClient!: NotionClient;
  private handlerRegistry!: MCPHandlerRegistry;
  private transportManager!: MCPTransportManager;
  private transportFactory!: MCPTransportFactory;
  private cache!: NodeCache;
  private isInitialized = false;

  constructor(private config: MCPServerConfig) {
    this.app = express();
    this.httpServer = createServer(this.app);
    this.setupLogger();
    this.setupNotionClient();
    this.setupCache();
    this.setupExpress();
    this.setupSocketIO();
    this.setupMCP();
  }

  /**
   * Set up Winston logger with structured logging and rotation
   */
  private setupLogger(): void {
    const logFormat = winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    );

    this.logger = winston.createLogger({
      level: process.env['LOG_LEVEL'] || 'info',
      format: logFormat,
      defaultMeta: {
        service: 'mcp-career-intelligence',
        version: this.config.version
      },
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        }),
        new DailyRotateFile({
          filename: 'logs/mcp-server-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          maxSize: '20m',
          maxFiles: '14d',
          format: logFormat
        }),
        new DailyRotateFile({
          filename: 'logs/mcp-server-error-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          level: 'error',
          maxSize: '20m',
          maxFiles: '30d',
          format: logFormat
        })
      ],
      exceptionHandlers: [
        new DailyRotateFile({
          filename: 'logs/mcp-server-exceptions-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          maxSize: '20m',
          maxFiles: '30d'
        })
      ],
      rejectionHandlers: [
        new DailyRotateFile({
          filename: 'logs/mcp-server-rejections-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          maxSize: '20m',
          maxFiles: '30d'
        })
      ]
    });

    this.logger.info('Logger initialized', {
      logLevel: process.env['LOG_LEVEL'] || 'info'
    });
  }

  /**
   * Set up Notion API client with proper error handling
   */
  private setupNotionClient(): void {
    // use the notion api to get information from notion
    const notionToken = process.env['NOTION_API_KEY'];
    if (!notionToken) {
      throw new Error('NOTION_API_KEY environment variable is required');
    }

    this.notionClient = new NotionClient({
      auth: notionToken,
      timeoutMs: 30000
    });

    this.logger.info('Notion client initialized');
  }

  /**
   * Set up caching layer for performance optimization
   */
  private setupCache(): void {
    this.cache = new NodeCache({
      stdTTL: parseInt(process.env['CACHE_TTL'] || '300'), // 5 minutes default
      checkperiod: 60, // Check for expired keys every minute
      useClones: false
    });

    this.cache.on('set', (key, value) => {
      this.logger.debug('Cache set', { key, valueSize: JSON.stringify(value).length });
    });

    this.cache.on('expired', (key, value) => {
      this.logger.debug('Cache expired', { key });
    });

    this.logger.info('Cache initialized', {
      ttl: this.cache.options.stdTTL,
      checkPeriod: this.cache.options.checkperiod
    });
  }

  /**
   * Set up Express application with security and performance middleware
   */
  private setupExpress(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", "wss:", "ws:"]
        }
      },
      crossOriginEmbedderPolicy: false
    }));

    // CORS configuration
    this.app.use(cors({
      origin: (process.env['ALLOWED_ORIGINS'] || 'http://localhost:3000').split(','),
      credentials: true,
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: parseInt(process.env['RATE_LIMIT_MAX'] || '100'), // Limit each IP to 100 requests per windowMs
      message: 'Too many requests from this IP',
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => {
        this.logger.warn('Rate limit exceeded', {
          ip: req.ip,
          userAgent: req.get('User-Agent')
        });
        res.status(429).json({
          error: 'Rate limit exceeded',
          retryAfter: 15 * 60 * 1000
        });
      }
    });
    this.app.use(limiter);

    // Performance middleware
    this.app.use(compression());
    this.app.use(express.json({ 
      limit: this.config.maxRequestSize || '10mb',
      strict: true
    }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging middleware
    this.app.use((req, res, next) => {
      const startTime = Date.now();
      
      res.on('finish', () => {
        const duration = Date.now() - startTime;
        this.logger.info('HTTP request', {
          method: req.method,
          url: req.url,
          statusCode: res.statusCode,
          duration,
          userAgent: req.get('User-Agent'),
          ip: req.ip
        });
      });

      next();
    });

    // Health check endpoint
    this.app.get('/health', (req, res) => {
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: this.config.version,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        activeConnections: this.transportManager?.getActiveCount() || 0,
        cacheStats: this.cache.getStats()
      };

      res.json(health);
    });

    // Metrics endpoint
    this.app.get('/metrics', (req, res) => {
      const metrics = {
        timestamp: new Date().toISOString(),
        server: {
          version: this.config.version,
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          cpu: process.cpuUsage()
        },
        transport: {
          activeConnections: this.transportManager?.getActiveCount() || 0
        },
        cache: this.cache.getStats(),
        handlers: {
          registered: this.handlerRegistry?.getRegisteredMethods().length || 0,
          methods: this.handlerRegistry?.getRegisteredMethods() || []
        }
      };

      res.json(metrics);
    });

    // Error handling middleware
    this.app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
      this.logger.error('Express error', {
        error: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method
      });

      res.status(500).json({
        error: 'Internal server error',
        timestamp: new Date().toISOString()
      });
    });

    this.logger.info('Express application configured');
  }

  /**
   * Set up Socket.IO server for WebSocket transport
   */
  private setupSocketIO(): void {
    this.io = new SocketIOServer(this.httpServer, {
      cors: {
        origin: (process.env['ALLOWED_ORIGINS'] || 'http://localhost:3000').split(','),
        methods: ['GET', 'POST']
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000,
      maxHttpBufferSize: this.config.maxRequestSize || 10 * 1024 * 1024 // 10MB
    });

    // listen for client connections
    this.io.on('connection', (socket) => {
      this.logger.info('Socket.IO client connected', {
        socketId: socket.id,
        remoteAddress: socket.handshake.address
      });

      // Create WebSocket transport for this connection
      const transport = new WebSocketTransport(socket, this.logger);
      this.transportManager.addTransport(socket.id, transport);

      // Set up MCP message handling for this transport
      transport.on('message', async (message: JSONRPCRequest) => {
        try {
          const response = await this.handlerRegistry.handleRequest(message);
          await transport.send(response);
        } catch (error) {
          this.logger.error('Failed to handle MCP message', {
            socketId: socket.id,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      });

      socket.on('disconnect', (reason) => {
        this.logger.info('Socket.IO client disconnected', {
          socketId: socket.id,
          reason
        });
        this.transportManager.removeTransport(socket.id);
      });

      socket.on('error', (error) => {
        this.logger.error('Socket.IO error', {
          socketId: socket.id,
          error: error.message
        });
      });
    });

    this.logger.info('Socket.IO server configured');
  }

  /**
   * Set up MCP protocol handlers and transport management
   */
  private setupMCP(): void {
    this.handlerRegistry = new MCPHandlerRegistry(this.logger);
    this.transportManager = new MCPTransportManager(this.logger);
    this.transportFactory = new MCPTransportFactory(this.logger);

    // Register all MCP handlers
    this.registerHandlers();

    // Set up transport manager event handling
    this.transportManager.on('error', ({ transportId, error }) => {
      this.logger.error('Transport error', { transportId, error: error.message });
    });

    this.transportManager.on('transport:close', ({ transportId }) => {
      this.logger.info('Transport closed', { transportId });
    });

    this.logger.info('MCP protocol configured', {
      registeredMethods: this.handlerRegistry.getRegisteredMethods()
    });
  }

  /**
   * Register all MCP protocol handlers
   */
  private registerHandlers(): void {
    const serverInfo = {
      name: this.config.name,
      version: this.config.version
    };

    // Core protocol handlers
    this.handlerRegistry.register(new InitializeHandler(this.logger, serverInfo));
    this.handlerRegistry.register(new InitializedHandler(this.logger));

    // Tool handlers
    this.handlerRegistry.register(new ToolsListHandler(this.logger));
    this.handlerRegistry.register(new ToolsCallHandler(this.logger, this.notionClient));

    // Resource handlers
    this.handlerRegistry.register(new ResourcesListHandler(this.logger));
    this.handlerRegistry.register(new ResourceTemplatesListHandler(this.logger));
    this.handlerRegistry.register(new ResourcesReadHandler(this.logger, this.notionClient));
    this.handlerRegistry.register(new ResourcesSubscribeHandler(this.logger));
    this.handlerRegistry.register(new ResourcesUnsubscribeHandler(this.logger));

    this.logger.info('MCP handlers registered', {
      handlerCount: this.handlerRegistry.getRegisteredMethods().length
    });
  }

  /**
   * Start the server
   */
  async start(): Promise<void> {
    if (this.isInitialized) {
      throw new Error('Server is already running');
    }

    return new Promise((resolve, reject) => {
      const port = parseInt(process.env['PORT'] || '3000');
      const host = process.env['HOST'] || '0.0.0.0';

      this.httpServer.listen(port, host, () => {
        this.isInitialized = true;
        this.logger.info('MCP Career Intelligence Server started', {
          port,
          host,
          version: this.config.version,
          capabilities: this.config.capabilities
        });
        resolve();
      });

      this.httpServer.on('error', (error) => {
        this.logger.error('Server startup failed', { error: error.message });
        reject(error);
      });

      // Graceful shutdown handling
      process.on('SIGINT', () => this.shutdown('SIGINT'));
      process.on('SIGTERM', () => this.shutdown('SIGTERM'));
    });
  }

  /**
   * Graceful server shutdown
   */
  async shutdown(signal?: string): Promise<void> {
    this.logger.info('Starting graceful shutdown', { signal });

    if (!this.isInitialized) {
      return;
    }

    try {
      // Close all MCP transports
      await this.transportManager.closeAll();

      // Close Socket.IO server
      this.io.close();

      // Close HTTP server
      await new Promise<void>((resolve) => {
        this.httpServer.close(() => {
          this.logger.info('HTTP server closed');
          resolve();
        });
      });

      // Clear cache
      this.cache.flushAll();

      this.isInitialized = false;
      this.logger.info('Graceful shutdown completed');

      process.exit(0);
    } catch (error) {
      this.logger.error('Error during shutdown', {
        error: error instanceof Error ? error.message : String(error)
      });
      process.exit(1);
    }
  }

  /**
   * Get server status
   */
  getStatus(): {
    isRunning: boolean;
    uptime: number;
    activeConnections: number;
    version: string;
  } {
    return {
      isRunning: this.isInitialized,
      uptime: process.uptime(),
      activeConnections: this.transportManager?.getActiveCount() || 0,
      version: this.config.version
    };
  }
}

/**
 * Create and start the MCP server
 */
async function main(): Promise<void> {
  try {
    const config: MCPServerConfig = {
      name: 'mcp-career-intelligence-server',
      version: process.env['npm_package_version'] || '1.0.0',
      transport: {
        type: 'websocket'
      },
      capabilities: {
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
      },
      maxRequestSize: 10 * 1024 * 1024, // 10MB
      requestTimeout: 30000, // 30 seconds
      enableLogging: true,
      logLevel: (process.env['LOG_LEVEL'] as any) || 'info'
    };

    const server = new MCPCareerIntelligenceServer(config);
    await server.start();

  } catch (error) {
    console.error('Failed to start MCP server:', error);
    process.exit(1);
  }
}

// Start the server if this file is run directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}
