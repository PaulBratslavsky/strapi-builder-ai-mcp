import type { Core } from '@strapi/strapi';

export const getApiStructureTool = {
  name: 'get_api_structure',
  description: `Get an overview of the Strapi API structure. Returns a summary of all content types with their endpoints, field counts, and relationship information.

Use this as a starting point to understand the overall API before diving into specific content types.
This is useful for building navigation, understanding data relationships, and planning frontend architecture.`,
  inputSchema: {
    type: 'object',
    properties: {},
  },
};

interface ContentTypeSummary {
  uid: string;
  kind: 'collectionType' | 'singleType';
  displayName: string;
  apiId: string;
  endpoint: string;
  fieldCount: number;
  fields: string[];
  relations: RelationSummary[];
  components: string[];
  hasDynamicZone: boolean;
  hasMedia: boolean;
  draftAndPublish: boolean;
}

interface RelationSummary {
  field: string;
  type: string;
  target: string;
  targetDisplayName: string;
}

interface ComponentSummary {
  uid: string;
  category: string;
  displayName: string;
  fieldCount: number;
}

export async function handleGetApiStructure(
  strapi: Core.Strapi,
  _args: Record<string, never>
): Promise<{ content: Array<{ type: string; text: string }> }> {
  try {
    const contentTypes = strapi.contentTypes;
    const components = strapi.components;

    const apiContentTypes: ContentTypeSummary[] = [];
    const pluginContentTypes: ContentTypeSummary[] = [];

    for (const [uid, contentType] of Object.entries(contentTypes)) {
      // Skip admin and internal types
      if (uid.startsWith('admin::') || uid.startsWith('strapi::')) {
        continue;
      }

      const isPlugin = uid.startsWith('plugin::');
      const apiId = uid.split('.').pop() || '';
      const kind = contentType.kind || 'collectionType';

      // Build endpoint path
      const pluralName = contentType.info?.pluralName || apiId;
      const endpoint = kind === 'singleType'
        ? `/api/${pluralName}`
        : `/api/${pluralName}/:documentId`;

      const fields: string[] = [];
      const relations: RelationSummary[] = [];
      const usedComponents: string[] = [];
      let hasDynamicZone = false;
      let hasMedia = false;

      for (const [attrName, attrDef] of Object.entries(contentType.attributes || {})) {
        // Skip internal fields
        if (['createdAt', 'updatedAt', 'publishedAt', 'createdBy', 'updatedBy', 'locale', 'localizations'].includes(attrName)) {
          continue;
        }

        const attr = attrDef as any;
        fields.push(attrName);

        if (attr.type === 'relation' && attr.target) {
          const targetCt = contentTypes[attr.target];
          relations.push({
            field: attrName,
            type: attr.relation,
            target: attr.target,
            targetDisplayName: targetCt?.info?.displayName || attr.target,
          });
        }

        if (attr.type === 'component' && attr.component) {
          if (!usedComponents.includes(attr.component)) {
            usedComponents.push(attr.component);
          }
        }

        if (attr.type === 'dynamiczone') {
          hasDynamicZone = true;
          for (const comp of attr.components || []) {
            if (!usedComponents.includes(comp)) {
              usedComponents.push(comp);
            }
          }
        }

        if (attr.type === 'media') {
          hasMedia = true;
        }
      }

      const summary: ContentTypeSummary = {
        uid,
        kind: kind as 'collectionType' | 'singleType',
        displayName: contentType.info?.displayName || apiId,
        apiId,
        endpoint,
        fieldCount: fields.length,
        fields,
        relations,
        components: usedComponents,
        hasDynamicZone,
        hasMedia,
        draftAndPublish: contentType.options?.draftAndPublish ?? false,
      };

      if (isPlugin) {
        pluginContentTypes.push(summary);
      } else {
        apiContentTypes.push(summary);
      }
    }

    // Component summary
    const componentSummaries: ComponentSummary[] = [];
    const componentCategories = new Set<string>();

    for (const [uid, component] of Object.entries(components)) {
      const category = component.category || 'default';
      componentCategories.add(category);

      const fieldCount = Object.keys(component.attributes || {}).length;

      componentSummaries.push({
        uid,
        category,
        displayName: component.info?.displayName || uid,
        fieldCount,
      });
    }

    // Sort results
    apiContentTypes.sort((a, b) => a.displayName.localeCompare(b.displayName));
    pluginContentTypes.sort((a, b) => a.displayName.localeCompare(b.displayName));
    componentSummaries.sort((a, b) => {
      const catCompare = a.category.localeCompare(b.category);
      if (catCompare !== 0) return catCompare;
      return a.displayName.localeCompare(b.displayName);
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              summary: {
                apiContentTypes: apiContentTypes.length,
                pluginContentTypes: pluginContentTypes.length,
                components: componentSummaries.length,
                componentCategories: Array.from(componentCategories).sort(),
              },
              apiContentTypes,
              pluginContentTypes,
              components: componentSummaries,
              tips: [
                'Use get_content_types to get detailed schema for any content type',
                'Use get_components to get detailed schema for components',
                'Use get_collection_data to fetch sample data from any collection',
                'Use get_single_entry to fetch a specific entry by documentId',
                'Endpoints follow pattern: /api/{pluralName} for collections, /api/{pluralName} for single types',
              ],
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (error) {
    throw new Error(
      `Failed to get API structure: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
