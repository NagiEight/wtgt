import React from 'react';
import { Link } from 'react-router-dom';
import bannerImage from '../assets/banner.png'; // Adjust path if needed

const Banner = () => {
    return (
        <section
            className="w-full bg-cover bg-center text-[var(--color-black-500)] py-20"
            style={{ backgroundImage: `url(${bannerImage})` }}
        >
            <div className="max-w-4xl mx-auto px-6 text-center bg-white/70 backdrop-blur-sm rounded-lg py-10">
                <h1 className="text-4xl font-bold font-[var(--font-display)] mb-4">
                    Welcome to WTGT
                </h1>
                <p className="text-lg leading-relaxed mb-6">
                    Watch anime together with friends in real-time. Share the experience, chat, and enjoy your favorite shows no matter where you are.
                </p>

                {/* Action Buttons */}
                <div className="flex justify-center space-x-4">
                    <Link
                        to="/host"
                        className="px-6 py-2 bg-[var(--color-magenta-500)] text-white rounded-md font-semibold hover:bg-[var(--color-magenta-600)] transition"
                    >
                        Host
                    </Link>
                    <Link
                        to="/join"
                        className="px-6 py-2 bg-[var(--color-cyan-500)] text-white rounded-md font-semibold hover:bg-[var(--color-cyan-600)] transition"
                    >
                        Join
                    </Link>
                    <Link
                        to="/library"
                        className="px-6 py-2 bg-[var(--color-yellow-500)] text-white rounded-md font-semibold hover:bg-[var(--color-yellow-600)] transition"
                    >
                        Library
                    </Link>
                </div>
            </div>
        </section>
    );
};

export default Banner;
