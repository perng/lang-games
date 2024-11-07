import './style.css';
import { Article } from './types';
import { TheGame } from './game';

class App {
  private articles: Article[] = [];
  private currentGame: TheGame | null = null;

  async init() {
    await this.loadArticles();
    this.renderArticleList();
    this.setupEventListeners();
  }

  private async loadArticles() {
    try {
      const response = await fetch('/data/articles.json');
      this.articles = await response.json();
    } catch (error) {
      console.error('Error loading articles:', error);
    }
  }

  private renderArticleList() {
    const container = document.getElementById('container')!;
    container.innerHTML = `
      <h1>The Article Game</h1>
      <div class="article-list">
        ${this.articles.map((article, index) => `
          <div class="article-item" data-index="${index}">
            ${article.title}
          </div>
        `).join('')}
      </div>
    `;
  }

  private startGame(article: Article) {
    const container = document.getElementById('container')!;
    this.currentGame = new TheGame(article.content);
    
    container.innerHTML = `
      <div class="game-container">
        <h2>${article.title}</h2>
        <div class="content" id="gameContent">
          ${this.currentGame.getDisplayWords().map(word => `
            <span class="word ${word.isSentenceStart ? 'sentence-start' : ''}" 
                  data-index="${word.index}"
                  data-original-word="${word.text}">${word.text}</span>
          `).join(' ')}
        </div>
        <div class="controls">
          <button id="checkButton">Check</button>
          <button id="mainMenuButton">Main Menu</button>
        </div>
        <div id="results" class="results"></div>
      </div>
    `;
  }

  private setupEventListeners() {
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      
      if (target.classList.contains('article-item')) {
        const index = parseInt(target.dataset.index!);
        this.startGame(this.articles[index]);
      }

      if (target.classList.contains('word')) {
        this.handleWordClick(target);
      }

      if (target.id === 'checkButton') {
        this.checkResults();
      }

      if (target.id === 'mainMenuButton') {
        if (confirm('Are you sure you want to return to the main menu?')) {
          this.renderArticleList();
        }
      }
    });
  }

  private handleWordClick(wordElement: HTMLElement) {
    console.log('Word clicked:', wordElement);
    const index = parseInt(wordElement.dataset.index!);
    const originalWord = wordElement.dataset.originalWord!;
    const isSentenceStart = wordElement.classList.contains('sentence-start');
    
    console.log('Index:', index);
    console.log('Original word:', originalWord);
    console.log('Is sentence start:', isSentenceStart);
    
    this.currentGame?.toggleThe(index);
    
    if (wordElement.classList.contains('has-the')) {
        // Remove "the"
        console.log('Removing the');
        wordElement.classList.remove('has-the', 'player-added', 'the-upper', 'the-lower');
        wordElement.textContent = originalWord;
    } else {
        // Add "the" with proper capitalization
        console.log('Adding the');
        wordElement.classList.add('has-the', 'player-added');
        if (isSentenceStart) {
            wordElement.classList.add('the-upper');
        } else {
            wordElement.classList.add('the-lower');
            wordElement.textContent = originalWord.toLowerCase();
        }
    }
    
    console.log('Current classes:', wordElement.classList.toString());
  }

  private checkResults() {
    if (!this.currentGame) return;

    const results = this.currentGame.checkResults();
    const words = document.querySelectorAll('.word');

    // Clear previous results
    words.forEach(word => {
        word.classList.remove('correct', 'error', 'missed', 'has-the', 'the-upper', 'the-lower');
    });

    // Handle correct "the"s
    results.positions.correct.forEach(index => {
        const word = document.querySelector(`.word[data-index="${index}"]`);
        if (word) {
            word.classList.add('correct', 'has-the');
            if (word.classList.contains('sentence-start')) {
                word.classList.add('the-upper');
            } else {
                word.classList.add('the-lower');
            }
        }
    });

    // Handle errors
    results.positions.errors.forEach(index => {
        const word = document.querySelector(`.word[data-index="${index}"]`);
        if (word) {
            word.classList.add('error', 'has-the');
            if (word.classList.contains('sentence-start')) {
                word.classList.add('the-upper');
            } else {
                word.classList.add('the-lower');
            }
        }
    });

    // Handle missed "the"s
    results.positions.missed.forEach(index => {
        const word = document.querySelector(`.word[data-index="${index}"]`);
        if (word) {
            const isSentenceStart = word.classList.contains('sentence-start');
            word.classList.add('missed', 'has-the');
            if (isSentenceStart) {
                word.classList.add('the-upper');
            } else {
                word.classList.add('the-lower');
                (word as HTMLElement).textContent = 
                    ((word as HTMLElement).dataset.originalWord || '').toLowerCase();
            }
        }
    });

    // Show results summary
    document.getElementById('results')!.innerHTML = `
        <div>Correct: ${results.correct}</div>
        <div>Errors: ${results.errors}</div>
        <div>Missed: ${results.missed}</div>
    `;

    console.log('Check results:', results);  // Debug log
  }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
  new App().init();
});