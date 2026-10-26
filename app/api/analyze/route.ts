import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import path from "path";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// Your unified static database with custom music mapping
const musicDatabase: Record<string, { title: string; description: string; audioFile: string }> = {
  "img1.jpg": {
    title: "Upbeat Energy Track",
    description: "Playing energetic electronic music for high focus.",
    audioFile: "/correctDing.mp3" // Refers to public/track1.mp3
  },
  "img2.jpg": {
    title: "Lo-Fi Beats",
    description: "Playing chill, relaxing lo-fi beats for studying.",
    audioFile: "/correctDing.mp3"
  },
  "img3.jpg": {
    title: "Acoustic Melody",
    description: "Playing a bright acoustic guitar melody.",
    audioFile: "/badTrack.mp3"
  },
  "img4.jpg": {
    title: "Synthwave Anthem",
    description: "Playing an 80s retro synthwave anthem.",
    audioFile: "/correctDing.mp3"
  },
  "img5.jpg": {
    title: "Classical Piano Solo",
    description: "Playing a soothing classical piano arrangement.",
    audioFile: "/correctDing.mp3"
  }
};

function getLocalImageBase64(filename: string): string | null {
  try {
    const filePath = path.join(process.cwd(), "public", filename);
    if (!fs.existsSync(filePath)) return null;
    const fileBuffer = fs.readFileSync(filePath);
    return fileBuffer.toString("base64");
  } catch (e) {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userImage } = body;

    if (!userImage) return NextResponse.json({ success: false, error: "No image received" });
    const cleanUserImageBase64 = userImage.replace(/^data:image\/\w+;base64,/, "");

    const filenames = Object.keys(musicDatabase);
    const inlineDataParts: any[] = [];

    inlineDataParts.push({
      inlineData: { mimeType: "image/jpeg", data: cleanUserImageBase64 }
    });

    for (const file of filenames) {
      const base64Data = getLocalImageBase64(file);
      if (base64Data) {
        inlineDataParts.push({
          inlineData: { mimeType: "image/jpeg", data: base64Data }
        });
      }
    }

    if (inlineDataParts.length <= 1) {
      return NextResponse.json({ success: false, error: "Reference images missing from public folder." });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `You are an exact object-matching machine.
              Compare the first image (User Live Image) against the remaining reference images.
              Determine which reference image represents an exact visual match.
               Respond ONLY with a raw JSON object matching this schema. Do not write markdown or backticks:
              {
                "match": "Name of the winning file exactly (e.g., img1.jpg) OR 'Data Not Found'",
                "reason": "One short sentence explaining the physical match similarity."
              }`
            },
            ...inlineDataParts
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            match: { type: "STRING", description: "Must be a local filename (e.g. img1.jpg) or exactly 'Data Not Found'." },
            reason: { type: "STRING" }
          },
          required: ["match", "reason"]
        }
      }
    });

    const aiData = JSON.parse(response.text || "{}");
    const winningFile = aiData.match;

    if (winningFile && winningFile !== "Data Not Found" && musicDatabase[winningFile]) {
      const matchedData = musicDatabase[winningFile];
      return NextResponse.json({
        success: true,
        match: matchedData.title,
        reason: matchedData.description,
        audioFile: matchedData.audioFile // 🚀 PASSING AUDIO TRACK PATH TO FRONTEND
      });
    }

    return NextResponse.json({
      success: true,
      match: "Data Not Found",
      reason: "This object does not match any current records. No music will be played."
    });

  } catch (error: any) {
    console.error("Audio Matcher Crash:", error);
    return NextResponse.json({ success: false, error: "AI pipeline processing failure." });
  }
}
