/* Rebuild the art handoff with Node.js + sharp. No old Project_Game_2D art is used. */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sharp = require('sharp');
const root = path.resolve(__dirname, '..');
const sourceSpec = require('./source-assets.json');
const directions = ['Down', 'Left', 'Right', 'Up'];
const assetRecords = [];
const diagnostics = [];
const furniture = [];
const ensure = p => fs.mkdirSync(path.dirname(p), { recursive: true });
const abs = p => path.join(root, p);
const json = (p, data) => { ensure(abs(p)); fs.writeFileSync(abs(p), JSON.stringify(data, null, 2) + '\n'); };
const blank = (width, height) => sharp({ create: { width, height, channels: 4, background: '#00000000' } });
const hash = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');

async function savePng(file, input, extra = {}) {
  ensure(abs(file));
  await sharp(input).png().toFile(abs(file));
  const m = await sharp(abs(file)).metadata();
  assetRecords.push({ file, width: m.width, height: m.height, alpha: m.hasAlpha, sha256: hash(abs(file)), ...extra });
  return file;
}

function runs(values, start, end, minimum, gap = 3) {
  const found = [];
  for (let i = start; i < end; i++) {
    if (values[i] < minimum) continue;
    let a = i, last = i;
    while (++i < end) {
      if (values[i] >= minimum) last = i;
      else if (i - last > gap) break;
    }
    found.push([a, last + 1]);
  }
  return found.filter(([a,b]) => b-a >= 8);
}

async function loadAtlas(key) {
  const sourceFile = sourceSpec.sources[key];
  const group = key === 'map' ? 'Backgrounds' : ['Male','Female'].includes(key) ? 'Characters' : 'Environment';
  const local = `1_2D_Art/${group}/Source/${key}.png`;
  ensure(abs(local));
  if (!fs.existsSync(abs(local))) fs.copyFileSync(path.join(sourceSpec.generatedRoot, sourceFile), abs(local));
  const { data, info } = await sharp(abs(local)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { key, data, width: info.width, height: info.height, local };
}

function splitAtlas(atlas, rowCount, colCount) {
  const {data,width,height} = atlas;
  const ys = new Uint32Array(height);
  for (let y=0;y<height;y++) for(let x=0;x<width;x++) if(data[(y*width+x)*4+3] > 64) ys[y]++;
  const rows = runs(ys,0,height,5);
  if (rows.length !== rowCount) throw Error(`${atlas.key}: expected ${rowCount} rows, got ${JSON.stringify(rows)}`);
  const result=[];
  for (const [top,bottom] of rows) {
    const xs=new Uint32Array(width);
    for(let y=top;y<bottom;y++) for(let x=0;x<width;x++) if(data[(y*width+x)*4+3]>64) xs[x]++;
    const cols=runs(xs,0,width,3);
    // Optional grouping of disconnected parts of one decor item (e.g. a pair of slippers).
    if(atlas.mergeNearbyParts)while(cols.length>colCount){
      const gaps=cols.slice(1).map((c,i)=>c[0]-cols[i][1]);
      const gap=Math.min(...gaps),index=gaps.indexOf(gap);
      if(gap>width/colCount*0.22)break;
      cols.splice(index,2,[cols[index][0],cols[index+1][1]]);
    }
    if(cols.length!==colCount) throw Error(`${atlas.key} row ${result.length}: expected ${colCount} columns, got ${JSON.stringify(cols)}`);
    result.push(cols.map(([left,right])=>({left:Math.max(0,left-2),top:Math.max(0,top-2),width:Math.min(width,right+2)-Math.max(0,left-2),height:Math.min(height,bottom+2)-Math.max(0,top-2)})));
  }
  diagnostics.push({source:atlas.local, rows:result});
  return result;
}

async function cropSprite(atlas, rect) {
  const {data,info}=await sharp(atlas.data,{raw:{width:atlas.width,height:atlas.height,channels:4}}).extract(rect).raw().toBuffer({resolveWithObject:true});
  let l=info.width,t=info.height,r=-1,b=-1;
  for(let y=0;y<info.height;y++) for(let x=0;x<info.width;x++) {
    const i=(y*info.width+x)*4;
    if(data[i+3]<28) {data[i]=data[i+1]=data[i+2]=data[i+3]=0; continue;}
    // Remove isolated transparency-extraction fringe colors, not opaque artwork.
    if(data[i+3]<150 && data[i]>175 && data[i+1]<65 && data[i+2]<65) {data[i+3]=0;continue;}
    l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);
  }
  if(r<l) throw Error('Empty sprite: '+atlas.key);
  const content={left:l,top:t,width:r-l+1,height:b-t+1};
  const buffer=await sharp(data,{raw:info}).extract(content).png().toBuffer();
  return {buffer,width:content.width,height:content.height,sourceRect:{left:rect.left+l,top:rect.top+t,width:content.width,height:content.height}};
}

const recipes = {
  bedroom: [ ['Bed','Giường',176,186,[3,4]], ['Wardrobe','Tủ quần áo',120,164,[2,1.5]], ['BedsideTable','Tủ đầu giường',70,72,[1,1]], ['Bookshelf','Kệ sách',98,163,[2,1]] ],
  living: [ ['Sofa','Sofa',190,134,[3.5,1.8]], ['CoffeeTable','Bàn trà',122,86,[2.4,1.4]], ['Chair','Ghế',68,105,[1,1]], ['Desk','Bàn làm việc',152,100,[3,1.5]] ],
  kitchen: [ ['Fridge','Tủ lạnh',82,140,[1.5,1.5]], ['Stove','Bếp',97,120,[1.8,1.5]], ['Sink','Bồn rửa',117,125,[2.2,1.5]], ['WashingMachine','Máy giặt',93,120,[1.7,1.5]] ],
  decor: [ ['Bench','Ghế sân vườn',175,135,[3,1.5]], ['DecorPlant','Chậu cây',66,78,[1,1]], ['Lamp','Đèn đứng',65,135,[1,1]], ['Rug','Thảm',238,162,[4,3]] ],
  garden_rotations: [ ['SoilBed','Luống trồng',360,196,[7,2]], ['PotEmpty','Chậu trống',50,58,[1,1]], ['WateringCan','Bình tưới',65,63,[1,1]], ['Broom','Chổi',56,102,[0.5,1]] ]
};

async function makeFurniture() {
  for(const [key,items] of Object.entries(recipes)) {
    const atlas=await loadAtlas(key), regions=splitAtlas(atlas,4,4);
    for(let row=0;row<4;row++) {
      const [id,name,maxW,maxH,footprint]=items[row];
      const sprites=await Promise.all(regions[row].map(r=>cropSprite(atlas,r)));
      // The generated side views visually face Right then Left; remap to the documented order.
      const order=[0,2,1,3];
      const factor=Math.min(maxW/Math.max(...sprites.map(s=>s.width)),maxH/Math.max(...sprites.map(s=>s.height)));
      const cell=id==='SoilBed' ? [384,256] : [256,256];
      const frames=[],layers=[];
      for(let d=0;d<4;d++) {
        const s=sprites[order[d]], w=Math.round(s.width*factor), h=Math.round(s.height*factor);
        const left=Math.floor((cell[0]-w)/2), top=cell[1]-12-h;
        const content=await sharp(s.buffer).resize(w,h,{kernel:'nearest'}).toBuffer();
        const frame=await blank(...cell).composite([{input:content,left,top}]).png().toBuffer();
        const file=`1_2D_Art/Environment/Object_${id}_${directions[d]}.png`;
        await savePng(file,frame,{kind:'furniture',id,direction:directions[d],pivotPixels:[cell[0]/2,cell[1]-12],bounds:[left,top,w,h]});
        layers.push({input:frame,left:d*cell[0],top:0});
        frames.push({direction:directions[d],file,atlasRect:[d*cell[0],0,...cell],contentRect:[left,top,w,h],sourceRect:s.sourceRect});
      }
      const atlasFile=`1_2D_Art/Environment/Atlases/Object_${id}_4Directions.png`;
      await savePng(atlasFile,await blank(cell[0]*4,cell[1]).composite(layers).png().toBuffer(),{kind:'rotation-atlas',id});
      furniture.push({id,name,rotatable:true,rotationOrder:['Down','Right','Up','Left'],atlas:atlasFile,framePixels:cell,pivotPixels:[cell[0]/2,cell[1]-12],pivotNormalized:[0.5,12/cell[1]],pixelsPerUnit:32,solid:!['Rug','Broom','WateringCan'].includes(id),footprintDownUp:footprint,footprintLeftRight:[footprint[1],footprint[0]],frames});
    }
  }
}

const characters=[];
async function makeCharacter(sex) {
  const atlas=await loadAtlas(sex),regions=splitAtlas(atlas,4,8);
  const sprites=await Promise.all(regions.flat().map(r=>cropSprite(atlas,r)));
  // Single scale for the entire character: per-frame resizing would change apparent body size.
  const factor=Math.min(68/Math.max(...sprites.map(s=>s.width)),82/Math.max(...sprites.map(s=>s.height)));
  const cell=[96,112], baseline=104,frames=[],layers=[],clips=[];
  for(let row=0;row<4;row++) for(let col=0;col<8;col++) {
    const s=sprites[row*8+col],w=Math.round(s.width*factor),h=Math.round(s.height*factor);
    const left=Math.floor((96-w)/2),top=baseline-h;
    const content=await sharp(s.buffer).resize(w,h,{kernel:'nearest'}).toBuffer();
    const buffer=await blank(...cell).composite([{input:content,left,top}]).png().toBuffer();
    const file=`2_Animations/Characters/${sex}/Frames/${directions[row]}_${String(col).padStart(2,'0')}.png`;
    await savePng(file,buffer,{kind:'character-frame',character:sex,direction:directions[row],frame:col,pivotPixels:[48,baseline]});
    layers.push({input:buffer,left:col*96,top:row*112});
    frames.push({index:row*8+col,direction:directions[row],column:col,file,rect:[col*96,row*112,...cell],sourceRect:s.sourceRect});
  }
  const file=`1_2D_Art/Characters/Player_${sex}_SpriteSheet.png`;
  await savePng(file,await blank(768,448).composite(layers).png().toBuffer(),{kind:'character-sheet',character:sex});
  for(let row=0;row<4;row++) for(const [action,columns,fps] of [['Idle',[0,1],2],['Walk',[2,3,4,5,6,7],8]]) {
    const clip={name:`${action}_${directions[row]}`,sheet:file,frames:columns.map(c=>row*8+c),framePixels:cell,fps,loop:true};
    json(`2_Animations/Characters/${sex}/${clip.name}.json`,clip); clips.push(clip);
  }
  characters.push({id:sex,sheet:file,framePixels:cell,columns:8,rows:directions,pivotPixels:[48,baseline],pivotNormalized:[0.5,8/112],pixelsPerUnit:32,clips,frames});
}

async function makeGarden() {
  const a=await loadAtlas('garden'),r=splitAtlas(a,2,4);
  const items=[['Tree',0,0,210,230],['Shrub',0,1,105,90],['Flowerbed',0,3,150,95],['PathStone',1,3,75,50]];
  for(const [id,row,col,maxW,maxH] of items) {
    const s=await cropSprite(a,r[row][col]),scale=Math.min(maxW/s.width,maxH/s.height);
    const w=Math.round(s.width*scale),h=Math.round(s.height*scale);
    const b=await sharp(s.buffer).resize(w,h,{kernel:'nearest'}).toBuffer();
    await savePng(`1_2D_Art/Environment/Garden/Object_${id}.png`,b,{kind:'scenery',id,pivotPixels:[w/2,h]});
  }
  const plants=await loadAtlas('plants'),pr=splitAtlas(plants,2,3);
  const species=['Daisy','Apple'],stages=['Seedling','Growing','Mature'],records=[];
  for(let row=0;row<2;row++) {
    const crops=await Promise.all(pr[row].map(rect=>cropSprite(plants,rect)));
    const factor=Math.min(82/Math.max(...crops.map(s=>s.width)),96/Math.max(...crops.map(s=>s.height)));
    for(let c=0;c<3;c++) {
      const s=crops[c],w=Math.round(s.width*factor),h=Math.round(s.height*factor);
      const body=await sharp(s.buffer).resize(w,h,{kernel:'nearest'}).toBuffer();
      const frame=await blank(112,112).composite([{input:body,left:Math.floor((112-w)/2),top:104-h}]).png().toBuffer();
      const file=`2_Animations/Plants/Plant_${species[row]}_${stages[c]}.png`;
      await savePng(file,frame,{kind:'plant-stage',species:species[row],stage:stages[c],pivotPixels:[56,104]});
      records.push({species:species[row],stage:stages[c],file,pivotPixels:[56,104]});
    }
  }
  json('4_Data_and_Fonts/Configs/PlantManifest.json',{stages,plants:records,notes:'Growth state sprites; timing and economy are game implementation decisions.'});
}

async function main() {
  await makeFurniture();
  await makeCharacter('Male'); await makeCharacter('Female');
  await makeGarden();
  const map=await loadAtlas('map');
  await savePng('1_2D_Art/Backgrounds/Background_EmptyMap.png',await sharp(abs(map.local)).resize(1536,1152,{kernel:'nearest'}).toBuffer(),{kind:'background'});
  json('4_Data_and_Fonts/Configs/FurnitureRules.json',{schemaVersion:'1.0',directions,rotationIsSpriteSwap:true,doNotRotateTextureInPlane:true,pivotConvention:'pixels measured from top left; normalized pivot measured from bottom left',collisionStatus:'Suggested footprints; verify in engine against desired actor clearance.',items:furniture});
  json('4_Data_and_Fonts/Configs/AnimationManifest.json',{schemaVersion:'1.0',characters,notes:'Art clips only. Import these frame rectangles into your engine; movement/controller not included.'});
  json('4_Data_and_Fonts/Configs/AssetManifest.json',{schemaVersion:'1.0',pathBase:'ProjectFinal',assets:assetRecords});
  json('4_Data_and_Fonts/Configs/ExtractionReport.json',{sources:diagnostics});
  json('4_Data_and_Fonts/Configs/Provenance.json',{generator:sourceSpec.generator,artwork:'All map, furniture, character and plant artwork newly generated for ProjectFinal.',reference:'User supplied cutaway screenshot, style reference only.',oldProjectArtCopied:false,processing:'Alpha-edge cleanup, content extraction, uniform per-item scale, transparent padding, sprite/atlas assembly with sharp.',sourcePrompts:'Tools/source-assets.json'});
  console.log(JSON.stringify({assets:assetRecords.length,furnitureTypes:furniture.length,characterSheets:characters.length,root},null,2));
}
module.exports={splitAtlas,cropSprite};
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1;});
