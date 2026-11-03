(() => {
  'use strict';

  const PROFILE_KEY = 'museai.local.profile.v1';
  const UPLOAD_DB = 'museai-local-gallery';
  const uploadInput = document.getElementById('localImageUpload');
  const uploadTrigger = document.getElementById('galleryUploadTrigger');

  function readProfile() {
    try {
      const value = localStorage.getItem(PROFILE_KEY);
      return value ? JSON.parse(value) : null;
    } catch (_) {
      return null;
    }
  }

  function setProfileStatus(message) {
    const status = document.getElementById('galleryToolStatus');
    if (status) status.textContent = message;
  }

  const profileOpen = document.getElementById('localProfileOpen');
  const profileModal = document.getElementById('galleryProfileModal');
  const profileForm = document.getElementById('galleryProfileForm');
  const profileName = document.getElementById('galleryProfileName');
  const profileClear = document.getElementById('galleryProfileClear');

  if (profileOpen && profileModal && profileForm && profileName) {
    let opener = null;
    const closeProfile = () => {
      profileModal.hidden = true;
      if (opener && opener.isConnected) opener.focus({ preventScroll: true });
    };
    profileOpen.addEventListener('click', () => {
      opener = profileOpen;
      const profile = readProfile();
      profileName.value = profile && typeof profile.name === 'string' ? profile.name : '';
      setProfileStatus('');
      profileModal.hidden = false;
      profileName.focus({ preventScroll: true });
    });
    profileModal.addEventListener('click', event => {
      if (event.target.matches('[data-gallery-profile-close]')) closeProfile();
    });
    profileForm.addEventListener('submit', event => {
      event.preventDefault();
      const name = profileName.value.trim().slice(0, 32);
      if (!name) {
        profileName.focus();
        return;
      }
      try {
        localStorage.setItem(PROFILE_KEY, JSON.stringify({ name }));
        setProfileStatus(`Saved “${name}” to this browser.`);
        closeProfile();
      } catch (_) {
        setProfileStatus('Browser storage is unavailable; the change could not be saved.');
      }
    });
    if (profileClear) {
      profileClear.addEventListener('click', () => {
        try {
          localStorage.removeItem(PROFILE_KEY);
          setProfileStatus('Local profile cleared from this browser.');
          profileName.value = '';
          closeProfile();
        } catch (_) {
          setProfileStatus('Browser storage is unavailable; the profile could not be cleared.');
        }
      });
    }
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !profileModal.hidden) closeProfile();
    });
  }

  if (!uploadInput || !uploadTrigger) return;
  uploadTrigger.addEventListener('click', () => uploadInput.click());

  // The Features wall already renders uploaded blobs as native gallery tiles.
  // Its existing handler remains the single owner of upload persistence there.
  if (document.getElementById('wall')) return;

  let inMemoryUploads = [];
  let storedUploads = [];
  let objectUrls = [];
  let panel;
  let launcher;
  let grid;
  let status = document.getElementById('galleryToolStatus');
  if (!status) {
    status = document.createElement('p');
    status.className = 'gallery-tool-status';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    status.hidden = true;
    document.body.appendChild(status);
  }

  function announce(message) {
    status.textContent = message;
    status.hidden = false;
    window.clearTimeout(announce.timer);
    announce.timer = window.setTimeout(() => { status.hidden = true; }, 4200);
  }

  function openDatabase() {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) return reject(new Error('IndexedDB unavailable'));
      const request = indexedDB.open(UPLOAD_DB, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains('images')) {
          request.result.createObjectStore('images', { keyPath: 'id' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Could not open local image storage'));
    });
  }

  async function saveUpload(record) {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('images', 'readwrite');
      transaction.objectStore('images').put(record);
      transaction.oncomplete = () => { db.close(); resolve(); };
      transaction.onerror = () => {
        const error = transaction.error || new Error('Could not save this upload');
        db.close();
        reject(error);
      };
      transaction.onabort = () => {
        const error = transaction.error || new Error('Could not save this upload');
        db.close();
        reject(error);
      };
    });
  }

  async function readUploads() {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const request = db.transaction('images', 'readonly').objectStore('images').getAll();
      request.onsuccess = () => { const records = request.result || []; db.close(); resolve(records); };
      request.onerror = () => {
        const error = request.error || new Error('Could not read saved uploads');
        db.close();
        reject(error);
      };
    });
  }

  function buildPanel() {
    if (panel) return;
    launcher = document.createElement('button');
    launcher.type = 'button';
    launcher.className = 'gallery-tool-button gallery-uploads-launcher';
    launcher.textContent = 'Your uploads';
    launcher.setAttribute('aria-expanded', 'false');
    launcher.setAttribute('aria-controls', 'galleryUploadsPanel');

    panel = document.createElement('section');
    panel.className = 'gallery-uploads-panel';
    panel.id = 'galleryUploadsPanel';
    panel.hidden = true;
    panel.setAttribute('aria-label', 'Your local image uploads');
    panel.innerHTML = '<div class="gallery-uploads-heading"><div><h2>Your uploads</h2><p>Images stay in this browser and are not sent to a server.</p></div><button class="gallery-profile-close" type="button" data-gallery-uploads-close aria-label="Close uploads">×</button></div><div class="gallery-uploads-grid"></div>';
    grid = panel.querySelector('.gallery-uploads-grid');
    document.body.append(launcher, panel);

    const setOpen = open => {
      panel.hidden = !open;
      launcher.setAttribute('aria-expanded', String(open));
      if (open) panel.querySelector('[data-gallery-uploads-close]').focus({ preventScroll: true });
      else launcher.focus({ preventScroll: true });
    };
    launcher.addEventListener('click', () => setOpen(panel.hidden));
    panel.addEventListener('click', event => {
      if (event.target.matches('[data-gallery-uploads-close]')) setOpen(false);
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !panel.hidden) setOpen(false);
    });
  }

  function renderUploads(open = false) {
    buildPanel();
    objectUrls.forEach(url => URL.revokeObjectURL(url));
    objectUrls = [];
    grid.replaceChildren();
    const uploads = [...storedUploads, ...inMemoryUploads]
      .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    launcher.hidden = uploads.length === 0;
    launcher.textContent = uploads.length ? `Your uploads (${uploads.length})` : 'Your uploads';
    if (!uploads.length) {
      const empty = document.createElement('p');
      empty.className = 'gallery-upload-empty';
      empty.textContent = 'No images uploaded yet.';
      grid.appendChild(empty);
    } else {
      for (const upload of uploads) {
        const figure = document.createElement('figure');
        figure.className = 'gallery-upload-card';
        const image = document.createElement('img');
        image.alt = upload.title || 'Uploaded image';
        image.loading = 'lazy';
        const url = URL.createObjectURL(upload.blob);
        objectUrls.push(url);
        image.src = url;
        const caption = document.createElement('figcaption');
        caption.textContent = upload.title || 'Untitled upload';
        figure.append(image, caption);
        grid.appendChild(figure);
      }
    }
    if (open) {
      panel.hidden = false;
      launcher.setAttribute('aria-expanded', 'true');
    }
  }

  async function imageAspect(file) {
    try {
      const bitmap = await createImageBitmap(file);
      const aspect = bitmap.width / bitmap.height;
      bitmap.close();
      return Number.isFinite(aspect) && aspect > 0 ? aspect : 0.8;
    } catch (_) {
      return 0.8;
    }
  }

  uploadInput.addEventListener('change', async () => {
    const files = Array.from(uploadInput.files || []);
    uploadInput.value = '';
    if (!files.length) return;
    let added = 0;
    let sessionOnly = 0;
    let tooLarge = 0;
    let invalid = 0;
    for (const file of files) {
      if (!file.type.startsWith('image/')) { invalid += 1; continue; }
      if (file.size > 20 * 1024 * 1024) { tooLarge += 1; continue; }
      const record = {
        id: `upload-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        title: file.name.replace(/\.[^.]+$/, '') || 'Untitled upload',
        ar: await imageAspect(file),
        createdAt: Date.now(),
        blob: file
      };
      try {
        await saveUpload(record);
        storedUploads = storedUploads.filter(item => item.id !== record.id);
        storedUploads.push(record);
      } catch (_) {
        inMemoryUploads.push(record);
        sessionOnly += 1;
      }
      added += 1;
    }
    if (added) renderUploads(true);
    const messages = [];
    if (added) messages.push(sessionOnly ? `${added} image${added === 1 ? '' : 's'} added for this session only; persistent browser storage is unavailable.` : `${added} image${added === 1 ? '' : 's'} added to your browser-local uploads.`);
    if (tooLarge) messages.push(`${tooLarge} image${tooLarge === 1 ? '' : 's'} skipped; the limit is 20 MB each.`);
    if (invalid) messages.push(`${invalid} file${invalid === 1 ? '' : 's'} skipped; choose image files.`);
    if (messages.length) announce(messages.join(' '));
  });

  readUploads().then(records => {
    storedUploads = records;
    renderUploads(false);
  }).catch(() => {
    renderUploads(false);
  });
})();
