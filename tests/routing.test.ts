import test from 'node:test';
import assert from 'node:assert/strict';
import { modelGroups } from '../typescript/src/routing';
import { normalizeModel } from '../typescript/src/adapters/openrouter';
import type { Catalog } from '../shared/types';

const model=(id:string,context=32000)=>normalizeModel({id,name:id,description:'Text model',context_length:context,architecture:{input_modalities:['text'],output_modalities:['text']},pricing:{prompt:'0.000001',completion:'0.000002'}});
test('all 601 compatible models participate exactly once, within TypeSafe limits',()=>{
 const models=Array.from({length:601},(_,i)=>model(`vendor/model-${i}`));
 const catalog:Catalog={stage:'catalog',models,fetchedAt:'now',durationMs:1};
 const groups=modelGroups(catalog,'hello');
 assert.deepEqual(groups.map(g=>g.length),[200,200,200,1]);
 assert.equal(new Set(groups.flat().map(m=>m.id)).size,601);
});
test('catalog preserves non-text models and aliases, while routing excludes them',()=>{
 const image=normalizeModel({id:'vendor/image',name:'Image',architecture:{input_modalities:['text'],output_modalities:['image']}});
 const alias=model('openrouter/auto');const tiny=model('vendor/tiny',2000);const normal=model('vendor/chat');
 const catalog:Catalog={stage:'catalog',models:[image,alias,tiny,normal],fetchedAt:'now',durationMs:1};
 assert.equal(catalog.models.length,4);
 assert.deepEqual(modelGroups(catalog,'hello').flat().map(m=>m.id),['vendor/chat']);
 assert.match(image.exclusion!,/text/);assert.match(alias.exclusion!,/routing alias/);
 assert.equal(normal.inputPrice,1);assert.equal(normal.outputPrice,2);
 assert.equal(image.inputPrice,null);
});
