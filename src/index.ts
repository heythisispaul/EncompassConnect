import * as request from 'request';
import { LoanAssociateProperties, PipeLineFilter, UserInfoContract, LicenseInformation, UserProfile, CreateLoanContract, FilterPipeLineContract, LoanGuidsPipeLineContract } from './encompassInterfaces';
import { RequestOptions } from 'https';

export default class EncompassConnect {
    clientId: string;
    APIsecret: string;
    instanceId: string;
    token: string;

    constructor(clientId: string, APIsecret: string, instanceId: string) {
        this.clientId = clientId;
        this.APIsecret = APIsecret;
        this.instanceId = instanceId;
        this.token = '';
    }

    private root: string = 'https://api.elliemae.com/encompass/v1';

    private utils = {
        handleResponse: (resolve: any, reject: any, err: Error, response: request.RequestResponse, override?: any): void => {
            if (err) {
                reject(err);
            }
            if (response.body && response.body.errorCode) {
                reject(response.body.details);
            }
            resolve(override ? override : response);
        },
        strictURI: (uriComponent: string): string => {
            let cleaned = uriComponent.replace(/[{}+-:`"!'()*&<>]/g, '');
            return cleaned;
        },
        callInfo: (method: string, body?: any): RequestOptions => {
            let options: any = {
                method: method,
                headers: {
                    "Authorization": 'Bearer ' + this.token
                },
                dataType: 'text',
                contentType: 'application/x-www-form-urlencoded',
                json: true
            };
            if (body) {
                options.body = body;
            }
            return options;
        },
        getMilestoneId: (GUID: string, milestone: string): Promise<string> => {
            return new Promise((resolve, reject) => {
                let milestoneId: string = '';
                request(`${this.root}/loans/${this.utils.strictURI(GUID)}/milestones`, this.utils.callInfo('GET'), (err, response, body) => {
                    if (err) {
                        reject(err);
                    }
                    try {
                        milestoneId = body.filter((ms: any) => ms.milestoneName == milestone)[0].id;
                        resolve(milestoneId);
                    }
                    catch {
                        reject('Could not find milestone ID based off milestone/loan provided. Ensure the milestone entered matches the milestone name in Encompass.');
                    }
                });
            })
        },
        tokenOptions: (method: string, token?: string | undefined, username?: string, password?: string): any => {
            let dataString = `token=${this.token}`;
            let auth = "Basic " + Buffer.from(this.clientId + ":" + this.APIsecret).toString('base64');
            if (username || password) {
                dataString = `grant_type=password&username=${username}@encompass:${this.instanceId}&password=${password}`;
            }
            return {
                method: method,
                json: true,
                headers: {
                    "Authorization": auth,
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                body: dataString
            }
        },
        numberCheck: (value: string | number): number | undefined => {
            if (typeof(value) == 'number') {
                return value;
            }
            let numregex = /^[0-9]+([,.][0-9]+)?$/g;
            return numregex.test(value) ? parseFloat(value) : undefined;
        },
        //needs testing as of 11/6
        contractGenerator: (fields: any, generate: boolean): Promise<request.RequestResponse> => {
            return new Promise((resolve, reject) => {
                let entryFields: any = { ...fields };
                let customReturn: any[] = [];
                if (!generate) {
                    resolve(fields);
                }
                if (fields.customFields) {
                    let customFields: any = fields.customFields;
                    delete entryFields.customFields;
                    Object.entries(customFields).forEach((cf: any) => {
                        let cfObj: any = {
                            fieldName: cf[0],
                            stringValue: cf[1].toString()
                        };
                        if (this.utils.numberCheck(cf[1])) {
                            cfObj.numericValue = this.utils.numberCheck(cf[1]);
                        }
                        customReturn.push(cfObj);
                    });
                }
                request(`${this.root}/schema/loan/contractGenerator`, this.utils.callInfo('POST', entryFields), (err, response) => {
                    // this.utils.handleResponse(resolve, reject, err, response, response.body);
                    if (err) {
                        reject(err);
                    }
                    if (response.body && response.body.errorCode) {
                        reject(response.body.details);
                    }
                    if (fields.customFields) {
                        response.body.customFields = customReturn;
                        resolve(response.body);
                    }
                    resolve(response.body);
                });
            });
        }
    }

    authenticate = (username: string, password: string): Promise<request.RequestResponse> => {
        return new Promise((resolve, reject) => {
            request('https://api.elliemae.com/oauth2/v1/token', this.utils.tokenOptions('POST', undefined, username, password), (err, response, body) => {
                if (err) {
                    reject(err);
                }
                if (response.body.access_token) {
                    this.token = response.body.access_token;
                    resolve(response);
                }
                reject('Token request was not rejected - however no token was returned');
            });
        });
    }

    tokenIntrospect = (token?: string): Promise<request.RequestResponse> => {
        return new Promise((resolve, reject) => {
            request(`https://api.elliemae.com/oauth2/v1/token/introspection`, this.utils.tokenOptions('POST', token ? token : this.token), (err, response) => {
                if (err) {
                    reject(err);
                }
                resolve(response);
            })
        })
    }

    revokeToken = (token?: string): Promise<request.RequestResponse> => {
        return new Promise((resolve, reject) => {
            request('https://api.elliemae.com/oauth2/v1/token/revocation', this.utils.tokenOptions('POST', token ? token : this.token), (err, response) => {
                if (err) {
                    reject(err);
                }
                resolve(response);
            })
        })
    }

    storeToken = (token: string): void => {
        this.token = token;
    }

    customRequest = (uri: string, method?: string, body?: any): Promise<request.RequestResponse> => {
        return new Promise((resolve, reject) => {
            request(uri, this.utils.callInfo(method ? method : 'GET', body ? body : undefined), (err, response) => {
                if (err) {
                    reject(err);
                }
                resolve(response);
            });
        });
    }

    getGuid = (loanNumber: string): Promise<string> => {

        let guidFilter: FilterPipeLineContract = {
            filter: {
                operator: "and",
                terms: [{
                  canonicalName: "Loan.LoanNumber",
                  value: loanNumber,
                  matchType: "exact"
              }]
            },
            fields: ["Loan.GUID"]
        };

        return new Promise((resolve, reject) => {
            request(`${this.root}/loanPipeline/`, this.utils.callInfo('POST', guidFilter), (err: Error, response: request.RequestResponse) => {
                if (err) {
                    reject(err);
                }
                if (response.body && response.body.length > 0) {
                    resolve(response.body[0].loanGuid);
                }
                else {
                    reject(`Loan ${loanNumber} did not return a GUID.`);
                }
            });
        });
    }

    //not yet in readme
    pipeLineView = (options: FilterPipeLineContract | LoanGuidsPipeLineContract, limit?: number): Promise<any[]> => {
        let requestOptions = this.utils.callInfo('POST', options);
        let uri = `${this.root}/loanPipeline/`;
        if (limit) {
            uri += `?limit=${limit}`;
        }
        return new Promise((resolve, reject) => {
            request(uri, requestOptions, (err, response) => {
                this.utils.handleResponse(resolve, reject, err, response, response.body);
            });
        });
    }

    //loan CRUD
    getLoan = (GUID: string, loanEntities?: string[]): Promise<any> => {
        let uri = `${this.root}/loans/${this.utils.strictURI(GUID)}`;
        if (loanEntities) {
            uri += '?entities=';
            loanEntities.forEach((item) => {
                uri += encodeURIComponent(item + ',');
            });
            uri = uri.substring(0, uri.length - 1);
        }
        return new Promise((resolve, reject) => {
            request(uri, this.utils.callInfo('GET'), (err, response) => {
                this.utils.handleResponse(resolve, reject, err, response, response.body);
            });
        });
    }

    updateLoan = (GUID: string, loanData: any, generateContract: boolean = true, loanTemplate?: string): Promise<request.RequestResponse> => {
        let uri = `${this.root}/loans/${this.utils.strictURI(GUID)}?appendData=true`;
        if (loanTemplate) {
            uri += '?loanTemplate=' + loanTemplate;
        }
        return new Promise((resolve, reject) => {
            this.utils.contractGenerator(loanData, generateContract).then((contract) => {
                request(uri, this.utils.callInfo('PATCH', contract), (err, response) => {
                    this.utils.handleResponse(resolve, reject, err, response);
                });
            })
            .catch((err) => {
                reject(err);
            });
        });
    }

    deleteLoan = (GUID: string): Promise<request.RequestResponse> => {
        return new Promise((resolve, reject) => {
            request(`${this.root}/loans/${this.utils.strictURI(GUID)}`, this.utils.callInfo('DELETE'), (err, response, body) => {
                this.utils.handleResponse(resolve, reject, err, response);
            });
        });
    }

    createLoan = (createLoanContract?: CreateLoanContract) => {
        return new Promise((resolve, reject) => {
            let uri = `${this.root}/loans`;
            if (createLoanContract) {
                uri += `?view=${createLoanContract.view ? createLoanContract.view : 'id'}`;
                if (createLoanContract.loanFolder) {
                    uri += `&loanFolder=${createLoanContract.loan}`;
                }
                if (createLoanContract.loanTemplate) {
                    uri += `&loanTemplate=${createLoanContract.loanTemplate}`;
                }
            }
            request(uri, this.utils.callInfo('POST', createLoanContract && createLoanContract.loan ? createLoanContract.loan : {}), (err, response) => {
                this.utils.handleResponse(resolve, reject, err, response, response.body);
            });
        });
    }
    //end loan CRUD

    //needs testing as well 10/26
    batchUpdate = (options: PipeLineFilter | string[], loanData: any, generateContract: boolean = true): Promise<request.RequestResponse> => {
        return new Promise((resolve, reject) => {
            this.utils.contractGenerator(loanData, generateContract).then((contract) => {
                let batchOptions: any = { loanData: contract };
                batchOptions[Array.isArray(options) ? 'loanGuids' : 'filter'] = options;
                request(`${this.root}/loanBatch/updateRequests`, this.utils.callInfo('POST', batchOptions), (err, response) => {
                    this.utils.handleResponse(resolve, reject, err, response);
                });
            })
            .catch((err) => {
                reject(err);
            })
        })
    }

    // UNTESTED 11/5
    moveLoan = (GUID: string, folderName: string) => {
        return new Promise((resolve, reject) => {
            request(`${this.root}/loanfolders/${this.utils.strictURI(folderName)}/loans`, this.utils.callInfo('PATCH', { loanGuid: GUID }), (err, response) => {
                this.utils.handleResponse(resolve, reject, err, response);
            });
        });
    }

    public milestones = {
        assign: (GUID: string, milestone: string, userProperties: LoanAssociateProperties): Promise<request.RequestResponse> => {
            return new Promise((resolve, reject) => {
                this.utils.getMilestoneId(this.utils.strictURI(GUID), milestone).then((milestoneId) => {
                    request(`${this.root}/loans/${this.utils.strictURI(GUID)}/associates/${milestoneId}`, this.utils.callInfo('PUT', userProperties), (err, response) => {
                        this.utils.handleResponse(resolve, reject, err, response);
                    });
                })
                .catch((err) => {
                    reject(err);
                });
            });
        },
        complete: (GUID: string, milestone: string): Promise<request.RequestResponse> => {
            return new Promise((resolve, reject) => {
                this.utils.getMilestoneId(this.utils.strictURI(GUID), milestone).then((milestoneId) => {
                    request(`${this.root}/loans/${this.utils.strictURI(GUID)}/milestones/${milestoneId}?action=finish`, this.utils.callInfo('PATCH', { milestoneName: milestone }), (err, response) => {
                        this.utils.handleResponse(resolve, reject, err, response);
                    });
                })
                .catch((err) => {
                    reject(err);
                });
            });
        },
        //this not right maybe? still needs tests ran 10-26
        updateRoleFree: (GUID: string, milestone: string, userProperties: LoanAssociateProperties): Promise<request.RequestResponse> => {
            return new Promise((resolve, reject) => {
                this.utils.getMilestoneId(this.utils.strictURI(GUID), milestone).then((milestoneId) => {
                    let options = {
                        loanAssociate: {
                            loanAssociateType: userProperties.loanAssociateType,
                            userId: userProperties.id
                        }
                    };

                    request(`${this.root}/loans/${this.utils.strictURI(GUID)}/milestoneFreeRoles/${milestoneId}`, this.utils.callInfo('PATCH', options), (err, response) => {
                        this.utils.handleResponse(resolve, reject, err, response);
                    });
                })
                .catch((err) => {
                    reject(err);
                });
            });
        },
        //eventually may want a type for a milestone oject
        all: (GUID: string): Promise<any[]> => {
            return new Promise((resolve, reject) => {
                request(`${this.root}/loans/${this.utils.strictURI(GUID)}/milestones`, this.utils.callInfo('GET'), (err, response) => {
                    this.utils.handleResponse(resolve, reject, err, response, response.body);
                });
            });
        },
        associate: (GUID: string, milestone: string): Promise<LoanAssociateProperties> => {
            return new Promise((resolve, reject) => {
                this.utils.getMilestoneId(GUID, milestone).then((milestoneId) => {
                    request(`${this.root}/loans/${this.utils.strictURI(GUID)}/associates/${milestoneId}`, this.utils.callInfo('GET'), (err, response) => {
                        this.utils.handleResponse(resolve, reject, err, response, response.body);
                    });
                })
                .catch((err) => {
                    reject(err);
                });
            });
        }
    }

    public users = {
        list: (UserInfoContract?: UserInfoContract): Promise<UserProfile[]> => {
            let uri = `${this.root}/company/users`;
            if (UserInfoContract) {
                uri += `?viewEmailSignature=${UserInfoContract.viewEmailSignature ? 'true' : 'false'}`;
                uri += UserInfoContract.hasOwnProperty('start') ? `&start=${UserInfoContract.start}` : '';
                uri += UserInfoContract.hasOwnProperty('limit') ? `&limit=${UserInfoContract.limit}` : '';
            }
            if (UserInfoContract && UserInfoContract.filter) {
                let filters: any = UserInfoContract.filter;
                Object.keys(UserInfoContract.filter).forEach((filter: string) => {
                    let filterString = `&${filter}=`;
                    filterString += this.utils.strictURI(filters[filter]);
                    uri += filterString;
                });
            }
            return new Promise((resolve, reject) => {
                request(uri, this.utils.callInfo('GET'), (err, response) => {
                    this.utils.handleResponse(resolve, reject, err, response, response.body);
                });
            });
        },
        profile: (userId: string): Promise<UserProfile> => {
            return new Promise((resolve, reject) => {
                request(`${this.root}/company/users/${this.utils.strictURI(userId)}`, this.utils.callInfo('GET'), (err, response) => {
                    this.utils.handleResponse(resolve, reject, err, response, response.body);
                    console.log(this.utils.strictURI(userId))
                });
            });
        },
        licenses: (userId: string, state?: string): Promise<LicenseInformation[]> => {
            let uri = `${this.root}/company/users/${this.utils.strictURI(userId)}/licenses`;
            return new Promise((resolve, reject) => {
                request(state ? uri + `?state=${this.utils.strictURI(state)}` : uri, this.utils.callInfo('GET'), (err, response) => {
                    this.utils.handleResponse(resolve, reject, err, response, response.body);
                });
            });
        }
    }
}