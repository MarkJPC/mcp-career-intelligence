/**
 * MCP Transport Layer Implementation
 * Supports WebSocket and stdio transport protocols with comprehensive error handling
 */

import { EventEmitter } from 'events';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import winston from 'winston';
import {
  JSONRPCRequest,
  JSONRPCResponse,
  JSONRPCNotification,
  MCPTransportType,
  MCPTransportConfig,
  MCPError,
  MCPErrorCode
} from '@/types/mcp.types';

/**
 * Base transport interface for MCP protocol
 */
export interface MCPTransport extends EventEmitter {
  send(message: JSONRPCResponse | JSONRPCNotification): Promise<void>;
  close(): Promise<void>;
  isConnected(): boolean;
}

/**
 * Transport events
 */
export interface TransportEvents {
  'message': [JSONRPCRequest];
  'close': [];
  'error': [Error];
  'connect': [];
  'disconnect': [];
}

/**
 * WebSocket transport implementation for MCP protocol
 */
export class WebSocketTransport extends EventEmitter implements MCPTransport {
  private socket: Socket;
  private logger: winston.Logger;
  private connected: boolean = false;

  constructor(socket: Socket, logger: winston.Logger) {
    super();
    this.socket = socket;
    this.logger = logger.child({ transport: 'websocket', socketId: socket.id });
    this.setupEventHandlers();
    this.connected = true;
  }

  /**
   * Set up WebSocket event handlers with comprehensive error handling
   */
  private setupEventHandlers(): void {
    this.socket.on('message', (data: unknown) => {
      try {
        this.handleMessage(data);
      } catch (error) {
        this.logger.error('Failed to handle WebSocket message', {
          error: error instanceof Error ? error.message : String(error),
          data
        });
        this.emit('error', new MCPError(
          MCPErrorCode.PARSE_ERROR,
          'Failed to parse incoming message'
        ));
      }
    });

    this.socket.on('disconnect', (reason: string) => {
      this.logger.info('WebSocket disconnected', { reason });
      this.connected = false;
      this.emit('disconnect');
      this.emit('close');
    });

    this.socket.on('error', (error: Error) => {
      this.logger.error('WebSocket error', { error: error.message });
      this.emit('error', new MCPError(
        MCPErrorCode.TRANSPORT_ERROR,
        `WebSocket error: ${error.message}`,
        { originalError: error }
      ));
    });

    this.socket.on('connect', () => {
      this.logger.info('WebSocket connected');
      this.connected = true;
      this.emit('connect');
    });
  }

  /**
   * Handle incoming WebSocket messages with validation
   */
  private handleMessage(data: unknown): void {
    if (!data || typeof data !== 'object') {
      throw new MCPError(
        MCPErrorCode.INVALID_REQUEST,
        'Message must be a valid JSON object'
      );
    }

    const message = data as Record<string, unknown>;

    // Validate JSON-RPC 2.0 format
    if (message.jsonrpc !== '2.0') {
      throw new MCPError(
        MCPErrorCode.INVALID_REQUEST,
        'Invalid JSON-RPC version'
      );
    }

    if (!message.method || typeof message.method !== 'string') {
      throw new MCPError(
        MCPErrorCode.INVALID_REQUEST,
        'Missing or invalid method field'
      );
    }

    this.logger.debug('Received WebSocket message', {
      method: message.method,
      id: message.id
    });

    this.emit('message', message as JSONRPCRequest);
  }

  /**
   * Send message through WebSocket with error handling
   */
  async send(message: JSONRPCResponse | JSONRPCNotification): Promise<void> {
    if (!this.connected) {
      throw new MCPError(
        MCPErrorCode.TRANSPORT_ERROR,
        'WebSocket not connected'
      );
    }

    try {
      this.socket.emit('message', message);
      this.logger.debug('Sent WebSocket message', {
        method: 'method' in message ? message.method : 'response',
        id: message.id
      });
    } catch (error) {
      this.logger.error('Failed to send WebSocket message', {
        error: error instanceof Error ? error.message : String(error),
        message
      });
      throw new MCPError(
        MCPErrorCode.TRANSPORT_ERROR,
        'Failed to send WebSocket message',
        { originalError: error }
      );
    }
  }

  /**
   * Close WebSocket connection gracefully
   */
  async close(): Promise<void> {
    if (this.connected) {
      this.socket.disconnect();
      this.connected = false;
      this.logger.info('WebSocket transport closed');
    }
  }

  /**
   * Check if WebSocket is connected
   */
  isConnected(): boolean {
    return this.connected && this.socket.connected;
  }
}

/**
 * Stdio transport implementation for MCP protocol
 */
export class StdioTransport extends EventEmitter implements MCPTransport {
  private logger: winston.Logger;
  private connected: boolean = false;
  private messageBuffer: string = '';

  constructor(logger: winston.Logger) {
    super();
    this.logger = logger.child({ transport: 'stdio' });
    this.setupEventHandlers();
    this.connected = true;
  }

  /**
   * Set up stdio event handlers
   */
  private setupEventHandlers(): void {
    process.stdin.setEncoding('utf8');
    process.stdin.on('readable', () => {
      this.handleStdinData();
    });

    process.stdin.on('end', () => {
      this.logger.info('Stdin ended');
      this.connected = false;
      this.emit('close');
    });

    process.stdin.on('error', (error: Error) => {
      this.logger.error('Stdin error', { error: error.message });
      this.emit('error', new MCPError(
        MCPErrorCode.TRANSPORT_ERROR,
        `Stdio error: ${error.message}`,
        { originalError: error }
      ));
    });

    // Handle process termination gracefully
    process.on('SIGINT', () => this.close());
    process.on('SIGTERM', () => this.close());
  }

  /**
   * Handle incoming stdin data with line-based parsing
   */
  private handleStdinData(): void {
    try {
      const chunk = process.stdin.read();
      if (chunk === null) return;

      this.messageBuffer += chunk;
      const lines = this.messageBuffer.split('\n');
      
      // Keep the last incomplete line in buffer
      this.messageBuffer = lines.pop() || '';

      for (const line of lines) {
        if (line.trim()) {
          this.parseMessage(line.trim());
        }
      }
    } catch (error) {
      this.logger.error('Failed to handle stdin data', {
        error: error instanceof Error ? error.message : String(error)
      });
      this.emit('error', new MCPError(
        MCPErrorCode.PARSE_ERROR,
        'Failed to parse stdin data'
      ));
    }
  }

  /**
   * Parse individual JSON message from stdin
   */
  private parseMessage(line: string): void {
    try {
      const message = JSON.parse(line) as JSONRPCRequest;
      
      // Validate JSON-RPC 2.0 format
      if (message.jsonrpc !== '2.0') {
        throw new MCPError(
          MCPErrorCode.INVALID_REQUEST,
          'Invalid JSON-RPC version'
        );
      }

      if (!message.method || typeof message.method !== 'string') {
        throw new MCPError(
          MCPErrorCode.INVALID_REQUEST,
          'Missing or invalid method field'
        );
      }

      this.logger.debug('Received stdio message', {
        method: message.method,
        id: message.id
      });

      this.emit('message', message);
    } catch (error) {
      if (error instanceof MCPError) {
        throw error;
      }
      throw new MCPError(
        MCPErrorCode.PARSE_ERROR,
        `Invalid JSON message: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Send message through stdout with error handling
   */
  async send(message: JSONRPCResponse | JSONRPCNotification): Promise<void> {
    if (!this.connected) {
      throw new MCPError(
        MCPErrorCode.TRANSPORT_ERROR,
        'Stdio transport not connected'
      );
    }

    try {
      const serialized = JSON.stringify(message);
      process.stdout.write(serialized + '\n');
      
      this.logger.debug('Sent stdio message', {
        method: 'method' in message ? message.method : 'response',
        id: message.id
      });
    } catch (error) {
      this.logger.error('Failed to send stdio message', {
        error: error instanceof Error ? error.message : String(error),
        message
      });
      throw new MCPError(
        MCPErrorCode.TRANSPORT_ERROR,
        'Failed to send stdio message',
        { originalError: error }
      );
    }
  }

  /**
   * Close stdio transport gracefully
   */
  async close(): Promise<void> {
    if (this.connected) {
      this.connected = false;
      process.stdin.pause();
      this.logger.info('Stdio transport closed');
    }
  }

  /**
   * Check if stdio is connected
   */
  isConnected(): boolean {
    return this.connected;
  }
}

/**
 * Transport factory for creating appropriate transport instances
 */
export class MCPTransportFactory {
  private logger: winston.Logger;

  constructor(logger: winston.Logger) {
    this.logger = logger.child({ component: 'transport-factory' });
  }

  /**
   * Create transport instance based on configuration
   */
  createTransport(
    config: MCPTransportConfig,
    context?: { socket?: Socket; httpServer?: HTTPServer }
  ): MCPTransport {
    this.logger.info('Creating transport', { type: config.type });

    switch (config.type) {
      case 'websocket':
        if (!context?.socket) {
          throw new MCPError(
            MCPErrorCode.INITIALIZATION_FAILED,
            'WebSocket transport requires socket context'
          );
        }
        return new WebSocketTransport(context.socket, this.logger);

      case 'stdio':
        return new StdioTransport(this.logger);

      default:
        throw new MCPError(
          MCPErrorCode.INITIALIZATION_FAILED,
          `Unsupported transport type: ${config.type}`
        );
    }
  }

  /**
   * Set up Socket.IO server for WebSocket transport
   */
  setupSocketIOServer(httpServer: HTTPServer): SocketIOServer {
    const io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
        methods: ['GET', 'POST']
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000
    });

    io.on('connection', (socket: Socket) => {
      this.logger.info('Socket.IO client connected', { socketId: socket.id });
      
      socket.on('disconnect', (reason: string) => {
        this.logger.info('Socket.IO client disconnected', {
          socketId: socket.id,
          reason
        });
      });
    });

    return io;
  }
}

/**
 * Transport manager for handling multiple transport instances
 */
export class MCPTransportManager extends EventEmitter {
  private transports = new Map<string, MCPTransport>();
  private logger: winston.Logger;

  constructor(logger: winston.Logger) {
    super();
    this.logger = logger.child({ component: 'transport-manager' });
  }

  /**
   * Add transport instance
   */
  addTransport(id: string, transport: MCPTransport): void {
    if (this.transports.has(id)) {
      throw new MCPError(
        MCPErrorCode.INTERNAL_ERROR,
        `Transport with id '${id}' already exists`
      );
    }

    transport.on('message', (message: JSONRPCRequest) => {
      this.emit('message', { transportId: id, message });
    });

    transport.on('error', (error: Error) => {
      this.emit('error', { transportId: id, error });
    });

    transport.on('close', () => {
      this.removeTransport(id);
      this.emit('transport:close', { transportId: id });
    });

    this.transports.set(id, transport);
    this.logger.info('Transport added', { transportId: id });
  }

  /**
   * Remove transport instance
   */
  removeTransport(id: string): void {
    const transport = this.transports.get(id);
    if (transport) {
      transport.removeAllListeners();
      this.transports.delete(id);
      this.logger.info('Transport removed', { transportId: id });
    }
  }

  /**
   * Get transport by ID
   */
  getTransport(id: string): MCPTransport | undefined {
    return this.transports.get(id);
  }

  /**
   * Broadcast message to all connected transports
   */
  async broadcast(message: JSONRPCNotification): Promise<void> {
    const promises = Array.from(this.transports.entries()).map(
      async ([id, transport]) => {
        try {
          if (transport.isConnected()) {
            await transport.send(message);
          }
        } catch (error) {
          this.logger.error('Failed to broadcast to transport', {
            transportId: id,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }
    );

    await Promise.allSettled(promises);
  }

  /**
   * Close all transports
   */
  async closeAll(): Promise<void> {
    const promises = Array.from(this.transports.values()).map(
      transport => transport.close()
    );

    await Promise.allSettled(promises);
    this.transports.clear();
    this.logger.info('All transports closed');
  }

  /**
   * Get count of active transports
   */
  getActiveCount(): number {
    return Array.from(this.transports.values())
      .filter(transport => transport.isConnected()).length;
  }
}