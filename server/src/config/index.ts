export default {
  default: {
    strapiUrl: process.env.STRAPI_URL || 'http://localhost:1337',
    mediaUrl: process.env.MEDIA_URL || process.env.STRAPI_URL || 'http://localhost:1337',
    publicEndpoints: true,
    apiPrefix: '/api',
  },
  validator(config: {
    strapiUrl?: string;
    mediaUrl?: string;
    publicEndpoints?: boolean;
    apiPrefix?: string;
  }) {
    if (config.strapiUrl && typeof config.strapiUrl !== 'string') {
      throw new Error('strapiUrl must be a string');
    }
    if (config.mediaUrl && typeof config.mediaUrl !== 'string') {
      throw new Error('mediaUrl must be a string');
    }
    if (config.apiPrefix && typeof config.apiPrefix !== 'string') {
      throw new Error('apiPrefix must be a string');
    }
  },
};
