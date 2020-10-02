import { mockResponse, fetch } from './mockFunctions';
import EncompassConnect from '../../src/encompassConnect';
import { testInstanceWithToken } from './mockEncompassConnectInstances';

export const getNestedMethod = (
  methodLocation: string,
  originalObject: EncompassConnect,
) => methodLocation
  .split('.')
  .reduce((acc: any, current: any) => acc[current], originalObject);

export const determineContext = (methodLocation: string) => {
  const isService = methodLocation.includes('.');
  return isService
    ? { context: testInstanceWithToken }
    : testInstanceWithToken;
};

export const returnsResponseBody = async (methodLocation: string, ...args: any) => {
  const testValue = '<EXPECTED RETURN VALUE>';
  mockResponse(testValue);
  const context = determineContext(methodLocation);
  const method: any = getNestedMethod(methodLocation, testInstanceWithToken);
  const result = await method.call(context, ...args);
  expect(result).toEqual(testValue);
};

export const matchesFetchSnapshot = async (methodLocation: string, ...args: any) => {
  mockResponse();
  const context = determineContext(methodLocation);
  const method: any = getNestedMethod(methodLocation, testInstanceWithToken);
  await method.call(context, ...args);
  expect(fetch.mock.calls[0]).toMatchSnapshot();
};
