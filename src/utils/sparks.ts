export const createSpark = (x: number, y: number) => {
  const spark = document.createElement('div');
  spark.className = 'spark';
  spark.style.left = `${x}px`;
  spark.style.top = `${y}px`;
  document.body.appendChild(spark);

  spark.addEventListener('animationend', () => {
    document.body.removeChild(spark);
  });
}; 