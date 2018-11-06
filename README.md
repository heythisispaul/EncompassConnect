# Encompass Connect
An Unofficial, fully-typed Node SDK that wraps around Ellie Mae's Encompass [RESTful API.](https://developer.elliemae.com/)

## Getting Started
Install via npm:
`npm install encompassconnect`

Import the module into your project then create an instance with your Encompass information:
```typescript
import EncompassConnect from 'encompassconnect';
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

If you already have a token supplied from another source, you can first call the `.storeToken()` method and supply it with your token to use this module with out having to authenticate.

## Examples

### Updating a Loan
Updating a loan is as simple as providing the GUID of the loan and the new information to the `.getLoan()` method after authenticating. This method by default will take in your `loanData` parameter and generate the contract structure required by the loan object model if you provide key-value pairs of the field ID and then the new information you'd like to update to. However, if your `loanData` will already be in the correct contract structure, you can turn off this functionality. For example, these two options will end up with the same result:

The first, we use the default behavior and supply the new information as an object with key-value pairs of the field ID and the new data. **Note that custom fields are placed inside their own `customFields` property**:
```javascript
encompass.authenticate('yourUsername', 'yourPassword').then(() => {

    let loanData = {
        "4002": "New Borrower Last Name" //ID for the Borrower Last Name field
        "317": "New Loan Officer Name", //ID for the Loan Officer Name field
        customFields: { //Custom fields must go inside this property
            "CX.CUSTOMFIELDID": "500" //numbers will automatically be parsed
        }
    };

    encompass.updateLoan('guid-Of-Loan-To-Update', loanData).then((response) => {
        console.log(response); //this value will have the status of the provided loan update call
    })
    .catch((err) => { //handle the error should the request fail
        console.log(err);
    });
});
```

In the second, we already have our data formatted in a contract which the loan object model knows how to read. So we provide the information as normal, but provide a third parameter to the `.updateLoan()` method to signal we do not want to generate a contract:
```javascript
encompass.authenticate('yourUsername', 'yourPassword').then(() => {

    let loanData = {
        applications: [
            {
                borrower: {
                    lastName: "New Borrower Last Name" //same as Field 4002
                }
            }
        ],
        contacts: [
            {
                contactType: "LOAN_OFFICER",
                name: "New Loan Officer Name" //same as Field 317
            }
        ],
        customFields: [
            {
                fieldName: "CX.CUSTOMFIELDID", //The custom field to update
                stringValue: "500",
                numericValue: 500
            }
        ]
    };

    encompass.updateLoan('guid-Of-Loan-To-Update', loanData, false).then((response) => {
        console.log(response); //this value will have the status of the provided loan update call
    })
    .catch((err) => { //handle the error should the request fail
        console.log(err);
    });
});
```

Either option will update the loan, just be sure you're toggling which functionality you need based off how your incoming loan data is structured. Keep in mind the second example is less taxing on the server, it requires one less call to Encompass and is generally recommended if the fields being updated are constant. Note that this same functionality exists in the `.batchUpdate()` method as well.

### Viewing a Pipeline
Pipeline Data can be pulled with the `.pipeLineView()` method. This method requires a Pipeline Contract object as its first parameter, and can optionally take a second parameter to specify a limit to how many results you would like. The pipeline contract determines which loans to retrieve and requires one of the two properties:
* The `loanGuids` property - takes an array of GUIDs of the loans to return
* The `filter` property - creates a filter based off canonical field names
The Pipeline Contract takes two additional properties: 
    * `sortOrder` - an optional property to determine which canonical name to sort by and whether to sort ascending or descending.
    * `fields` - a required property which takes an array of canonical field names which will be returned in the response

In this example, we're pulling all the loans in our pipeline view that were modified today and viewing the loan amount and borrower last name. The result will be sorted descending by date/time last modified, and will only return the top 50 results:
```javascript
encompass.authenticate('yourUsername', 'yourPassword').then(() => {

    let pipeLineOptions = {
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
        sortOrder: [
            {
                canonicalName: 'Loan.LastModified',
                order: 'desc'
            }
        ],
        fields: [
            "Loan.LoanAmount",
            "Fields.4002"
        ]
    };

    encompass.pipeLineView(pipeLineOptions, 50).then((loans) => {
        console.log(loans) // the array of loan data returned
    })
    .catch((err) => {
        // handle any potential errors here.
    });
});
```

In this example, we already have the list of specific loans we want to see. We'll return the same data points plus the loan officer name from the loans and sort them them the same as well:
```javascript
encompass.authenticate('yourUsername', 'yourPassword').then(() => {

    let pipeLineOptions = {
        loanGuids: [
            'loan-guid-number-one',
            'loan-guid-number-two',
            'loan-guid-number-three',
            'loan-guid-number-four'
        ],
        sortOrder: [
            {
                canonicalName: 'Loan.LastModified',
                order: 'desc'
            }
        ],
        fields: [
            "Loan.LoanAmount",
            "Fields.4002",
            "Fields.317"
        ]
    };

    encompass.pipeLineView(pipeLineOptions).then((loans) => {
        console.log(loans) // the array of loan data returned
    })
    .catch((err) => {
        // handle any potential errors here.
    });
});
```

### Getting a Loan
In this example, the user has supplied a loan number (12345678) and will receive the loan's application and closing cost data back. We'll first call the `.getGuid()` method to retrieve the GUID with our loan number, and then provide that GUID and our filtering information (to specify that we only want the application and closing cost entity information) to the `.getLoan()` method:
```javascript
encompass.authenticate('yourUsername', 'yourPassword').then(() => {

    encompass.getGuid('12345678').then((guid) => {

        let loanEntities = [
            'application',
            'closingCost'
        ];

        encompass.getLoan(guid, loanEntities).then((loanData) => {
            console.log(loanData); //the application and closing cost information for the provided loan.
        })
        .catch((err) => {
            //handle any errors if this call is unsuccessful
        });
    })
    .catch((err) => {
        //handle any errors if the provided loan number does not return a GUID
    });
});
```

If you don't provide a second parameter to the `.getLoan()` method, the entire loan object will be returned from the Promise.

### Assigning a User and Completing Milestones
Here we have a loan that has completed processing and now needs to be sent to underwriting. We're assigning it to a user with the Encompass Id 'jsmith' and the milestones are labeled 'Underwriting' and 'Processing' in Encompass. First we'll assign our user to the 'Underwriting' milestone, and then complete the 'Processing' milestone now that the loan is ready to move on:
```javascript
encompass.authenticate('yourUserName', 'yourPassword').then(() => {

    let underwriter = {
        loanAssociateType: 'user',
        id: 'jsmith'
    };

    encompass.milestones.assign('guid-Of-Loan-To-Update', 'Underwriting', underwriter).then(() => {

        encompass.milestones.complete('guid-Of-Loan-To-Update', 'Processing').then(() => {
            //any additional actions can be done here.
        })
        .catch((err) => {
            //handle any errors if the milestone could not be completed.
            console.log(err);
        });
    })
    .catch((err) => {
        //handle any errors if the user could not be assigned.
        console.log(err);
    });
});
```
A parameter can be supplied to the `.then()` methods and will resolve to the HTTP response from Encompass if you need that information as well.

## All Methods
All methods return a [Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise). Unless stated otherwise, the resolved value of each promise is the HTTP response from Encompass's API.

### Handling Tokens

#### .authenticate(_username_, _password_)
As described above, this method creates and stores a token to your instance of EncompassConnect.

Parameters: 
* username: string - the username for the Encompass Account you're authenticating with.
* password: string - the password for the Encompass Account you're autenthicating with.

#### .tokenIntrospect(_token?_)
Retrieves the introspection information (if the token is valid, who it was issued to, its scope, etc) from Encompass.

Parameters:
* token: string _(optional)_ - the token you'd like information about. If one is not supplied, it will call the instance's `token` property by default.

#### .revokeToken(_token?_)
Invalidates the provided token.

Parameters:
* token: string _(optional)_ - the token you'd like to be revoked. If one is not supplied, it will call the instance's `token` property by default.

#### .storeToken(_token_)
Stores the token as the `token` property of the EncompassConnect instance it is called from. Allows you to use tokens collected from different sources. This method is void and does not return a promise.

Parameters:
* token: string - the token you would like to store as the new token value for this instance.

### Working with Loans

#### .createLoan(_createLoanContract?_)
Creates a new loan in Encompass. By default the loan will appear in the 'My Pipeline' folder of the individual of the user who was issued the token. This method returns a promise that resolves the GUID of the newly created loan, however it can also include more information.

Parameters:
* createLoanContract: createLoanContract (_optional_) - An object that provides additional details when creating a new loan. It has four properties (all are optional):
    * `view`: 'entity' | 'id' - determines if the response value will contain just the GUID or all the loan information from the new loan (defaults to 'id').
    * `loanTemplate`: string - The URL to the loan template for the loan to be created.
    * `loanFolder`: string - The loan folder name to place the loan (defaults to 'My Pipeline' if not provided).
    * `loan`: any - An object that follows the structure of the loan object model. This object will populate your new loan with the data provided.

#### .getGuid(_loanNumber_)
Takes in a loan number and returns the loan GUID as the resolution to the promise.

Parameters:
* loannumber: string - The loan number (Loan.LoanNumber) you need the GUID for.

#### .getLoan(_GUID_, _loanEntities?_)
Retrieves all or partial data about a loan object. Returns a promise that resolves the loan object.

Parameters:
* GUID: string - the GUID for the loan object to retrieve.
* loanEntities: string[] _(optional)_ - an array of loan entities (e.g. 'application', 'underwritersummary') you can filter down to if you're only looking for specific fields.

#### .updateLoan(_GUID_, _loanData_, _generateContract?_, _loanTemplate?_)
Updates a supplied loan object with new information.

Parameters: 
* GUID: string - the GUID for the loan object to update.
* loanData: any - the object which contains the loan data you're updating. Check out the [example](https://github.com/heythisispaul/EncompassConnect#updating-a-loan) for additional information.
* generateContract: boolean _(optional)_ - Determines whether your supplied loanData object will be generated into a contract to match the object model or not (defaults to true).
* loanTemplate: string  _(optional)_ - The URL to the loan template if one should be provided.

#### .deleteLoan(_GUID_)
Deletes the specified loan from your Encompass instance.

Paramters:
* GUID: string - The GUID of the loan to delete.

#### .pipeLineView(_options_, _limit?_)
Pulls an array of loans based off the filter or list of GUIDs supplied. Returns a promise that resolves to the array of loans with the fields you requested.

Parameters:
* options: FilterPipeLineContract | LoanGuidsPipeLineContract - An object that determines which loans and fields being pulled. Check out the [example](https://github.com/heythisispaul/EncompassConnect#viewing-a-pipeline) for additional details.
* limit: number _(optional)_ - the maximum results to return from the call. The default is 1000, but may vary depending on the amount of data being requested per loan. 



### Milestones

#### milestones.all(_GUID_)
Returns a promise which resolves an array of milestone logs for the provided loan.

Paramters:
* GUID: string - The GUID for the loan which to look up milestone logs.

#### milestones.associate(_GUID_, _milestone_)
Returns a promise which resolves the loan associate properties for the person assigned to the loan/milestone provided.

Paramters:
* GUID: string - The GUID of the loan to be looked up.
* milestone: string - the milestone of the needed user profle.

#### milestones.assign(_GUID_, _milestone_, _userProperties_)
Assigns a user to the provided loan and milestone. Returns a promise of the response from Encompass.

Paramters: 
* GUID: string - The Guid of the loan to update
* milestone: string - The milestone to update (be sure it matches how it is spelled in Encompass)
* userProperties: LoanAssociateProperties - an object that requires the `loanAssociateType` property (will always be 'user' or 'group') and the `id` property (the Encompass user Id of the user to assign). Can also take optional parameters of contact information types if needed to be updated.

#### milestones.complete(_GUID_, _milestone_)
Marks the provided loan/milestone as completed. Returns a promise that resolves to the response from Encompass.

Paramters:
* GUID: string - The GUID of the loan to update
* milestone: string - The milestone to complete (be sure it matches the spelling in Encompass exactly)

### Retrieving User Information

#### users.list(_userInfoContract?_)
Pulls the user profile information of your organization's users. Can optionally take an object to filter the results. Returns a promise which resolves the array of users.

Parameters: 
* userInfoContract: UserInfoContract (_optional_) - An object that acts as a filters the user profiles returned. Includes the following properties (all are optional): 
    * `viewEmailSignature`: boolean - determines if the email signature HTML will be returned with the results (defaults to false).
    * `start`: number - Allows to optionally skip over records.
    * `limit`: number
    * `filter` - Can take the following properties. Each property takes a string or number of the property you would like to filter to:
        * `groupId`
        * `roleId`
        * `personaId`
        * `organizationId`
        * `userName` (Looks at first or last name but not full name. Eg - John Smith would return from providing 'John' or 'Smith' but not 'John Smith')

#### users.profile(_userId_)
Returns a user profile for the provided Encompass Id as the resolution to a promise.

Paramters:
* userId: string - The Encompass user Id to look up.

#### users.licenses(_userId_, _state?_)
Returns an array of the licensing information by state for the provided Encompass user. Can optionally be filtered by state with the second parameter.

Paramters:
* userId: string - The Encompass Id of the user to look up.
* state: string _(optional)_ - The two-letter state code of the state to filter down to.

### Custom API Calls

#### .customRequest(_uri_, _method?_, _body?_)
If There isn't an existing function to suit your needs, you can supply this method with the Encompass API endpoint you need. It will default to a 'GET' request, but you can supply additional parameters as necessary. It returns a promise that resolves to the HTTP response from Encompass.

Parameters:
* uri: string - The Encompass API to interact with.
* method: string _(optional)_ - The HTTP verb to use. If not supplied, defaults to 'GET'.
* body: any _(optional)_ - The JSON body to send with your request if required.
