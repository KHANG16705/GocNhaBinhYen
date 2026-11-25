const fs=require('fs');
const path=require('path');
const sharp=require('sharp');
const crypto=require('crypto');
const {splitAtlas,cropSprite}=require('./build-assets');
const spec=require('./decor-expansion.json');
const root=path.resolve(__dirname,'..');
const abs=p=>path.join(root,p);
const ensure=p=>fs.mkdirSync(path.dirname(abs(p)),{recursive:true});
const read=p=>JSON.parse(fs.readFileSync(abs(p),'utf8'));
const write=(p,o)=>{ensure(p);fs.writeFileSync(abs(p),JSON.stringify(o,null,2)+'\n');};
const dirs=['Down','Left','Right','Up'];
const blank=(w,h)=>sharp({create:{width:w,height:h,channels:4,background:'#00000000'}});
const manifest=read('4_Data_and_Fonts/Configs/AssetManifest.json');
const rules=read('4_Data_and_Fonts/Configs/FurnitureRules.json');
const added=[];
async function save(file,buffer,extra={}){
 ensure(file);await sharp(buffer).png().toFile(abs(file));const m=await sharp(abs(file)).metadata();
 const record={file,width:m.width,height:m.height,alpha:m.hasAlpha,sha256:crypto.createHash('sha256').update(fs.readFileSync(abs(file))).digest('hex'),...extra};
 const i=manifest.assets.findIndex(a=>a.file===file);if(i<0)manifest.assets.push(record);else manifest.assets[i]=record;
}

function placementSettings(item){
 const required={surface:'tabletop',surface_edge:'cabinet_top_edge',seat:'seat',wall:'wall',doorway:'doorway',boundary:'ground',floor:'ground',ground:'ground'}[item.placement];
 return {category:item.placement,requiredSupport:required,gridStepPixels:['surface','surface_edge','seat'].includes(item.placement)?4:16,rotateWithParent:['surface','surface_edge','seat'].includes(item.placement),independentCollision:!['surface','surface_edge','seat','wall','ground'].includes(item.placement),groupMode:item.includes.length>1?'baked_set':'single',includes:item.includes,excludeFromAutomaticAttachments:item.includes,placementAnchor:'pivotPixels',note:'Data for implementing placement, not an engine component.'};
}

async function makeCombinations(){
 const layers=[];
 async function place(id,direction,x,y,scale=1){
  const item=rules.items.find(i=>i.id===id),f=item.frames.find(f=>f.direction===direction),[sx,sy,w,h]=f.contentRect;
  const pivot=f.pivotPixels||item.pivotPixels;
  const width=Math.round(w*scale),height=Math.round(h*scale);
  layers.push({input:await sharp(abs(f.file)).extract({left:sx,top:sy,width:w,height:h}).resize(width,height,{kernel:'nearest'}).toBuffer(),left:Math.round(x-(pivot[0]-sx)*scale),top:Math.round(y-(pivot[1]-sy)*scale)});
 }
 const bg=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="880"><rect width="1200" height="880" fill="#e6e2ce"/><rect x="24" y="90" width="564" height="360" rx="18" fill="#d1d8c4"/><rect x="612" y="90" width="564" height="360" rx="18" fill="#d1d8c4"/><rect x="24" y="480" width="564" height="370" rx="18" fill="#d1d8c4"/><rect x="612" y="480" width="564" height="370" rx="18" fill="#d1d8c4"/></svg>');
 await place('StudyRug','Down',265,395,1.55);
 await place('ComputerDesk','Down',260,330,1.10);
 await place('OfficeChair','Up',260,411,1.05);
 await place('TrashBin','Down',430,375,1.10);
 await place('DiningTableSet','Down',890,352,1.45);
 await place('Chair','Right',720,375,1.0);
 await place('Chair','Left',1060,375,1.0);
 await place('BedsideTable','Down',160,776,1.45);
 await place('TableLamp','Down',160,696,1.45);
 await place('CoffeeTable','Down',394,775,1.5);
 await place('ReadingTray','Down',394,714,1.5);
 await place('LongSofa','Right',744,791,1.12);
 await place('TVConsole','Left',1025,790,1.25);
 const textSvg=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="880"><style>text{font-family:Arial,sans-serif;fill:#273b2f} .title{font-size:27px;font-weight:bold}.sub{font-size:17px}</style><text x="35" y="49" class="title">PROJECT FINAL · DECOR COMBINATIONS</text><text x="48" y="124" class="title">Bàn máy tính + ghế rời</text><text x="48" y="153" class="sub">Màn hình, bàn phím, chuột đi cùng bàn</text><text x="636" y="124" class="title">Bàn ăn + ghế rời</text><text x="636" y="153" class="sub">Khăn và lọ hoa đi cùng bàn</text><text x="48" y="516" class="title">Phụ kiện đặt trên bàn</text><text x="48" y="546" class="sub">Đèn ngủ và khay sách là hai món riêng</text><text x="636" y="516" class="title">Sofa + bộ kệ TV</text><text x="636" y="546" class="sub">TV đi cùng kệ; sofa đặt độc lập</text></svg>');
 await save('5_Previews/Decor_Combinations.png',await sharp(bg).composite([...layers,{input:textSvg,left:0,top:0}]).png().toBuffer(),{kind:'preview',pack:'DecorExpansion'});
}

async function main(){
 for(const group of spec.groups){
  const source=`1_2D_Art/Environment/Source/DecorExpansion/${group.key}.png`;
  ensure(source);if(!fs.existsSync(abs(source)))fs.copyFileSync(path.join(spec.generatedRoot,group.source),abs(source));
  const {data,info}=await sharp(abs(source)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const atlas={key:group.key,data,width:info.width,height:info.height,local:source,mergeNearbyParts:true};
  const regions=splitAtlas(atlas,4,4);
  const cropRows=[];
  for(let row=0;row<4;row++)cropRows.push(await Promise.all(regions[row].map(r=>cropSprite(atlas,r))));
  // Use ONE scale across the paired closed/open door states.
  const doorScale=group.key==='architecture'?Math.min(101/Math.max(...cropRows.slice(0,2).flat().map(s=>s.width)),152/Math.max(...cropRows.slice(0,2).flat().map(s=>s.height))):null;
  for(let row=0;row<4;row++){
   const item=group.items[row],sprites=cropRows[row];
   const factor=group.key==='architecture'&&row<2?doorScale:Math.min(item.width/Math.max(...sprites.map(s=>s.width)),item.height/Math.max(...sprites.map(s=>s.height)));
   const cell=[256,256],frames=[],layers=[];
   for(let d=0;d<4;d++){
    const s=sprites[item.sourceColumns[d]],w=Math.round(s.width*factor),h=Math.round(s.height*factor);
    const left=Math.floor((256-w)/2),top=244-h;
    const content=await sharp(s.buffer).resize(w,h,{kernel:'nearest'}).toBuffer();
    const frame=await blank(...cell).composite([{input:content,left,top}]).png().toBuffer();
    const file=`1_2D_Art/Environment/Object_${item.id}_${dirs[d]}.png`;
    // Ivy is attached at the pot bottom, not at the hanging vine tips.
    const pivot=item.id==='TrailingPlant'?[128,top+Math.round(h*0.39)]:[128,244];
    await save(file,frame,{kind:'furniture',pack:'DecorExpansion',id:item.id,direction:dirs[d],bounds:[left,top,w,h],pivotPixels:pivot});
    frames.push({direction:dirs[d],file,atlasRect:[d*256,0,256,256],contentRect:[left,top,w,h],pivotPixels:pivot,sourceRect:s.sourceRect});
    layers.push({input:frame,left:d*256,top:0});
   }
   const file=`1_2D_Art/Environment/Atlases/Object_${item.id}_4Directions.png`;
   await save(file,await blank(1024,256).composite(layers).png().toBuffer(),{kind:'rotation-atlas',pack:'DecorExpansion',id:item.id});
   const entry={id:item.id,name:item.name,pack:'DecorExpansion',rotatable:true,rotationOrder:['Down','Right','Up','Left'],atlas:file,framePixels:cell,pivotPixels:frames[0].pivotPixels,pivotNormalized:[0.5,1-frames[0].pivotPixels[1]/256],pivotPerFrame:item.id==='TrailingPlant',pixelsPerUnit:32,solid:placementSettings(item).independentCollision,footprintDownUp:item.footprint,footprintLeftRight:[item.footprint[1],item.footprint[0]],placement:placementSettings(item),frames};
   if(item.id==='DoorClosed'||item.id==='DoorOpen'){entry.stateFamily='WoodDoor';entry.state=item.id==='DoorClosed'?'closed':'open';entry.stateTransitionNote='Shared scale and origin; generated frame details may vary slightly. Not an animated door clip.';entry.solid=item.id==='DoorClosed';}
   if(item.id==='CatBedSet')entry.animation='none; sleeping cat is baked into this static decoration';
   const i=rules.items.findIndex(a=>a.id===item.id);if(i<0)rules.items.push(entry);else rules.items[i]=entry;added.push(entry);
  }
 }
 rules.schemaVersion='1.2';
 await makeCombinations();
 write('4_Data_and_Fonts/Configs/FurnitureRules.json',rules);
 write('4_Data_and_Fonts/Configs/AssetManifest.json',manifest);
 write('4_Data_and_Fonts/Configs/DecorPlacement.json',{
  schemaVersion:'1.0',pack:'DecorExpansion',items:added.map(i=>({id:i.id,...i.placement})),
  groupedSets:added.filter(i=>i.placement.groupMode==='baked_set').map(i=>({id:i.id,includes:i.placement.includes})),
  variants:[{base:'Desk',dressed:'ComputerDesk'},{base:'CoffeeTable',dressed:'DiningTableSet',note:'Different purpose and dimensions; not a state swap'},{base:'Sofa',dressed:'LongSofa',note:'Different footprint'}],
  supportRules:{surface:'Parent small decor to a tabletop socket and use the parent sort anchor plus a child draw offset. Recompute local offset for each direction.',surface_edge:'Use per-frame pot-base pivot for TrailingPlant. Vines hang below support; do not align vine tips with tabletop.',seat:'Attach to a sofa/chair cushion socket; avoid seats with baked pillows.',wall:'Attach to a wall plane. Do not allow arbitrary floor drops. Left/Right architectural views are oblique artwork, not a modular tile wall kit.',ground:'Rugs render under furniture and actors; do not add solid colliders.'},
  attachmentNote:'This pack defines categories and pivots. Furniture-specific attachment sockets, snapping and collision logic still need to be implemented in the game engine.',
  recommendedCombinations:[{primary:'ComputerDesk',separate:['OfficeChair','TrashBin'],alreadyIncluded:['monitor','keyboard','mouse']},{primary:'DiningTableSet',separate:['Chair','Chair'],alreadyIncluded:['tablecloth','flower vase']},{primary:'TVConsole',separate:['LongSofa','CoffeeTable'],alreadyIncluded:['TV']},{primary:'BedsideTable',separate:['TableLamp']},{primary:'CoffeeTable',separate:['ReadingTray']},{primary:'Wardrobe',separate:['TrailingPlant']}]
 });
 write('4_Data_and_Fonts/Configs/DecorExpansionSources.json',{generator:spec.generator,prompts:'Tools/decor-expansion.json',groups:spec.groups.map(g=>({id:g.key,file:`1_2D_Art/Environment/Source/DecorExpansion/${g.key}.png`})),counts:{newEntries:added.length,newDirectionalSprites:added.length*4,newAtlases:added.length}});
 console.log(JSON.stringify({newEntries:added.length,totalEntries:rules.items.length,newSprites:added.length*4},null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
