export const rotate = <T>(arr: T[], element: T): T[] => {
  if (arr.length === 0) {
    return arr;
  }

  const k = arr.indexOf(element) % arr.length;
  return [...arr.slice(arr.length - k), ...arr.slice(0, arr.length - k)];
};
