import {createNeighborhood} from './scene.js';
const root=document.querySelector('main');
const scene=createNeighborhood({root,
  onItem:detail=>window.dispatchEvent(new CustomEvent('amane:home-item',{detail})),
  onView:detail=>window.dispatchEvent(new CustomEvent('amane:home-view',{detail}))
});
root.querySelector('.house-toggle').id='house-toggle';
Object.defineProperty(window,'amaneHome',{configurable:true,value:scene});
window.addEventListener('pagehide',()=>{scene.dispose();if(window.amaneHome===scene)delete window.amaneHome;},{once:true});
