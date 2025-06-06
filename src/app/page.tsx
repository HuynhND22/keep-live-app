'use client';

import React, { useState, useEffect } from 'react';
import { loadFromBackend, startInterval, stopInterval } from '@/lib/intervalManager';

export default function Home() {
  const [urls, setUrls] = useState<string[]>([]);
  const [counters, setCounters] = useState<Map<string, number>>(new Map());
  const [startTimes, setStartTimes] = useState<Map<string, number>>(new Map());
  const [active, setActive] = useState<Map<string, boolean>>(new Map());
  const [newUrl, setNewUrl] = useState('');

  const fetchData = () => {
    loadFromBackend((data: any) => {
      setUrls(data.urls || []);
      setCounters(new Map(Object.entries(data.counters || {})));
      setStartTimes(new Map(Object.entries(data.startTimes || {})));
      setActive(new Map(Object.entries(data.active || {})));
    });
  };

  useEffect(() => {
    fetchData();
  }, []);

  const addUrl = () => {
    if (newUrl && !urls.includes(newUrl)) {
      startInterval(newUrl);
      fetchData();
      setNewUrl('');
    }
  };

  const handleStart = (url: string) => {
    startInterval(url);
    fetchData();
  };

  const handleStop = (url: string) => {
    stopInterval(url);
    fetchData();
  };

  const handleDelete = (url: string) => {
    stopInterval(url);
    fetchData();
  };

  const formatTime = (timestamp: number) => {
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
          />
          <button
            onClick={addUrl}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            Add & Start
          </button>
        </div>
      </div>
      <div className="w-full max-w-4xl bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">URL Management</h2>
        {urls.length === 0 ? (
          <p className="text-gray-500">No URLs added yet.</p>
        ) : (
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr>
                <th className="border p-2 text-left">URL</th>
                <th className="border p-2 text-left">Status</th>
                <th className="border p-2 text-left">Run Count</th>
                <th className="border p-2 text-left">Start Time</th>
                <th className="border p-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {urls.map((url) => {
                const isRunning = active.get(url);
                const startTime = startTimes.get(url);
                const runCount = counters.get(url) || 0;
                return (
                  <tr key={url} className="border-b">
                    <td className="p-2 border">{url}</td>
                    <td className="p-2 border">{isRunning ? 'Running' : 'Stopped'}</td>
                    <td className="p-2 border">{runCount}</td>
                    <td className="p-2 border">{startTime ? formatTime(startTime) : 'N/A'}</td>
                    <td className="p-2 border flex gap-2">
                      <button
                        onClick={() => handleStart(url)}
                        disabled={isRunning}
                        className={`px-2 py-1 rounded-md text-white ${isRunning ? 'bg-gray-400' : 'bg-green-500 hover:bg-green-600'}`}
                      >
                        Start
                      </button>
                      <button
                        onClick={() => handleStop(url)}
                        disabled={!isRunning}
                        className={`px-2 py-1 rounded-md text-white ${!isRunning ? 'bg-gray-400' : 'bg-red-500 hover:bg-red-600'}`}
                      >
                        Stop
                      </button>
                      <button
                        onClick={() => handleDelete(url)}
                        className="px-2 py-1 bg-yellow-500 text-white rounded-md hover:bg-yellow-600"
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
