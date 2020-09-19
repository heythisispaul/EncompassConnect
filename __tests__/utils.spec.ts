import { massageCustomFields } from '../src/utils';

describe('utils', () => {
  describe('massageCustomFields', () => {
    const customFields = {
      'CX.FIRST.NAME': 'Bojack',
      'CX.LAST.NAME': 'Horseman',
      'CX.AGE': 50,
    };
    it('returns an empty array if no argument is provided', () => {
      expect(massageCustomFields(null)).toEqual([]);
    });

    it('returns a "fieldName" key for each field', () => {
      const customFieldArray = massageCustomFields(customFields);
      const allHaveFieldName = customFieldArray
        .every(({ fieldName }) => Boolean(fieldName));
      expect(allHaveFieldName).toBeTruthy();
    });

    it('returns the value itself if no "toString" method is available', () => {
      const testValue = null;
      const test = { 'CX.TEST': testValue };
      const [{ stringValue }] = massageCustomFields(test);
      expect(stringValue === testValue).toBeTruthy();
    });

    it('includes a numeric value if it can parse a number from the input value', () => {
      const [,, age] = massageCustomFields(customFields);
      expect(age.numericValue).toEqual(50);
    });
  });
});
