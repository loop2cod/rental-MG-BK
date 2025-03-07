export const logRequest = (req, res, next) => {
  console.log(
    `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - Body:`,
    req.body
  );
  next();
};
