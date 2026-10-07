// Island fruit: each jungle/sandbar island grows one kind. Gather it with E, sell it or use it for commissions.
export const FRUIT_ORDER = ['coconut', 'banana', 'mango', 'pineapple', 'papaya'];
export const FRUITS = {
  coconut: { name: 'coconut', dark: 'hollow coconut', color: '#7a4a28', price: 4 },
  banana: { name: 'banana', dark: 'bone-white banana', color: '#f0d040', price: 4 },
  mango: { name: 'mango', dark: 'weeping mango', color: '#ee8a2a', price: 6 },
  pineapple: { name: 'pineapple', dark: 'many-eyed pineapple', color: '#e8b838', price: 7 },
  papaya: { name: 'papaya', dark: 'sunken papaya', color: '#f08a50', price: 5 },
};
export const fruitOf = (d) => (d.type === 'sandbar' ? 'coconut' : FRUIT_ORDER[(d.seed >> 3) % FRUIT_ORDER.length]);
export const fruitName = (f, dread) => (dread > 0.5 ? FRUITS[f].dark : FRUITS[f].name);
export const plural = (word, n) => (n === 1 ? word : word.endsWith('y') ? word.slice(0, -1) + 'ies' : word.endsWith('o') ? word + 'es' : word + 's');
