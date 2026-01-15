import type { Core } from '@strapi/strapi';

const PLUGIN_ID = 'strapi-builder-ai-mcp';

export const fetchDataTool = {
  name: 'fetch_data',
  description: `Fetch data from a Strapi API route. Automatically prepends the configured strapiUrl.

Example:
- route: "/api/landing-pages" → fetches from https://your-strapi.com/api/landing-pages
- route: "/api/articles?populate=*" → fetches with population

Use get_routes first to discover available endpoints, then use this tool to fetch actual data.`,
  inputSchema: {
    type: 'object',
    properties: {
      route: {
        type: 'string',
        description: 'The API route to fetch (e.g., "/api/landing-pages", "/api/articles?populate=*")',
      },
    },
    required: ['route'],
  },
};

export async function handleFetchData(
  strapi: Core.Strapi,
  args: { route: string }
): Promise<{ content: Array<{ type: string; text: string }> }> {
  try {
    const plugin = strapi.plugin(PLUGIN_ID);
    const config = plugin.config;
    const strapiUrl = config('strapiUrl');

    // Ensure route starts with /
    const route = args.route.startsWith('/') ? args.route : `/${args.route}`;

    // Build full URL
    const url = `${strapiUrl}${route}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              url,
              status: response.status,
              data,
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (error) {
    throw new Error(
      `Failed to fetch data: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
