# Encompass Connect
An **Unofficial**, fully-typed Node SDK that wraps around Ellie Mae's Encompass [RESTful API.](https://developer.elliemae.com/)

## Getting Started
Include the source `dist/index.js` file into your project then create an instance with your Encompass information:
```typescript
const EncompassConnect = require('path-to-EncompassConnect/index.js');
const encompass = new EncompassConnect('YourClientId', 'YourAPISecret', 'YourInstanceId');
```
### Authenticating 
Calling the `.authenticate()`  method will store a token to your instance of EncompassConnect. A safe way to do so is to call this method, and then chain any subsequent calls inside the following `.then()` method:

```javascript
encompass.authenticate('yourUsername', 'yourPassword').then(() => {
    //rest of your logic can be done here.
});
```
If you'd like to see or move the token, the API response is returned as the value of the promise (as is the case with most methods in this library), and is available as the `access_token` property on the body of the response.

## Methods
All methods return a [Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise). Unless stated otherwise, the resolved value of each promise is the HTTP response from Encompass's API.

### Handling Tokens

#### .authenticate()
As described above, this method creates and stores a token to your instance of EncompassConnect.

Parameters: 
* username: string - the username for the Encompass Account you're authenticating with.
* password: string - the password for the Encompass Account you're autenthicating with.

#### .tokenIntrospect()
Retrieves the introspection information (if the token is valid, who it was issued to, its scope, etc) from Encompass.

Parameters:
* token: string _(optional)_ - the token you'd like information about. If one is not supplied, it will call the instance's `token` property by default.

#### .revokeToken()
Invalidates the provided token.

Parameters:
* token: string _(optional)_ - the token you'd like to be revoked. If one is not supplied, it will call the instance's `token` property by default.

#### .storeToken()
Stores the token as the `token` property of the EncompassConnect instance it is called from. Allows you to use tokens collected from different sources.

Parameters:
* token: string - the token you would like to store as the new token value for this instance.

### Working with Loans

#### .getGuid()
Takes in a loan number and returns the loan GUID as the resolution to the promise.

Parameters:
* loannumber: string - The loan number (Loan.LoanNumber) you need the GUID for.

#### .getLoan()
Retrieves all or partial data about a loan object.

Parameters:
* GUID: string - the GUID for the loan object to retrieve.
* loanEntities: string[] _(optional)_ - an array of loan entities (e.g. 'application', 'underwritersummary') you can filter down to if you're only looking for specific fields.

#### updateLoan()
Updates a supplied loan object with new information.

Parameters: 
* GUID: string - the GUID for the loan object to update.
* loanData: any - the object which contains the loan data you're updating.
* generateContract: boolean _(optional)_ - Determines whether your supplied loanData object will be generated into a contract to match the object model or not (defaults to true).
* loanTemplate: string  _(optional)_ - The URL to the loan template if one should be provided.
