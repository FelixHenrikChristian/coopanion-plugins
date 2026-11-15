import {writeFile} from 'node:fs/promises';
import {DESCRIBE} from '../src/index.js';
await writeFile(new URL('../describe.json',import.meta.url),JSON.stringify(DESCRIBE,null,2)+'\n');
console.log('Home World description updated.');
