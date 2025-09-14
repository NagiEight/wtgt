// Home.jsx
import React from 'react';

const Home = () => {
    return (
        <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center px-4">
            <h1 className="text-4xl font-bold text-gray-800 mb-4">
                Welcome to My React App
            </h1>
            <p className="text-lg text-gray-600 text-center max-w-xl">
                This is the Home page. Use the navigation bar above to explore other sections like About and Contact.
            </p>
        </div>
    );
};

export default Home;
