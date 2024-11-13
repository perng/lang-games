export const createFirework = (x: number, y: number) => {
  const firework = document.createElement('div');
  firework.className = 'firework';
  firework.style.left = `${x}px`;
  firework.style.top = `${y}px`;
  document.body.appendChild(firework);

  firework.addEventListener('animationend', () => {
    document.body.removeChild(firework);
  });
}; 