const Accessory = require("./accessory");
const { platformName } = require("./platform.temp");

const AccessoryModel = "Apple TV";
const AccessoryManufacturer = "Apple";

module.exports = class TempAccessory {
    constructor(platform, config, device) {
        this.configureAccessory = this.configureAccessory.bind(this);
        this.configureServices = this.configureServices.bind(this);
        this.configureSwitchService = this.configureSwitchService.bind(this);

        this.setPower = this.setPower.bind(this);
        this.getPower = this.getPower.bind(this);
        
        this.platform = platform;
        this.config = config;
        this.device = device;

        this.on = false; 

        this.configureAccessory(config, device);
    }

    log(message) {
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
    }

    configureSwitchService() {
        this.switchService = this.instance.getService(this.platform.api.hap.Service.Switch);

        if (!this.switchService) {
            this.switchService = this.instance.addService(this.platform.api.hap.Service.Switch, `${this.config.name} Switch`, `${this.uid}_switch`);
        }

        this.switchService.getCharacteristic(this.platform.api.hap.Characteristic.On).on("get", this.getPower).on("set", this.setPower);
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
};
