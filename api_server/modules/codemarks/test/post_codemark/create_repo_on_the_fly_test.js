'use strict';

const MarkerStreamOnTheFlyTest = require('./marker_stream_on_the_fly_test');

class CreateRepoOnTheFlyTest extends MarkerStreamOnTheFlyTest {

	constructor (options) {
		super(options);

		// create some random remote URLs to generate a new repo
		this.useRemotes = [];
		for (let i = 0; i < 3; i++) {
			this.useRemotes.push(this.repoFactory.randomUrl());
		}
	}

	get description () {
		return 'should return a valid codemark and create a repo on the fly when creating a codemark with a marker and specifying remotes that do not match an existing repo';
	}
}

module.exports = CreateRepoOnTheFlyTest;
