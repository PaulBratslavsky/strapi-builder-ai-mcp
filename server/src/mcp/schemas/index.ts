import { z } from 'zod';

export const GetContentTypesSchema = z.object({
  includePlugins: z.boolean().optional().default(false),
  filter: z.string().optional(),
});

export const GetComponentsSchema = z.object({
  category: z.string().optional(),
});

export const GetCollectionDataSchema = z.object({
  contentType: z.string().min(1, 'Content type is required'),
  limit: z.number().min(1).max(100).optional().default(10),
  page: z.number().min(1).optional().default(1),
  populate: z.union([z.string(), z.array(z.string()), z.literal('*')]).optional(),
  filters: z.record(z.unknown()).optional(),
  sort: z.string().optional(),
});

export const GetSingleEntrySchema = z.object({
  contentType: z.string().min(1, 'Content type is required'),
  documentId: z.string().min(1, 'Document ID is required'),
  populate: z.union([z.string(), z.array(z.string()), z.literal('*')]).optional(),
});

export const GetApiStructureSchema = z.object({});

export const GetProjectContextSchema = z.object({});

export const GetRoutesSchema = z.object({});

export const ToolSchemas: Record<string, z.ZodSchema> = {
  get_project_context: GetProjectContextSchema,
  get_routes: GetRoutesSchema,
  get_content_types: GetContentTypesSchema,
  get_components: GetComponentsSchema,
  get_collection_data: GetCollectionDataSchema,
  get_single_entry: GetSingleEntrySchema,
  get_api_structure: GetApiStructureSchema,
};

export function validateToolInput<T = unknown>(toolName: string, input: unknown): T {
  const schema = ToolSchemas[toolName];
  if (!schema) {
    throw new Error(`No schema defined for tool: ${toolName}`);
  }

  const result = schema.safeParse(input);
  if (!result.success) {
    const errors = result.error.errors
      .map((e) => `${e.path.join('.')}: ${e.message}`)
      .join(', ');
    throw new Error(`Validation failed for ${toolName}: ${errors}`);
  }

  return result.data as T;
}
