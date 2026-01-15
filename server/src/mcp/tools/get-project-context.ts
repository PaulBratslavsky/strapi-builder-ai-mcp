import type { Core } from '@strapi/strapi';

const PLUGIN_ID = 'strapi-builder-ai-mcp';

export const getProjectContextTool = {
  name: 'get_project_context',
  description: `ALWAYS call this first before building. Returns Strapi configuration including base URLs, endpoint settings, and available content types.

This provides essential context for:
- Constructing correct API URLs in generated code
- Referencing media assets with the correct domain
- Understanding authentication requirements
- Knowing what content types are available to work with

Call this tool at the start of any frontend building task.`,
  inputSchema: {
    type: 'object',
    properties: {},
  },
};

interface ProjectContext {
  strapiUrl: string;
  mediaUrl: string;
  publicEndpoints: boolean;
  apiPrefix: string;
  availableContentTypes: string[];
}

export async function handleGetProjectContext(
  strapi: Core.Strapi,
  _args: Record<string, never>
): Promise<{ content: Array<{ type: string; text: string }> }> {
  try {
    const plugin = strapi.plugin(PLUGIN_ID);
    const config = plugin.config;

    // Get available content types (api:: types only, not admin/internal)
    const availableContentTypes = Object.keys(strapi.contentTypes)
      .filter((uid) => uid.startsWith('api::'))
      .map((uid) => uid.replace('api::', '').split('.')[0]);

    const projectContext: ProjectContext = {
      strapiUrl: config('strapiUrl'),
      mediaUrl: config('mediaUrl'),
      publicEndpoints: config('publicEndpoints'),
      apiPrefix: config('apiPrefix'),
      availableContentTypes: [...availableContentTypes].sort((a, b) => a.localeCompare(b)),
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              ...projectContext,
              usage: {
                strapiUrl: 'Base URL for API requests in generated code',
                mediaUrl: 'Base URL for images and media assets',
                publicEndpoints: 'Whether endpoints require authentication for GET requests',
                apiPrefix: 'API path prefix (e.g., /api)',
                availableContentTypes: 'Content types you can fetch data from',
              },
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (error) {
    throw new Error(
      `Failed to get project context: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
