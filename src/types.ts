/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type IELTSBand = number; // 0 to 9, usually in 0.5 increments

export enum SkillType {
  READING = 'Reading',
  WRITING = 'Writing',
  SPEAKING = 'Speaking',
  LISTENING = 'Listening',
  VOCABULARY = 'Vocabulary',
  GRAMMAR = 'Grammar',
  SENTENCE_FORMATION = 'Sentence Formation',
}

export interface Exercise {
  id: string;
  type: SkillType;
  title: string;
  content: string; // The prompt or passage
  instructions: string;
  difficulty: IELTSBand;
  context?: string; // Interest-based context
  audioUrl?: string; // For listening
}

export interface AssessmentResult {
  score: IELTSBand;
  feedback: string;
  corrections?: string[];
  vocabularySuggestions?: string[];
}

export interface UserState {
  hasOnboarded: boolean;
  currentBand: IELTSBand;
  interests: string[];
  completedTasks: string[]; // List of exercise IDs
  dailyProgress: {
    [date: string]: SkillType[]; // Skills practiced today
  };
}

export interface DailyLoopTask {
  skill: SkillType;
  completed: boolean;
  exercise?: Exercise;
}
