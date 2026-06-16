const API_CONFIG_KEY = 'mmwApiUrl';
const DEFAULT_API_URL = 'https://script.google.com/macros/s/AKfycbx_xHAyop1J6QbSez84NWqZ5Ld1xEmCyZW0HJqFLijVGzjk6URMtbs_OPujQ4QXXPk/exec';

function getApiUrl() {
  return localStorage.getItem(API_CONFIG_KEY) || DEFAULT_API_URL;
}

function setApiUrl(url) {
  localStorage.setItem(API_CONFIG_KEY, url.trim());
}

function getAuthToken() {
  return localStorage.getItem('mmwToken') || '';
}

function showLoader() {
  document.getElementById('loader')?.classList.remove('hidden');
}

function hideLoader() {
  document.getElementById('loader')?.classList.add('hidden');
}

async function parseApiResponse(response) {
  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};
  if (!response.ok || payload.success === false) {
    if (payload.message && payload.message.toLowerCase().includes('login required')) {
      localStorage.removeItem('mmwAuth');
      localStorage.removeItem('mmwToken');
      localStorage.removeItem('mmwUser');
      window.location.hash = 'login';
    }
    throw new Error(payload.message || `Request failed with status ${response.status}`);
  }
  return payload.data ?? payload;
}

async function apiGet(action, params = {}) {
  const apiUrl = getApiUrl();
  if (!apiUrl) {
    if (action.indexOf('get') === 0) {
      const sheetName = action.replace('get', '');
      return JSON.parse(localStorage.getItem(`mmwLocal_${sheetName}`) || '[]');
    }
    return [];
  }

  const url = new URL(apiUrl);
  url.searchParams.set('action', action);
  const token = getAuthToken();
  if (token) {
    url.searchParams.set('token', token);
  }
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, value);
    }
  });

  showLoader();
  try {
    const response = await fetch(url.toString(), { method: 'GET' });
    return await parseApiResponse(response);
  } finally {
    hideLoader();
  }
}

async function apiPost(action, data = {}) {
  const apiUrl = getApiUrl();
  if (!apiUrl) {
    if (action === 'login') {
      throw new Error('API URL is required for login.');
    }

    const match = action.match(/^(save|delete)(.+)$/);
    if (!match) {
      return { local: true };
    }

    const [, operation, sheetName] = match;
    const localKey = `mmwLocal_${sheetName}`;
    const localData = JSON.parse(localStorage.getItem(localKey) || '[]');

    if (operation === 'save') {
      const idField = Object.keys(data).find((key) => key.endsWith('ID') || key.endsWith('Code')) || Object.keys(data)[0];
      const existingIndex = localData.findIndex((row) => String(row[idField]) === String(data[idField]));
      if (existingIndex >= 0) {
        localData[existingIndex] = data;
      } else {
        localData.push(data);
      }
    }

    if (operation === 'delete') {
      const nextData = localData.filter((row) => String(row[data.idField]) !== String(data.idValue));
      localStorage.setItem(localKey, JSON.stringify(nextData));
      return { local: true };
    }

    localStorage.setItem(localKey, JSON.stringify(localData));
    return { local: true };
  }

  showLoader();
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      body: JSON.stringify({ action, data, token: getAuthToken() }),
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    });
    return await parseApiResponse(response);
  } finally {
    hideLoader();
  }
}
