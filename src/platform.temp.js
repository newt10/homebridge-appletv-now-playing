const appletv = require("node-appletv-x");

const TempAccessory = require("./accessory.temp");

class Platform {
    constructor(log, config, api) {
        this.configureDevice = this.configureDevice.bind(this);
        this.configureAccessory = this.configureAccessory.bind(this);
        this.registerAccessory = this.registerAccessory.bind(this);
        this.onApiDidFinishLaunching = this.onApiDidFinishLaunching.bind(this);

        this.log = this.log.bind(this);
        this.debug = this.debug.bind(this);

        this.config = config;
        this.api = api;
        this.log = log;

        this.accessories = [];

        this.api.on("didFinishLaunching", this.onApiDidFinishLaunching);
    }

    debug(message) {
        if (this.config && this.config.debug) {
            if (typeof mesage === "string") {
                message = message.toLowerCase();
            }

            this.log(message);
        }
    }

    log(message) {
        if (typeof mesage === "string") {
            message = message.toLowerCase();
        }

        this.log(message);
    }

    registerAccessory(accessory) {
        this.api.registerPlatformAccessories(Platform.pluginName, Platform.platformName, [accessory]);
    }

    updateAccessory(accessory) {
        this.api.updatePlatformAccessories([accessory]);
    }

    configureAccessory(accessory) {
        //this.api.unregisterPlatformAccessories(Platform.pluginName, Platform.platformName, [accessory]);
        if (!accessory.context.device) {
            try {
                //this.api.unregisterPlatformAccessories(Platform.pluginName, Platform.platformName, [accessory]);
            } catch (error) {
                this.log(error);
            }
        } else {
            this.accessories.push(accessory);
        }
    }

    configureDevice(deviceConfiguration) {
        let credentials = appletv.parseCredentials(deviceConfiguration.credentials);

        new TempAccessory(this, this.config.devices[0], { uid: credentials.uniqueIdentifier });
    }

    onApiDidFinishLaunching() {
        this.config.devices.map(this.configureDevice);
    }
}

Platform.pluginName = "homebridge-appletv-now-playing";
Platform.platformName = "AppleTvNowPlayingPlatform";

module.exports = Platform;
