import { klona } from 'klona/full';
import _ from 'lodash';
import traverse from 'traverse';

const sensitiveKeys = [
  /cookie/i,
  /passw(or)?d/i,
  /^pw$/,
  /^pass$/i,
  /secret/i,
  /token/i,
  /api[-._]?key/i,
  /session[-._]?id/i,
  /^connect\.sid$/,
  /private[-._]?key/i,
  /(access([a-z0-9]+)?)/i,
  /(refresh([a-z0-9]+)?)/i,
  /(private([a-z0-9]+)?)/i,
  /^\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}$/, // credit card number
];

const sensitiveValues = [
  /"(cookie(s)?)":"[^"]+"/i,
  /"(passw(or)?d)":"[^"]+"/i,
  /"(pw)":"[^"]+"/i,
  /"(pass)":"[^"]+"/i,
  /"(secret)":"[^"]+"/i,
  /"(token)":"[^"]+"/i,
  /"(file)":"[^"]+"/i, // also remove long base64 strings
  /"(authorization)":"Bearer\s[^"]+"/i,
  /"(authorization)":"Basic\s[^"]+"/i,
  /"(api[-._]?key)":"[^"]+"/i,
  /"(session[-._]?id)":"[^"]+"/i,
  /"(private[-._]?key)":"[^"]+"/i,
  /"(access([a-z0-9]+)?)":"[^"]+"/i,
  /"(secret([a-z0-9]+)?)":"[^"]+"/i,
  /"(refresh([a-z0-9]+)?)":"[^"]+"/i,
  /"(private([a-z0-9]+)?)":"[^"]+"/i,
  /"([^"]+)":"\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}"/,
];

const isSensitiveKey = (keyStr?: string): boolean => {
  if (keyStr) {
    return sensitiveKeys.some((regex) => regex.test(keyStr));
  }

  return false;
};

const isSensitiveValue = (valueStr: string): string | undefined => {
  let newVal = valueStr;

  if (newVal) {
    sensitiveValues.forEach((regex) => {
      newVal = newVal.replace(regex, '"$1":"[REDACTED]"');
    });
  }

  return valueStr === newVal ? undefined : newVal;
};

const redactObject = (obj: Record<string, any>): void => {
  traverse(obj).forEach(function redactor(val) {
    if (isSensitiveKey(this.key)) {
      this.update('[REDACTED]');
    } else if (typeof val === 'string') {
      // check value (string like json)
      const newVal = isSensitiveValue(val);

      if (newVal) {
        this.update(newVal);
      }
    }
  });
};

/**
 * https://github.com/winstonjs/winston/issues/1079#issuecomment-825115754
 */
const redact = (obj: Record<string | symbol, any>): Record<string | symbol, any> => {
  if (typeof obj !== 'object') {
    return obj;
  }

  try {
    const copy = klona(obj); // Making a deep copy to prevent side effects

    redactObject(copy);

    const splat = copy[Symbol.for('splat')] as Record<string, any>;

    redactObject(splat); // Specifically redact splat Symbol

    return copy;
  } catch (e) {
    // fallback to lodash deep clone
    if (e.name === 'RangeError') {
      const copy = _.cloneDeep(obj);

      redactObject(copy);

      return copy;
    }

    return { ...obj, message: 'Failed redact secrets' };
  }
};

export default redact;
