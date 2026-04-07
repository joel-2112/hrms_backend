'use strict';

/**
 * middlewares/validate.middleware.js
 *
 * Factory that turns a Joi schema into an Express middleware.
 * Controllers stay completely free of validation logic.
 *
 * Usage in routes:
 *
 *   const { validate } = require('../../middlewares/validate.middleware');
 *   const { createEmployeeSchema } = require('./employee.schema');
 *
 *   router.post(
 *     '/employees',
 *     authenticate,
 *     validate(createEmployeeSchema),   // ← rejects bad input before controller runs
 *     employeeController.create,
 *   );
 *
 * Schema location convention:
 *   Each module owns its schemas in a sibling file:
 *   modules/employee/employee.schema.js
 *   modules/role/role.schema.js  … etc.
 *
 * Validation target:
 *   validate(schema)              → validates req.body   (default)
 *   validate(schema, 'query')     → validates req.query
 *   validate(schema, 'params')    → validates req.params
 *
 * On failure → 422 with field-level error array:
 *   { success: false, message: 'Validation failed', errors: [{ field, message }] }
 *
 * Install:  npm install joi
 */

const Joi    = require('joi');
const { unprocessable } = require('../utils/response');

// ─────────────────────────────────────────────
//  VALIDATE FACTORY
// ─────────────────────────────────────────────

/**
 * validate(schema, target?)
 *
 * @param {Joi.ObjectSchema} schema  - Joi schema to validate against
 * @param {'body'|'query'|'params'} target - which part of req to validate (default: 'body')
 * @returns {import('express').RequestHandler}
 */
const validate = (schema, target = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[target], {
      abortEarly:   false,  // collect ALL errors, not just the first
      stripUnknown: true,   // silently drop fields not in the schema
      convert:      true,   // coerce strings to numbers/booleans where typed
    });

    if (error) {
      const errors = error.details.map((d) => ({
        field:   d.path.join('.'),   // nested paths: 'address.city'
        message: d.message.replace(/['"]/g, ''),  // strip Joi's quote wrapping
      }));

      return unprocessable(res, 'Validation failed', errors);
    }

    // Replace req[target] with the validated + stripped + coerced value
    // so controllers always work with clean data
    req[target] = value;
    return next();
  };
};

// ─────────────────────────────────────────────
//  COMMON REUSABLE RULES
//  Import these in module schema files to keep
//  schemas DRY across the whole codebase.
// ─────────────────────────────────────────────
const rules = {
  /** Standard UUID field */
  uuid: () => Joi.string().uuid({ version: 'uuidv4' }),

  /** Required UUID FK */
  requiredUuid: () => Joi.string().uuid({ version: 'uuidv4' }).required(),

  /** Pagination query params */
  pagination: Joi.object({
    page:  Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
  }),

  /** ISO date string (YYYY-MM-DD) */
  date: () => Joi.string().isoDate(),

  /** Non-empty trimmed string */
  str: (max = 255) => Joi.string().trim().max(max),

  /** Required non-empty trimmed string */
  requiredStr: (max = 255) => Joi.string().trim().max(max).required(),

  /** Email */
  email: () => Joi.string().email().lowercase().trim(),

  /** Phone — loose, accepts +254 712 345678 etc. */
  phone: () => Joi.string().pattern(/^[+\d\s\-().]{7,30}$/),

  /** Positive decimal for money */
  money: () => Joi.number().precision(2).min(0),

  /** Boolean coerced from string */
  bool: () => Joi.boolean(),
};

module.exports = { validate, rules };