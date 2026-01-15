import type { Core } from '@strapi/strapi';

export const getRoutesTool = {
  name: 'get_routes',
  description: `Get all API routes from Strapi content types. Returns endpoints organized by type:
- Single types (static pages like landing-page, about, global)
- Collection types (dynamic content like articles, categories)

Use this to understand what API endpoints exist and plan your frontend routing.`,
  inputSchema: {
    type: 'object',
    properties: {},
  },
};

interface SingleTypeRoute {
  name: string;
  displayName: string;
  endpoint: string;
  methods: string[];
}

interface CollectionRoute {
  name: string;
  displayName: string;
  endpoint: string;
  endpoints: {
    list: string;
    single: string;
  };
  methods: string[];
  hasSlug: boolean;
}

export async function handleGetRoutes(
  strapi: Core.Strapi,
  _args: Record<string, never>
): Promise<{ content: Array<{ type: string; text: string }> }> {
  try {
    const singleTypes: SingleTypeRoute[] = [];
    const collectionTypes: CollectionRoute[] = [];

    for (const [uid, contentType] of Object.entries(strapi.contentTypes)) {
      if (!uid.startsWith('api::')) {
        continue;
      }

      const apiId = uid.split('.').pop() || '';
      const kind = contentType.kind || 'collectionType';
      const displayName = contentType.info?.displayName || apiId;
      const pluralName = contentType.info?.pluralName || apiId;

      // Check for slug field
      const attributes = contentType.attributes || {};
      const hasSlug = Object.keys(attributes).some(
        (name) => name === 'slug' || name.toLowerCase().includes('slug')
      );

      if (kind === 'singleType') {
        singleTypes.push({
          name: apiId,
          displayName,
          endpoint: `/api/${pluralName}`,
          methods: ['GET', 'PUT', 'DELETE'],
        });
      } else {
        collectionTypes.push({
          name: apiId,
          displayName,
          endpoint: `/api/${pluralName}`,
          endpoints: {
            list: `/api/${pluralName}`,
            single: `/api/${pluralName}/:documentId`,
          },
          methods: ['GET', 'POST', 'PUT', 'DELETE'],
          hasSlug,
        });
      }
    }

    // Sort alphabetically
    singleTypes.sort((a, b) => a.name.localeCompare(b.name));
    collectionTypes.sort((a, b) => a.name.localeCompare(b.name));

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              summary: {
                singleTypes: singleTypes.length,
                collectionTypes: collectionTypes.length,
              },
              singleTypes,
              collectionTypes,
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (error) {
    throw new Error(
      `Failed to get routes: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
