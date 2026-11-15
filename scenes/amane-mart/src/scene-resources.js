// Each mounted scene owns its resources. Sets account for textures, materials
// and geometry shared by several meshes within the same instance.
export function disposeSceneResources(scene, weather) {
  const geometries=new Set(),materials=new Set(),textures=new Set(),targets=new Set();
  const texture=value=>{
    if(value?.isTexture&&!value.isRenderTargetTexture)textures.add(value);
    else if(Array.isArray(value))value.forEach(texture);
  };
  scene.traverse(object=>{
    if(object.geometry)geometries.add(object.geometry);
    const list=Array.isArray(object.material)?object.material:[object.material];
    for(const material of list){
      if(!material)continue;
      materials.add(material);
      Object.values(material).forEach(texture);
      Object.values(material.uniforms??{}).forEach(uniform=>texture(uniform.value));
    }
    if(object.isReflector)targets.add(object.getRenderTarget());
    if(object.shadow?.map)targets.add(object.shadow.map);
    if(object.shadow?.mapPass)targets.add(object.shadow.mapPass);
    object.onBeforeRender=()=>{};object.onAfterRender=()=>{};
    if(object.isInstancedMesh)object.dispose();
  });
  weather?.dispose?.();
  targets.forEach(value=>value.dispose());
  textures.forEach(value=>value.dispose());
  materials.forEach(value=>value.dispose());
  geometries.forEach(value=>value.dispose());
}
