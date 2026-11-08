import {createServer} from 'node:http';
import {createHash,timingSafeEqual} from 'node:crypto';

/** Read-only, origin-checked loopback feed. No command or filesystem RPCs. */
export class NativeFeed {
  constructor({origin,token,port=17891,snapshot}){this.origin=origin;this.token=token;this.port=port;this.snapshot=snapshot;this.clients=new Set();}
  async start(){
    const server=this.server=createServer((_req,res)=>res.writeHead(404).end());
    server.headersTimeout=3000;
    server.on('upgrade',(req,socket,head)=>{
      const reject=()=>{socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');};
      const key=req.headers['sec-websocket-key'];let url;try{url=new URL(req.url,'http://127.0.0.1');}catch{return reject();}
      const supplied=Buffer.from(url.searchParams.get('key')??''),expected=Buffer.from(this.token);
      if(req.headers.origin!==this.origin||req.headers.host!==`127.0.0.1:${this.port}`||url.pathname!=='/wardrobe-view'||supplied.length!==expected.length||!timingSafeEqual(supplied,expected)||req.headers['sec-websocket-version']!=='13'||typeof key!=='string'||!/^[A-Za-z0-9+/]{22}==$/.test(key)||head.length)return reject();
      const accept=createHash('sha1').update(key+'258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
      socket.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\n\r\n`);
      this.clients.add(socket);socket.on('error',()=>{});socket.on('close',()=>this.clients.delete(socket));
      // Clients never send commands; even unsolicited application frames close the connection.
      socket.on('data',()=>socket.destroy());this.send(socket);
    });
    await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(this.port,'127.0.0.1',()=>{server.off('error',reject);this.port=server.address().port;resolve();});});
    this.timer=setInterval(()=>this.broadcast(),2000);this.timer.unref();
  }
  send(socket){
    let body;try{body=Buffer.from(JSON.stringify(this.snapshot()));}catch{socket.destroy();return;}
    if(body.length>1024*1024||socket.writableLength>2*1024*1024){socket.destroy();return;}
    let header;if(body.length<126)header=Buffer.from([0x81,body.length]);else if(body.length<65536){header=Buffer.alloc(4);header[0]=0x81;header[1]=126;header.writeUInt16BE(body.length,2);}else{header=Buffer.alloc(10);header[0]=0x81;header[1]=127;header.writeBigUInt64BE(BigInt(body.length),2);}
    socket.write(Buffer.concat([header,body]));
  }
  broadcast(){for(const socket of this.clients)this.send(socket);}
  async stop(){clearInterval(this.timer);for(const s of this.clients)s.destroy();this.clients.clear();if(this.server?.listening)await new Promise(resolve=>this.server.close(resolve));}
}
