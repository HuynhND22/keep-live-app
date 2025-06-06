const API_URL = '/api/urls';

export function startInterval(url: string) {
  fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url, action: 'start' }),
  })
    .then(response => response.json())
    .then(data => console.log(`Started interval for ${url} on server`))
    .catch(error => console.error('Error starting interval on server:', error));
}

export function stopInterval(url: string) {
  fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url, action: 'stop' }),
  })
    .then(response => response.json())
    .then(data => console.log(`Stopped interval for ${url} on server`))
    .catch(error => console.error('Error stopping interval on server:', error));
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

export function loadFromBackend(setUrls: (urls: string[]) => void) {
  fetch(API_URL)
    .then(response => response.json())
    .then(data => {
      setUrls(data.urls || []);
    })
    .catch(error => console.error('Error loading data from backend:', error));
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

export function updateCounter(url: string) {
  fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url, action: 'counter' }),
  })
    .then(response => response.json())
    .then(data => console.log(`Updated counter for ${url}`))
    .catch(error => console.error('Error updating counter:', error));
}
