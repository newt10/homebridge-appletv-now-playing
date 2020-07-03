const appletv = require("node-appletv-x");

const SwitchAccessory = require("./accessory.switch");
const TelevisionAccessory = require("./accessory.television");

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
        this.logger = log;

        this.accessories = [];

        this.api.on("didFinishLaunching", this.onApiDidFinishLaunching);
    }

    debug(message) {
        if (this.config && this.config.debug) {
            if (typeof mesage === "string") {
                message = message.toLowerCase();
            }

            this.logger(message);
        }
    }

    log(message) {
        if (typeof mesage === "string") {
            message = message.toLowerCase();
        }

        this.logger(message);
    }

    registerAccessory(accessory) {
        this.log(`registering accessory => ${accessory.name || accessory.UUID}.`);

        this.api.registerPlatformAccessories(Platform.pluginName, Platform.platformName, [accessory]);
    }

    unregisterAccessory(accessory) {
        this.log(`unregistering accessory => ${accessory.name || accessory.UUID}.`);

        this.api.unregisterPlatformAccessories(Platform.pluginName, Platform.platformName, [accessory]);
    };

    publishExternalAccessory(accessory) {
        this.log(`publishing external accessory => ${accessory.name || accessory.UUID}.`);

        this.api.publishExternalAccessories(Platform.pluginName, [accessory]);
    }

    updateAccessory(accessory) {
        this.log(`updating accessory => ${accessory.name || accessory.UUID}.`);

        this.api.updatePlatformAccessories([accessory]);
    }

    configureAccessory(accessory) {
        if (!accessory.context.uid) {
            try {
                this.log(`removing orphaned accessory => ${accessory.name || accessory.UUID}.`);

                this.unregisterAccessory(accessory);
            } catch (error) {
                this.log(error);
            }
        } else {
            this.log(`loaded cached accessory => ${accessory.name || accessory.UUID}.`);

            this.accessories.push(accessory);
        }
    }

    async configureDevice(deviceConfiguration) {
        let credentials = appletv.parseCredentials(deviceConfiguration.credentials);

        this.debug(`(${deviceConfiguration.name}) scanning for device => ${credentials.uniqueIdentifier}.`);

        let devices = await appletv.scan(credentials.uniqueIdentifier);

        if (devices && devices.length) {
            this.debug(`(${deviceConfiguration.name}) device found => ${credentials.uniqueIdentifier}.`);
            this.debug(`(${deviceConfiguration.name}) connecting to device => ${credentials.uniqueIdentifier}.`);

            let connectedDevice = await devices[0].openConnection(credentials);

            this.debug(`(${deviceConfiguration.name}) connected to device => ${credentials.uniqueIdentifier}.`);

            new SwitchAccessory(this, this.config.devices[0], connectedDevice);

            if (this.config.devices[0].showTvAccessory) {
                new TelevisionAccessory(this, this.config.devices[0], connectedDevice);
            }
        }
    }

    onApiDidFinishLaunching() {
        this.config.devices.map(this.configureDevice);
    }
}

Platform.pluginName = "homebridge-appletv-now-playing";
Platform.platformName = "AppleTvNowPlayingPlatform";

module.exports = Platform;
