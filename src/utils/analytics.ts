import ReactGA from 'react-ga4';

const GA_MEASUREMENT_ID = 'G-TZGE601WH5';  // Your actual GA4 ID

export const initGA = () => {
  ReactGA.initialize(GA_MEASUREMENT_ID);
};

export const logPageView = (path: string) => {
  ReactGA.send({ hitType: "pageview", page: path });
};

export const logEvent = (category: string, action: string) => {
  ReactGA.event({
    category: category,
    action: action,
  });
}; 