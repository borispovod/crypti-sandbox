var crypti = process.binding('sandbox');

crypti.onMessage(function (msg, callback) {
	callback(null, {
		callback_id: msg.callback_id,
		response: {}
	});
});
