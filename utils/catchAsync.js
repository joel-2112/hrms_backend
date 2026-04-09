// utils/catchAsync.js

/**
 * Wraps an async function to catch any errors and pass them to Express error handling middleware
 * @param {Function} fn - The async function to wrap
 * @returns {Function} - Express middleware function with error handling
 */
const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

module.exports = { catchAsync };