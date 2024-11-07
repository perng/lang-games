import './style.css';
import { TheGame, WordInfo } from './game';

interface Article {
    title: string;
    content: string;
}

class App {
    private currentGame: TheGame | null = null;
    private articles: Article[] = [];

    async init() {
        await this.loadArticles();
        this.showMainMenu();
    }

    private async loadArticles() {
        try {
            const response = await fetch('/data/articles.json');
            this.articles = await response.json();
        } catch (error) {
            console.error('Error loading articles:', error);
            this.articles = [];
        }
    }

    private showMainMenu() {
        const container = document.getElementById('container')!;
        container.innerHTML = `
          <div class="main-menu">
            <h1>Choose an Article</h1>
            <div class="article-list">
              ${this.articles.map((article, index) => `
                <div class="article-item ${index % 2 === 0 ? 'even' : 'odd'}" data-index="${index}">
                  <div class="article-number">${(index + 1).toString().padStart(2, '0')}</div>
                  <div class="article-title">${article.title}</div>
                </div>
              `).join('')}
            </div>
          </div>
        `;

        document.querySelectorAll('.article-item').forEach(item => {
            item.addEventListener('click', () => {
                const index = parseInt(item.getAttribute('data-index') || '0');
                console.log('Article clicked:', index);
                this.startGame(this.articles[index]);
            });
        });
    }

    private startGame(article: Article) {
        this.currentGame = new TheGame(article.content);
        const container = document.getElementById('container')!;
        
        container.innerHTML = `
          <div class="game-container">
            <h2>${article.title}</h2>
            <div class="content" id="gameContent">
              ${this.currentGame.getWords().map((word: WordInfo) => {
                const displayWord = word.isSentenceStart ? 
                                  this.capitalizeFirstLetter(word.text) : 
                                  word.text;
                return `
                  <span 
                    class="word ${word.isSentenceStart ? 'sentence-start' : ''}" 
                    data-index="${word.index}"
                    data-original-word="${word.text}"
                  >${displayWord}</span> `;
              }).join('')}
            </div>
            <div class="controls">
              <button id="checkButton">Check</button>
              <button id="mainMenuButton">Main Menu</button>
            </div>
            <div id="results" class="results"></div>
            <div class="story-footnote">
              <p>🦹‍♂️ Oh no! The evil Article Bandit has struck again! They've stolen all the "the"s from this story!</p>
              <p>🦸‍♂️ Your mission: Click on each word that needs its "the" back to restore order and save the world of grammar!</p>
            </div>
          </div>
        `;

        // Add event listeners
        document.querySelectorAll('.word').forEach(word => {
            word.addEventListener('click', () => this.handleWordClick(word as HTMLElement));
        });

        document.getElementById('checkButton')?.addEventListener('click', () => this.checkResults());
        document.getElementById('mainMenuButton')?.addEventListener('click', () => this.showMainMenu());
    }

    private handleWordClick(wordElement: HTMLElement) {
        if (!this.currentGame) return;
        
        const index = parseInt(wordElement.dataset.index!);
        const originalWord = wordElement.dataset.originalWord!;
        const isSentenceStart = wordElement.classList.contains('sentence-start');
        
        console.log('Click:', { 
            index, 
            originalWord, 
            isSentenceStart,
            hasThe: wordElement.classList.contains('has-the')
        });

        if (wordElement.classList.contains('has-the')) {
            // Removing "the"
            wordElement.classList.remove('has-the', 'player-added', 'the-upper', 'the-lower');
            // If it's a sentence start, capitalize the word
            if (isSentenceStart) {
                wordElement.textContent = this.capitalizeFirstLetter(originalWord);
            } else {
                wordElement.textContent = originalWord.toLowerCase();
            }
            this.currentGame.toggleThe(index);
        } else {
            // Adding "the"
            wordElement.classList.add('has-the', 'player-added');
            
            if (isSentenceStart) {
                // For sentence starts, add "The" (uppercase)
                wordElement.classList.add('the-upper');
                wordElement.classList.remove('the-lower');
                wordElement.textContent = originalWord.toLowerCase();
                console.log('Adding The to sentence start');
            } else {
                // For other positions, add "the" (lowercase)
                wordElement.classList.add('the-lower');
                wordElement.classList.remove('the-upper');
                wordElement.textContent = originalWord.toLowerCase();
                console.log('Adding the to mid-sentence word');
            }
            this.currentGame.toggleThe(index);
        }
    }

    private capitalizeFirstLetter(str: string): string {
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    }

    private capitalizeFirstLetter(str: string): string {
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    }

    private capitalizeFirstLetter(str: string): string {
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    }

    private checkResults() {
        if (!this.currentGame) return;

        const results = this.currentGame.checkResults();
        const words = document.querySelectorAll('.word');

        words.forEach(word => {
            word.classList.remove('correct', 'error', 'missed', 'has-the', 'the-upper', 'the-lower');
        });

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

        document.getElementById('results')!.innerHTML = `
            <div class="result-correct">Correct: ${results.correct}</div>
            <div class="result-errors">Errors: ${results.errors}</div>
            <div class="result-missed">Missed: ${results.missed}</div>
        `;

        console.log('Check results:', results);  // Debug log
    }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    new App().init();
});