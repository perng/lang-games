export const setCookie = (name: string, value: string) => {
  // Set expiration to maximum date (Fri, 31 Dec 9999 23:59:59 GMT)
  const maxDate = new Date(253402300799999);
  document.cookie = `${name}=${value};expires=${maxDate.toUTCString()};path=/`;
};

export const getCookie = (name: string): string | null => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
}; 