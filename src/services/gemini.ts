/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Type } from "@google/genai";
import { SkillType, IELTSBand, Exercise, AssessmentResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const MODEL_NAME = "gemini-3-flash-preview";

export const geminiService = {
  /**
   * Generates a set of assessment questions for the user.
   */
  async generateAssessment(): Promise<Exercise[]> {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Generate 3 extremely simple IELTS-style assessment questions for an ABSOLUTE BEGINNER (Band 1.0-2.0). 
      Focus on basic Grammar, Vocabulary, and Sentence Formation. The focus English content must be in English. 
      The 'instructions' and 'title' must be in Bangla. 
      
      CRITICAL FORMATTING:
      - Use <div align="center"><h1><b>ANIK~MAMA</b></h1></div> at the top of instructions.
      - Use --- for dividers.
      - Use rich emojis (📚, ✍️, 🎯, 📊, ⚡).
      - Use <div align="right"><b>🎯 Overall Score: 1.0</b></div> at the bottom of instructions.
      - DO NOT USE ITALICS (* or _). Use markdown **bold** for headings.
      - Use tables or blockquotes for structured data.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              type: { type: Type.STRING, enum: Object.values(SkillType) },
              title: { type: Type.STRING },
              content: { type: Type.STRING },
              instructions: { type: Type.STRING },
              difficulty: { type: Type.NUMBER },
            },
            required: ["id", "type", "title", "content", "instructions", "difficulty"],
          },
        },
      },
    });

    try {
      return JSON.parse(response.text || "[]");
    } catch (e) {
      console.error("Failed to parse assessment", e);
      return [];
    }
  },

  /**
   * Generates a personalized exercise based on user level and interests.
   */
  async generateDailyExercise(
    skill: SkillType,
    level: IELTSBand,
    interests: string[]
  ): Promise<Exercise> {
    const interestStr = interests.join(", ");
    const prompt = `Generate an IELTS ${skill} exercise for an ABSOLUTE BEGINNER student at band ${level}. 
    The topic should be related to: ${interestStr || "general academic topics"}.
    The "content" field MUST be in English and use VERY simple vocabulary and short sentences.
    The "instructions" and "title" MUST be in Bangla. 
    
    VISUAL DASHBOARD STYLE:
    - Use <div align="center"><h1><b>ANIK~MAMA</b></h1></div> at the top of instructions.
    - Use --- for dividers.
    - Use rich emojis, Markdown tables, and Blockquotes (>).
    - Use <div align="right"><b>🎯 Current Band: ${level}</b></div> at the bottom of instructions.
    
    CRITICAL FORMATTING: DO NOT USE ITALICS (* or _). Use **bold** for titles and key focus words.`;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            type: { type: Type.STRING, enum: Object.values(SkillType) },
            title: { type: Type.STRING },
            content: { type: Type.STRING },
            instructions: { type: Type.STRING },
            difficulty: { type: Type.NUMBER },
          },
          required: ["id", "type", "title", "content", "instructions", "difficulty"],
        },
      },
    });

    try {
      return JSON.parse(response.text || "{}");
    } catch (e) {
      throw new Error("Failed to generate exercise");
    }
  },

  /**
   * Grades a user's response.
   */
  async gradeResponse(
    exercise: Exercise,
    userResponse: string
  ): Promise<AssessmentResult> {
    const prompt = `As a personal IELTS Coach for beginners, grade this ${exercise.type} response.
    Question (English): ${exercise.content}
    User Answer (English): ${userResponse}
    Original Difficulty: ${exercise.difficulty}
    
    CRITICAL: Provide the "feedback" and "corrections" in BANGLA. 
    - Use <div align="center"><b>ANIK~MAMA Progress Tracker</b></div> for the feedback title.
    - Use --- for dividers.
    - Use rich emojis, Markdown tables for performance stats, and Blockquotes.
    - Use <div align="right"><b>🎯 Estimated Band: [Score]</b></div> at the very bottom of feedback.
    - DO NOT USE ITALICS. Use **bold** for headings or emphasis.
    
    The "score" should be a band score (0-9).
    The "vocabularySuggestions" should be in English with brief Bangla meanings.`;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER },
            feedback: { type: Type.STRING },
            corrections: { type: Type.ARRAY, items: { type: Type.STRING } },
            vocabularySuggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ["score", "feedback"],
        },
      },
    });

    try {
      return JSON.parse(response.text || "{}");
    } catch (e) {
      throw new Error("Failed to grade response");
    }
  },
};
