import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import type { Core } from '@strapi/strapi';

import { tools, handleToolCall } from './tools';

export function createMcpServer(strapi: Core.Strapi): Server {
  const server = new Server(
    {
      name: 'strapi-builder-ai-mcp',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    strapi.log.debug('[strapi-builder-ai-mcp] Listing tools');
    return { tools };
  });

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    strapi.log.debug(`[strapi-builder-ai-mcp] Tool call: ${request.params.name}`);
    return handleToolCall(strapi, request);
  });

  return server;
}
