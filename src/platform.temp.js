const appletv = require("node-appletv-x");

const TempAccessory = require("./accessory.temp");

class Platform {
    constructor(log, config, api) {
        this.configureAccessory = this.configureAccessory.bind(this);
        this.onApiDidFinishLaunching = this.onApiDidFinishLaunching.bind(this);

        this.config = config;
        this.api = api;
        this.log = log;

        this.accessories = [];

        this.api.on("didFinishLaunching", this.onApiDidFinishLaunching);
    }

    configureAccessory(accessory) {
        if (!accessory.context.device) {
            try {
                this.api.unregisterPlatformAccessories(Platform.pluginName, Platform.platformName, [accessory]);
            } catch (error) {
                this.log(error);
            }
        } else {
            this.accessories.push(accessory);
        }
    }

    onApiDidFinishLaunching() {
        let accessory = new TempAccessory(this, this.config.devices[0], { uid: "1234" });
    }
}

Platform.pluginName = "homebridge-appletv-now-playing";
Platform.platformName = "AppleTvNowPlayingPlatform";

module.exports = Platform;
