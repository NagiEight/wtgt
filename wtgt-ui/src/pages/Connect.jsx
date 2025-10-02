import { useNavigate } from 'react-router-dom';

const Connect = () => {
    const navigate = useNavigate();

    return (
        <div className="max-w-4xl mx-auto px-4 py-16 text-center text-(--color-text) bg-(--color-bg) rounded-sm">
            <h1 className="text-4xl font-bold mb-6">Welcome to WTGT</h1>
            <p className="text-lg text-(--color-subtext) mb-10">
                Watch anime together with friends in real-time. Choose how you want to start:
            </p>

            <div className="flex flex-col sm:flex-row justify-center gap-4">
                <button
                    onClick={() => navigate('/join')}
                    className="px-6 py-3 rounded-md font-semibold bg-(--color-bg) border-3 border-(--color-subtext) text-(--color-text) transition-all duration-200 hover:bg-(--color-cyan) hover:text-(--color-bg) hover:border-(--color-bg) focus:outline-none focus:border-(--color-cyan)"
                >
                    Join Room
                </button>
                <button
                    onClick={() => navigate('/host')}
                    className="px-6 py-3 rounded-md font-semibold bg-(--color-bg) border-3 border-(--color-subtext) text-(--color-text) transition-all duration-200 hover:bg-(--color-magenta) hover:text-(--color-bg) hover:border-(--color-bg) focus:outline-none focus:border-(--color-magenta)"
                >
                    Host Room
                </button>
                <button
                    onClick={() => navigate('/library')}
                    className="px-6 py-3 rounded-sm font-semibold bg-(--color-bg) border-3 border-(--color-subtext) text-(--color-text) transition-all duration-200 hover:bg-(--color-yellow) hover:text-(--color-bg) hover:border-(--color-bg) hover:rounded-sm focus:outline-none focus:border-(--color-yellow)"
                >
                    Browse Library
                </button>
            </div>
        </div>
    );
};

export default Connect;
