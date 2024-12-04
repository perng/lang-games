// import { getCookie } from './cookies';

// export function getStorageWithCookie(key: string): string {
//     // Get from both sources
//     const storageValue = localStorage.getItem(key) || '';
//     const cookieValue = getCookie(key);
    
//     // If both exist and are numbers, compare and update if needed
//     if (storageValue && cookieValue) {
//         const storageNum = parseFloat(storageValue);
//         const cookieNum = parseFloat(cookieValue);
//         if (!isNaN(storageNum) && !isNaN(cookieNum)) {
//             if (cookieNum > storageNum) {
//                 // Update localStorage if cookie value is higher
//                 localStorage.setItem(key, cookieNum.toString());
//                 return cookieNum.toString();
//             }
//             return storageNum.toString();
//         }
//     }
    
//     // If key doesn't exist in storage but exists in cookie, write to storage
//     if (!storageValue && cookieValue) {
//         localStorage.setItem(key, cookieValue);
//         return cookieValue;
//     }
    
//     // Return whichever exists, or empty string
//     return storageValue || cookieValue || '';
// }

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