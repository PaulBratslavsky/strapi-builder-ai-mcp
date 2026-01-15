import type { Core } from '@strapi/strapi';

export const getSingleEntryTool = {
  name: 'get_single_entry',
  description: `Fetch a single entry by its document ID from Strapi.
Use this to get complete data for a specific entry, including all populated relations.

Parameters:
- contentType: The API ID of the content type (e.g., 'article', 'product')
- documentId: The document ID of the entry to fetch
- populate: Relations to populate. Use '*' for all, or specify field names`,
  inputSchema: {
    type: 'object',
    properties: {
      contentType: {
        type: 'string',
        description: 'The API ID of the content type (e.g., "article", "product")',
      },
      documentId: {
        type: 'string',
        description: 'The document ID of the entry to fetch',
      },
      populate: {
        oneOf: [
          { type: 'string' },
          { type: 'array', items: { type: 'string' } },
        ],
        description: 'Relations to populate. Use "*" for all, or specify field names',
      },
    },
    required: ['contentType', 'documentId'],
  },
};

interface GetSingleEntryArgs {
  contentType: string;
  documentId: string;
  populate?: string | string[];
}

export async function handleGetSingleEntry(
  strapi: Core.Strapi,
  args: GetSingleEntryArgs
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const { contentType, documentId, populate } = args;

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
    const queryOptions: Record<string, unknown> = {};

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

    // Fetch the entry
    const entry = await strapi.documents(uid as any).findOne({
      documentId,
      ...queryOptions,
    });

    if (!entry) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                error: true,
                message: `Entry with documentId "${documentId}" not found in ${contentType}`,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              contentType: uid,
              data: entry,
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (error) {
    throw new Error(
      `Failed to get entry: ${error instanceof Error ? error.message : String(error)}`
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
