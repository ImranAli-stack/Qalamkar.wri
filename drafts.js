const STORAGE_PREFIX = 'qalamkar-drafts:';

function storageKey(userId) {
  return `${STORAGE_PREFIX}${userId}`;
}

export function loadDrafts(userId) {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveDrafts(userId, drafts) {
  localStorage.setItem(storageKey(userId), JSON.stringify(drafts));
}

export function getDraft(userId, id) {
  return loadDrafts(userId).find((draft) => draft.id === id) || null;
}

export function createDraft(userId, { title, language, excerpt = '', body = '', coverDataUrl = '' } = {}) {
  const drafts = loadDrafts(userId);
  const now = new Date().toISOString();
  const draft = {
    id: crypto.randomUUID(),
    title: (title || 'Untitled').trim(),
    excerpt: (excerpt || '').trim(),
    language: language || 'en',
    body: body || '',
    coverDataUrl: coverDataUrl || '',
    status: 'draft',
    updatedAt: now,
    createdAt: now,
  };
  drafts.unshift(draft);
  saveDrafts(userId, drafts);
  return draft;
}

export function upsertDraft(userId, payload) {
  const drafts = loadDrafts(userId);
  const now = new Date().toISOString();
  const index = payload.id ? drafts.findIndex((draft) => draft.id === payload.id) : -1;

  if (index >= 0) {
    drafts[index] = {
      ...drafts[index],
      title: String(payload.title || drafts[index].title).trim() || 'Untitled',
      excerpt: String(payload.excerpt ?? drafts[index].excerpt ?? '').trim(),
      language: payload.language || drafts[index].language || 'en',
      body: payload.body ?? drafts[index].body ?? '',
      coverDataUrl: payload.coverDataUrl ?? drafts[index].coverDataUrl ?? '',
      status: payload.status || drafts[index].status || 'draft',
      updatedAt: now,
    };
    saveDrafts(userId, drafts);
    return drafts[index];
  }

  return createDraft(userId, payload);
}

export function getDraftStats(userId) {
  const drafts = loadDrafts(userId);
  const published = drafts.filter((d) => d.status === 'published').length;
  const draftCount = drafts.filter((d) => d.status !== 'published').length;
  return {
    stories: drafts.length,
    published,
    drafts: draftCount,
    followers: null,
  };
}
