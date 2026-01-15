import type { Core } from '@strapi/strapi';

const controller = ({ strapi }: { strapi: Core.Strapi }) => ({
  index(ctx) {
    ctx.body = strapi
      .plugin('strapi-builder-ai-mcp')
      // the name of the service file & the method.
      .service('service')
      .getWelcomeMessage();
  },
});

export default controller;
