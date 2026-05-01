'use client';

export default function HeroVideo() {
  return (
    <div className="relative mx-auto max-w-md">
      <video 
        className="w-full h-auto rounded-lg shadow-2xl" 
        controls 
        poster="/images/vsl-poster.jpg"
        preload="metadata"
      >
        <source src="/videos/ottoserv-vsl-60s.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="bg-blue-600 rounded-full p-4 opacity-90 hover:opacity-100 transition-opacity">
          <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z"/>
          </svg>
        </div>
      </div>
    </div>
  );
}