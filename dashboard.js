import { createClient } from '@supabase/supabase-js';
import { createDraft, getDraftStats, loadDrafts } from './drafts.js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const page = document.querySelector('[data-dashboard-page]');

if (!page) {
  // Not on dashboard
} else if (!supabaseUrl || !supabaseKey) {
  page.querySelector('[data-dashboard-status]').textContent =
    'Add the Supabase environment variables to enable the dashboard.';
} else {
  const supabase = createClient(supabaseUrl, supabaseKey);
  const nameEl = page.querySelector('[data-dashboard-name]');
  const listEl = page.querySelector('[data-dashboard-stories]');
  const statusEl = page.querySelector('[data-dashboard-status]');
  const draftForm = page.querySelector('[data-draft-form]');
  const draftStatus = page.querySelector('[data-draft-status]');

  const setStat = (key, value) => {
    const el = page.querySelector(`[data-stat-${key}]`);
    if (el) el.textContent = value == null ? '—' : String(value);
  };

  const languageLabel = (code) =>
    ({ en: 'English', ur: 'Urdu', bal: 'Balochi' }[code] || code);

  const renderStories = (userId) => {
    const drafts = loadDrafts(userId);
    const stats = getDraftStats(userId);
    setStat('stories', stats.stories);
    setStat('published', stats.published);
    setStat('drafts', stats.drafts);
    setStat('followers', stats.followers);

    if (!drafts.length) {
      listEl.innerHTML = '<p class="dashboard-empty">No stories yet. Start a draft on the right.</p>';
      return;
    }

    listEl.replaceChildren(
      ...drafts.slice(0, 6).map((draft) => {
        const article = document.createElement('article');
        article.className = 'dashboard-story-item';
        article.tabIndex = 0;
        article.setAttribute('role', 'link');
        article.dataset.storyId = draft.id;
        article.innerHTML = `
          <div>
            <h3>${escapeHtml(draft.title)}</h3>
            <p>${languageLabel(draft.language)} · ${draft.status}</p>
          </div>
          <time datetime="${draft.updatedAt}">${new Date(draft.updatedAt).toLocaleDateString()}</time>
        `;
        const open = () => {
          window.location.assign(`write.html?id=${encodeURIComponent(draft.id)}`);
        };
        article.addEventListener('click', open);
        article.addEventListener('keydown', (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            open();
          }
        });
        return article;
      }),
    );
  };

  function escapeHtml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;');
  }

  const init = async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      window.location.assign('login.html');
      return;
    }

    let displayName = 'Writer';
    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name, last_name, username')
      .eq('id', user.id)
      .maybeSingle();

    if (profile) {
      displayName =
        `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
        || profile.username
        || user.user_metadata?.first_name
        || 'Writer';
    } else if (user.user_metadata?.first_name) {
      displayName = user.user_metadata.first_name;
    }
    nameEl.textContent = displayName;

    renderStories(user.id);
    statusEl.textContent = '';

    draftForm?.addEventListener('submit', (event) => {
      event.preventDefault();
      const formData = new FormData(draftForm);
      const title = String(formData.get('title') || '').trim();
      if (!title) {
        draftStatus.textContent = 'Add a title to create a draft.';
        draftStatus.dataset.state = 'error';
        return;
      }
      const draft = createDraft(user.id, {
        title,
        language: String(formData.get('language') || 'en'),
      });
      draftStatus.textContent = 'Opening writing room...';
      draftStatus.dataset.state = 'success';
      window.location.assign(`write.html?id=${encodeURIComponent(draft.id)}`);
    });
  };

  init().catch((err) => {
    statusEl.textContent = err.message || 'Could not load your dashboard.';
    statusEl.dataset.state = 'error';
  });
}
