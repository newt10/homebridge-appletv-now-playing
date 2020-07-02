const Accessory = require("./accessory");
const { platformName } = require("./platform.temp");

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
        this.uid = this.platform.api.hap.uuid.generate(`${this.device.uid}_apple_tv`);
        this.instance = new this.platform.api.platformAccessory(this.config.name, this.uid);

        this.configureServices();

        this.platform.registerAccessory(this.instance);
    }

    configureServices() {
        this.instance
            .getService(this.platform.api.hap.Service.AccessoryInformation)
            .setCharacteristic(this.platform.api.hap.Characteristic.Manufacturer, AccessoryManufacturer)
            .setCharacteristic(this.platform.api.hap.Characteristic.Model, AccessoryModel)
            .setCharacteristic(this.platform.api.hap.Characteristic.SerialNumber, this.device.uid)
            .setCharacteristic(this.platform.api.hap.Characteristic.Name, this.config.name);

        this.configureSwitchService();
        this.configureTelevisionsService();
    }

    configureSwitchService() {
        this.log(`setting on characteristic => ${value}`);

        this.switchService = this.instance.getService(this.platform.api.hap.Service.Switch);

        if (!this.switchService) {
            this.switchService = this.instance.addService(this.platform.api.hap.Service.Switch, `${this.config.name} Switch`, `${this.uid}_switch`);
        }

        this.switchService.getCharacteristic(this.platform.api.hap.Characteristic.On).on("get", this.getPower).on("set", this.setPower);
    }

    configureTelevisionsService() {
        this.televisionService = this.instance.getService(this.platform.api.hap.Service.Television);

        if (!this.televisionService) {
            this.televisionService = this.instance.addService(this.platform.api.hap.Service.Television, `${this.config.name} Television`, `${this.uid}_television`);
        }

        this.televisionService.getCharacteristic(this.platform.api.hap.Characteristic.On).on("get", this.getPower).on("set", this.setPower);
        this.televisionService.getCharacteristic(this.platform.api.hap.Characteristic.ActiveIdentifier).on("get", this.getActiveIdentifier).on("set", this.setActiveIdentifier);
    }

    setPower(value, callback) {
        this.log(`setting on characteristic => ${value}`);
        this.on = value;

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
