import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import cron from 'node-cron';
import sqlite3 from 'sqlite3';

const DATA_FILE = path.join(process.cwd(), 'data.json');
const db = new sqlite3.Database('./urls.db', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    db.run(`CREATE TABLE IF NOT EXISTS urls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      url TEXT NOT NULL UNIQUE,
      active INTEGER DEFAULT 0,
      request_count INTEGER DEFAULT 0,
      start_time INTEGER
    )`, (err) => {
      if (err) {
        console.error('Error creating table:', err.message);
      }
    });
  }
});

// Load data from file
function loadData() {
  if (fs.existsSync(DATA_FILE)) {
    const rawData = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(rawData);
  }
  return { urls: [], counters: {}, startTimes: {}, active: {} };
}

// Save data to file
function saveData(data: any) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// Add URL to SQLite
function addUrlToDatabase(url: string) {
  db.run('INSERT INTO urls (url) VALUES (?)', url, function(err) {
    if (err) {
      return console.error('Error adding URL to database:', err.message);
    }
    console.log(`Added ${url} to database`);
  });
}

// Start URL in SQLite
function startUrlInDatabase(url: string) {
  const startTime = Date.now();
  db.run('UPDATE urls SET active = 1, start_time = ?, request_count = 0 WHERE url = ?', [startTime, url], function(err) {
    if (err) {
      return console.error('Error starting URL in database:', err.message);
    }
    console.log(`Started ${url} in database`);
  });
}

// Stop URL in SQLite
function stopUrlInDatabase(url: string) {
  db.run('UPDATE urls SET active = 0, request_count = 0, start_time = NULL WHERE url = ?', url, function(err) {
    if (err) {
      return console.error('Error stopping URL in database:', err.message);
    }
    console.log(`Stopped ${url} in database`);
  });
}

// Delete URL from SQLite
function deleteUrlFromDatabase(url: string) {
  db.run('DELETE FROM urls WHERE url = ?', url, function(err) {
    if (err) {
      return console.error('Error deleting URL from database:', err.message);
    }
    console.log(`Deleted ${url} from database`);
  });
}

// Thiết lập cron job để gửi request định kỳ
cron.schedule('*/5 * * * *', () => {
  db.all('SELECT url FROM urls WHERE active = 1', (err, rows: { url: string }[]) => {
    if (err) {
      console.error('Error fetching active URLs from database:', err.message);
    } else {
      rows.forEach((row) => {
        const url = row.url;
        fetch(url)
          .then(response => response.text())
          .then(() => {
            db.run('UPDATE urls SET request_count = request_count + 1 WHERE url = ?', url, function(err) {
              if (err) {
                console.error('Error updating request count:', err.message);
              }
            });
          })
          .catch(error => console.error(`Error fetching ${url}:`, error));
      });
    }
  });
});

export async function GET() {
  try {
    const data = loadData();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in GET request:', error);
    return NextResponse.error();
  }
}

export async function POST(req: Request) {
  try {
    const { url, action } = await req.json();
    const data = loadData();

    if (action === 'add') {
      addUrlToDatabase(url);
      if (!data.urls.includes(url)) {
        data.urls.push(url);
        data.counters[url] = 0;
        data.startTimes[url] = null;
        data.active[url] = false;
        saveData(data);
      }
      return NextResponse.json({ message: `URL ${url} added`, data });
    } else if (action === 'start') {
      startUrlInDatabase(url);
      if (!data.urls.includes(url)) {
        data.urls.push(url);
        data.counters[url] = 0;
        data.startTimes[url] = Date.now();
      }
      data.active[url] = true;
      saveData(data);
      return NextResponse.json({ message: `URL ${url} started`, data });
    } else if (action === 'stop') {
      stopUrlInDatabase(url);
      if (data.urls.includes(url)) {
        data.active[url] = false;
        data.counters[url] = 0;
        data.startTimes[url] = null;
        saveData(data);
        return NextResponse.json({ message: `URL ${url} stopped`, data });
      } else {
        return NextResponse.json({ message: `URL ${url} not found` }, { status: 404 });
      }
    } else if (action === 'delete') {
      deleteUrlFromDatabase(url);
      data.urls = data.urls.filter((u: string) => u !== url);
      delete data.counters[url];
      delete data.startTimes[url];
      delete data.active[url];
      saveData(data);
      return NextResponse.json({ message: `URL ${url} deleted`, data });
    } else if (action === 'counter') {
      if (data.urls.includes(url)) {
        data.counters[url] = (data.counters[url] || 0) + 1;
        saveData(data);
        return NextResponse.json({ message: `Counter for URL ${url} updated`, data });
      } else {
        return NextResponse.json({ message: `URL ${url} not found` }, { status: 404 });
      }
    } else {
      if (!data.urls.includes(url)) {
        data.urls.push(url);
        data.counters[url] = 0;
        data.startTimes[url] = Date.now();
        data.active[url] = true;
      } else {
        data.active[url] = true;
        if (!data.startTimes[url]) {
          data.startTimes[url] = Date.now();
        }
      }
      saveData(data);
      return NextResponse.json({ 
        message: `URL ${url} added or started`, 
        data: {
          ...data,
          startTimes: {
            [url]: data.startTimes[url]
          }
        } 
      });
    }
  } catch (error) {
    console.error('Error in POST request:', error);
    return NextResponse.error();
  }
}
