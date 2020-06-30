const appletv = require("node-appletv-x");

const SwitchAccessory = require("./accessory.switch");
const TelevisionAccessory = require("./accessory.television");

class Platform {
    constructor(log, config, api) {
        this.debug = this.debug.bind(this);
        this.log = this.log.bind(this);
        this.registerAccessories = this.registerAccessories.bind(this);
        this.unregisterAccessories = this.unregisterAccessories.bind(this);
        this.updateAccessories = this.updateAccessories.bind(this);
        this.configureAccessory = this.configureAccessory.bind(this);
        this.removeAccessory = this.removeAccessory.bind(this);
        this.cleanupAccessories = this.cleanupAccessories.bind(this);
        this.loadDevice = this.loadDevice.bind(this);
        this.onApiDidFinishLaunching = this.onApiDidFinishLaunching.bind(this);

        this.log = log;
        this.config = config;
        this.api = api;
        this.accessories = [];
        this.devices = [];

        this.api.on("didFinishLaunching", this.onApiDidFinishLaunching);
    }

    debug(message) {
        if (this.config && this.config.debug) {
            if(typeof mesage === "string") {
                message = message.toLowerCase();
            }

            this.log(message);
        }
    };

    log(message) {
        if(typeof mesage === "string") {
            message = message.toLowerCase();
        }

        this.log(message);
    };

    registerAccessories(accessories) {
        this.api.registerPlatformAccessories(Platform.pluginName, Platform.platformName, accessories);
    };

    unregisterAccessories(accessories) {
        this.api.unregisterPlatformAccessories(Platform.pluginName, Platform.platformName, accessories);
    };

    updateAccessories(accessories) {
        this.api.updatePlatformAccessories(accessories);
    };

    configureAccessory(accessory) {
        if (!accessory.context.uid) {
            this.debug(`Removing cached accessory width id ${accessory.UUID}`);

            this.api.unregisterPlatformAccessories(Platform.pluginName, Platform.platformName, [accessory]);
        } else {
            this.accessories.push(accessory);

            this.debug(`Loaded cached accessory width id ${accessory.UUID}`);
        }
    };

    removeAccessory(accessory) {
        this.debug(`Removing accessory width id ${accessory.UUID}`);

        this.api.unregisterPlatformAccessories(Platform.pluginName, Platform.platformName, [accessory]);
    };

    cleanupAccessories() {
        let devices = this.config.devices ? this.config.devices.map(device =>{
             device.parsedCredentials = appletv.parseCredentials(device.credentials);             
             return device;
        }) : [];
        
        for(let accessoryIndex = 0; accessoryIndex < this.accessories.length; accessoryIndex ++) {
            let accessory = this.accessories[accessoryIndex];
            let accessoryFound = false;

            for(let deviceIndex = 0; deviceIndex < devices.length; deviceIndex ++) {
                let device = devices[deviceIndex];

                if(accessory.context.uid === device.parsedCredentials.uniqueIdentifier) {
                    accessoryFound = true;

                    if(device.showTVAccessory === false && accessory.context.type === TelevisionAccessory.Type) {
                        this.debug(`Removing orphaned ${accessory.context.type} accessory [${accessory.context.uid}].`);
                        this.unregisterAccessories([accessory]);
                    }
                }    
            }

            if(!accessoryFound) {
                this.debug(`Removing orphaned ${accessory.context.type} accessory [${accessory.context.uid}].`);
                this.unregisterAccessories([accessory]);
            }
        }
    };

    async loadDevice(deviceConfiguration) {
        let credentials = appletv.parseCredentials(deviceConfiguration.credentials);

        this.debug(`Scanning for Apple TV [${credentials.uniqueIdentifier}].`);

        let devices = await appletv.scan(credentials.uniqueIdentifier);

        this.debug(`Apple TV [${credentials.uniqueIdentifier}] found.`);
        this.debug(`Attempting to connect to Apple TV [${credentials.uniqueIdentifier}].`);

        let connectedDevice = await devices[0].openConnection(credentials);

        this.debug(`Connected to ${connectedDevice.name} [${connectedDevice.uid}].`);
        this.debug(`Loading ${SwitchAccessory.Type} acessory for ${connectedDevice.name} [${connectedDevice.uid}].`);

        this.devices.push(new SwitchAccessory(this, deviceConfiguration, connectedDevice));

        if(deviceConfiguration.showTvAccessory) {
            this.debug(`Loading ${TelevisionAccessory.Type} acessory for ${connectedDevice.name} [${connectedDevice.uid}].`);
            this.devices.push(new TelevisionAccessory(this, deviceConfiguration, connectedDevice));
        }
    };

    onApiDidFinishLaunching() {
        this.debug("Cleaning up orphaned accessories...");

        this.cleanupAccessories();

        if (!this.config.devices) {
            this.debug("No Apple TV devices have been configured.");
            return;
        }

        this.debug("Loading configured Apple TVs...");

        this.config.devices.map(this.loadDevice);
    };
}

Platform.pluginName = "homebridge-appletv-now-playing";
Platform.platformName = "AppleTvNowPlayingPlatform";

module.exports = Platform;
