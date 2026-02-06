const yearEl = document.getElementById('year'); if (yearEl) yearEl.textContent = new Date().getFullYear();

const videoGrid = document.getElementById('media-grid-videos');
const photoGrid = document.getElementById('media-grid-photos');
const modal = document.getElementById('modal');
const modalContent = document.getElementById('modal-content');
const modalClose = document.getElementById('modal-close');
const modalPrev = document.getElementById('modal-prev');
const modalNext = document.getElementById('modal-next');
const modalCounter = document.getElementById('modal-counter');

let activeItems = [];
let currentIndex = -1;

const setupToggle = ({ gridEl, toggleBtn }) => {
  if (!gridEl || !toggleBtn) return;

  const handleToggleClick = () => {
    if (gridEl.classList.contains('collapsed')) {
      gridEl.classList.remove('collapsed');
      gridEl.classList.add('expanded');
      toggleBtn.textContent = 'Свернуть';
      return;
    }

    gridEl.classList.remove('expanded');
    gridEl.classList.add('collapsed');
    toggleBtn.textContent = 'Показать все';
  };

  toggleBtn.addEventListener('click', handleToggleClick);
  gridEl.classList.add('collapsed');
};

const renderGrid = ({ gridEl, items }) => {
  if (!gridEl) return;

  if (!items || items.length === 0) {
    gridEl.innerHTML = '<p>В галерее пока нет материалов.</p>';
    return;
  }

  gridEl.innerHTML = '';
  items.forEach((item, idx) => {
    const card = document.createElement('div');
    card.className = 'card';
    card.tabIndex = 0;

    
    const img = document.createElement('img');
    img.alt = item.title || '';
    img.dataset.src = item.thumbUrl || item.url;
    img.loading = 'lazy';
    img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
    card.appendChild(img);

    card.addEventListener('click', () => openModal(idx, items));
    card.addEventListener('keydown', (e) => { if(e.key === 'Enter') openModal(idx, items); });

    gridEl.appendChild(card);
  });

  observeImages();
};

const loadGallery = async ({ kind, gridEl }) => {
  if (!gridEl) return;

  try {
    const res = await fetch(`/api/gallery?kind=${encodeURIComponent(kind)}`);
    if (!res.ok) throw new Error('Не удалось загрузить галерею');
    const items = await res.json();
    renderGrid({ gridEl, items });
  } catch (err) {
    gridEl.innerHTML = `<p>Ошибка загрузки галереи: ${err.message}</p>`;
    console.error(err);
  }
};

let imgObserver = null;
function observeImages(){
  const lazyImgs = document.querySelectorAll('.grid img[data-src]');
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

function openModal(index, items){
  if(!Array.isArray(items)) return;
  if(typeof index !== 'number' || index < 0 || index >= items.length) return;
  activeItems = items;
  currentIndex = index;
  renderModalContent();
  updateCounter();
  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');
  modal.focus && modal.focus();
}

function renderModalContent(){
    modalContent.innerHTML = '';
    const item = activeItems[currentIndex];
    if (item.type === 'video') {
        const video = document.createElement('video');
        video.src = item.url;
        video.controls = true;
        video.autoplay = true;
        modalContent.appendChild(video);
    } else {
        const img = document.createElement('img');
        img.src = item.url;
        img.alt = item.title || '';
        modalContent.appendChild(img);
    }
}

function updateCounter(){
  if(!modalCounter) return;
  modalCounter.textContent = `${currentIndex + 1} / ${activeItems.length}`;
}

function showNext(){
  if(currentIndex < activeItems.length - 1){
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


setupToggle({
  gridEl: videoGrid,
  toggleBtn: document.getElementById('toggle-gallery-videos'),
});

setupToggle({
  gridEl: photoGrid,
  toggleBtn: document.getElementById('toggle-gallery-photos'),
});

loadGallery({ kind: 'videos', gridEl: videoGrid });
loadGallery({ kind: 'photos', gridEl: photoGrid });

// Выравнивание stages-image по первому и последнему stage-item
function alignStagesImage() {
  const stagesContainer = document.querySelector('.stages-container');
  const stagesList = document.querySelector('.stages-list');
  const stagesImage = document.querySelector('.stages-image');
  const stageItems = document.querySelectorAll('.stage-item');
  
  if (!stagesContainer || !stagesList || !stagesImage || stageItems.length === 0) return;
  
  const firstItem = stageItems[0];
  const lastItem = stageItems[stageItems.length - 1];
  
  // Позиции относительно stages-list
  const firstItemTop = firstItem.offsetTop;
  const lastItemBottom = lastItem.offsetTop + lastItem.offsetHeight;
  const height = lastItemBottom - firstItemTop;
  
  // Устанавливаем высоту и позицию для изображения
  stagesImage.style.height = `${height}px`;
  stagesImage.style.marginTop = `${firstItemTop}px`;
}

// Выполняем выравнивание после загрузки DOM и при изменении размера окна
document.addEventListener('DOMContentLoaded', () => {
  alignStagesImage();
  
  // Пересчитываем при изменении размера окна
  window.addEventListener('resize', () => {
    setTimeout(alignStagesImage, 100);
  });
  
  // Пересчитываем после загрузки изображений
  const stagesImageImg = document.querySelector('.stages-image img');
  if (stagesImageImg) {
    stagesImageImg.addEventListener('load', alignStagesImage);
  }
});