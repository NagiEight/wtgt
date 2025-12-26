import { useState } from 'react'
import { Layout } from '../components/Layout'
import type { ServerLog } from '../types'

export const AdminPanel = () => {
  const [logs] = useState<ServerLog[]>([
    {
      id: '1',
      timestamp: new Date(Date.now() - 3600000),
      event: 'user_connected',
      userId: 'user-1',
      data: { username: 'Alice' },
    },
    {
      id: '2',
      timestamp: new Date(Date.now() - 1800000),
      event: 'room_created',
      roomId: 'room-1',
      data: { name: 'Movie Night' },
    },
    {
      id: '3',
      timestamp: new Date(Date.now() - 900000),
      event: 'user_joined_room',
      userId: 'user-2',
      roomId: 'room-1',
    },
  ])

  const stats = {
    activeRooms: 5,
    activeUsers: 23,
    totalMessages: 456,
    uptime: 2592000, // 30 days in seconds
  }

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    return `${days}d ${hours}h`
  }

  return (
    <Layout title="Admin Panel">
      <div className="space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            {
              label: 'Active Rooms',
              value: stats.activeRooms,
              icon: '🎬',
            },
            {
              label: 'Active Users',
              value: stats.activeUsers,
              icon: '👥',
            },
            {
              label: 'Total Messages',
              value: stats.totalMessages,
              icon: '💬',
            },
            {
              label: 'Uptime',
              value: formatUptime(stats.uptime),
              icon: '⏱️',
            },
          ].map((stat, idx) => (
            <div
              key={idx}
              className="p-6 rounded-xl border border-default card"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-content-secondary">
                    {stat.label}
                  </p>
                  <p className="text-3xl font-bold mt-2">{stat.value}</p>
                </div>
                <span className="text-4xl">{stat.icon}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Logs Section */}
        <div className="p-6 rounded-xl border border-default card">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Recent Activity Logs</h2>
            <button className="px-4 py-2 rounded-lg font-semibold transition-colors btn-primary">
              Download Logs
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-default">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold">
                    Timestamp
                  </th>
                  <th className="text-left py-3 px-4 font-semibold">Event</th>
                  <th className="text-left py-3 px-4 font-semibold">User ID</th>
                  <th className="text-left py-3 px-4 font-semibold">Room ID</th>
                  <th className="text-left py-3 px-4 font-semibold">Data</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    className="border-b border-default"
                  >
                    <td className="py-3 px-4">
                      {log.timestamp.toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-secondary text-white">
                        {log.event}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-xs">
                      {log.userId || '-'}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs">
                      {log.roomId || '-'}
                    </td>
                    <td className="py-3 px-4 text-xs">
                      {log.data ? JSON.stringify(log.data) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="p-6 rounded-xl border-2 border-error card">
          <h2 className="text-2xl font-bold mb-4">Danger Zone</h2>
          <div className="space-y-3">
            <button className="w-full py-2 rounded-lg font-semibold transition-colors bg-error text-white hover:opacity-90">
              Clear Server Logs
            </button>
            <button className="w-full py-2 rounded-lg font-semibold transition-colors btn-secondary">
              Shutdown Server
            </button>
          </div>
        </div>
      </div>
    </Layout>
  )
}
