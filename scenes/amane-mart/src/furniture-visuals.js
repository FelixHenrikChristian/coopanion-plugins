// Visual state only. The host owns command validation, task timing and persistence.
export function createFurnitureVisuals({tvScreen,laptopScreen,lampShade,lampGlow,washerIndicators}){
  const state={'living.tv':{power:true},'study.laptop':{power:true},'bedroom.bedside':{power:true},'genkan.washer':{power:true,running:false}};
  const original=new Map();
  for(const mesh of [tvScreen,laptopScreen,lampShade,...washerIndicators]){
    mesh.userData.preserveBatch=true;
    mesh.material=mesh.material.clone();
    original.set(mesh,{color:mesh.material.color.clone(),emissive:mesh.material.emissive.clone(),intensity:mesh.material.emissiveIntensity});
  }
  const glowOpacity=lampGlow.material.opacity;
  function reset(mesh){const b=original.get(mesh);mesh.material.color.copy(b.color);mesh.material.emissive.copy(b.emissive);mesh.material.emissiveIntensity=b.intensity;}
  function screen(mesh,power){
    reset(mesh);
    if(!power){mesh.material.color.setRGB(.012,.016,.019);mesh.material.emissiveIntensity=0;}
  }
  function apply(){
    screen(tvScreen,state['living.tv'].power);screen(laptopScreen,state['study.laptop'].power);
    reset(lampShade);
    if(!state['bedroom.bedside'].power)lampShade.material.emissiveIntensity=0;
    lampGlow.material.opacity=state['bedroom.bedside'].power?glowOpacity:0;
    washerIndicators.forEach(mesh=>{
      reset(mesh);
      if(!state['genkan.washer'].power){mesh.material.color.set('#364441');mesh.material.emissiveIntensity=0;}
    });
  }
  function setFurnitureVisuals(snapshot){
    if(!snapshot||typeof snapshot!=='object'||Array.isArray(snapshot))throw new TypeError('Furniture visuals must be an object keyed by item ID');
    const next=structuredClone(state);
    for(const [id,patch] of Object.entries(snapshot)){
      if(!Object.hasOwn(state,id)||!patch||typeof patch!=='object'||Array.isArray(patch))throw new TypeError('Unknown furniture visual state');
      for(const [key,value] of Object.entries(patch)){
        if(!Object.hasOwn(state[id],key)||typeof value!=='boolean')throw new TypeError('Furniture state fields must be supported booleans');
        next[id][key]=value;
      }
      if(id==='genkan.washer'&&!next[id].power)next[id].running=false;
    }
    for(const id of Object.keys(state))state[id]=next[id];
    apply();return getFurnitureVisuals();
  }
  function getFurnitureVisuals(){return structuredClone(state);}
  function update(time,reducedMotion){
    const washer=state['genkan.washer'];
    if(!washer.power||!washer.running)return;
    washerIndicators.forEach((mesh,i)=>{
      mesh.material.emissive.set('#8ed4bb');
      mesh.material.emissiveIntensity=reducedMotion?.7:.5+.35*(.5+.5*Math.sin(time*4-i*1.4));
    });
  }
  return Object.freeze({setFurnitureVisuals,getFurnitureVisuals,update,isPowered:id=>state[id]?.power!==false});
}
