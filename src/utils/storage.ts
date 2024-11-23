export function setStorage(name: string, value: string) {
  try {
    localStorage.setItem(name, value);
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
}

export function getStorage(name: string): string {
  try {
    return localStorage.getItem(name) || '';
  } catch (error) {
    console.error('Error reading from localStorage:', error);
    return '';
  }
}

export function deleteStorage(name: string) {
  try {
    localStorage.removeItem(name);
  } catch (error) {
    console.error('Error removing from localStorage:', error);
  }
} 