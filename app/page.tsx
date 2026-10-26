"use client";
import React, { useRef, useState } from "react";
import Webcam from "react-webcam";

export default function Home() {
  const webcamRef = useRef<Webcam>(null);
  
  // Keep track of the currently playing music track to stop overlaps
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const captureAndAnalyse = async () => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (!imageSrc) return;
    
    setImgSrc(imageSrc);
    setLoading(true);
    setResult(null);

    // Stop any music track that might already be playing from a previous scan
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userImage: imageSrc }),
      });

      const data = await response.json();
      
      if (data.success) {
        setResult(`Match found: ${data.match}\n\n${data.reason}`);
        
        //  THE MAGIC CONNECTION: Play music if the backend sends an audio file back
        if (data.audioFile) {
          const audio = new Audio(data.audioFile);
          currentAudioRef.current = audio;
          audio.play().catch(e => console.log("Audio autoplay blocked by browser policy. Click screen first!"));
        }
      } else {
        setResult(`Error: ${data.error}`);
      }
    } catch (error) {
      setResult("Failed to reach backend server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-white p-6">
      <header className="text-center mb-8">
        <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
          Poisonous Plant Perception
        </h1>
        <p className="text-slate-400 mt-2">Scan objects to trigger immersive theme tracks live</p>
      </header>

      <main className="flex flex-col md:flex-row gap-8 items-center justify-center w-full max-w-4xl">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col items-center w-full max-w-sm sm:max-w-md">
          <div className="rounded-xl overflow-hidden bg-black aspect-video w-full">
            <Webcam audio={false} ref={webcamRef} screenshotFormat="image/jpeg" className="w-full h-full object-cover" />
          </div>
          <button
            onClick={captureAndAnalyse}
            disabled={loading}
            className="mt-6 w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:from-slate-800 disabled:to-slate-800 text-white font-bold py-3.5 px-6 rounded-xl transition-all shadow-lg active:scale-95 text-lg"
          >
            {loading ? "🎵 Shuffling Data..." : "🔮 Scan & Play Track"}
          </button>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl w-full max-w-sm min-h-[300px] flex flex-col justify-between">
          <div>
            <h2 className="text-xl font-bold border-b border-slate-800 pb-2 mb-4">Jukebox Playing</h2>
            {imgSrc && (
              <div className="mb-4 rounded-lg overflow-hidden border border-slate-700 max-h-32 bg-black flex justify-center">
                <img src={imgSrc} alt="Preview" className="h-full object-contain" />
              </div>
            )}
            
            {result ? (
              <p className="text-slate-300 whitespace-pre-line font-mono text-sm bg-slate-950 p-3 rounded-lg border border-slate-800 border-l-4 border-l-pink-500">{result}</p>
            ) : (
              <p className="text-slate-500 text-sm italic">Point an item at the webcam and launch the match system to cue music.</p>
            )}
          </div>
          <div className="mt-4 text-xs text-slate-500 text-center">Poisonous_Plant_Perception</div>
        </div>
      </main>
    </div>
  );
}
