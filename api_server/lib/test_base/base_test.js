// Base class for unit tests, as a class-based wrapper to mocha

'use strict';

var Assert = require('assert');

// make eslint happy
/* globals before, after, it */

var NumTests = 0;	// used to number tests in a single test run

class GenericTest {

	constructor (options) {
		Object.assign(this, options);
		this.testNum = ++NumTests;
	}

	// override me!
	async run () {
	}

	// before the test runs...
	async before () {
	}

	// after the test runs...
	async after () {
	}

	// do the test
	test () {
		this.timeout(10000);

		before(async () => {
			await this.before();
		});

		after(async () => {
			await this.after();
		});

		const out = it(
			this.testNum + ': ' + (this.description || '???'),
			async () => {
				await this.run();
			}
		);
		if (this.testTimeout) {
			out.timeout(this.testTimeout);
		}
	}

	// override to indicate an error response is expected for this test
	getExpectedError () {
		return null;
	}

	// override to indicate an object with a set of fields is expected for this test
	getExpectedFields () {
		return null;
	}

	// check the response to this test, there might be an error and a real response
	async checkResponse (error, response) {
		this.error = error ? response : null;
		const expectError = this.getExpectedError();
		if (expectError) {
			this.expectError(expectError);
		}
		else if (error) {
			throw error;
		}
		else {
			this.response = response;
			this.expectFields();
			this.validate();
		}
	}

	// check against an array of expected fields in the response object
	expectFields () {
		const expectFields = this.getExpectedFields();
		if (!expectFields) { return; }
		Assert(typeof this.response === 'object', 'response should be an object');
		this.expect(this.response, expectFields, '');
	}

	// check for expected data, in the form of objects, sub-objects, and arrays
	expect (responseData, expectData, chain) {
		const message = chain ? `response expects ${chain}` : 'response expected';
		if (this.isArrayOfStrings(expectData)) {
			// for an array of strings, this indicates a list of expected keys (fields) in the object
			Assert(typeof responseData === 'object', `${message} to be an object`);
			this.expectArray(responseData, expectData, chain);
		}
		else if (expectData instanceof Array) {
			// for any other array, we expect an array of elements, usually objects
			Assert(responseData instanceof Array, `${message} to be an array`);
			this.expectArray(responseData, expectData, chain);
		}
		else if (typeof expectData === 'object') {
			// for an object, we expect a matching object
			Assert(typeof responseData === 'object', `${message} to be an object`);
			this.expectObject(responseData, expectData, chain);
		}
		else if (typeof expectData === 'string') {
			// for a string, we expect a regular expression match
			Assert(typeof responseData === 'string', `${message} to be a string`);
			Assert(responseData.match(new RegExp(expectData)), `${message} to be like ${expectData}`);
		}
	}

	// is this value an array of (exclusively) strings?
	isArrayOfStrings (value) {
		return value instanceof Array && !value.find(elem => {
			return typeof elem !== 'string';
		});
	}

	// for an array, we expect an object of certain fields, or an array of sub-objects
	expectArray (responseData, expectFields, chain) {
		Object.keys(expectFields).forEach(key => {
			const expect = expectFields[key];
			if (typeof expect === 'string') {
				Assert(typeof responseData[expect] !== 'undefined', `response requires ${chain}.${expect} ... ${JSON.stringify(responseData, undefined, 5)}`);
			}
			else if (typeof expect === 'object') {
				Assert(typeof responseData[key] === 'object', `response expects ${chain}.${key} to be an object`);
				this.expectObject(responseData[key], expect, `${chain}.${key}`);
			}
		});
	}

	// expect a matching object, matching key for key
	expectObject (responseData, expectData, chain) {
		Object.keys(expectData).forEach(key => {
			Assert(typeof responseData[key] !== 'undefined', `response requires ${chain}.${key} ... ${JSON.stringify(responseData, undefined, 5)}`);
			this.expect(responseData[key], expectData[key], `${chain}.${key}`);
		});
	}

	// validate response to a request
	validate () {
		if (typeof this.validateResponse !== 'function') { return; }
		this.validateResponse(this.response);
	}

	// check for an error response
	expectError (expectError) {
		Assert(this.error, 'test should return an error');
		this.expect(this.error, expectError, '');
	}

	// for debugging
	debug (message) {
		const now = Date.now();
		const ms = now % 1000;
		console.log(`${this.testNum}: ${new Date(now).toString()}.${ms}: ${message}`); // eslint-disable-line no-console
	}

	timeout () {
		return null;
	}
}

module.exports = GenericTest;
