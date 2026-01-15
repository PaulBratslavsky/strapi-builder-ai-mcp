import type { Core } from '@strapi/strapi';

export const getContentTypesTool = {
  name: 'get_content_types',
  description: `Get all content type schemas from Strapi. Returns field definitions, types, validations, and relationships.
Use this to understand the data structure before building frontend components.
Set includePlugins=true to also see plugin content types (users, media, etc).
Use filter to search for specific content types by name.`,
  inputSchema: {
    type: 'object',
    properties: {
      includePlugins: {
        type: 'boolean',
        description: 'Include plugin content types (default: false)',
        default: false,
      },
      filter: {
        type: 'string',
        description: 'Filter content types by name (case-insensitive)',
      },
    },
  },
};

interface ContentTypeInfo {
  uid: string;
  kind: string;
  singularName: string;
  pluralName: string;
  displayName: string;
  description?: string;
  draftAndPublish: boolean;
  attributes: Record<string, AttributeInfo>;
  apiId: string;
}

interface AttributeInfo {
  type: string;
  required?: boolean;
  unique?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  enum?: string[];
  default?: unknown;
  relation?: string;
  target?: string;
  mappedBy?: string;
  inversedBy?: string;
  component?: string;
  repeatable?: boolean;
  components?: string[];
  allowedTypes?: string[];
}

export async function handleGetContentTypes(
  strapi: Core.Strapi,
  args: { includePlugins?: boolean; filter?: string }
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const { includePlugins = false, filter } = args;

  try {
    const contentTypes = strapi.contentTypes;
    const results: ContentTypeInfo[] = [];

    for (const [uid, contentType] of Object.entries(contentTypes)) {
      // Skip admin and internal types
      if (uid.startsWith('admin::') || uid.startsWith('strapi::')) {
        continue;
      }

      // Skip plugin types unless requested
      if (!includePlugins && uid.startsWith('plugin::')) {
        continue;
      }

      // Apply filter if provided
      if (filter) {
        const lowerFilter = filter.toLowerCase();
        const matchesFilter =
          uid.toLowerCase().includes(lowerFilter) ||
          contentType.info?.displayName?.toLowerCase().includes(lowerFilter) ||
          contentType.info?.singularName?.toLowerCase().includes(lowerFilter);
        if (!matchesFilter) {
          continue;
        }
      }

      const attributes: Record<string, AttributeInfo> = {};

      for (const [attrName, attrDef] of Object.entries(contentType.attributes || {})) {
        // Skip internal fields
        if (['createdAt', 'updatedAt', 'publishedAt', 'createdBy', 'updatedBy', 'locale', 'localizations'].includes(attrName)) {
          continue;
        }

        const attr = attrDef as any;
        const attrInfo: AttributeInfo = {
          type: attr.type,
        };

        // Add relevant constraints
        if (attr.required) attrInfo.required = true;
        if (attr.unique) attrInfo.unique = true;
        if (attr.minLength) attrInfo.minLength = attr.minLength;
        if (attr.maxLength) attrInfo.maxLength = attr.maxLength;
        if (attr.min) attrInfo.min = attr.min;
        if (attr.max) attrInfo.max = attr.max;
        if (attr.enum) attrInfo.enum = attr.enum;
        if (attr.default !== undefined) attrInfo.default = attr.default;

        // Relation info
        if (attr.type === 'relation') {
          attrInfo.relation = attr.relation;
          attrInfo.target = attr.target;
          if (attr.mappedBy) attrInfo.mappedBy = attr.mappedBy;
          if (attr.inversedBy) attrInfo.inversedBy = attr.inversedBy;
        }

        // Component info
        if (attr.type === 'component') {
          attrInfo.component = attr.component;
          attrInfo.repeatable = attr.repeatable;
        }

        // Dynamic zone info
        if (attr.type === 'dynamiczone') {
          attrInfo.components = attr.components;
        }

        // Media info
        if (attr.type === 'media') {
          attrInfo.allowedTypes = attr.allowedTypes;
        }

        attributes[attrName] = attrInfo;
      }

      // Extract apiId from uid (e.g., 'api::article.article' -> 'article')
      const apiId = uid.split('.').pop() || '';

      results.push({
        uid,
        kind: contentType.kind || 'collectionType',
        singularName: contentType.info?.singularName || '',
        pluralName: contentType.info?.pluralName || '',
        displayName: contentType.info?.displayName || '',
        description: contentType.info?.description,
        draftAndPublish: contentType.options?.draftAndPublish ?? false,
        attributes,
        apiId,
      });
    }

    // Sort by display name
    results.sort((a, b) => a.displayName.localeCompare(b.displayName));

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              count: results.length,
              contentTypes: results,
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (error) {
    throw new Error(
      `Failed to get content types: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
