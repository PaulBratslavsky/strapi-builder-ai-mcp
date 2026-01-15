export default () => ({
  type: 'content-api',
  routes: [
    {
      method: 'GET',
      path: '/',
      handler: 'controller.index',
      config: {
        policies: [],
      },
    },
    // MCP routes - auth disabled (handled by middleware/token validation)
    {
      method: 'POST',
      path: '/mcp',
      handler: 'mcp.handle',
      config: {
        auth: false,
        policies: [],
      },
    },
    {
      method: 'GET',
      path: '/mcp',
      handler: 'mcp.handle',
      config: {
        auth: false,
        policies: [],
      },
    },
    {
      method: 'DELETE',
      path: '/mcp',
      handler: 'mcp.handle',
      config: {
        auth: false,
        policies: [],
      },
    },
  ],
});
