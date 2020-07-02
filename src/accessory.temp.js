const lodash = require("lodash");

const AccessoryModel = "Apple TV";
const AccessoryManufacturer = "Apple";

module.exports = class TempAccessory {
    constructor(platform, config, device) {
        this.configureAccessory = this.configureAccessory.bind(this);
        this.configureServices = this.configureServices.bind(this);
        this.configureSwitchService = this.configureSwitchService.bind(this);
        this.configureTelevisionsService = this.configureTelevisionsService.bind(this);

        this.setPower = this.setPower.bind(this);
        this.getPower = this.getPower.bind(this);
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
        this.log(`configuring accessory.`);

        this.uid = this.platform.api.hap.uuid.generate(`${this.device.uid}_apple_tv`);
        this.instance = lodash.find(this.platform.accessories, (accessory) => accessory.context.device.uid === this.device.uid);

        if (!this.instance) {
            this.instance = new this.platform.api.platformAccessory(this.config.name, this.uid);

            //this.platform.registerAccessory(this.instance);
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
        this.log(`configuring accessory information service.`);

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
        this.log(`configuring switch service.`);

        this.switchService = this.instance.getService(this.platform.api.hap.Service.Switch);

        if (!this.switchService) {
            this.log(`creating switch service.`);

            this.switchService = this.instance.addService(this.platform.api.hap.Service.Switch, `${this.config.name} Switch`, `${this.uid}_switch`);
        }

        this.switchService.getCharacteristic(this.platform.api.hap.Characteristic.On).on("get", this.getPower).on("set", this.setPower);

        this.log(`switch service configured.`);
    }

    configureTelevisionsService() {
        this.log(`configuring television service.`);

        this.televisionService = this.instance.getService(this.platform.api.hap.Service.Television);

        if (!this.televisionService) {
            this.log(`creating television service.`);

            this.televisionService = this.instance.addService(this.platform.api.hap.Service.Television, `${this.config.name} Television`, `${this.uid}_television`);
        }

        this.televisionService.getCharacteristic(this.platform.api.hap.Characteristic.On).on("get", this.getPower).on("set", this.setPower);
        this.televisionService.getCharacteristic(this.platform.api.hap.Characteristic.ActiveIdentifier).on("get", this.getActiveIdentifier).on("set", this.setActiveIdentifier);

        this.log(`television service configured.`);
    }

    setPower(value, callback) {
        this.log(`setting on characteristic => ${value}`);

        this.on = value;

        this.televisionService.getCharacteristic(this.platform.api.hap.Characteristic.On).updateValue(this.on);
        this.switchService.getCharacteristic(this.platform.api.hap.Characteristic.On).updateValue(this.on);

        callback(null);
    }

    getPower(callback) {
        this.log(`requesting on characteristic => ${this.on}`);

        callback(null, this.on);
    }

    setActiveIdentifier(value, callback) {
        this.log(`setting active identifier characteristic => ${value}`);

        this.on = value;

        callback(null);
    }

    getActiveIdentifier(callback) {
        this.log(`requesting active identifier characteristic => ${this.on}`);

        callback(null, this.on);
    }
};
