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

  const ACTIVITY_KEYS = {
    likes: 'museai.local.likes.v1',
    comments: 'museai.local.comments.v1',
    views: 'museai.local.views.v1',
    downloads: 'museai.local.downloads.v1'
  };
  function readActivityMap(key) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || '{}');
      return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    } catch (_) { return {}; }
  }
  const activity = Object.fromEntries(Object.entries(ACTIVITY_KEYS).map(([name, key]) => [name, readActivityMap(key)]));

  let inMemoryUploads = [];
  let storedUploads = [];
  let objectUrls = [];
  let panel;
  let launcher;
  let grid;
  let viewer;
  let viewerImage;
  let viewerTitle;
  let viewerClose;
  let viewerOpener = null;
  let activeUpload = null;
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
    buildViewer();

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

  function uploadKey(upload) { return upload.id; }
  function uploadComments(upload) {
    const list = activity.comments[uploadKey(upload)];
    return Array.isArray(list) ? list : [];
  }
  function activityCount(type, upload) {
    const count = Number(activity[type][uploadKey(upload)]);
    return Number.isFinite(count) && count > 0 ? Math.floor(count) : 0;
  }
  function saveActivity(type) {
    try { localStorage.setItem(ACTIVITY_KEYS[type], JSON.stringify(activity[type])); }
    catch (_) { announce('Browser storage is unavailable; activity changes last only for this session.'); }
  }
  function refreshUploadActivity(upload, card) {
    const key = uploadKey(upload);
    const target = card || Array.from(grid.querySelectorAll('.gallery-upload-card')).find(item => item.dataset.uploadId === key);
    const liked = Boolean(activity.likes[key]);
    const comments = uploadComments(upload).length;
    const views = activityCount('views', upload);
    const downloads = activityCount('downloads', upload);
    if (target) {
      const like = target.querySelector('.gallery-upload-like');
      like.setAttribute('aria-pressed', String(liked));
      like.classList.toggle('is-liked', liked);
      like.querySelector('[aria-hidden="true"]').textContent = liked ? '♥' : '♡';
      like.querySelector('[data-upload-likes]').textContent = liked ? '1' : '0';
      like.querySelector('.gallery-upload-like-label').textContent = liked ? 'Liked' : 'Like';
      target.querySelector('[data-upload-comments]').textContent = String(comments);
      target.querySelector('[data-upload-views]').textContent = String(views);
      target.querySelector('[data-upload-download-summary]').textContent = String(downloads);
      target.querySelector('[data-upload-downloads]').textContent = String(downloads);
    }
    if (activeUpload && uploadKey(activeUpload) === key && viewer && !viewer.hidden) {
      viewer.querySelector('[data-viewer-likes]').textContent = String(liked ? 1 : 0);
      viewer.querySelector('[data-viewer-comments]').textContent = String(comments);
      viewer.querySelector('[data-viewer-views]').textContent = String(views);
      viewer.querySelector('[data-viewer-downloads]').textContent = String(downloads);
    }
  }
  function incrementActivity(type, upload) {
    const key = uploadKey(upload);
    activity[type][key] = activityCount(type, upload) + 1;
    saveActivity(type);
    refreshUploadActivity(upload);
  }
  function downloadName(upload) {
    const base = (upload.title || 'image').normalize('NFKD').replace(/[^\w.-]+/g, '-').replace(/^-+|-+$/g, '') || 'image';
    const extensions = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/avif': 'avif', 'image/svg+xml': 'svg' };
    const extension = extensions[upload.blob && upload.blob.type] || 'png';
    return `${base}.${extension}`;
  }
  function downloadUpload(upload, url) {
    const link = document.createElement('a');
    link.href = url;
    link.download = downloadName(upload);
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    link.remove();
    incrementActivity('downloads', upload);
    announce(`Download started: ${upload.title || 'image'}`);
  }
  function renderUploadComments(upload, list) {
    list.replaceChildren();
    uploadComments(upload).forEach(comment => {
      const entry = document.createElement('p');
      entry.className = 'gallery-upload-comment';
      const author = document.createElement('strong');
      const profile = readProfile();
      author.textContent = comment.author || (profile && profile.name) || 'You';
      const text = document.createElement('span');
      text.textContent = comment.text || '';
      entry.append(author, text);
      list.appendChild(entry);
    });
  }
  function buildViewer() {
    if (viewer) return;
    viewer = document.createElement('section');
    viewer.className = 'gallery-upload-viewer';
    viewer.hidden = true;
    viewer.setAttribute('role', 'dialog');
    viewer.setAttribute('aria-modal', 'true');
    viewer.setAttribute('aria-label', 'Uploaded image viewer');
    viewer.innerHTML = '<div class="gallery-upload-viewer-scrim" data-upload-viewer-close></div><div class="gallery-upload-viewer-card"><button class="gallery-profile-close" type="button" data-upload-viewer-close aria-label="Close image viewer">×</button><img class="gallery-upload-viewer-image" alt=""><h2 class="gallery-upload-viewer-title"></h2><div class="gallery-upload-viewer-stats" aria-live="polite"><span>Likes <strong data-viewer-likes>0</strong></span><span>Comments <strong data-viewer-comments>0</strong></span><span>Views <strong data-viewer-views>0</strong></span><span>Downloads <strong data-viewer-downloads>0</strong></span></div><button class="gallery-tool-button gallery-upload-viewer-download" type="button">↓ Download image</button><p class="gallery-upload-viewer-note">Counts are saved in this browser only.</p></div>';
    viewerImage = viewer.querySelector('.gallery-upload-viewer-image');
    viewerTitle = viewer.querySelector('.gallery-upload-viewer-title');
    viewerClose = viewer.querySelector('[data-upload-viewer-close].gallery-profile-close');
    viewer.addEventListener('click', event => {
      if (event.target === viewer || event.target.matches('[data-upload-viewer-close]')) closeViewer();
    });
    viewer.querySelector('.gallery-upload-viewer-download').addEventListener('click', () => {
      if (activeUpload) downloadUpload(activeUpload, viewerImage.src);
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && viewer && !viewer.hidden) closeViewer();
    });
    document.body.appendChild(viewer);
  }
  function openViewer(upload, url, opener) {
    activeUpload = upload;
    viewerOpener = opener;
    viewerImage.src = url;
    viewerImage.alt = upload.title || 'Uploaded image';
    viewerTitle.textContent = upload.title || 'Untitled upload';
    viewer.hidden = false;
    incrementActivity('views', upload);
    viewerClose.focus({ preventScroll: true });
  }
  function closeViewer() {
    if (!viewer || viewer.hidden) return;
    viewer.hidden = true;
    viewerImage.removeAttribute('src');
    activeUpload = null;
    if (viewerOpener && viewerOpener.isConnected) viewerOpener.focus({ preventScroll: true });
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
        figure.dataset.uploadId = uploadKey(upload);
        const preview = document.createElement('button');
        preview.type = 'button';
        preview.className = 'gallery-upload-preview';
        preview.setAttribute('aria-label', `Open ${upload.title || 'uploaded image'}`);
        const image = document.createElement('img');
        image.alt = upload.title || 'Uploaded image';
        image.loading = 'lazy';
        const url = URL.createObjectURL(upload.blob);
        objectUrls.push(url);
        image.src = url;
        preview.appendChild(image);
        preview.addEventListener('click', () => openViewer(upload, url, preview));
        const caption = document.createElement('figcaption');
        caption.textContent = upload.title || 'Untitled upload';
        const summary = document.createElement('p');
        summary.className = 'gallery-upload-summary';
        summary.innerHTML = 'Views <strong data-upload-views>0</strong><span aria-hidden="true"> · </span>Downloads <strong data-upload-download-summary>0</strong>';
        const actions = document.createElement('div');
        actions.className = 'gallery-upload-actions';
        const like = document.createElement('button');
        like.type = 'button';
        like.className = 'gallery-upload-action gallery-upload-like';
        like.innerHTML = '<span aria-hidden="true">♡</span> <span class="gallery-upload-like-label">Like</span> <strong data-upload-likes>0</strong>';
        like.addEventListener('click', () => {
          const key = uploadKey(upload);
          if (activity.likes[key]) delete activity.likes[key];
          else activity.likes[key] = true;
          saveActivity('likes');
          refreshUploadActivity(upload, figure);
        });
        const commentToggle = document.createElement('button');
        commentToggle.type = 'button';
        commentToggle.className = 'gallery-upload-action gallery-upload-comment-toggle';
        commentToggle.innerHTML = 'Comment <strong data-upload-comments>0</strong>';
        const download = document.createElement('button');
        download.type = 'button';
        download.className = 'gallery-upload-action gallery-upload-download';
        download.innerHTML = '↓ Download <strong data-upload-downloads>0</strong>';
        download.addEventListener('click', () => downloadUpload(upload, url));
        actions.append(like, commentToggle, download);
        const commentsPanel = document.createElement('div');
        commentsPanel.className = 'gallery-upload-comments-panel';
        commentsPanel.hidden = true;
        const commentList = document.createElement('div');
        commentList.className = 'gallery-upload-comment-list';
        const commentForm = document.createElement('form');
        commentForm.className = 'gallery-upload-comment-form';
        const commentInput = document.createElement('textarea');
        commentInput.maxLength = 500;
        commentInput.required = true;
        commentInput.rows = 2;
        commentInput.placeholder = 'Add a comment…';
        commentInput.setAttribute('aria-label', `Comment on ${upload.title || 'uploaded image'}`);
        const post = document.createElement('button');
        post.type = 'submit';
        post.className = 'gallery-upload-action';
        post.textContent = 'Post';
        commentForm.append(commentInput, post);
        commentForm.addEventListener('submit', event => {
          event.preventDefault();
          const text = commentInput.value.trim();
          if (!text) return;
          const key = uploadKey(upload);
          const existing = uploadComments(upload);
          const profile = readProfile();
          existing.push({ author: (profile && profile.name) || 'You', text, createdAt: new Date().toISOString() });
          activity.comments[key] = existing;
          saveActivity('comments');
          commentInput.value = '';
          renderUploadComments(upload, commentList);
          refreshUploadActivity(upload, figure);
        });
        commentToggle.addEventListener('click', () => {
          commentsPanel.hidden = !commentsPanel.hidden;
          if (!commentsPanel.hidden) commentInput.focus({ preventScroll: true });
        });
        commentsPanel.append(commentList, commentForm);
        figure.append(preview, caption, summary, actions, commentsPanel);
        renderUploadComments(upload, commentList);
        refreshUploadActivity(upload, figure);
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
