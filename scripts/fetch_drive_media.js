// Скрипт для выборки списка файлов из папки Google Drive и генерации media.json
// Требования: Node 18+ (или глобальный fetch), запустить:
// node scripts/fetch_drive_media.js --apiKey=YOUR_API_KEY --folderId=YOUR_FOLDER_ID

const fs = require('fs');
const path = require('path');

function parseArgs(){
  const args = process.argv.slice(2);
  const out = {};
  args.forEach(a => {
    const [k,v] = a.split('=');
    out[k.replace(/^--/, '')] = v;
  });
  return out;
}

async function listFiles(apiKey, folderId){
  const q = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
  const fields = encodeURIComponent('files(id,name,mimeType,webViewLink)');
  const url = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=${fields}&key=${apiKey}`;
  const res = await fetch(url);
  if(!res.ok) throw new Error(`Drive API error: ${res.status} ${res.statusText}`);
  return res.json();
}

function toMediaItem(file){
  const id = file.id;
  const mime = file.mimeType || '';
  const isVideo = mime.startsWith('video');
  const isImage = mime.startsWith('image');
  const url = `https://drive.google.com/uc?export=view&id=${id}`; 
  return {
    type: isVideo ? 'video' : (isImage ? 'image' : 'image'),
    title: file.name,
    url
  };
}

(async ()=>{
  try{
    const opts = parseArgs();
    if(!opts.apiKey || !opts.folderId){
      console.error('Usage: node scripts/fetch_drive_media.js --apiKey=YOUR_API_KEY --folderId=FOLDER_ID');
      process.exit(2);
    }
    const data = await listFiles(opts.apiKey, opts.folderId);
    if(!data.files || data.files.length === 0){
      console.log('Файлы не найдены. Проверьте, что в папке есть публичные файлы или у вас корректный доступ.');
    }
    const items = (data.files||[]).map(toMediaItem);
    const outPath = path.resolve(process.cwd(), 'media.json');
    fs.writeFileSync(outPath, JSON.stringify(items, null, 2), 'utf8');
    console.log(`Wrote ${items.length} items to ${outPath}`);
  }catch(err){
    console.error(err);
    process.exit(1);
  }
})();
