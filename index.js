
const Platform = require('./src/platform.temp');

module.exports = function (homebridge) {
    homebridge.registerPlatform("homebridge-appletv-now-playing", "AppleTvNowPlayingPlatform", Platform, true);
}