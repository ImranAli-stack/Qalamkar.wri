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

export function createDraft(userId, { title, language }) {
  const drafts = loadDrafts(userId);
  const draft = {
    id: crypto.randomUUID(),
    title: title.trim(),
    language: language || 'en',
    body: '',
    status: 'draft',
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
  drafts.unshift(draft);
  saveDrafts(userId, drafts);
  return draft;
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
