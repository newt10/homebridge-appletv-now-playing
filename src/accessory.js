const lodash = require("lodash");

const AccessoryModel = "Apple TV";
const AccessoryManufacturer = "Apple";

module.exports = class Accessory {
    constructor(type, platform, config, device) {
        this.createAccessory = this.createAccessory.bind(this);
        this.updateAccessory = this.updateAccessory.bind(this);
        this.configureServices = this.configureServices.bind(this);
        
        this.log = this.log.bind(this);
        this.debug = this.debug.bind(this);

        this.platform = platform;
        this.config = config;
        this.device = device;

        this.type = type;

        this.configureAccessory();
    }

    debug(message) {
        if (this.config && this.config.debug) {
            if (typeof mesage === "string") {
                message = message.toLowerCase();
            }

            this.platform.log(message);
        }
    }

    log(message) {
        if (typeof mesage === "string") {
            message = message.toLowerCase();
        }

        this.platform.log(message);
    }

    createAccessory() {
        this.platform.registerAccessory(this.instance);
    }

    updateAccessory() {
        this.platform.updateAccessory(this.instance);
    }

    configureAccessory() {
        this.debug(`configuring ${this.type} accessory.`);

        this.uid = this.platform.api.hap.uuid.generate(`${this.device.uid}_apple_tv_${this.type}`);
        this.instance = lodash.find(this.platform.accessories, (accessory) => accessory.context.device.uid === this.device.uid);

        if (!this.instance) {
            this.debug(`creating ${this.type} accessory.`);

            this.instance = new this.platform.api.platformAccessory(this.config.name, this.uid);

            this.createAccessory(this.instance);
        }

        this.instance.displayName = this.config.name;
        this.instance.name = this.config.name;
        this.instance.context.device = {
            uid: this.device.uid,
        };

        this.updateAccessory(this.instance);

        this.log(`accessory configured.`);
    }

    configureServices() {
        this.debug(`configuring ${this.type} accessory information service.`);

        this.instance
            .getService(this.platform.api.hap.Service.AccessoryInformation)
            .setCharacteristic(this.platform.api.hap.Characteristic.Manufacturer, AccessoryManufacturer)
            .setCharacteristic(this.platform.api.hap.Characteristic.Model, AccessoryModel)
            .setCharacteristic(this.platform.api.hap.Characteristic.SerialNumber, this.device.uid)
            .setCharacteristic(this.platform.api.hap.Characteristic.Name, this.config.name);

        this.log(`${this.type} accessory information service configured.`);
    }
};