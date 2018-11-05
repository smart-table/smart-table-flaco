export const wait = (time = 50) => new Promise((resolve, reject) => {
    setTimeout(() => resolve(), 50);
});
