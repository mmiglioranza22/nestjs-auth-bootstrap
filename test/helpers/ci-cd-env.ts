// Nasty hack for CI/CD avoiding logging
export const _getCurrentNodeEnv = () => process.env.NODE_ENV;
