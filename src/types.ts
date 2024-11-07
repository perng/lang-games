export interface Article {
  title: string;
  content: string;
}

export interface GameState {
  originalContent: string;
  transformedContent: string;
  playerSelections: Set<number>;
  correctPositions: Set<number>;
}
