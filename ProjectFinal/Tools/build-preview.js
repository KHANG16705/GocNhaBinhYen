const fs=require('fs');
const path=require('path');
const sharp=require('sharp');
const crypto=require('crypto');
const root=path.resolve(__dirname,'..');
const abs=p=>path.join(root,p);
const ensure=p=>fs.mkdirSync(path.dirname(abs(p)),{recursive:true});
const write=(p,data)=>{ensure(p);fs.writeFileSync(abs(p),data);};
const rules=require('../4_Data_and_Fonts/Configs/FurnitureRules.json');
const animation=require('../4_Data_and_Fonts/Configs/AnimationManifest.json');
const blank=(w,h,color='#00000000')=>sharp({create:{width:w,height:h,channels:4,background:color}});
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;');
const png=async(p,b)=>{ensure(p);await sharp(b).png().toFile(abs(p));};
const json=(p,x)=>write(p,JSON.stringify(x,null,2)+'\n');
const sf=1536/1448;
// Positions in source-map pixel coordinates, then scaled to the exported 1536 x 1152 map.
const placements=[
 ['Rug','Down',288,340,0.92],['Rug','Down',706,583,1.20],
 ['Bed','Down',267,323,1.03],['BedsideTable','Down',158,268,0.9],
 ['Wardrobe','Down',397,397,0.95],['DecorPlant','Down',160,350,0.7],
 ['Desk','Down',670,269,1.0],['Chair','Up',660,331,0.78],['Bookshelf','Down',816,274,0.9],
 ['Fridge','Down',1038,278,1],['Sink','Down',1148,280,1],['Stove','Down',1270,280,1],
 ['CoffeeTable','Down',1190,386,1.1],['Chair','Right',1085,387,0.75],['Chair','Left',1290,387,0.75],
 ['Sofa','Right',592,564,1.15],['CoffeeTable','Down',720,552,1.1],
 ['DecorPlant','Down',839,475,0.8],['Lamp','Down',881,580,0.87],
 ['WashingMachine','Down',1285,606,0.78],['PotEmpty','Down',1109,602,0.7],
 ['Bench','Down',373,788,0.9],['WateringCan','Right',842,881,0.75],
 ['SoilBed','Down',1068,805,1],['SoilBed','Down',1068,945,1],['SoilBed','Down',454,929,1]
].map(([id,direction,x,y,scale],i)=>({instanceId:`PROP_${String(i+1).padStart(2,'0')}`,id,direction,anchorPixels:[Math.round(x*sf),Math.round(y*sf)],scale,layer:id==='Rug'?'ground':'objects'}));

async function objectLayer(p) {
 const item=rules.items.find(i=>i.id===p.id),frame=item.frames.find(f=>f.direction===p.direction);
 const [x,y,w,h]=frame.contentRect;
 const width=Math.round(w*p.scale),height=Math.round(h*p.scale);
 return {input:await sharp(abs(frame.file)).extract({left:x,top:y,width:w,height:h}).resize(width,height,{kernel:'nearest'}).toBuffer(),left:Math.round(p.anchorPixels[0]-width/2),top:p.anchorPixels[1]-height};
}

async function makeMap() {
 const objects=[];
 for(const p of placements.filter(p=>p.layer!=='ground'))objects.push({...await objectLayer(p),sort:p.anchorPixels[1]});
 for(const [id,x,y,scale] of [['Tree',179,859,0.90],['Shrub',1300,940,0.6]]) {
  const file=`1_2D_Art/Environment/Garden/Object_${id}.png`,m=await sharp(abs(file)).metadata();
  const w=Math.round(m.width*scale),h=Math.round(m.height*scale);
  objects.push({input:await sharp(abs(file)).resize(w,h,{kernel:'nearest'}).toBuffer(),left:Math.round(x*sf-w/2),top:Math.round(y*sf-h),sort:y*sf});
 }
 for(const [sex,direction,x,y] of [['Female','Right',569,365],['Male','Down',732,835]]) {
  const file=`2_Animations/Characters/${sex}/Frames/${direction}_00.png`;
  objects.push({input:fs.readFileSync(abs(file)),left:Math.round(x*sf-48),top:Math.round(y*sf-104),sort:y*sf});
 }
 const background='1_2D_Art/Backgrounds/Background_EmptyMap.png';

 // Exact visible wall cutouts; no artificial floor painted behind the walls.
 const wallSegments=[
  {id:'EntryHeader',rect:[59,392,211,28]},
  {id:'EntryWindowWall',rect:[62,416,181,129]},
  {id:'EntryPost',rect:[242,410,31,137]},
  {id:'EntrySteps',rect:[273,486,196,62]},
  {id:'LivingLeft',rect:[474,357,48,263]},
  {id:'FrontLeft',rect:[477,620,175,82]},
  {id:'FrontRight',rect:[790,620,582,85]},
  {id:'LivingRight',rect:[943,358,35,261]},
  {id:'UtilityLeft',rect:[1076,395,32,83]},
  {id:'UtilityHeader',rect:[1100,395,267,28]},
  // Rear window-wall trims and the two projecting partitions were absent previously.
  {id:'RearUpperBeam',rect:[80,0,1285,35]},
  {id:'RearLowerTrimLeft',rect:[108,135,367,50]},
  {id:'RearLowerTrimCenter',rect:[515,132,359,42]},
  {id:'RearLowerTrimRight',rect:[914,137,414,48]},
  {id:'RearPartitionLeft',rect:[475,0,40,269]},
  {id:'RearPartitionRight',rect:[874,0,40,270]}
 ];
 const wallRects=wallSegments.map(s=>s.rect);
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1536" height="1152">${wallRects.map(([x,y,w,h])=>`<rect x="${Math.round(x*sf)}" y="${Math.round(y*sf)}" width="${Math.round(w*sf)}" height="${Math.round(h*sf)}" fill="white"/>`).join('')}</svg>`;
 const mask=Buffer.from(svg);
 await png('1_2D_Art/Backgrounds/Background_Occlusion.png',await sharp(abs(background)).ensureAlpha().composite([{input:mask,blend:'dest-in'}]).png().toBuffer());
 await png('1_2D_Art/Backgrounds/Background_Base.png',await sharp(abs(background)).ensureAlpha().composite([{input:mask,blend:'dest-out'}]).png().toBuffer());
 const occluders=[];
 for(const segment of wallSegments){
  const [x,y,w,h]=segment.rect.map(n=>Math.round(n*sf));
  const file=`1_2D_Art/Backgrounds/Walls/Wall_${segment.id}.png`;
  await png(file,await sharp(abs(background)).extract({left:x,top:y,width:w,height:h}).ensureAlpha().toBuffer());
  occluders.push({id:segment.id,file,rectPixels:[x,y,w,h],positionPixels:[x,y],pivotPixels:[w/2,h],sortAnchorPixels:[x+w/2,y+h]});
 }
 // Restore each wall among the actors/props by its ground anchor rather than always on top.
 const sortedWalls=occluders.map(w=>({input:abs(w.file),left:w.positionPixels[0],top:w.positionPixels[1],sort:w.sortAnchorPixels[1]}));
 const sceneObjects=[...objects,...sortedWalls].sort((a,b)=>a.sort-b.sort).map(({sort,...o})=>o);
 const ground=[];
 for(const p of placements.filter(p=>p.layer==='ground'))ground.push(await objectLayer(p));
 await png('5_Previews/Map_Demo.png',await sharp(abs('1_2D_Art/Backgrounds/Background_Base.png')).composite([...ground,...sceneObjects]).toBuffer());
 await png('5_Previews/Wall_Layers_Preview.png',await sharp(abs('1_2D_Art/Backgrounds/Background_Occlusion.png')).flatten({background:'#c7cbb9'}).toBuffer());
 const beds=placements.filter(p=>p.id==='SoilBed').map((p,i)=>({id:`BED_${i+1}`,instanceId:p.instanceId,orientation:'Down',anchorPixels:p.anchorPixels,slots:[-100,0,100].map((offset,j)=>({id:`BED_${i+1}_S${j+1}`,plantAnchorPixels:[p.anchorPixels[0]+offset,p.anchorPixels[1]-56],interactionPixels:[p.anchorPixels[0]+offset,p.anchorPixels[1]+18],initialState:'empty'}))}));
 json('4_Data_and_Fonts/Configs/MapLayout.json',{schemaVersion:'1.0',status:'art_layout_reference_not_engine_scene',sizePixels:[1536,1152],pixelsPerUnit:32,coordinateSystem:'top-left pixels, x right, y down; anchors at bottom center',background,preview:'5_Previews/Map_Demo.png',spawnPixels:[Math.round(569*sf),Math.round(365*sf)],placements,soilBeds:beds,pathNote:'Keep the central house-to-gate path free. Three beds: two on right, one on left; each has three planting anchors.',architectureNote:'Doors and windows are baked into the background. Opening doors requires a separate door art/state implementation.',collisionNote:'Footprints and planting interaction points are design guides, not validated physics colliders.'});
 json('4_Data_and_Fonts/Configs/MapLayers.json',{schemaVersion:'1.1',sizePixels:[1536,1152],order:['Background_Base','ground props','Y-sorted wall segments / furniture / characters / plants'],base:'1_2D_Art/Backgrounds/Background_Base.png',occlusion:'1_2D_Art/Backgrounds/Background_Occlusion.png',source:background,occluders,sortConvention:'Screen coordinates y down: draw smaller ground-anchor y first, larger y last. Keep tall wall pieces anchored at their ground edge.',combinedOcclusionUsage:'Inspection and exact reconstruction only; do not draw the combined overlay AND the individual wall segments. Prefer individual segments for actors able to pass in front and behind.',collisionNote:'Art separation does not block movement. Add wall colliders in engine; rectPixels describes artwork, not a ground collision footprint.',note:'Base plus combined occlusion, or base plus all segments, recombines pixel-exactly. Base has transparent holes where wall pixels move to occlusion; floor is not reconstructed behind walls.'});
}

async function makeCatalog(items=rules.items,file='Furniture_Catalog.png') {
 const w=1400,h=150+Math.ceil(items.length/5)*278,layers=[];
 let labels=`<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="${h}"><style>text{font-family:Arial,sans-serif;fill:#f0e9d8}</style><text x="40" y="54" font-size="28">PROJECT FINAL / FURNITURE</text><text x="40" y="83" font-size="16" fill="#b8c8a7">${items.length} entries · 4 directional sprites each · transparent PNG</text>`;
 for(let i=0;i<items.length;i++) {
  const item=items[i],f=item.frames[0],[x,y,ww,hh]=f.contentRect;
  const col=i%5,row=Math.floor(i/5),left=40+col*272,top=115+row*278;
  const scale=Math.min(210/ww,200/hh,1.5),dw=Math.round(ww*scale),dh=Math.round(hh*scale);
  layers.push({input:await sharp(abs(f.file)).extract({left:x,top:y,width:ww,height:hh}).resize(dw,dh,{kernel:'nearest'}).toBuffer(),left:left+Math.floor((232-dw)/2),top:top+205-dh});
  labels+=`<rect x="${left}" y="${top}" width="232" height="245" rx="14" fill="none" stroke="#53624a"/><text x="${left+12}" y="${top+231}" font-size="17">${esc(item.id)}</text>`;
 }
 labels+='</svg>';
 await png('5_Previews/'+file,await blank(w,h,'#29342c').composite([...layers,{input:Buffer.from(labels),left:0,top:0}]).png().toBuffer());
 const chars=[];
 for(let i=0;i<2;i++) {
  const c=animation.characters[i];
  chars.push({input:fs.readFileSync(abs(c.sheet)),left:20,top:60+i*500});
 }
 const title=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="808" height="1050"><style>text{font-family:Arial,sans-serif;fill:#f0e9d8;font-size:24px}</style><text x="24" y="37">MALE · 8 columns × 4 directions</text><text x="24" y="539">FEMALE · 8 columns × 4 directions</text></svg>');
 await png('5_Previews/Characters_Catalog.png',await blank(808,1050,'#354238').composite([...chars,{input:title,left:0,top:0}]).png().toBuffer());
}

function makeViewer() {
 const data=JSON.stringify({items:rules.items,characters:animation.characters});
 const template=fs.readFileSync(path.join(__dirname,'viewer-template.html'),'utf8');
 write('5_Previews/Asset_Viewer.html',template.replace('/*__ASSET_DATA__*/',`const DATA=${data};`));
}

async function updateManifest() {
 const p='4_Data_and_Fonts/Configs/AssetManifest.json';
 const manifest=JSON.parse(fs.readFileSync(abs(p),'utf8'));
 const files=['1_2D_Art/Backgrounds/Background_Base.png','1_2D_Art/Backgrounds/Background_Occlusion.png',...fs.readdirSync(abs('1_2D_Art/Backgrounds/Walls')).filter(f=>f.endsWith('.png')).map(f=>'1_2D_Art/Backgrounds/Walls/'+f),...fs.readdirSync(abs('5_Previews')).filter(f=>f.endsWith('.png')).map(f=>'5_Previews/'+f)];
 for(const file of files){const m=await sharp(abs(file)).metadata();const record={file,width:m.width,height:m.height,alpha:m.hasAlpha,sha256:crypto.createHash('sha256').update(fs.readFileSync(abs(file))).digest('hex'),kind:file.startsWith('5_Previews')?'preview':'background-layer'};const i=manifest.assets.findIndex(a=>a.file===file);if(i===-1)manifest.assets.push(record);else manifest.assets[i]=record;}
 json(p,manifest);
}

(async()=>{await makeMap();await makeCatalog();const expansion=rules.items.filter(i=>i.pack==='DecorExpansion');if(expansion.length)await makeCatalog(expansion,'Decor_Expansion_Catalog.png');makeViewer();await updateManifest();console.log('Map, catalogs, layers, layout and offline viewer built.');})().catch(e=>{console.error(e);process.exitCode=1;});
