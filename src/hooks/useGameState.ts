import { useState } from 'react';

 export default function useGameState(game: string, level: string) {
  const recordAnswer = (questionId: string, isCorrect: boolean) => {
    // Implement your answer recording logic here
    console.log(`Question ${questionId}: ${isCorrect ? 'Correct' : 'Incorrect'}`);
  };

  return { recordAnswer };
} 