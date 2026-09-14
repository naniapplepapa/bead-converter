import {quantize} from './core.js';
self.onmessage=({data})=>{
  try { self.postMessage({id:data.id,...quantize(data.pixels,data.palette,data.maxColors)}); }
  catch(e) { self.postMessage({id:data.id,errorMessage:e.message}); }
};
