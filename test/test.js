var should = require('should');
var path = require('path');
var dapp = path.resolve("./lib/dapp.js");
var Sandbox = require('../index.js');
var apiHandler = function () {}

describe("Crypti Sandbox", function () {
	describe("#Initialize sandbox", function () {
		var sandbox = null;

		it("Should initialize sandbox", function () {
			sandbox = new Sandbox(dapp, apiHandler);
			should(sandbox).be.ok;
		});

		it("Should run dapp", function () {
			sandbox.run();
			should(sandbox).have.property("child").and.be.ok;
		});


		describe("#I/O from JS", function () {
			it("Should send message and get response", function (done) {
				sandbox.sendMessage({
					call: "a+b",
					data: [10, 20]
				}, function (err, c) {

					done();
				});
			});
		});

	})
});