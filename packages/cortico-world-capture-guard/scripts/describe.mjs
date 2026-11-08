import {writeFile} from 'node:fs/promises';
import definition from '../src/index.js';
await writeFile(new URL('../describe.json',import.meta.url),JSON.stringify(definition.describe,null,2)+'\n');
console.log('Capture Guard declarations generated');
