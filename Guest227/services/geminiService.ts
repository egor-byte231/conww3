
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getTrackMood = async (title: string, artist: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Classify the musical mood of the track "${title}" by "${artist}". Return only one word like: Energetic, Calm, Sad, Melancholic, Happy, Epic, Romantic, Dark.`,
      config: {
        thinkingConfig: { thinkingBudget: 0 }
      }
    });
    return response.text?.trim() || "Unknown";
  } catch (error) {
    console.error("Gemini Mood Error:", error);
    return "Neutral";
  }
};

export const getTrackLyrics = async (title: string, artist: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Find or generate the lyrics for the song "${title}" by "${artist}". If it's an instrumental, describe the vibe. Return only the text of the lyrics.`,
      config: {
        thinkingConfig: { thinkingBudget: 0 }
      }
    });
    return response.text || "Lyrics not found for this frequency.";
  } catch (error) {
    return "Connection lost to the lyrics archive.";
  }
};

export const getSmartRecommendations = async (history: string[]): Promise<string[]> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Based on this listening history: ${history.join(", ")}. Suggest 5 musical genres or keywords that the user would enjoy now.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });
    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error("Gemini Rec Error:", error);
    return ["Lo-Fi", "Synthwave", "Jazz"];
  }
};
