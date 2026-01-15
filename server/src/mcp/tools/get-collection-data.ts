import type { Core } from '@strapi/strapi';

export const getCollectionDataTool = {
  name: 'get_collection_data',
  description: `Fetch data from a Strapi collection. Returns actual entries from the database.
Use this to get sample data for building frontend components.

Parameters:
- contentType: The API ID of the content type (e.g., 'article', 'product')
- limit: Number of entries to return (1-100, default 10)
- page: Page number for pagination (default 1)
- populate: Relations to populate. Use '*' for all, or specify field names
- filters: Optional filters object following Strapi's filter syntax
- sort: Sort field and direction (e.g., 'createdAt:desc')

Example: To get articles with their authors populated:
  contentType: 'article', populate: ['author', 'category'], limit: 5`,
  inputSchema: {
    type: 'object',
    properties: {
      contentType: {
        type: 'string',
        description: 'The API ID of the content type (e.g., "article", "product")',
      },
      limit: {
        type: 'number',
        description: 'Number of entries to return (1-100, default 10)',
        default: 10,
      },
      page: {
        type: 'number',
        description: 'Page number for pagination (default 1)',
        default: 1,
      },
      populate: {
        oneOf: [
          { type: 'string' },
          { type: 'array', items: { type: 'string' } },
        ],
        description: 'Relations to populate. Use "*" for all, or specify field names as array',
      },
      filters: {
        type: 'object',
        description: 'Filters object following Strapi filter syntax',
      },
      sort: {
        type: 'string',
        description: 'Sort field and direction (e.g., "createdAt:desc")',
      },
    },
    required: ['contentType'],
  },
};

interface GetCollectionDataArgs {
  contentType: string;
  limit?: number;
  page?: number;
  populate?: string | string[];
  filters?: Record<string, unknown>;
  sort?: string;
}

export async function handleGetCollectionData(
  strapi: Core.Strapi,
  args: GetCollectionDataArgs
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const { contentType, limit = 10, page = 1, populate, filters, sort } = args;

  try {
    // Find the content type UID
    const uid = findContentTypeUid(strapi, contentType);
    if (!uid) {
      const availableTypes = getAvailableApiContentTypes(strapi);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                error: true,
                message: `Content type "${contentType}" not found`,
                availableContentTypes: availableTypes,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    // Build query options
    const queryOptions: Record<string, unknown> = {
      limit: Math.min(limit, 100),
      offset: (page - 1) * limit,
    };

    // Handle populate
    if (populate) {
      if (populate === '*') {
        queryOptions.populate = '*';
      } else if (Array.isArray(populate)) {
        queryOptions.populate = populate.reduce((acc, field) => {
          acc[field] = true;
          return acc;
        }, {} as Record<string, boolean>);
      } else {
        queryOptions.populate = { [populate]: true };
      }
    }

    // Handle filters
    if (filters) {
      queryOptions.filters = filters;
    }

    // Handle sort
    if (sort) {
      const [field, direction = 'asc'] = sort.split(':');
      queryOptions.sort = { [field]: direction };
    }

    // Fetch data
    const entries = await strapi.documents(uid as any).findMany(queryOptions);

    // Get total count for pagination info
    const totalCount = await strapi.documents(uid as any).count({
      filters: filters || {},
    });

    const totalPages = Math.ceil(totalCount / limit);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              contentType: uid,
              pagination: {
                page,
                pageSize: limit,
                pageCount: totalPages,
                total: totalCount,
              },
              data: entries,
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (error) {
    throw new Error(
      `Failed to get collection data: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

function findContentTypeUid(strapi: Core.Strapi, contentType: string): string | null {
  const contentTypes = strapi.contentTypes;

  // Try direct match with api:: prefix
  const apiUid = `api::${contentType}.${contentType}`;
  if (contentTypes[apiUid]) {
    return apiUid;
  }

  // Search by singularName or pluralName
  for (const [uid, ct] of Object.entries(contentTypes)) {
    if (!uid.startsWith('api::')) continue;
    if (
      ct.info?.singularName === contentType ||
      ct.info?.pluralName === contentType ||
      uid.endsWith(`.${contentType}`)
    ) {
      return uid;
    }
  }

  return null;
}

function getAvailableApiContentTypes(strapi: Core.Strapi): string[] {
  const result: string[] = [];
  for (const [uid, ct] of Object.entries(strapi.contentTypes)) {
    if (uid.startsWith('api::')) {
      result.push(ct.info?.singularName || uid.split('.').pop() || uid);
    }
  }
  return result.sort();
}
