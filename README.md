# Encompass Connect
An Unofficial, (mostly) typed Node SDK that wraps around Ellie Mae's Encompass [RESTful API.](https://developer.elliemae.com/)

## Getting Started
Install via npm:
`npm install encompassconnect`

Import the module into your project then create an instance with your Encompass information:
```typescript
import EncompassConnect from 'encompassconnect';
const encompass = new EncompassConnect({
  clientId: '<Client ID>',
  APIsecret: '<API Secret>',
  instanceId: '<Instance ID>',
  username: 'mycoolusername',
  password: 'mycoolpassword',
});

const canonicalFields = await encompass.getCanonicalNames();
console.log(canonicalFields);
```

Checkout the [documentation site](https://heythisispaul.github.io/EncompassConnect/classes/encompassconnectclass.encompassconnect.html) for all available methods and functionality.

## Authenticating 
There are three ways to authenticate an instance of `encompassconnect` with your Encompass instance, each may work better depending on your usecase.

### Providing Credentials In The Constructor
If you provide a username and password in the constructor (as done in the Getting Started section), these values are saved to the instance and will be used to fetch a token. This option is meant to be a "set it and forget it" option, useful for servers that need to be logged in with a service account or a similar scenario.

Before attempting to access a resource for the first time, these credentials will be used to fetch a token. This token will be reused until a `401` response is received from Encompass - at that time these credentials will be re-exchanged for a new token, and the failed request will be resent with the fresh token. If another `401` is returned at that time, an error will be thrown.

### Providing Credentials to a Get Token Request
If instead you want to exchange username and password for a single token, a token can be retrieved by calling the `getTokenWithCredentials()` method to retrieve a token. Once this token expires it will be released, or can be overwritten at any time by calling `setToken()` to a different value.
```typescript
import EncompassConnect, { EncompassConnectInitOptions } from 'encompassconnect';

const constructorValues: EncompassConnectInitOptions = {
  clientId: '<Client ID>',
  APIsecret: '<API Secret>',
  instanceId: '<Instance ID>',
}

const encompass = new EncompassConnect(constructorValues);

await encompass.getTokenWithCredentials('mycoolusername', 'mycoolpassword');

const canonicalFields = await encompass.getCanonicalNames();
console.log(canonicalFields);
```
When providing credentials here, they are not saved in the instance and will not be reused.

### Setting The Token Value Directly
Instead of providing credentials and locking the instance to the identity of one user, a token can be set in your application code. This may be useful if you expect to receive the token from a different source, or expect the user to provide the token themselves:

```typescript
import EncompassConnect, { EncompassConnectInitOptions } from 'encompassconnect';

const constructorValues: EncompassConnectInitOptions = {
  clientId: '<Client ID>',
  APIsecret: '<API Secret>',
  instanceId: '<Instance ID>',
}

const encompass = new EncompassConnect(constructorValues);

encompass.setToken('<A Valid Encompass Token>');

const canonicalFields = await encompass.getCanonicalNames();
console.log(canonicalFields);
```

This token will be stored to the instance until either a new value is set with the `setToken()` method, or until a `401` is returned from the Encompass API. Be sure to set the token before making any resource requests.

### Customizing the Authentication Flow
If instead of exchanging the credentials provided in the constructor for a token, you'd like to perform some custom action, you can provide an `onAuthenticate` function in the constructor. This function will be called instead of the standard `encompass.getTokenFromCredentials()` function, and will be invoked with your instance of encompass connect.

```typescript
import EncompassConnect, { EncompassConnectInitOptions } from 'encompassconnect';
import aCustomTokenFetchingAction from './some-file';

const constructorValues: EncompassConnectInitOptions = {
  clientId: '<Client ID>',
  APIsecret: '<API Secret>',
  instanceId: '<Instance ID>',
  onAuthenticate: async (encompass: EncompassConnect) => {
    console.log('I will be invoked on construction and any time there is an auth failure.');
    const token = await aCustomTokenFetchingAction();
    if (token) {
      encompass.setToken(token);
    } else {
      await encompass.getTokenFromCredentials();
    }
  },
}

const encompass = new EncompassConnect(constructorValues);
```

If you need to perform a side effect in the event of a failed authentication, you can do so by providing an `onAuthenticateFailure` function to the constructor. This function will be called after an unauthorized response is received, but before the reauthorization flow occurs. This method has the same signature as the `onAuthenticate` hook, it will be called with your instance and returns a promise that resolves to void. To avoid an unresolved promise error, both functions are called within try/catch blocks, so there is no need to include it in your function declaration unless you want to control the error handling for your own needs.

```typescript
import EncompassConnect, { EncompassConnectInitOptions } from 'encompassconnect';
import tellSomethingItFailed from './some-file';

const constructorValues: EncompassConnectInitOptions = {
  clientId: '<Client ID>',
  APIsecret: '<API Secret>',
  instanceId: '<Instance ID>',
  onAuthenticateFailure: async (encompass: EncompassConnect) => {
    console.log('The token used was not valid!');
    await tellSomethingItFailed();
    encompass.setToken(null);
  },
}

const encompass = new EncompassConnect(constructorValues);
```

Leaving these authentication hook values empty is functionally the same as:

```typescript
import EncompassConnect, { EncompassConnectInitOptions } from 'encompassconnect';

const constructorValues: EncompassConnectInitOptions = {
  // ...your other contructor values
  onAuthenticate: async (encompass: EncompassConnect) => encompass.getTokenFromCredentials(),
  onAuthenticateFailure: async (encompass: EncompassConnect) => encompass.setToken(null),
}

const encompass = new EncompassConnect(constructorValues);
```

## Examples

### Get A loan
A loan can be retrieved simply by providing its GUID to the `get()` method on the `loans` object. Optionally, an array of entities can be provided if you only need certain data. 
```typescript
const guid: string = 'some-loan-guid';

const fullLoan = await encompass.loans.get(guid);
console.log(fullLoan);

// or just the closing costs entity:
const closingCosts = await encompass.loans.get(guid, ['closingCosts']);
console.log(closingCosts);
```

Loan Guids can also be looked up by their loan number (`Loan.LoanNumber`) value by using the `getGuidByLoanNumber()`:
```typescript
const guid: string = await encompass.loans.getGuidByLoanNumber('123456');
const loanData = await encompoass.loans.get(guid);
console.log(loanData);
```

### Update A Loan
If the contract is already known for the data that needs to be updated, loan data can be updated using the `update()` method on the `loans` object:
```typescript
const updateData: any = {
  applications: [
    borrower: {
      lastName: 'new borrower last name',
    },
  ],
  contacts: [
    {
      contactType: 'LOAN_OFFICER',
      name: 'new loan officer name',
    },
  ],
  customFields: [
    {
      fieldName: 'CX.SOME.CUSTOM.FIELD',
      stringValue: 'new value',
    },
  ],
};

// using the default options:
await encompass.loans.update('some-loan-guid', updateData);

// providing options:
const options: LoanUpdateOptions = {
  appendData: true,
  persistent: 'transient',
  view: 'entity',
};

await encompass.loans.update('some-loan-guid', updateData, options);
```

If the contract is not known, one can be generated before updating. The update data is expected as key value pairs (the key being the field ID), and all standard Encompass values are placed in the `standardFields` key, while all custom fields are placed in the `customFields` key:
```typescript
const updateData: UpdateLoanWithGenerateContract = {
  standardFields: {
    '4000': 'new borrower last name',
    '317': 'new loan officer name',
  },
  customFields: {
    'CX.SOME.CUSTOM.FIELD': 'new value',
  },
};

await encompass.loans.updateWithGeneratedContract('some-loan-guild', updateData);
```

The `updateWithGeneratedContract()` method can also take the third `LoanUpdateOptions` as well. Keep in mind this method requires an extra call to generate the contract, and `loans.update()` should be used instead when possible.

### Viewing a Pipeline
Generate a pipeline view by calling the `viewPipeline()` method. This method has one required argument, a `PipeLineContract`, and can optionally take a limit value as the second argument:
```typescript
// a pipelineContract expects either a loanGuids array, or a filter object:
const commonFilterValues = {
  sortOrder: [
    {
      canonicalName: 'Loan.LastModified',
      order: 'desc'
    }
  ],
  fields: [
    "Loan.LoanAmount",
    "Fields.4002"
  ],
};

const pipelineWithGuids: LoanGuidsPipeLineContract = {
  ...commonFilterValues,
  loanGuids: [
    'some-loan-guid-1',
    'some-loan-guid-2',
  ],
};

const pipelineWithFilter: FilterPipeLineContract = {
  ...commonFilterValues,
  filter: {
    operator: 'and',
    terms: [
      {
        canonicalName: "Loan.LastModified",
        matchType: "greaterThanOrEquals",
        value: new Date()
      },
      {
        canonicalName: "Loan.LoanFolder",
        matchType: "exact",
        value: "My Pipeline"
      }
    ]
  },
};

const pipelineDataFromGuids = await encompass.viewPipeline(pipelineWithGuids);

// or with the other contract, and a limit of the first 50 results:
const pipelineDataFromFilter = await encompass.viewPipeline(pipelineWithFilter, 50);
```
### Batch Update
The batch update API allows your to apply the same loan data to multiple loans and can be invoked with `batchLoanUpdate()` method. This method returns an object that with it's own functionality to check the status of batch update, or to get the request ID if needed.

 Just like viewing a pipeline, either a filter or an array of loan GUIDs can be provided.
```typescript
const updateData: BatchLoanUpdateContract = {
  loanGuids: [
    // array of loan GUIDs to update
  ],
  loanData: {
    // contract of the loan data to apply to each loan
  },
};

const exampleBatchUpdate: BatchUpdate = await encompass.batchLoanUpdate(updateData);

// the return value can be used to check the status:
const latestStatus: BatchUpdateStatus = await exampleBatchUpdate.getUpdateStatus();
console.log(latestStatus.status) // 'done' or 'error'

// or if needed you can get the request ID itself:
const exampleBatchUpdateId: string = exampleBatchUpdate.getRequestId();
```

### Update a Milestone
Milestones can be read or updated through the methods in the `milestones` object. For example, in the below scenario, a loan has completed Processing, and is ready to be submitted to an underwriter. We'll assign an underwriting contact to the 'Underwriting' milestone, and then complete the 'Processing' milestone.
```typescript
const guidToUpdate: string = 'some-loan-guid';
const assignUnderwriterOptions: AssignMilestoneOptions = {
  loanGuid: guidToUpdate,
  milestone: 'Underwriting',
  userId: 'UnderwritersId',
};

await encompass.milestones.assign(assignUnderwriterOptions);

// after this operation is complete, we can complete our Processing milestone:
const updateProcessingOptions: UpdateMilestoneOptions = {
  loanGuid: guidToUpdate,
  milestone: 'Processing',
  options: {
    comments: 'this milestone is complete!',
  }
  action: 'finish',
};

await encompass.milestones.update(updateProcessingOptions);
```

### The Request Method
If an API is not available through an explicit method in this class, the `request()` method will act as a fetch wrapper around any Encompass API call you want to make and return the response. It takes in the same arguments as any [fetch](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) API, with the exception that the first argument is appended as a path to the Encompass API domain, currently `https://api.elliemae.com/`.

```typescript
// hitting the Get Custom Fields API:
const customFieldsResponse: Response = await encompass.request('/encompass/v1/settings/loan/customFields');
const data = await customFieldsResponse.json();
console.log(data);

// or update a contact:
const options: RequestInit = {
  method: 'POST',
  body: {
    firstname: 'contact first name',
    lastname: 'contact last name',
  },
};

await encompass.request('/encompass/v1/businessContacts/<some-contact-id>', options);
```

Checkout the [documentation site](https://heythisispaul.github.io/EncompassConnect/classes/encompassconnectclass.encompassconnect.html) for all available methods and other examples.

## Contributing
This is a growing library as needs arise. Any contributions are welcome.
