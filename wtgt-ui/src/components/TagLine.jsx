import React from 'react';

const TagLine = ({ tags = [], onTagClick }) => {
    return (
        <div className="flex overflow-x-auto space-x-2 py-2 px-1 scrollbar-hide">
            {tags.map((tag, index) => (
                <button
                    key={index}
                    onClick={() => onTagClick?.(tag)}
                    className="whitespace-nowrap bg-(--color-subtext) hover:bg-(--color-text) text-sm px-3 py-1 rounded-full transition-colors duration-200"
                >
                    {tag}
                </button>
            ))}
        </div>
    );
};

export default TagLine;
