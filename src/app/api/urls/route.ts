import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import cron from 'node-cron';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Thêm error handler cho pool
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

const CRON_INTERVAL_MINUTES = parseInt(process.env.CRON_INTERVAL_MINUTES || '5', 10);

// Thêm hàm delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Tạo bảng nếu chưa có
async function ensureTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS urls (
        id SERIAL PRIMARY KEY,
        url TEXT NOT NULL UNIQUE,
        active BOOLEAN DEFAULT FALSE,
        request_count INTEGER DEFAULT 0,
        total_requests INTEGER DEFAULT 0,
        start_time BIGINT
      )
    `);
  } catch (error) {
    console.error('Error ensuring table:', error);
    throw error;
  }
}

// CRUD
async function addUrl(url: string) {
  try {
    await ensureTable();
    await pool.query('INSERT INTO urls (url) VALUES ($1) ON CONFLICT (url) DO NOTHING', [url]);
  } catch (error) {
    console.error('Error adding URL:', error);
    throw error;
  }
}

async function startUrl(url: string) {
  try {
    await ensureTable();
    await pool.query(
      'UPDATE urls SET active = TRUE, start_time = $1, request_count = 0 WHERE url = $2',
      [Date.now(), url]
    );
  } catch (error) {
    console.error('Error starting URL:', error);
    throw error;
  }
}

async function stopUrl(url: string) {
  try {
    await ensureTable();
    console.log('Stopping URL:', url);
    const result = await pool.query(
      'UPDATE urls SET active = FALSE, request_count = 0, total_requests = 0, start_time = NULL WHERE url = $1 RETURNING *',
      [url]
    );
    console.log('Stop result:', result.rows);
    if (result.rowCount === 0) {
      throw new Error(`URL not found: ${url}`);
    }
    // Thêm delay sau khi stop
    await delay(1000);
  } catch (error) {
    console.error('Error stopping URL:', error);
    throw error;
  }
}

async function deleteUrl(url: string) {
  try {
    await ensureTable();
    // Kiểm tra xem URL có đang active không
    const result = await pool.query('SELECT active FROM urls WHERE url = $1', [url]);
    if (result.rows.length > 0 && result.rows[0].active) {
      // Nếu đang active thì stop trước
      await stopUrl(url);
    }
    // Thêm delay trước khi xóa
    await delay(1000);
    // Sau đó mới xóa
    const deleteResult = await pool.query('DELETE FROM urls WHERE url = $1 RETURNING *', [url]);
    console.log('Delete result:', deleteResult.rows);
  } catch (error) {
    console.error('Error deleting URL:', error);
    throw error;
  }
}

async function updateCounter(url: string) {
  try {
    await ensureTable();
    await pool.query('UPDATE urls SET request_count = request_count + 1 WHERE url = $1', [url]);
  } catch (error) {
    console.error('Error updating counter:', error);
    throw error;
  }
}

async function getAllUrls() {
  try {
    await ensureTable();
    const res = await pool.query('SELECT * FROM urls');
    return res.rows;
  } catch (error) {
    console.error('Error getting all URLs:', error);
    throw error;
  }
}

// Cron job
cron.schedule(`*/${CRON_INTERVAL_MINUTES} * * * *`, async () => {
  try {
    await ensureTable();
    const res = await pool.query('SELECT url FROM urls WHERE active = TRUE');
    
    // Xử lý tuần tự từng URL
    for (const row of res.rows) {
      const url = row.url;
      try {
        // Tăng tổng số lần gọi API
        await pool.query('UPDATE urls SET total_requests = total_requests + 1 WHERE url = $1', [url]);
        
        console.log(`[${new Date().toISOString()}] Sending request to ${url}`);
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });
        
        // Nếu response không ok (bao gồm cả 401), chỉ log lỗi nhưng không throw
        if (!response.ok) {
          console.error(`[${new Date().toISOString()}] HTTP error for ${url}: ${response.status}`);
          // Thêm delay 1 giây trước khi tiếp tục
          await delay(1000);
          continue; // Bỏ qua việc tăng request_count
        }
        
        // Chỉ tăng request_count khi gọi thành công
        await updateCounter(url);
        console.log(`[${new Date().toISOString()}] Successfully updated counter for ${url}`);
        
        // Thêm delay 1 giây giữa các request
        await delay(1000);
      } catch (error) {
        console.error(`[${new Date().toISOString()}] Error processing ${url}:`, error);
        // Thêm delay 1 giây khi có lỗi
        await delay(1000);
      }
    }
  } catch (err) {
    console.error('Cron job error:', err);
  }
});

export async function GET() {
  try {
    const urls = await getAllUrls();
    // Chuẩn hóa dữ liệu cho FE
    const data = {
      urls: urls.map((u: { url: string }) => u.url),
      counters: Object.fromEntries(urls.map((u: { url: string; request_count: number }) => [u.url, u.request_count])),
      totalRequests: Object.fromEntries(urls.map((u: { url: string; total_requests: number }) => [u.url, u.total_requests])),
      startTimes: Object.fromEntries(urls.map((u: { url: string; start_time: number | null }) => [u.url, u.start_time])),
      active: Object.fromEntries(urls.map((u: { url: string; active: boolean }) => [u.url, u.active]))
    };
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in GET request:', error);
    return NextResponse.error();
  }
}

export async function POST(req: Request) {
  try {
    const { url, action } = await req.json();
    console.log('Received POST request:', { url, action });
    
    if (!url) {
      console.error('Missing URL in request');
      return NextResponse.json({ message: 'Missing url' }, { status: 400 });
    }

    if (action === 'add') {
      await addUrl(url);
      return NextResponse.json({ message: `URL ${url} added` });
    } else if (action === 'start') {
      await startUrl(url);
      return NextResponse.json({ message: `URL ${url} started` });
    } else if (action === 'stop') {
      await stopUrl(url);
      return NextResponse.json({ message: `URL ${url} stopped` });
    } else if (action === 'delete') {
      await deleteUrl(url);
      return NextResponse.json({ message: `URL ${url} deleted` });
    } else if (action === 'counter') {
      await updateCounter(url);
      return NextResponse.json({ message: `Counter for URL ${url} updated` });
    } else {
      // Mặc định: add và start
      await addUrl(url);
      await startUrl(url);
      return NextResponse.json({ message: `URL ${url} added or started` });
    }
  } catch (error) {
    console.error('Error in POST request:', error);
    return NextResponse.json(
      { message: 'Internal server error', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
