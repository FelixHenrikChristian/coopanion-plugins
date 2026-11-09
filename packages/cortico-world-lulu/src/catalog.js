export const FIGURE='lulu-capybara';
export const SCHEMES=Object.freeze({bag:'橘子噜噜 · 带包包',plain:'橘子噜噜 · 摘下包包',sleep:'睡衣噜噜',dino:'纸箱恐龙噜噜'});
export const PROFILE={schema:1,id:'lulu-wardrobe',figure:FIGURE,label:'噜噜的衣橱',outfits:[
  {id:'orange',label:'橘子噜噜',controls:[{id:'bag',label:'小鸟包包',default:'on',options:[{id:'on',label:'戴上'},{id:'off',label:'摘下'}]}],variants:[{pick:{bag:'on'},scheme:'bag'},{pick:{bag:'off'},scheme:'plain'}]},
  {id:'sleep',label:'睡衣噜噜',controls:[],variants:[{pick:{},scheme:'sleep'}]},
  {id:'dino',label:'纸箱恐龙噜噜',controls:[],variants:[{pick:{},scheme:'dino'}]}
]};
export const DESCRIBE={tools:[],events:[]};
