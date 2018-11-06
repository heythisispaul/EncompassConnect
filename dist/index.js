"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const request = require("request");
class EncompassConnect {
    constructor(clientId, APIsecret, instanceId) {
        this.root = 'https://api.elliemae.com/encompass/v1';
        this.utils = {
            handleResponse: (resolve, reject, err, response, override) => {
                if (err) {
                    reject(err);
                }
                if (response.body && response.body.errorCode) {
                    reject(response.body.details);
                }
                resolve(override ? override : response);
            },
            strictURI: (uriComponent) => {
                let cleaned = uriComponent.replace(/[{}+-:`"!'()*&<>]/g, '');
                return cleaned;
            },
            callInfo: (method, body) => {
                let options = {
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
            getMilestoneId: (GUID, milestone) => {
                return new Promise((resolve, reject) => {
                    let milestoneId = '';
                    request(`${this.root}/loans/${this.utils.strictURI(GUID)}/milestones`, this.utils.callInfo('GET'), (err, response, body) => {
                        if (err) {
                            reject(err);
                        }
                        try {
                            milestoneId = body.filter((ms) => ms.milestoneName == milestone)[0].id;
                            resolve(milestoneId);
                        }
                        catch (_a) {
                            reject('Could not find milestone ID based off milestone/loan provided. Ensure the milestone entered matches the milestone name in Encompass.');
                        }
                    });
                });
            },
            tokenOptions: (method, token, username, password) => {
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
                };
            },
            numberCheck: (value) => {
                if (typeof (value) == 'number') {
                    return value;
                }
                let numregex = /^[0-9]+([,.][0-9]+)?$/g;
                return numregex.test(value) ? parseFloat(value) : undefined;
            },
            //needs testing as of 11/6
            contractGenerator: (fields, generate) => {
                return new Promise((resolve, reject) => {
                    let entryFields = Object.assign({}, fields);
                    let customReturn = [];
                    if (!generate) {
                        resolve(fields);
                    }
                    if (fields.customFields) {
                        let customFields = fields.customFields;
                        delete entryFields.customFields;
                        Object.entries(customFields).forEach((cf) => {
                            let cfObj = {
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
        };
        this.authenticate = (username, password) => {
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
        };
        this.tokenIntrospect = (token) => {
            return new Promise((resolve, reject) => {
                request(`https://api.elliemae.com/oauth2/v1/token/introspection`, this.utils.tokenOptions('POST', token ? token : this.token), (err, response) => {
                    if (err) {
                        reject(err);
                    }
                    resolve(response);
                });
            });
        };
        this.revokeToken = (token) => {
            return new Promise((resolve, reject) => {
                request('https://api.elliemae.com/oauth2/v1/token/revocation', this.utils.tokenOptions('POST', token ? token : this.token), (err, response) => {
                    if (err) {
                        reject(err);
                    }
                    resolve(response);
                });
            });
        };
        this.storeToken = (token) => {
            this.token = token;
        };
        this.customRequest = (uri, method, body) => {
            return new Promise((resolve, reject) => {
                request(uri, this.utils.callInfo(method ? method : 'GET', body ? body : undefined), (err, response) => {
                    if (err) {
                        reject(err);
                    }
                    resolve(response);
                });
            });
        };
        this.getGuid = (loanNumber) => {
            let guidFilter = {
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
                request(`${this.root}/loanPipeline/`, this.utils.callInfo('POST', guidFilter), (err, response) => {
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
        };
        //not yet in readme
        this.pipeLineView = (options, limit) => {
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
        };
        //loan CRUD
        this.getLoan = (GUID, loanEntities) => {
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
        };
        this.updateLoan = (GUID, loanData, generateContract = true, loanTemplate) => {
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
        };
        this.deleteLoan = (GUID) => {
            return new Promise((resolve, reject) => {
                request(`${this.root}/loans/${this.utils.strictURI(GUID)}`, this.utils.callInfo('DELETE'), (err, response, body) => {
                    this.utils.handleResponse(resolve, reject, err, response);
                });
            });
        };
        this.createLoan = (createLoanContract) => {
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
        };
        //end loan CRUD
        //needs testing as well 10/26
        this.batchUpdate = (options, loanData, generateContract = true) => {
            return new Promise((resolve, reject) => {
                this.utils.contractGenerator(loanData, generateContract).then((contract) => {
                    let batchOptions = { loanData: contract };
                    batchOptions[Array.isArray(options) ? 'loanGuids' : 'filter'] = options;
                    request(`${this.root}/loanBatch/updateRequests`, this.utils.callInfo('POST', batchOptions), (err, response) => {
                        this.utils.handleResponse(resolve, reject, err, response);
                    });
                })
                    .catch((err) => {
                    reject(err);
                });
            });
        };
        // UNTESTED 11/5
        this.moveLoan = (GUID, folderName) => {
            return new Promise((resolve, reject) => {
                request(`${this.root}/loanfolders/${this.utils.strictURI(folderName)}/loans`, this.utils.callInfo('PATCH', { loanGuid: GUID }), (err, response) => {
                    this.utils.handleResponse(resolve, reject, err, response);
                });
            });
        };
        this.milestones = {
            assign: (GUID, milestone, userProperties) => {
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
            complete: (GUID, milestone) => {
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
            updateRoleFree: (GUID, milestone, userProperties) => {
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
            all: (GUID) => {
                return new Promise((resolve, reject) => {
                    request(`${this.root}/loans/${this.utils.strictURI(GUID)}/milestones`, this.utils.callInfo('GET'), (err, response) => {
                        this.utils.handleResponse(resolve, reject, err, response, response.body);
                    });
                });
            },
            associate: (GUID, milestone) => {
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
        };
        this.users = {
            list: (UserInfoContract) => {
                let uri = `${this.root}/company/users`;
                if (UserInfoContract) {
                    uri += `?viewEmailSignature=${UserInfoContract.viewEmailSignature ? 'true' : 'false'}`;
                    uri += UserInfoContract.hasOwnProperty('start') ? `&start=${UserInfoContract.start}` : '';
                    uri += UserInfoContract.hasOwnProperty('limit') ? `&limit=${UserInfoContract.limit}` : '';
                }
                if (UserInfoContract && UserInfoContract.filter) {
                    let filters = UserInfoContract.filter;
                    Object.keys(UserInfoContract.filter).forEach((filter) => {
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
            profile: (userId) => {
                return new Promise((resolve, reject) => {
                    request(`${this.root}/company/users/${this.utils.strictURI(userId)}`, this.utils.callInfo('GET'), (err, response) => {
                        this.utils.handleResponse(resolve, reject, err, response, response.body);
                        console.log(this.utils.strictURI(userId));
                    });
                });
            },
            licenses: (userId, state) => {
                let uri = `${this.root}/company/users/${this.utils.strictURI(userId)}/licenses`;
                return new Promise((resolve, reject) => {
                    request(state ? uri + `?state=${this.utils.strictURI(state)}` : uri, this.utils.callInfo('GET'), (err, response) => {
                        this.utils.handleResponse(resolve, reject, err, response, response.body);
                    });
                });
            }
        };
        this.clientId = clientId;
        this.APIsecret = APIsecret;
        this.instanceId = instanceId;
        this.token = '';
    }
}
exports.default = EncompassConnect;
