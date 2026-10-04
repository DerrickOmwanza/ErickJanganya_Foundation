// One picture and one icon for each area of work, shared by the Development Tracker and the Promise Scorecard so an
// area looks the same wherever it appears (tiles, headings, card and drawer photos). The photos are illustrative
// stand-ins until real local pictures replace them: change the path here and every page follows. An area with no entry
// simply gets a neutral tile and a flag icon. `img` is the tile picture; an optional `imgs` list lets project cards of the same category rotate through a few pictures.
window.AreaMeta = {
  'Education': { img: 'img/vision-education-youth.jpg', icon: 'fa-graduation-cap' },
  'Health': { img: 'img/hero-clinics-poster.jpg', icon: 'fa-heart-pulse' },
  'Infrastructure': { img: 'img/hero-roads-poster.jpg', imgs: ['img/hero-roads-poster.jpg', 'img/focus-infrastructure.jpg'], icon: 'fa-road' },
  'Water & Sanitation': { img: 'img/hero-water-poster.jpg', icon: 'fa-droplet' },
  'Youth & Employment': { img: 'img/focus-youth.jpg', icon: 'fa-briefcase' }
};
