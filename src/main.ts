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
        console.log('Starting game with article:', article);
        this.currentGame = new TheGame(article.content);
        const container = document.getElementById('container')!;
        
        container.innerHTML = `
          <div class="game-container">
            <h2>${article.title}</h2>
            <div class="content" id="gameContent">
              ${this.currentGame.getWords().map((word: WordInfo) => `
                <span 
                  class="word ${word.isSentenceStart ? 'sentence-start' : ''}" 
                  data-index="${word.index}"
                  data-original-word="${word.text}"
                >${word.text}</span>${' '}`).join('')}
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

        console.log('Adding click listeners to words');
        document.querySelectorAll('.word').forEach(word => {
            word.addEventListener('click', () => {
                console.log('Word clicked:', word);
                this.handleWordClick(word as HTMLElement);
            });
        });

        document.getElementById('checkButton')?.addEventListener('click', () => this.checkResults());
        document.getElementById('mainMenuButton')?.addEventListener('click', () => this.showMainMenu());
    }

    private handleWordClick(wordElement: HTMLElement) {
        if (!this.currentGame) return;  // Safety check
        
        const index = parseInt(wordElement.dataset.index!);
        const originalWord = wordElement.dataset.originalWord!;
        const isSentenceStart = wordElement.classList.contains('sentence-start');
        
        console.log('Word clicked:', {
            word: originalWord,
            index,
            isSentenceStart,
            currentClasses: wordElement.classList.toString()
        });

        if (!wordElement.classList.contains('has-the')) {
            this.currentGame.toggleThe(index);
            wordElement.classList.add('has-the', 'player-added');
            
            if (isSentenceStart) {
                wordElement.classList.add('the-upper');
                wordElement.classList.remove('the-lower');
            } else {
                wordElement.classList.add('the-lower');
                wordElement.classList.remove('the-upper');
                wordElement.textContent = originalWord.toLowerCase();
            }
        }
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