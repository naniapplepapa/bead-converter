// sRGB -> OKLab, using Björn Ottosson's public-domain 2021 matrices.
export function oklab(rgb) {
  const [r,g,b] = rgb.map(v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; });
  const l=Math.cbrt(.4122214708*r+.5363325363*g+.0514459929*b);
  const m=Math.cbrt(.2119034982*r+.6806995451*g+.1073969566*b);
  const s=Math.cbrt(.0883024619*r+.2817188376*g+.6299787005*b);
  return [.2104542553*l+.793617785*m-.0040720468*s,1.9779984951*l-2.428592205*m+.4505937099*s,.0259040371*l+.7827717662*m-.808675766*s];
}
export const rgbFromHex = hex => [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
export const distance = (a,b) => (a[0]-b[0])**2+(a[1]-b[1])**2+(a[2]-b[2])**2;
export function validatePalette(data) {
  if(data.schemaVersion!==1 || !Array.isArray(data.colors) || !data.colors.length || data.colors.length>500) throw Error('色庫格式不正確');
  const codes=new Set();
  for(const c of data.colors) {
    if(!/^[A-Z]{1,3}[0-9]{1,3}$/.test(c.code) || !/^#[0-9a-f]{6}$/i.test(c.hex) || codes.has(c.code)) throw Error('色庫含重複色號或無效色值');
    codes.add(c.code);
  }
  if(!Array.isArray(data.kit36) || data.kit36.length!==36 || new Set(data.kit36).size!==36 || data.kit36.some(c=>!codes.has(c))) throw Error('36 色清單不正確');
  return data;
}
// A palette-constrained greedy facility selection minimizes total squared OKLab
// error. Every cell is finally mapped only to the selected <= K real bead colors.
// The full distance matrix is bounded at 2500 x 500 and stays inside a worker.
export function quantize(pixels,palette,maxColors) {
  if(!pixels.length || !palette.length || !Number.isInteger(maxColors) || maxColors<1) throw Error('無效的轉換設定');
  const n=pixels.length,m=palette.length,k=Math.min(maxColors,m);
  const labs=palette.map(c=>oklab(rgbFromHex(c.hex)));
  const costs=new Float32Array(n*m), sums=new Float64Array(m);
  for(let i=0;i<n;i++) {
    const lab=oklab(pixels[i]);
    for(let j=0;j<m;j++) {const d=distance(lab,labs[j]);costs[i*m+j]=d;sums[j]+=d;}
  }
  let selected=[];
  if(k===m) selected=Array.from({length:m},(_,i)=>i);
  else {
    let first=0;for(let j=1;j<m;j++) if(sums[j]<sums[first]) first=j;
    selected=[first];const used=new Set(selected),best=Float32Array.from({length:n},(_,i)=>costs[i*m+first]);
    while(selected.length<k) {
      let chosen=-1,gain=1e-12;
      for(let j=0;j<m;j++) {
        if(used.has(j)) continue;
        let g=0;for(let i=0;i<n;i++) g+=Math.max(0,best[i]-costs[i*m+j]);
        if(g>gain) {gain=g;chosen=j;}
      }
      if(chosen<0) break;
      used.add(chosen);selected.push(chosen);
      for(let i=0;i<n;i++) best[i]=Math.min(best[i],costs[i*m+chosen]);
    }
  }
  const cells=[],counts={};let error=0;
  for(let i=0;i<n;i++) {
    let j=selected[0];for(const s of selected) if(costs[i*m+s]<costs[i*m+j]) j=s;
    const code=palette[j].code;cells.push(code);counts[code]=(counts[code]||0)+1;error+=costs[i*m+j];
  }
  return {cells,counts,error};
}
