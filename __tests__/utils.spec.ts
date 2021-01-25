import { massageCustomFields, objectToURLString, reduceFieldReaderValues } from '../src/utils';

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

  describe('objectToURLString', () => {
    const input = {
      who: 'I',
      when: 1990,
      doing: 'very famous TV show',
    };
    const expectedOutput = 'who=I&when=1990&doing=very+famous+TV+show';
    it('turns the provided object into a URL encoded data string', () => {
      const result = objectToURLString(input);
      expect(result).toEqual(expectedOutput);
    });

    it('returns an empty string if no input is provided', () => {
      expect(objectToURLString(null)).toEqual('');
    });

    it('prepends a "?" if the queryString parameter is provided', () => {
      const result = objectToURLString(input, true);
      expect(result).toEqual(`?${expectedOutput}`);
    });
  });

  describe('reduceFieldReaderValues', () => {
    const input = [
      { fieldId: 'field1', value: 'value1' },
      { fieldId: 'field2', value: 'value2' },
    ];
    it('returns an object', () => {
      expect(typeof reduceFieldReaderValues(input)).toEqual('object');
    });

    it('has a key value pair for each fieldId/value', () => {
      const reducedResult = reduceFieldReaderValues(input);
      expect(reducedResult).toEqual({
        field1: 'value1',
        field2: 'value2',
      });
    });
  });
});
