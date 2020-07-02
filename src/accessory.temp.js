const lodash = require("lodash");

const AccessoryModel = "Apple TV";
const AccessoryManufacturer = "Apple";

module.exports = class TempAccessory {
    constructor(platform, config, device) {
        this.configureAccessory = this.configureAccessory.bind(this);
        this.configureServices = this.configureServices.bind(this);
        this.configureSwitchService = this.configureSwitchService.bind(this);
        this.configureTelevisionsService = this.configureTelevisionsService.bind(this);

        this.setOn = this.setOn.bind(this);
        this.getOn = this.getOn.bind(this);
        this.setActiveIdentifier = this.setActiveIdentifier.bind(this);
        this.getActiveIdentifier = this.getActiveIdentifier.bind(this);

        this.log = this.log.bind(this);
        this.debug = this.debug.bind(this);

        this.platform = platform;
        this.config = config;
        this.device = device;

        this.on = false;

        this.configureAccessory(config, device);
    }

    log(message) {
        this.platform.log(`[${this.config.name}] ${message}`);
    }

    debug(message) {
        this.platform.log(`[${this.config.name}] ${message}`);
    }

    configureAccessory() {
        this.debug(`configuring accessory.`);

        this.uid = this.platform.api.hap.uuid.generate(`${this.device.uid}_apple_tv`);
        this.instance = lodash.find(this.platform.accessories, (accessory) => accessory.context.device.uid === this.device.uid);

        if (!this.instance) {
            this.debug(`creating accessory.`);

            this.instance = new this.platform.api.platformAccessory(this.config.name, this.uid);

            this.platform.registerAccessory(this.instance);
        }

        this.instance.displayName = this.config.name;
        this.instance.name = this.config.name;
        this.instance.context.device = {
            uid: this.device.uid,
        };

        this.platform.updateAccessory(this.instance);

        this.configureServices();

        this.log(`accessory configured.`);
    }

    configureServices() {
        this.debug(`configuring accessory information service.`);

        this.instance
            .getService(this.platform.api.hap.Service.AccessoryInformation)
            .setCharacteristic(this.platform.api.hap.Characteristic.Manufacturer, AccessoryManufacturer)
            .setCharacteristic(this.platform.api.hap.Characteristic.Model, AccessoryModel)
            .setCharacteristic(this.platform.api.hap.Characteristic.SerialNumber, this.device.uid)
            .setCharacteristic(this.platform.api.hap.Characteristic.Name, this.config.name);

        this.log(`accessory information service configured.`);

        this.configureTelevisionsService();
        this.configureSwitchService();
    }

    configureSwitchService() {
        this.debug(`configuring switch service.`);

        this.switchService = this.instance.getService(this.platform.api.hap.Service.Switch);

        if (!this.switchService) {
            this.debug(`creating switch service.`);

            this.switchService = this.instance.addService(this.platform.api.hap.Service.Switch, `${this.config.name} Switch`, `${this.uid}_switch`);
        }

        this.switchService.getCharacteristic(this.platform.api.hap.Characteristic.On).on("get", this.getOn).on("set", this.setOn);

        this.log(`switch service configured.`);
    }

    configureTelevisionsService() {
        this.debug(`configuring television service.`);

        this.televisionService = this.instance.getService(this.platform.api.hap.Service.Television);

        if (!this.televisionService) {
            this.debug(`creating television service.`);

            this.televisionService = this.instance.addService(this.platform.api.hap.Service.Television, `${this.config.name} Television`, `${this.uid}_television`);
        }

        this.televisionService.getCharacteristic(this.platform.api.hap.Characteristic.Active).on("get", this.getActive).on("set", this.setActive);
        this.televisionService.getCharacteristic(this.platform.api.hap.Characteristic.ActiveIdentifier).on("get", this.getActiveIdentifier).on("set", this.setActiveIdentifier);

        this.televisionService.setCharacteristic(this.platform.api.hap.Characteristic.ConfiguredName, `${this.config.name} Television`);
        this.televisionService.setCharacteristic(this.platform.api.hap.Characteristic.SleepDiscoveryMode, this.platform.api.hap.Characteristic.SleepDiscoveryMode.ALWAYS_DISCOVERABLE);

        this.log(`television service configured.`);
    }

    setOn(value, callback) {
        this.debug(`setting on characteristic => ${!!value}`);

        this.on = value;

        this.televisionService.getCharacteristic(this.platform.api.hap.Characteristic.Active).updateValue(this.on ? 1 : 0);
        this.switchService.getCharacteristic(this.platform.api.hap.Characteristic.On).updateValue(this.on);

        callback(null);
    }

    getOn(callback) {
        this.debug(`requesting on characteristic => ${this.on}`);

        callback(null, this.on);
    }

    setActive(value, callback) {
        this.debug(`setting active characteristic => ${!!value}`);

        this.on = !!value;

        this.televisionService.getCharacteristic(this.platform.api.hap.Characteristic.Active).updateValue(this.on);
        this.switchService.getCharacteristic(this.platform.api.hap.Characteristic.On).updateValue(this.on ? 1 : 0);

        callback(null);
    }

    getActive(callback) {
        this.debug(`requesting active characteristic => ${this.on}`);

        callback(null, this.on ? 1 : 0);
    }

    setActiveIdentifier(value, callback) {
        this.debug(`setting active identifier characteristic => ${value}`);

        this.on = value;

        callback(null);
    }

    getActiveIdentifier(callback) {
        this.debug(`requesting active identifier characteristic => ${this.on}`);

        callback(null, this.on);
    }
};
