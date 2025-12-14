export interface Option {
  id: string;
  text: string;
}

export interface Question {
  id: number;
  text: string;
  options: Option[];
}

export enum AppStage {
  WELCOME = 'WELCOME',
  QUIZ = 'QUIZ',
  PROFILE = 'PROFILE',
  ANALYZING = 'ANALYZING',
  RESULT = 'RESULT'
}

export interface UserProfile {
  nickname: string;
  gender: 'male' | 'female' | 'other' | '';
}
