const yearEl = document.getElementById('year'); if(yearEl) yearEl.textContent = new Date().getFullYear();

const grid = document.getElementById('media-grid');
const modal = document.getElementById('modal');
const modalContent = document.getElementById('modal-content');
const modalClose = document.getElementById('modal-close');
const modalPrev = document.getElementById('modal-prev');
const modalNext = document.getElementById('modal-next');
const modalCounter = document.getElementById('modal-counter');

let galleryImages = []; 
let currentIndex = -1;

async function loadMedia(){
  try{
    const res = await fetch('media.json');
    if(!res.ok) throw new Error('Не удалось загрузить media.json');
    const items = await res.json();
    const images = (items || []).filter(i => i.type === 'image');
    renderGrid(images);
  }catch(err){
    grid.innerHTML = `<p>Ошибка загрузки галереи: ${err.message}</p>`;
    console.error(err);
  }
}

function renderGrid(items){
  if(!items || items.length === 0){
    grid.innerHTML = '<p>В галерее пока нет материалов.</p>';
    return;
  }

  grid.innerHTML = '';
  items.forEach(item => {
    const card = document.createElement('div');
    card.className = 'card';
    card.tabIndex = 0;

    
    const img = document.createElement('img');
    img.alt = item.title || '';
    img.dataset.src = item.url; 
    img.loading = 'lazy'; 
    img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
    card.appendChild(img);

  const idx = galleryImages.length;
  card.addEventListener('click', () => openModal(idx));
  card.addEventListener('keydown', (e) => { if(e.key === 'Enter') openModal(idx); });

  galleryImages.push(item);

    grid.appendChild(card);
  });

  observeImages();
}

let imgObserver = null;
function observeImages(){
  const lazyImgs = grid.querySelectorAll('img[data-src]');
  if(lazyImgs.length === 0) return;

  if('IntersectionObserver' in window){
    if(!imgObserver){
      imgObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if(entry.isIntersecting){
            const img = entry.target;
              img.onload = () => {
                console.log('Image loaded:', img.dataset && img.dataset.src ? img.dataset.src : img.src);
                img.classList.add('loaded');
              };
              img.onerror = (e) => {
                console.error('Image failed to load:', img.dataset && img.dataset.src ? img.dataset.src : img.src, e);
                img.classList.add('failed');
                img.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="100%" height="100%" fill="%23eee"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%23999" font-size="16">Не удалось загрузить изображение</text></svg>';
              };
              img.src = img.dataset.src;
              img.removeAttribute('data-src');
              imgObserver.unobserve(img);
          }
        });
      }, {rootMargin: '200px 0px'});
    }
    lazyImgs.forEach(img => { if(img.dataset.src) imgObserver.observe(img); });
  } else {
    lazyImgs.forEach(img => {
      img.src = img.dataset.src;
      img.removeAttribute('data-src');
    });
  }
}

function openModal(index){
  if(typeof index !== 'number' || index < 0 || index >= galleryImages.length) return;
  currentIndex = index;
  renderModalContent();
  updateCounter();
  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');
  modal.focus && modal.focus();
}

function renderModalContent(){
  modalContent.innerHTML = '';
  const item = galleryImages[currentIndex];
  if(!item) return;
  const img = document.createElement('img');
  img.src = item.url;
  img.alt = item.title || '';
  img.style.maxWidth = '100%';
  img.style.height = 'auto';
  modalContent.appendChild(img);
}

function updateCounter(){
  if(!modalCounter) return;
  modalCounter.textContent = `${currentIndex + 1} / ${galleryImages.length}`;
}

function showNext(){
  if(currentIndex < galleryImages.length - 1){
    currentIndex += 1;
    renderModalContent();
    updateCounter();
  }
}

function showPrev(){
  if(currentIndex > 0){
    currentIndex -= 1;
    renderModalContent();
    updateCounter();
  }
}

modalClose.addEventListener('click', closeModal);
modal.addEventListener('click', (e) => { if(e.target === modal) closeModal(); });
function closeModal(){
  modal.classList.add('hidden');
  modal.setAttribute('aria-hidden', 'true');
  modalContent.innerHTML = '';
}

if(modalNext) modalNext.addEventListener('click', showNext);
if(modalPrev) modalPrev.addEventListener('click', showPrev);

document.addEventListener('keydown', (e) => {
  if(modal.classList.contains('hidden')) return;
  if(e.key === 'ArrowRight') showNext();
  if(e.key === 'ArrowLeft') showPrev();
  if(e.key === 'Escape') closeModal();
});


loadMedia();
