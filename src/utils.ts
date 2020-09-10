/* eslint-disable import/prefer-default-export */
export const massageCustomFields = (customFields: any) => {
  if (!customFields) {
    return [];
  }
  const massaged = Object
    .entries(customFields).map(([fieldName, value]: [string, any]) => {
      const parsedNumber = parseFloat(value);
      const customFieldObject: any = {
        fieldName,
        stringValue: value.toString ? value.toString() : value,
      };
      if (!Number.isNaN(parsedNumber)) {
        customFieldObject.numericValue = parsedNumber;
      }
      return customFieldObject;
    });
  return massaged;
};
