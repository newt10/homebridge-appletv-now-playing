const Platform = require("./platform");

const appletv = require("node-appletv-x");
const lodash = require("lodash");

const AccessoryModel = "Apple TV";
const AccessoryManufacturer = "Apple";

module.exports = class Accessory {
    constructor(type, platform, config, device) {
        this.createAccessory = this.createAccessory.bind(this);
        this.updateAccessory = this.updateAccessory.bind(this);
        this.configureServices = this.configureServices.bind(this);
        this.togglePower = this.togglePower.bind(this);

        this.onDeviceMessage = this.onDeviceMessage.bind(this);

        this.log = this.log.bind(this);
        this.debug = this.debug.bind(this);

        this.platform = platform;
        this.config = config;
        this.device = device;

        this.type = type;
        this.power = false;

        this.configureAccessory();

        this.device.sendIntroduction().then(this.onDeviceMessage);

        this.deviceInfoTimer = setInterval(() => this.device.sendIntroduction().then(this.onDeviceMessage), 5000);
    }

    debug(message) {
        this.platform.debug(`(${this.config.name} ${this.type}) ${message}`);
    }

    log(message) {
        this.platform.log(`(${this.config.name} ${this.type}) ${message}`);
    }

    configureAccessory() {
        this.debug(`configuring ${this.type} accessory.`);

        this.uid = this.platform.api.hap.uuid.generate(`${Platform.pluginName}-${this.device.uid}_apple_tv_${this.type}`);

        this.debug(this.uid);

        this.instance = lodash.find(this.platform.accessories, (accessory) => accessory.context.uid === this.device.uid);

        let update = true;

        if (!this.instance) {
            this.debug(`creating ${this.type} accessory.`);

            this.instance = new this.platform.api.platformAccessory(`${this.config.name} ${this.type}`, this.uid);

            this.createAccessory(this.instance);

            update = false;
        }

        this.instance.displayName = `${this.config.name} ${this.type}`;
        this.instance.name = `${this.config.name} ${this.type}`;
        this.instance.context.uid = this.device.uid;
        this.instance.context.version = 2;

        if (update) {
            this.updateAccessory(this.instance);
        }

        this.device.on("message", this.onDeviceMessage);
        this.device.on("nowPlaying", this.onNowPlaying);

        this.log(`accessory configured.`);
    }

    configureServices() {
        this.debug(`configuring ${this.type} accessory information service.`);

        this.instance
            .getService(this.platform.api.hap.Service.AccessoryInformation)
            .setCharacteristic(this.platform.api.hap.Characteristic.Manufacturer, AccessoryManufacturer)
            .setCharacteristic(this.platform.api.hap.Characteristic.Model, AccessoryModel)
            .setCharacteristic(this.platform.api.hap.Characteristic.SerialNumber, this.device.uid)
            .setCharacteristic(this.platform.api.hap.Characteristic.Name, `${this.config.name} ${this.type}`);

        this.log(`${this.type} accessory information service configured.`);
    }

    async togglePower(value, callback) {
        clearInterval(this.deviceInfoTimer);

        this.debug(`toggle power => ${value ? "on" : "off"}.`);

        if (!value && this.power) {
            await this.device.sendKeyCommand(appletv.AppleTV.Key.LongTv);
            await this.device.sendKeyCommand(appletv.AppleTV.Key.Select);
        } else if (value && !this.power) {
            await this.device.sendKeyPressAndRelease(1, 0x83);
            await this.device.sendKeyCommand(appletv.AppleTV.Key.Tv);
            await this.device.sendKeyCommand(appletv.AppleTV.Key.Tv);
        }

        this.onPowerUpdate && this.onPowerUpdate(value);
        this.power = value;

        setTimeout(() => callback(), 5000);

        this.deviceInfoTimer = setInterval(() => this.device.sendIntroduction().then(this.onDeviceMessage), 5000);
    }

    onDeviceMessage(message) {
        let power = false;

        if (message.payload.logicalDeviceCount) {
            if (message.payload.logicalDeviceCount <= 0) {
                power = false;
            }

            if (!message.payload.isProxyGroupPlayer || message.payload.isAirplayActive) {
                power = true;
            }
        }

        if (this.power === power) {
            return;
        }

        this.power = power;

        this.onPowerUpdate && this.onPowerUpdate(this.power);

        this.debug(`power status update => ${this.power ? "on" : "off"}.`);
    }
};
