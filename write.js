import { createClient } from '@supabase/supabase-js';
import { getDraft, upsertDraft } from './drafts.js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const page = document.querySelector('[data-write-page]');
const MAX_COVER_BYTES = 5 * 1024 * 1024;

if (!page) {
  // not on write page
} else if (!supabaseUrl || !supabaseKey) {
  page.querySelector('[data-write-status]').textContent =
    'Add the Supabase environment variables to enable writing.';
} else {
  const supabase = createClient(supabaseUrl, supabaseKey);
  const form = page.querySelector('[data-story-form]');
  const editor = page.querySelector('[data-story-editor]');
  const statusEl = page.querySelector('[data-write-status]');
  const stateEl = page.querySelector('[data-write-state]');
  const headingEl = page.querySelector('[data-write-heading]');
  const coverInput = page.querySelector('[data-cover-input]');
  const coverPreview = page.querySelector('[data-cover-preview]');
  const coverPrompt = page.querySelector('[data-cover-prompt]');
  const fontSelect = page.querySelector('[data-editor-font]');
  const sizeSelect = page.querySelector('[data-editor-size]');
  const titleInput = form.elements.title;

  let storyId = new URLSearchParams(window.location.search).get('id') || null;
  let coverDataUrl = '';
  let dirty = false;

  const setStatus = (message, isError = false) => {
    statusEl.textContent = message;
    statusEl.dataset.state = isError ? 'error' : 'success';
  };

  const markDirty = () => {
    dirty = true;
    stateEl.textContent = 'Unsaved changes';
  };

  const markSaved = () => {
    dirty = false;
    stateEl.textContent = 'Draft saved';
  };

  const applyEditorStyles = () => {
    editor.style.fontFamily = fontSelect.value;
    editor.style.fontSize = `${sizeSelect.value}px`;
  };

  const showCover = (dataUrl) => {
    coverDataUrl = dataUrl || '';
    if (coverDataUrl) {
      coverPreview.src = coverDataUrl;
      coverPreview.hidden = false;
      coverPrompt.hidden = true;
    } else {
      coverPreview.removeAttribute('src');
      coverPreview.hidden = true;
      coverPrompt.hidden = false;
    }
  };

  const loadStory = (userId) => {
    if (!storyId) return;
    const draft = getDraft(userId, storyId);
    if (!draft) {
      setStatus('That draft was not found. Starting a new story.', true);
      storyId = null;
      history.replaceState({}, '', 'write.html');
      return;
    }
    titleInput.value = draft.title || '';
    form.elements.excerpt.value = draft.excerpt || '';
    form.elements.language.value = draft.language || 'en';
    editor.innerHTML = draft.body || '';
    showCover(draft.coverDataUrl || '');
    headingEl.textContent = draft.title || 'Continue your story.';
    markSaved();
  };

  const readCoverFile = (file) =>
    new Promise((resolve, reject) => {
      if (!file) return resolve('');
      if (file.size > MAX_COVER_BYTES) {
        reject(new Error('Cover image must be 5 MB or smaller.'));
        return;
      }
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Could not read that image.'));
      reader.readAsDataURL(file);
    });

  const init = async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      window.location.assign('login.html');
      return;
    }

    applyEditorStyles();
    loadStory(user.id);

    titleInput.addEventListener('input', () => {
      headingEl.textContent = titleInput.value.trim() || 'Start with a title.';
      markDirty();
    });
    form.elements.excerpt.addEventListener('input', markDirty);
    form.elements.language.addEventListener('change', markDirty);
    editor.addEventListener('input', markDirty);

    fontSelect.addEventListener('change', applyEditorStyles);
    sizeSelect.addEventListener('change', applyEditorStyles);

    page.querySelectorAll('[data-format]').forEach((button) => {
      button.addEventListener('click', () => {
        editor.focus();
        document.execCommand(button.dataset.format, false);
        markDirty();
      });
    });

    coverInput.addEventListener('change', async () => {
      try {
        const file = coverInput.files?.[0];
        const dataUrl = await readCoverFile(file);
        showCover(dataUrl);
        markDirty();
        setStatus(file ? 'Cover selected. Save draft to keep it.' : '');
      } catch (err) {
        coverInput.value = '';
        setStatus(err.message || 'Could not use that image.', true);
      }
    });

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const title = String(titleInput.value || '').trim();
      if (!title) {
        setStatus('Add a title before saving.', true);
        return;
      }

      try {
        const saved = upsertDraft(user.id, {
          id: storyId,
          title,
          excerpt: String(form.elements.excerpt.value || ''),
          language: String(form.elements.language.value || 'en'),
          body: editor.innerHTML,
          coverDataUrl,
          status: 'draft',
        });
        storyId = saved.id;
        history.replaceState({}, '', `write.html?id=${encodeURIComponent(storyId)}`);
        markSaved();
        setStatus('Draft saved.');
      } catch (err) {
        setStatus(err.message || 'Could not save this draft. Cover may be too large for local storage.', true);
      }
    });

    window.addEventListener('beforeunload', (event) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = '';
    });
  };

  init().catch((err) => setStatus(err.message || 'Could not open the writing room.', true));
}
