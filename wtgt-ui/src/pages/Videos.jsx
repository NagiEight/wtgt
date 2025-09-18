import { useNavigate } from 'react-router-dom';

const VideoBrowser = () => {
    const navigate = useNavigate();

    return (
        <div className="max-w-4xl mx-auto px-4 py-16 text-center text-[var(--color-black-500)]">
            <h1 className="text-4xl font-bold mb-6">Welcome to WTGT</h1>
            <p className="text-lg text-gray-600 mb-10">
                Watch anime together with friends in real-time. Choose how you want to start:
            </p>

            <div className="flex flex-col sm:flex-row justify-center gap-4">
                <button
                    onClick={() => navigate('/join')}
                    className="px-6 py-3 rounded-md font-semibold text-white transition-all duration-200 ease-out shadow hover:shadow-lg hover:scale-105"
                    style={{ backgroundColor: 'var(--color-cyan-500)' }}
                >
                    Join Room
                </button>
                <button
                    onClick={() => navigate('/host')}
                    className="px-6 py-3 rounded-md font-semibold text-white transition-all duration-200 ease-out shadow hover:shadow-lg hover:scale-105"
                    style={{ backgroundColor: 'var(--color-magenta-500)' }}
                >
                    Host Room
                </button>
                <button
                    onClick={() => navigate('/library')}
                    className="px-6 py-3 rounded-md font-semibold text-black transition-all duration-200 ease-out shadow hover:shadow-lg hover:scale-105"
                    style={{ backgroundColor: 'var(--color-yellow-500)' }}
                >
                    Browse Library
                </button>
            </div>
        </div>
    );
};

export default VideoBrowser;
