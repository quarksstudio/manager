const { resolve } = require('node:path');
const { compilerOptions } = require('../tsconfig.base.json');
module.exports = Object.fromEntries(
  Object.entries(compilerOptions.paths)
    .filter(
      ([name]) => name.startsWith('@quarks.studio/') && !name.includes('*'),
    )
    .map(([name, [source]]) => [
      `^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`,
      resolve(__dirname, '..', source),
    ]),
);
