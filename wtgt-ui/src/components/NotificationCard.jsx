import React from 'react';

const NotificationCard = ({ avt, content, timestamp }) => {
    return (
        <div className="flex items-start space-x-4 px-4 py-3 hover:bg-[var(--color-cyan-100)] transition rounded-md">
            {/* Avatar */}
            <img
                src={avt}
                alt="avatar"
                className="w-10 h-10 rounded-full object-cover"
            />

            {/* Content + Timestamp */}
            <div className="flex-1">
                <p className="text-sm text-[var(--color-black-500)]">{content}</p>
                <span className="text-xs text-gray-500">{timestamp}</span>
            </div>
        </div>
    );
};

export default NotificationCard;
