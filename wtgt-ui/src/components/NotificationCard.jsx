import React from 'react';

const NotificationCard = ({ avt, content, timestamp }) => {
    return (
        <div className="flex items-start space-x-4 px-4 py-3 hover:bg-(--color-magenta) transition rounded-md">
            {/* Avatar */}
            <img
                src={avt}
                alt="avatar"
                className="w-10 h-10 rounded-full object-cover"
            />

            {/* Content + Timestamp */}
            <div className="flex-1">
                <p className="text-sm text-(--color-text)">{content}</p>
                <span className="text-xs text-(--color-subtext)">{timestamp}</span>
            </div>
        </div>
    );
};

export default NotificationCard;
