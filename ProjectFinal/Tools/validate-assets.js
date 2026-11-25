const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
const sharp=require('sharp');
const root=path.resolve(__dirname,'..');
const abs=p=>path.join(root,p);
const read=p=>JSON.parse(fs.readFileSync(abs(p),'utf8'));
const errors=[];
function check(ok,message){if(!ok)errors.push(message);}
function allFiles(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?allFiles(path.join(dir,e.name)):[path.join(dir,e.name)]);}
async function main(){
 const manifest=read('4_Data_and_Fonts/Configs/AssetManifest.json'),rules=read('4_Data_and_Fonts/Configs/FurnitureRules.json'),anim=read('4_Data_and_Fonts/Configs/AnimationManifest.json'),map=read('4_Data_and_Fonts/Configs/MapLayout.json');
 const pngs=allFiles(root).filter(f=>f.toLowerCase().endsWith('.png'));
 for(const f of pngs){try{await sharp(f).raw().toBuffer();}catch(e){errors.push('PNG decode: '+f);}}
 for(const a of manifest.assets){check(fs.existsSync(abs(a.file)),'Missing '+a.file);if(!fs.existsSync(abs(a.file)))continue;const m=await sharp(abs(a.file)).metadata();check(m.width===a.width&&m.height===a.height,'Dimensions '+a.file);const hash=crypto.createHash('sha256').update(fs.readFileSync(abs(a.file))).digest('hex');check(hash===a.sha256,'Hash '+a.file);}
 const expectedExpansion=fs.existsSync(abs('Tools/decor-expansion.json'))?read('Tools/decor-expansion.json').groups.flatMap(g=>g.items):[];
 check(rules.items.length===20+expectedExpansion.length,'Furniture type count');
 for(const item of expectedExpansion)check(rules.items.some(i=>i.id===item.id),'Missing expansion '+item.id);
 for(const i of rules.items){check(i.frames.length===4,'4 directions '+i.id);check(new Set(i.frames.map(f=>f.direction)).size===4,'Unique directions '+i.id);for(const f of i.frames){const m=await sharp(abs(f.file)).metadata();check(m.width===i.framePixels[0]&&m.height===i.framePixels[1]&&m.hasAlpha,'Frame shape/alpha '+f.file);const st=await sharp(abs(f.file)).stats();check(st.channels[3].min===0&&st.channels[3].max>220,'Usable alpha '+f.file);}}
 check(anim.characters.length===2,'Two characters');
 for(const c of anim.characters){check(c.frames.length===32,'32 frames '+c.id);check(c.clips.length===8,'8 clips '+c.id);const m=await sharp(abs(c.sheet)).metadata();check(m.width===768&&m.height===448&&m.hasAlpha,'Character sheet shape '+c.id);for(const clip of c.clips)for(const index of clip.frames)check(index>=0&&index<32,'Clip index '+clip.name);for(const f of c.frames)check(fs.existsSync(abs(f.file)),'Character frame '+f.file);}
 check(map.soilBeds.length===3&&map.soilBeds.flatMap(b=>b.slots).length===9,'3 beds and 9 slots');
 const base='1_2D_Art/Backgrounds/Background_Base.png',over='1_2D_Art/Backgrounds/Background_Occlusion.png';
 const a=await sharp(abs(map.background)).ensureAlpha().raw().toBuffer();
 const b=await sharp(abs(base)).composite([{input:abs(over)}]).ensureAlpha().raw().toBuffer();
 check(a.equals(b),'Map layers must recombine pixel-exactly');
 const layerConfig=read('4_Data_and_Fonts/Configs/MapLayers.json');
 const segmented=await sharp(abs(base)).composite(layerConfig.occluders.map(w=>({input:abs(w.file),left:w.positionPixels[0],top:w.positionPixels[1]}))).ensureAlpha().raw().toBuffer();
 check(a.equals(segmented),'Individual wall segments must recombine pixel-exactly');
 for(const id of ['RearUpperBeam','RearLowerTrimLeft','RearLowerTrimCenter','RearLowerTrimRight','RearPartitionLeft','RearPartitionRight'])check(layerConfig.occluders.some(w=>w.id===id),'Missing rear window-wall section: '+id);
 for(const point of [[525,225],[949,225],[285,182],[765,164],[1230,183]]){
  const raw=await sharp(abs(over)).ensureAlpha().raw().toBuffer();check(raw[(point[1]*1536+point[0])*4+3]===255,'Rear occlusion missing at '+point);
 }
 const html=fs.readFileSync(abs('5_Previews/Asset_Viewer.html'),'utf8');check(html.includes('const DATA=')&&!html.includes('/*__ASSET_DATA__*/'),'Viewer data embedded');
 if(expectedExpansion.length){
  const decor=read('4_Data_and_Fonts/Configs/DecorPlacement.json');
  const desk=decor.groupedSets.find(s=>s.id==='ComputerDesk');
  check(desk&&['monitor','keyboard','mouse'].every(p=>desk.includes.includes(p))&&!desk.includes.includes('chair'),'Computer desk grouping');
  check(decor.items.some(i=>i.id==='OfficeChair'&&i.category==='floor'),'Separate office chair');
  for(const i of rules.items.filter(i=>i.pack==='DecorExpansion')){
   check(!!i.placement,'Placement data '+i.id);
   for(const f of i.frames){const p=f.pivotPixels||i.pivotPixels;check(p[0]>=0&&p[0]<=i.framePixels[0]&&p[1]>=0&&p[1]<=i.framePixels[1],'Pivot within frame '+i.id);}
  }
 }
 const report={status:errors.length?'failed':'passed',pngFilesDecoded:pngs.length,manifestPngAssets:manifest.assets.length,furnitureTypes:rules.items.length,rotationSprites:rules.items.length*4,decorExpansionEntries:expectedExpansion.length,characterSheets:2,characterFrames:64,animationClips:16,plantStages:6,plantingSlots:9,wallSegments:layerConfig.occluders.length,mapLayerRecompositionExact:a.equals(b),wallSegmentRecompositionExact:a.equals(segmented),errors,limits:'Checks art files, metadata and compositing, not in-engine collisions, animation feel or gameplay.'};
 fs.writeFileSync(abs('4_Data_and_Fonts/Configs/Validation.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));if(errors.length)process.exitCode=1;
}
main().catch(e=>{console.error(e);process.exitCode=1;});
