import {NativeAdapter} from './native-adapter.js';
import {Store} from './store.js';
const args=process.argv.slice(2);
if(args.length!==4||args[0]!=='--data-dir'||args[2]!=='--web-dir'){
  console.error('Usage: node src/native-restore.js --data-dir <World dataDir> --web-dir <desktop-pet/web>');process.exitCode=1;
}else{
  try{await new NativeAdapter({webDir:args[3],store:new Store(args[1])}).stop();console.log('Native adapter files restored; reopen the native wardrobe page.');}
  catch(error){console.error(error.message);process.exitCode=1;}
}
