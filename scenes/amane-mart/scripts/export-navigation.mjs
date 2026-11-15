import {writeFile} from 'node:fs/promises';
import {getNavigationData} from '../src/navigation-data.js';

// The plugin build can consume this JSON without loading a renderer or DOM.
const json=JSON.stringify(getNavigationData(),null,2)+'\n';
if(process.argv[2])await writeFile(process.argv[2],json);
else process.stdout.write(json);
