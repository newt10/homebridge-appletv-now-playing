class Accessory {
    constructor(type, platform, config, device) {
        this.configureAccessory = this.configureAccessory.bind(this);

        this.type = type;
        this.platform = platform;
        this.config = config;
        this.device = device;
        this.power = false;
        this.powerTimer = null;
        this.deviceInfoTimer = null;
        this.characteristics = require("./characteristics")(platform.api);

        this.configureAccessory();
    }

    configureAccessory() {
        let accessoryUid = this.platform.api.hap.uuid.generate(`${this.device.uid}_apple_tv_${this.type}`);
        let deviceAccessories = this.platform.accessories.filter((accessory) => accessory.context.uid === this.device.uid);

        this.accessory = deviceAccessories.find((_accessory) => _accessory.UUID === accessoryUid);

        if (!this.accessory) {
            this.platform.debug(`creating ${this.type} accessory (${this.device.name} [${this.device.uid}]).`);

            this.accessory = new this.platform.api.platformAccessory(this.config.name, accessoryUid);
            this.accessory.displayName = this.config.name;
            this.accessory.context.uid = this.device.uid;

            this.platform.registerAccessories([this.accessory]);
        } else {
            this.platform.debug(`updating ${this.type} accessory (${this.device.name} [${this.device.uid}]).`);

            this.accessory.displayName = this.config.name;
            this.accessory.name = this.config.name;

            this.platform.updateAccessories([this.accessory]);
        }

        this.platform.log(`${this.type} accessory (${this.device.name} [${this.device.uid}]) ready.`);
    };

    onSupportedCommands(message, service) {
        if (!!message) {
            if (!message.length) {
                service.getCharacteristic(this.platform.api.hap.Characteristic.Active).updateValue(false);
            }
        }
    };

    onDeviceInfo(message, service) {
        this.power = message.payload.logicalDeviceCount == 1;

        service.getCharacteristic(this.platform.api.hap.Characteristic.Active).updateValue(this.power);
    }

    async onPower(value, next) {
        clearTimeout(this.powerTimer);

        this.platform.debug(`turning ${this.type} service for accessory (${this.device.name} [${this.device.uid}]) ${value ? "on" : "off"}.`);

        if (value && !this.power) {
            await this.device.sendKeyCommand(appletv.AppleTV.Key.LongTv);
            await this.device.sendKeyCommand(appletv.AppleTV.Key.Select);
        } else if (!value && this.power) {
            await this.device.sendKeyCommand(appletv.AppleTV.Key.Tv);
        }

        this.power = value;
        this.powerTimer = setTimeout(() => this.device.sendIntroduction().then(this.onDeviceInfo), 10000);

        next(null);
    }
}

module.exports = Accessory;