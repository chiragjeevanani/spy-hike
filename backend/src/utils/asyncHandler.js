// Wraps an async route handler so any rejected promise is forwarded to Express's
// error middleware instead of crashing the process. Lets controllers use plain
// `async/await` and `throw` without a try/catch in every handler.
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
