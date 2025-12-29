
import { GoogleGenAI } from "@google/genai";
import { TrackStat } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const chatWithAI = async (
  message: string, 
  history: {role: 'user' | 'model', parts: {text: string}[]}[],
  stats: TrackStat[]
) => {
  try {
    const statsContext = stats.length > 0 
      ? `Статистика користувача: ${stats.slice(0, 5).map(s => `${s.title} (${s.count} разів)`).join(', ')}.`
      : "Користувач ще не слухав музику.";

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [...history, { role: 'user', parts: [{ text: message }] }],
      config: {
        systemInstruction: `Ти — NovaToneX, футуристичний музичний асистент. ТИ ПОВИНЕН ВІДПОВІДАТИ ВИКЛЮЧНО УКРАЇНСЬКОЮ МОВОЮ. 
        Тобі доступна статистика користувача: ${statsContext}. 
        Використовуй ці дані, щоб давати персоналізовані поради. Будь лаконічним, використовуй емодзі. 
        Інтерфейс додатка англійською, але ти — голос української душі.`,
        thinkingConfig: { thinkingBudget: 0 }
      }
    });
    return response.text || "Я зараз на іншій частоті. Спробуй ще раз пізніше?";
  } catch (error) {
    console.error("Chat Error:", error);
    return "Зв'язок з нейромережею перервано. Перевір інтернет.";
  }
};