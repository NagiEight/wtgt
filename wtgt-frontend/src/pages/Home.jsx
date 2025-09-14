import React from 'react';

function Home() {
    const isDark = document.documentElement.classList.contains('dark');
    return (
        <main className={`w-full h-screen flex flex-col items-center justify-center duration-200 bg-grape`}>
            <h1 className="text-5xl font-bold mb-4 tracking-tight">Watch together</h1>
            <p className="text-lg mb-8 text-center max-w-xl">
                {isDark ? 'Watch together dark.' : 'light'}
            </p>
        </main>
    );
}

export default Home;
