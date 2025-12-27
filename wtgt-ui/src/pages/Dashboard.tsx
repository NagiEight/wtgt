import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "../components/Layout";
import { CreateRoomModal } from "../components/CreateRoomModal";
import type { Room } from "../types";
import { useWebSocket } from "../api";

export const Dashboard = () => {
  const { hostRoom, joinRoom, leaveRoom } = useWebSocket();

  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [rooms, setRooms] = useState<Room[]>([
    {
      id: "room-1",
      name: "Room name goes here",
      type: "public",
      host: { id: "user-1", username: "Name of the host" },
      currentMedia: "Starset - VESSLES",
      isPaused: false,
      members: [],
      moderators: [],
      createdAt: new Date(),
      messages: [],
    },
    {
      id: "room-2",
      name: "Room name goes here",
      type: "private",
      host: { id: "user-2", username: "Name of the host" },
      currentMedia: "Umamusume - S01E01",
      isPaused: true,
      members: [],
      moderators: [],
      createdAt: new Date(),
      messages: [],
    },
  ]);

  const handleCreateRoom = () => setIsModalOpen(true);

  const handleCreateRoomSubmit = (roomData: {
    name: string;
    type: "public" | "private";
    mediaName: string;
  }) => {
    const newRoom: Room = {
      id: `room-${Date.now()}`,
      name: roomData.name,
      type: roomData.type,
      host: { id: "current-user", username: "You", avatar: "😊" },
      currentMedia: roomData.mediaName,
      isPaused: false,
      members: [],
      moderators: [],
      createdAt: new Date(),
      messages: [],
    };
    if (hostRoom) {
      hostRoom(roomData.mediaName, roomData.type, false);
      console.log("Room hosted successfully");
    }
    setRooms([newRoom, ...rooms]);
    setIsModalOpen(false);
  };

  const handleJoinRoom = (roomId: string) => {
    if (joinRoom) {
      joinRoom(roomId);
      navigate(`/room/${roomId}`);
      console.log("Joined room successfully");
    }
  };

  const handleGetRooms = () => {};

  return (
    <Layout title="Browsing Rooms">
      <CreateRoomModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreateRoom={handleCreateRoomSubmit}
      />

      <div className="space-y-6">
        <button
          onClick={handleCreateRoom}
          className="px-6 py-3 rounded-lg font-semibold transition-colors btn-primary"
        >
          + Create New Room
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rooms.map((room) => (
            <div
              key={room.id}
              onClick={() => handleJoinRoom(room.id)}
              className="p-6 rounded-xl border transition-all hover:shadow-lg cursor-pointer card"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold">{room.name}</h3>
                  <p className="text-sm text-content-secondary">
                    Hosted by {room.host.username} {room.host.avatar}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold text-white ${
                    room.type === "public" ? "bg-primary" : "bg-secondary"
                  }`}
                >
                  {room.type}
                </span>
              </div>

              <div className="mb-4 p-3 rounded-lg bg-hover bg-opacity-50 backdrop-blur">
                <p className="text-sm font-medium text-primary">
                  🎬 {room.currentMedia}
                </p>
                <p className="text-xs mt-1 text-content-secondary">
                  {room.isPaused ? "⏸ Paused" : "▶ Playing"}
                </p>
              </div>

              <button className="w-full py-2 rounded-lg font-semibold transition-colors btn-primary">
                Join Room
              </button>
            </div>
          ))}
        </div>

        {rooms.length === 0 && (
          <div className="text-center py-12">
            <p className="text-lg text-content-secondary">
              No rooms available. Create one to get started!
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
};
