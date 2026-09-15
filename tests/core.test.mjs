import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {oklab,quantize,validatePalette,rgbFromHex} from '../core.js';
const data=validatePalette(JSON.parse(readFileSync(new URL('../data/mard.json',import.meta.url))));
test('palette has 221 unique colors and a valid 36-color subset',()=>{assert.equal(data.colors.length,221);assert.equal(data.kit36.length,36);});
test('OKLab reference values',()=>{const red=oklab([255,0,0]);[.62795536,.22486306,.12584630].forEach((x,i)=>assert.ok(Math.abs(red[i]-x)<1e-7));assert.ok(Math.abs(oklab([255,255,255])[0]-1)<1e-7);assert.deepEqual(oklab([0,0,0]),[0,0,0]);});
test('hard color cap, exact bead totals, valid palette membership at every size',()=>{
 for(const n of [10,29,35,47,50,100])for(const palette of [data.colors,data.colors.filter(c=>data.kit36.includes(c.code))]){
  const pixels=Array.from({length:n*n},(_,i)=>[(i*137)%256,(i*71)%256,(i*37)%256]);let last=Infinity;
  for(const k of [1,4,8,16,24,32,palette.length]){const r=quantize(pixels,palette,k);assert.equal(r.cells.length,n*n);assert.ok(Object.keys(r.counts).length<=k);assert.equal(Object.values(r.counts).reduce((a,b)=>a+b,0),n*n);assert.ok(r.cells.every(code=>palette.some(c=>c.code===code)));assert.ok(r.error<=last+1e-6);last=r.error;}
 }
});
test('exact palette inputs reproduce with unrestricted colors',()=>{const r=quantize(data.colors.map(c=>rgbFromHex(c.hex)),data.colors,221);assert.equal(r.error,0);});
test('flat color stays one color and conversion is deterministic',()=>{const p=Array.from({length:841},()=>[250,244,200]);const a=quantize(p,data.colors,16);assert.equal(Object.keys(a.counts).length,1);assert.deepEqual(quantize(p,data.colors,16),a);});
test('invalid palette rejected',()=>{assert.throws(()=>validatePalette({...data,colors:[data.colors[0],data.colors[0]]}));assert.throws(()=>quantize([[1,2,3]],data.colors,0));});
