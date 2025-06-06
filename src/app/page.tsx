'use client';

import React, { useState, useEffect } from 'react';
import {
  loadFromBackend,
  startInterval,
  stopInterval,
  deleteUrl,
  addUrl as addUrlApi
} from '@/lib/intervalManager';

export default function Home() {
  const [urls, setUrls] = useState<string[]>([]);
  const [counters, setCounters] = useState<Map<string, number>>(new Map());
  const [totalRequests, setTotalRequests] = useState<Map<string, number>>(new Map());
  const [startTimes, setStartTimes] = useState<Map<string, number>>(new Map());
  const [active, setActive] = useState<Map<string, boolean>>(new Map());
  const [newUrl, setNewUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await loadFromBackend();
      setUrls(data.urls || []);
      setCounters(new Map(Object.entries(data.counters || {})));
      setTotalRequests(new Map(Object.entries(data.totalRequests || {})));
      setStartTimes(new Map(Object.entries(data.startTimes || {})));
      setActive(new Map(Object.entries(data.active || {})));
    } catch (e) {
      // Có thể show toast lỗi ở đây
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const addUrl = async () => {
    if (newUrl && !urls.includes(newUrl)) {
      setLoading(true);
      await addUrlApi(newUrl);
      await startInterval(newUrl);
      await fetchData();
      setNewUrl('');
      setLoading(false);
    }
  };

  const handleStart = async (url: string) => {
    setLoading(true);
    try {
      await startInterval(url);
      await fetchData();
    } catch (error) {
      console.error('Error starting URL:', error);
      // Có thể thêm toast thông báo lỗi ở đây
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async (url: string) => {
    setLoading(true);
    try {
      await stopInterval(url);
      await fetchData();
    } catch (error) {
      console.error('Error stopping URL:', error);
      // Có thể thêm toast thông báo lỗi ở đây
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (url: string) => {
    setLoading(true);
    try {
      await deleteUrl(url);
      await fetchData();
    } catch (error) {
      console.error('Error deleting URL:', error);
      // Có thể thêm toast thông báo lỗi ở đây
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timestamp: number) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <h1 className="text-3xl font-bold mb-6">Keep Alive App</h1>
      <div className="w-full max-w-4xl bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Add New URL</h2>
        <div className="flex gap-4">
          <input
            type="text"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            placeholder="Enter URL"
            className="flex-1 p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />
          <button
            onClick={addUrl}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-400"
            disabled={loading || !newUrl}
          >
            Add & Start
          </button>
        </div>
      </div>
      <div className="w-full max-w-4xl bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">URL Management</h2>
        {loading ? (
          <div className="text-center text-blue-500 font-semibold">Loading...</div>
        ) : urls.length === 0 ? (
          <p className="text-gray-500">No URLs added yet.</p>
        ) : (
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr>
                <th className="border p-2 text-left">URL</th>
                <th className="border p-2 text-left">Status</th>
                <th className="border p-2 text-left">Successful Requests</th>
                <th className="border p-2 text-left">Total Requests</th>
                <th className="border p-2 text-left">Start Time</th>
                <th className="border p-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {urls.map((url) => {
                const isRunning = active.get(url);
                const startTime = startTimes.get(url);
                const runCount = counters.get(url) || 0;
                const totalCount = totalRequests.get(url) || 0;
                return (
                  <tr key={url} className="border-b">
                    <td className="p-2 border">{url}</td>
                    <td className="p-2 border">{isRunning ? 'Running' : 'Stopped'}</td>
                    <td className="p-2 border">{runCount}</td>
                    <td className="p-2 border">{totalCount}</td>
                    <td className="p-2 border">{formatTime(startTime ?? 0)}</td>
                    <td className="p-2 border flex gap-2">
                      <button
                        onClick={() => handleStart(url)}
                        disabled={isRunning || loading}
                        className={`px-2 py-1 rounded-md text-white ${isRunning || loading ? 'bg-gray-400' : 'bg-green-500 hover:bg-green-600'}`}
                      >
                        Start
                      </button>
                      <button
                        onClick={() => handleStop(url)}
                        disabled={!isRunning || loading}
                        className={`px-2 py-1 rounded-md text-white ${!isRunning || loading ? 'bg-gray-400' : 'bg-red-500 hover:bg-red-600'}`}
                      >
                        Stop
                      </button>
                      <button
                        onClick={() => handleDelete(url)}
                        disabled={loading}
                        className="px-2 py-1 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 disabled:bg-gray-400"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
