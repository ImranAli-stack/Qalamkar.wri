import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const authForms = document.querySelectorAll('[data-auth-form]');
const profilePage = document.querySelector('[data-profile-page]');
const dashboardPage = document.querySelector('[data-dashboard-page]');
const publicDashboardPage = document.querySelector('[data-public-dashboard-page]');
const writePage = document.querySelector('[data-write-page]');
const authLinks = document.querySelector('[data-auth-links]');
const homeProfile = document.querySelector('[data-home-profile]');
let supabase;

authForms.forEach((form) => {
  if (form.dataset.authForm !== 'signup') return;

  const password = form.elements.password;
  const confirmPassword = form.elements.confirm_password;
  const validatePasswords = () => {
    confirmPassword.setCustomValidity(
      password.value === confirmPassword.value ? '' : 'Passwords do not match.',
    );
  };

  password.addEventListener('input', validatePasswords);
  confirmPassword.addEventListener('input', validatePasswords);
});

function showStatus(form, message, isError = false) {
  const status = form.querySelector('[data-auth-status]');
  status.textContent = message;
  status.dataset.state = isError ? 'error' : 'success';
}

function sanitizeStoryContent(content) {
  const parsed = new DOMParser().parseFromString(content, 'text/html');
  const allowedTags = new Set(['P', 'BR', 'STRONG', 'B', 'EM', 'I', 'U', 'UL', 'OL', 'LI', 'BLOCKQUOTE', 'DIV', 'H2', 'H3']);
  const blockedTags = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'SVG', 'MATH']);
  const clean = (parent) => {
    for (const node of [...parent.childNodes]) {
      if (node.nodeType === Node.COMMENT_NODE) {
        node.remove();
        continue;
      }
      if (node.nodeType !== Node.ELEMENT_NODE) continue;
      clean(node);
      if (blockedTags.has(node.tagName)) {
        node.remove();
      } else if (!allowedTags.has(node.tagName)) {
        node.replaceWith(...node.childNodes);
      } else {
        for (const attribute of [...node.attributes]) node.removeAttribute(attribute.name);
      }
    }
  };
  clean(parsed.body);
  return parsed.body.innerHTML;
}

if (!supabaseUrl || !supabaseKey) {
  authForms.forEach((form) => {
    showStatus(form, 'Authentication is not configured yet. Add the Supabase environment variables to enable it.', true);
  });
  if (profilePage) {
    profilePage.querySelector('[data-profile-status]').textContent = 'Add the Supabase environment variables to enable profiles.';
  }
  if (dashboardPage) {
    dashboardPage.querySelector('[data-dashboard-status]').textContent = 'Add the Supabase environment variables to load your dashboard.';
  }
  if (publicDashboardPage) {
    publicDashboardPage.querySelector('[data-public-stories]').innerHTML = '<p class="dashboard-empty">Published stories need Supabase configuration before they can be loaded.</p>';
    publicDashboardPage.querySelector('[data-public-dashboard-status]').textContent = 'Add the Supabase environment variables to load published stories.';
  }
  if (writePage) {
    writePage.querySelector('[data-write-status]').textContent = 'Add the Supabase environment variables to save stories.';
    writePage.querySelectorAll('[data-story-action]').forEach((button) => { button.disabled = true; });
  }
} else {
  supabase = createClient(supabaseUrl, supabaseKey);

  if (authLinks) {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return;
      authLinks.replaceChildren();
      const storiesLink = document.createElement('a');
      storiesLink.href = 'dashboard.html';
      storiesLink.className = 'btn-ghost';
      storiesLink.textContent = 'Stories';
      const dashboardLink = document.createElement('a');
      dashboardLink.href = 'my-dashboard.html';
      dashboardLink.className = 'btn-ghost';
      dashboardLink.textContent = 'My dashboard';
      const profileLink = document.createElement('a');
      profileLink.href = 'profile.html';
      profileLink.className = 'btn-ghost';
      profileLink.textContent = 'Profile';
      const signOutButton = document.createElement('button');
      signOutButton.type = 'button';
      signOutButton.className = 'btn-ghost';
      signOutButton.textContent = 'Sign out';
      signOutButton.addEventListener('click', async () => {
        await supabase.auth.signOut();
        window.location.reload();
      });
      authLinks.append(storiesLink, dashboardLink, profileLink, signOutButton);

      if (homeProfile) {
        const guestPanel = homeProfile.querySelector('[data-home-guest]');
        const memberPanel = homeProfile.querySelector('[data-home-member]');
        const profileStatus = homeProfile.querySelector('[data-home-profile-status]');
        guestPanel.hidden = true;
        memberPanel.hidden = false;

        const [profileResult, publishedResult, followersResult] = await Promise.all([
          supabase.from('profiles').select('username, first_name, last_name').eq('id', session.user.id).single(),
          supabase.from('stories').select('id', { count: 'exact', head: true }).eq('author_id', session.user.id).eq('status', 'published'),
          supabase.from('writer_follows').select('follower_id', { count: 'exact', head: true }).eq('followed_id', session.user.id),
        ]);

        const profile = profileResult.data;
        const name = profile
          ? `${profile.first_name} ${profile.last_name}`.trim() || 'Writer'
          : 'Writer';
        homeProfile.querySelector('[data-home-name]').textContent = name;
        homeProfile.querySelector('[data-home-username]').textContent = profile?.username ? `@${profile.username}` : '';
        homeProfile.querySelector('[data-home-avatar]').textContent = Array.from(name)[0] || 'Q';
        homeProfile.querySelector('[data-home-published]').textContent = publishedResult.error
          ? '—'
          : String(publishedResult.count ?? 0);
        homeProfile.querySelector('[data-home-followers]').textContent = followersResult.error
          ? '—'
          : String(followersResult.count ?? 0);

        const errors = [profileResult.error, publishedResult.error, followersResult.error].filter(Boolean);
        if (errors.length) {
          profileStatus.textContent = errors.map((error) => error.message).join(' ');
          profileStatus.dataset.state = 'error';
        }
      }
    }).catch((error) => {
      if (!homeProfile) return;
      const profileStatus = homeProfile.querySelector('[data-home-profile-status]');
      profileStatus.textContent = error.message || 'Your profile summary could not be loaded.';
      profileStatus.dataset.state = 'error';
    });
  }

  if (publicDashboardPage) {
    const storyList = publicDashboardPage.querySelector('[data-public-stories]');
    const status = publicDashboardPage.querySelector('[data-public-dashboard-status]');
    const pageSize = 20;
    let offset = 0;
    let isLoading = false;
    let loadMoreButton;

    const loadStories = async () => {
      if (isLoading) return;
      isLoading = true;
      if (loadMoreButton) loadMoreButton.disabled = true;
      const { data: stories, error } = await supabase.from('stories')
        .select('id, title, excerpt, content, language, cover_image_url, published_at, author_id')
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .range(offset, offset + pageSize - 1);

      if (error) {
        storyList.innerHTML = '<p class="dashboard-empty">Published stories could not be loaded. Check that the publishing migrations have been applied.</p>';
        status.textContent = error.message;
        status.dataset.state = 'error';
        isLoading = false;
        if (loadMoreButton) loadMoreButton.disabled = false;
        return;
      }

      if (offset === 0 && !stories.length) {
        storyList.innerHTML = '<p class="dashboard-empty">No stories have been published yet. Be the first to share your work.</p>';
        isLoading = false;
        return;
      }

      const authorIds = [...new Set(stories.map((story) => story.author_id))];
      const { data: authors } = await supabase.from('public_profiles')
        .select('id, username, first_name, last_name')
        .in('id', authorIds);
      const authorById = new Map((authors || []).map((author) => [author.id, author]));
      const languageNames = { en: 'English', ur: 'Urdu', bal: 'Balochi' };

      for (const story of stories) {
        const author = authorById.get(story.author_id);
        const fullName = author ? `${author.first_name} ${author.last_name}`.trim() : '';
        const card = document.createElement('article');
        card.className = homeProfile
          ? `public-story home-letter${story.cover_image_url ? '' : ' home-letter-no-cover'}`
          : 'public-story';
        if (story.cover_image_url) {
          const cover = document.createElement('img');
          cover.className = homeProfile ? 'public-story-cover home-letter-cover' : 'public-story-cover';
          cover.src = story.cover_image_url;
          cover.alt = `${story.title} cover`;
          cover.loading = 'lazy';
          card.append(cover);
        }

        const body = document.createElement('div');
        body.className = homeProfile ? 'public-story-body home-letter-body' : 'public-story-body';
        const metadata = document.createElement('p');
        metadata.className = homeProfile ? 'public-story-meta home-letter-meta' : 'public-story-meta';
        const authorName = fullName || (author ? `@${author.username}` : 'Qalamkar writer');
        const readingTime = Math.max(1, Math.ceil((story.content || '').replace(/<[^>]*>/g, ' ').trim().split(/\s+/).filter(Boolean).length / 200));
        metadata.textContent = `${authorName} · ${languageNames[story.language] || story.language} · ${new Date(story.published_at).toLocaleDateString()} · ${readingTime} min read`;
        const title = document.createElement('h3');
        title.textContent = story.title;
        body.append(metadata, title);
        if (story.excerpt) {
          const excerpt = document.createElement('p');
          excerpt.className = homeProfile ? 'public-story-excerpt home-letter-excerpt' : 'public-story-excerpt';
          excerpt.textContent = story.excerpt;
          body.append(excerpt);
        }
        const details = document.createElement('details');
        details.className = homeProfile ? 'public-story-content home-letter-content' : 'public-story-content';
        const summary = document.createElement('summary');
        summary.textContent = 'Read story';
        const content = document.createElement('div');
        content.className = 'story-reader';
        content.innerHTML = sanitizeStoryContent(story.content || '');
        details.append(summary, content);
        body.append(details);
        card.append(body);
        storyList.append(card);
      }

      offset += stories.length;
      if (stories.length === pageSize) {
        if (!loadMoreButton) {
          loadMoreButton = document.createElement('button');
          loadMoreButton.type = 'button';
          loadMoreButton.className = 'btn-ghost public-story-more';
          loadMoreButton.textContent = 'Load more stories';
          loadMoreButton.addEventListener('click', loadStories);
          if (homeProfile) {
            storyList.append(loadMoreButton);
          } else {
            publicDashboardPage.querySelector('.public-story-list').after(loadMoreButton);
          }
        }
        loadMoreButton.hidden = false;
        loadMoreButton.disabled = false;
      } else if (loadMoreButton) {
        loadMoreButton.hidden = true;
      }
      status.textContent = '';
      isLoading = false;
    };

    loadStories().catch((error) => {
      status.textContent = error.message || 'Published stories could not be loaded.';
      status.dataset.state = 'error';
      isLoading = false;
    });
  }

  if (dashboardPage) {
    const storyList = dashboardPage.querySelector('[data-dashboard-stories]');
    const dashboardStatus = dashboardPage.querySelector('[data-dashboard-status]');
    const setStatus = (element, message, isError = false) => {
      element.textContent = message;
      element.dataset.state = isError ? 'error' : 'success';
    };

    const loadDashboard = async () => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        window.location.assign('login.html');
        return;
      }

      const [profileResult, storiesResult, publishedResult, draftsResult, followersResult] = await Promise.all([
        supabase.from('profiles').select('first_name, preferred_language').eq('id', user.id).single(),
        supabase.from('stories').select('id, title, status, updated_at', { count: 'exact' }).eq('author_id', user.id).order('updated_at', { ascending: false }).limit(5),
        supabase.from('stories').select('id', { count: 'exact', head: true }).eq('author_id', user.id).eq('status', 'published'),
        supabase.from('stories').select('id', { count: 'exact', head: true }).eq('author_id', user.id).eq('status', 'draft'),
        supabase.from('writer_follows').select('follower_id', { count: 'exact', head: true }).eq('followed_id', user.id),
      ]);

      if (profileResult.data?.first_name) {
        dashboardPage.querySelector('[data-dashboard-name]').textContent = profileResult.data.first_name;
      }
      dashboardPage.querySelector('[data-stat-stories]').textContent = storiesResult.error ? '—' : String(storiesResult.count ?? 0);
      dashboardPage.querySelector('[data-stat-published]').textContent = publishedResult.error ? '—' : String(publishedResult.count ?? 0);
      dashboardPage.querySelector('[data-stat-drafts]').textContent = draftsResult.error ? '—' : String(draftsResult.count ?? 0);
      dashboardPage.querySelector('[data-stat-followers]').textContent = followersResult.error ? '—' : String(followersResult.count ?? 0);

      if (storiesResult.error) {
        storyList.innerHTML = '<p class="dashboard-empty">Your stories could not be loaded. Check that the publishing migration has been applied.</p>';
        return;
      }
      if (!storiesResult.data.length) {
        storyList.innerHTML = '<p class="dashboard-empty">Your library is ready for its first story. Start with a title in the draft form.</p>';
        return;
      }

      storyList.replaceChildren(...storiesResult.data.map((story) => {
        const item = document.createElement('article');
        item.className = 'dashboard-story';
        const details = document.createElement('div');
        const title = document.createElement('h3');
        title.textContent = story.title;
        const updated = document.createElement('p');
        updated.textContent = `Updated ${new Date(story.updated_at).toLocaleDateString()}`;
        const badge = document.createElement('span');
        badge.className = `story-status story-status-${story.status}`;
        badge.textContent = story.status;
        const storyLink = document.createElement('a');
        storyLink.href = `write.html?id=${encodeURIComponent(story.id)}`;
        storyLink.className = 'dashboard-story-link';
        storyLink.setAttribute('aria-label', `Edit ${story.title}`);
        storyLink.append(title);
        details.append(storyLink, updated);
        item.append(details, badge);
        return item;
      }));
    };

    loadDashboard().catch((error) => {
      setStatus(dashboardStatus, error.message || 'Your dashboard could not be loaded.', true);
    });
  }

  if (writePage) {
    const form = writePage.querySelector('[data-story-form]');
    const editor = writePage.querySelector('[data-story-editor]');
    const status = writePage.querySelector('[data-write-status]');
    const saveState = writePage.querySelector('[data-write-state]');
    const coverInput = writePage.querySelector('[data-cover-input]');
    const coverPreview = writePage.querySelector('[data-cover-preview]');
    const coverPrompt = writePage.querySelector('[data-cover-prompt]');
    const fontSelect = writePage.querySelector('[data-editor-font]');
    const sizeSelect = writePage.querySelector('[data-editor-size]');
    const saveButtons = [...writePage.querySelectorAll('[data-story-action]')];
    const storyId = new URLSearchParams(window.location.search).get('id');
    let currentStory = null;
    let selectedCover = null;
    let coverPreviewUrl = '';

    const setWriteStatus = (message, isError = false) => {
      status.textContent = message;
      status.dataset.state = isError ? 'error' : 'success';
    };

    const setCoverPreview = (url) => {
      coverPreview.hidden = !url;
      coverPrompt.hidden = Boolean(url);
      if (url) coverPreview.src = url;
      else coverPreview.removeAttribute('src');
    };

    const loadStory = async () => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        window.location.assign('login.html');
        return null;
      }
      if (!storyId) return user;

      const { data: story, error } = await supabase.from('stories')
        .select('id, author_id, title, slug, excerpt, content, language, status, cover_image_url, font_family, font_size')
        .eq('id', storyId)
        .eq('author_id', user.id)
        .single();
      if (error) {
        setWriteStatus('This story could not be opened. It may have been removed.', true);
        saveButtons.forEach((button) => { button.disabled = true; });
        return null;
      }

      currentStory = story;
      form.elements.title.value = story.title;
      form.elements.excerpt.value = story.excerpt || '';
      form.elements.language.value = story.language;
      editor.innerHTML = sanitizeStoryContent(story.content || '');
      fontSelect.value = story.font_family || 'Georgia';
      sizeSelect.value = String(story.font_size || 18);
      editor.style.fontFamily = fontSelect.value;
      editor.style.fontSize = `${sizeSelect.value}px`;
      if (story.cover_image_url) setCoverPreview(story.cover_image_url);
      writePage.querySelector('[data-write-heading]').textContent = 'Continue your story.';
      saveState.textContent = story.status === 'published' ? 'Published story' : 'Draft';
      return user;
    };

    coverInput.addEventListener('change', () => {
      selectedCover = coverInput.files?.[0] || null;
      if (coverPreviewUrl) URL.revokeObjectURL(coverPreviewUrl);
      coverPreviewUrl = selectedCover ? URL.createObjectURL(selectedCover) : '';
      setCoverPreview(coverPreviewUrl || currentStory?.cover_image_url || '');
    });

    fontSelect.addEventListener('change', () => {
      editor.style.fontFamily = fontSelect.value;
      editor.focus();
    });
    sizeSelect.addEventListener('change', () => {
      editor.style.fontSize = `${sizeSelect.value}px`;
      editor.focus();
    });
    writePage.querySelectorAll('[data-format]').forEach((button) => {
      button.addEventListener('click', () => {
        editor.focus();
        document.execCommand(button.dataset.format);
      });
    });
    editor.addEventListener('paste', (event) => {
      event.preventDefault();
      document.execCommand('insertText', false, event.clipboardData.getData('text/plain'));
    });

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return window.location.assign('login.html');
      const title = form.elements.title.value.trim();
      if (!title) {
        form.elements.title.focus();
        return;
      }
      if (selectedCover && (!selectedCover.type.startsWith('image/') || selectedCover.size > 5 * 1024 * 1024)) {
        setWriteStatus('Choose a supported image no larger than 5 MB.', true);
        return;
      }

      const shouldPublish = event.submitter?.dataset.storyAction === 'publish';
      saveButtons.forEach((button) => { button.disabled = true; });
      setWriteStatus(shouldPublish ? 'Publishing your story...' : 'Saving your story...');
      const id = currentStory?.id || crypto.randomUUID();
      let coverUrl = currentStory?.cover_image_url || '';
      let uploadedPath = '';

      if (selectedCover) {
        const extension = ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' })[selectedCover.type];
        if (!extension) {
          saveButtons.forEach((button) => { button.disabled = false; });
          setWriteStatus('Choose a JPG, PNG, WebP, or GIF image.', true);
          return;
        }
        uploadedPath = `${user.id}/${id}/cover-${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await supabase.storage.from('story-covers').upload(uploadedPath, selectedCover, {
          cacheControl: '3600',
          contentType: selectedCover.type,
          upsert: false,
        });
        if (uploadError) {
          saveButtons.forEach((button) => { button.disabled = false; });
          setWriteStatus(uploadError.message || 'The featured picture could not be uploaded.', true);
          return;
        }
        coverUrl = supabase.storage.from('story-covers').getPublicUrl(uploadedPath).data.publicUrl;
      }

      const titleSlug = title.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 140) || 'story';
      const values = {
        title,
        slug: currentStory?.slug || `${titleSlug}-${id.slice(0, 8)}`,
        excerpt: form.elements.excerpt.value.trim(),
        content: sanitizeStoryContent(editor.innerHTML),
        language: form.elements.language.value,
        cover_image_url: coverUrl,
        font_family: fontSelect.value,
        font_size: Number(sizeSelect.value),
        status: shouldPublish ? 'published' : (currentStory?.status || 'draft'),
      };

      const result = currentStory
        ? await supabase.from('stories').update(values).eq('id', id).eq('author_id', user.id)
        : await supabase.from('stories').insert({ id, author_id: user.id, ...values });
      saveButtons.forEach((button) => { button.disabled = false; });
      if (result.error) {
        if (uploadedPath) await supabase.storage.from('story-covers').remove([uploadedPath]);
        setWriteStatus(result.error.message || 'Your story could not be saved.', true);
        return;
      }

      currentStory = { ...currentStory, id, ...values };
      selectedCover = null;
      coverInput.value = '';
      if (window.location.search !== `?id=${encodeURIComponent(id)}`) {
        window.history.replaceState({}, '', `write.html?id=${encodeURIComponent(id)}`);
      }
      setCoverPreview(coverUrl);
      saveState.textContent = currentStory.status === 'published' ? 'Published story' : 'Draft saved';
      setWriteStatus(shouldPublish ? 'Your story is published and available in Stories.' : 'Your story is saved.');
    });

    loadStory().catch((error) => setWriteStatus(error.message || 'The writing room could not be opened.', true));
  }

  if (profilePage) {
    const form = profilePage.querySelector('[data-profile-form]');
    const status = profilePage.querySelector('[data-profile-status]');
    const submitButton = form.querySelector('[type="submit"]');
    const setProfileStatus = (message, isError = false) => {
      status.textContent = message;
      status.dataset.state = isError ? 'error' : 'success';
    };

    const loadProfile = async () => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        window.location.assign('login.html');
        return;
      }

      profilePage.querySelector('[data-profile-email]').textContent = user.email || '';
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('username, first_name, last_name, bio, preferred_language, created_at')
        .eq('id', user.id)
        .single();

      if (error) {
        setProfileStatus('Your profile could not be loaded. Check that the Supabase profile migration has been applied.', true);
        submitButton.disabled = true;
        return;
      }

      for (const [field, value] of Object.entries(profile)) {
        const input = form.elements.namedItem(field);
        if (input) input.value = value ?? '';
      }
      profilePage.querySelector('[data-profile-name]').textContent = `${profile.first_name} ${profile.last_name}`.trim() || 'Writer';
      profilePage.querySelector('[data-profile-joined]').textContent = new Date(profile.created_at).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
      });
      submitButton.disabled = false;
    };

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return window.location.assign('login.html');
      const formData = new FormData(form);
      submitButton.disabled = true;
      setProfileStatus('Saving your profile...');
      const { error } = await supabase.from('profiles').update({
        username: formData.get('username').trim().toLowerCase(),
        first_name: formData.get('first_name').trim(),
        last_name: formData.get('last_name').trim(),
        bio: formData.get('bio').trim(),
        preferred_language: formData.get('preferred_language'),
      }).eq('id', user.id);
      submitButton.disabled = false;
      if (error) {
        setProfileStatus(error.code === '23505' ? 'That username is already taken.' : error.message, true);
        return;
      }
      profilePage.querySelector('[data-profile-name]').textContent = `${formData.get('first_name').trim()} ${formData.get('last_name').trim()}`.trim() || 'Writer';
      setProfileStatus('Profile saved.');
    });

    loadProfile().catch((error) => setProfileStatus(error.message || 'Could not load your profile.', true));
  }

  authForms.forEach((form) => {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const submitButton = form.querySelector('[type="submit"]');
      const formData = new FormData(form);
      submitButton.disabled = true;
      showStatus(form, 'Please wait...');

      try {
        const mode = form.dataset.authForm;
        let result;

        if (mode === 'signup') {
          const firstName = formData.get('first_name').trim();
          const lastName = formData.get('last_name').trim();
          result = await supabase.auth.signUp({
            email: formData.get('email'),
            password: formData.get('password'),
            options: {
              data: {
                first_name: firstName,
                last_name: lastName,
                full_name: `${firstName} ${lastName}`,
                username: formData.get('username').trim().toLowerCase(),
                preferred_language: formData.get('preferred_language') || 'en',
              },
              emailRedirectTo: `${window.location.origin}/login.html`,
            },
          });
          if (result.error) throw result.error;
          showStatus(form, result.data.session
            ? 'Your account is ready. Redirecting...'
            : 'Account created. Check your email to confirm your address.');
          if (result.data.session) window.location.assign('my-dashboard.html');
        } else if (mode === 'login') {
          result = await supabase.auth.signInWithPassword({
            email: formData.get('email'),
            password: formData.get('password'),
          });
          if (result.error) throw result.error;
          showStatus(form, 'Signed in. Redirecting...');
          window.location.assign('my-dashboard.html');
        } else if (mode === 'forgot-password') {
          result = await supabase.auth.resetPasswordForEmail(formData.get('email'), {
            redirectTo: `${window.location.origin}/reset-password.html`,
          });
          if (result.error) throw result.error;
          showStatus(form, 'If an account exists for that email, a password reset link is on its way.');
        } else if (mode === 'reset-password') {
          result = await supabase.auth.updateUser({ password: formData.get('password') });
          if (result.error) throw result.error;
          showStatus(form, 'Password updated. You can now sign in.');
          await supabase.auth.signOut();
          window.setTimeout(() => window.location.assign('login.html'), 1200);
        }
      } catch (error) {
        showStatus(form, error.message || 'Something went wrong. Please try again.', true);
      } finally {
        submitButton.disabled = false;
      }
    });
  });
}