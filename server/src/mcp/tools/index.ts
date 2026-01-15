import type { Core } from '@strapi/strapi';
import { validateToolInput } from '../schemas';

import { getContentTypesTool, handleGetContentTypes } from './get-content-types';
import { getComponentsTool, handleGetComponents } from './get-components';
import { getCollectionDataTool, handleGetCollectionData } from './get-collection-data';
import { getSingleEntryTool, handleGetSingleEntry } from './get-single-entry';
import { getApiStructureTool, handleGetApiStructure } from './get-api-structure';
import { getProjectContextTool, handleGetProjectContext } from './get-project-context';
import { getRoutesTool, handleGetRoutes } from './get-routes';
import { fetchDataTool, handleFetchData } from './fetch-data';

// Export all tool definitions for MCP listing
export const tools = [
  getProjectContextTool,
  getRoutesTool,
  fetchDataTool,
  getApiStructureTool,
  getContentTypesTool,
  getComponentsTool,
  getCollectionDataTool,
  getSingleEntryTool,
];

// Handler registry
const toolHandlers: Record<
  string,
  (strapi: Core.Strapi, args: unknown) => Promise<{ content: Array<{ type: string; text: string }> }>
> = {
  get_project_context: handleGetProjectContext,
  get_routes: handleGetRoutes,
  fetch_data: handleFetchData,
  get_api_structure: handleGetApiStructure,
  get_content_types: handleGetContentTypes,
  get_components: handleGetComponents,
  get_collection_data: handleGetCollectionData,
  get_single_entry: handleGetSingleEntry,
};

export interface ToolCallRequest {
  params: {
    name: string;
    arguments?: unknown;
  };
}

export async function handleToolCall(
  strapi: Core.Strapi,
  request: ToolCallRequest
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const { name, arguments: args = {} } = request.params;

  const handler = toolHandlers[name];
  if (!handler) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              error: true,
              message: `Unknown tool: ${name}`,
              availableTools: Object.keys(toolHandlers),
            },
            null,
            2
          ),
        },
      ],
    };
  }

  try {
    // Validate input
    const validatedArgs = validateToolInput(name, args);

    // Execute handler
    const result = await handler(strapi, validatedArgs);
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    strapi.log.error(`[strapi-builder-ai-mcp] Tool error`, {
      tool: name,
      error: errorMessage,
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              error: true,
              tool: name,
              message: errorMessage,
            },
            null,
            2
          ),
        },
      ],
    };
  }
}
