import EncompassConnect from '../../src/encompassConnect';

export const createConstructor = (additions = {}) => ({
  clientId: '<CLIENT ID>',
  APIsecret: '<API SECRET>',
  instanceId: '<INSTANCE ID>',
  ...additions,
});

export const defaultCreds = {
  username: '<CONSTRUCTOR USERNAME>',
  password: '<CONSTRUCTOR PASSWORD>',
};
export const mockToken = '<MOCK TOKEN VALUE>';
export const mockGuid = '<MOCK GUID VALUE>';
export const mockOnAuthenticate = jest.fn();
export const mockOnAuthenticateFailure = jest.fn();
export const testInstance = new EncompassConnect(createConstructor());
export const testInstanceWithCreds = new EncompassConnect(createConstructor(defaultCreds));
export const testInstanceWithToken = new EncompassConnect(createConstructor(defaultCreds));
export const testInstanceWithOnAuth = new EncompassConnect(createConstructor({
  ...defaultCreds,
  onAuthenticate: mockOnAuthenticate,
  onAuthenticateFailure: mockOnAuthenticateFailure,
}));
testInstanceWithToken.setToken(mockToken);
