const API_URL = '/api/urls';

export async function startInterval(url: string) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url, action: 'start' }),
  });
  if (!response.ok) {
    throw new Error(`Failed to start URL: ${response.statusText}`);
  }
  return response.json();
}

export async function stopInterval(url: string) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url, action: 'stop' }),
  });
  if (!response.ok) {
    throw new Error(`Failed to stop URL: ${response.statusText}`);
  }
  return response.json();
}

export async function deleteUrl(url: string) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url, action: 'delete' }),
  });
  if (!response.ok) {
    throw new Error(`Failed to delete URL: ${response.statusText}`);
  }
  return response.json();
}

export async function loadFromBackend() {
  const response = await fetch(API_URL);
  if (!response.ok) {
    throw new Error('Failed to load data from backend');
  }
  return response.json();
}

export async function addUrl(url: string) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url, action: 'add' }),
  });
  if (!response.ok) {
    throw new Error(`Failed to add URL: ${response.statusText}`);
  }
  return response.json();
}

export async function updateCounter(url: string) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url, action: 'counter' }),
  });
  if (!response.ok) {
    throw new Error(`Failed to update counter: ${response.statusText}`);
  }
  return response.json();
}

export function getIntervals() {
  return new Map(); 
}

export function getCounters() {
  return new Map(); 
}

export function getStartTimes() {
  return new Map(); 
}

export function saveToBackend(url: string, active: boolean) {
  if (active) {
    fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    })
      .then(response => response.json())
      .then(data => console.log(`Saved ${url} to backend as active`))
      .catch(error => console.error('Error saving to backend:', error));
  } else {
    fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url, action: 'stop' }),
    })
      .then(response => response.json())
      .then(data => console.log(`Saved ${url} to backend as inactive`))
      .catch(error => console.error('Error saving to backend:', error));
  }
}
