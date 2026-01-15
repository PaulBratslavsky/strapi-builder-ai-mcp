import type { Core } from '@strapi/strapi';

export const getComponentsTool = {
  name: 'get_components',
  description: `Get all component schemas from Strapi. Components are reusable field groups used within content types.
Returns field definitions for each component, organized by category.
Use this to understand nested data structures when building forms or displaying content.`,
  inputSchema: {
    type: 'object',
    properties: {
      category: {
        type: 'string',
        description: 'Filter components by category name',
      },
    },
  },
};

interface ComponentInfo {
  uid: string;
  category: string;
  displayName: string;
  description?: string;
  attributes: Record<string, AttributeInfo>;
}

interface AttributeInfo {
  type: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  enum?: string[];
  default?: unknown;
  relation?: string;
  target?: string;
  component?: string;
  repeatable?: boolean;
  components?: string[];
  allowedTypes?: string[];
}

export async function handleGetComponents(
  strapi: Core.Strapi,
  args: { category?: string }
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const { category } = args;

  try {
    const components = strapi.components;
    const results: ComponentInfo[] = [];
    const categories = new Set<string>();

    for (const [uid, component] of Object.entries(components)) {
      const componentCategory = component.category || 'default';
      categories.add(componentCategory);

      // Apply category filter if provided
      if (category && componentCategory.toLowerCase() !== category.toLowerCase()) {
        continue;
      }

      const attributes: Record<string, AttributeInfo> = {};

      for (const [attrName, attrDef] of Object.entries(component.attributes || {})) {
        const attr = attrDef as any;
        const attrInfo: AttributeInfo = {
          type: attr.type,
        };

        // Add relevant constraints
        if (attr.required) attrInfo.required = true;
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
        }

        // Nested component info
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

      results.push({
        uid,
        category: componentCategory,
        displayName: component.info?.displayName || uid,
        description: component.info?.description,
        attributes,
      });
    }

    // Sort by category then display name
    results.sort((a, b) => {
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
              count: results.length,
              availableCategories: Array.from(categories).sort(),
              components: results,
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (error) {
    throw new Error(
      `Failed to get components: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
