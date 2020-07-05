const appletv = require("node-appletv-x");

class Accessory {
    constructor(type, platform, config, device) {
        this.configureAccessory = this.configureAccessory.bind(this);
        this.setPower = this.setPower.bind(this);
        this.getPower = this.getPower.bind(this);
        this.onMessage = this.onMessage.bind(this);
        this.onSupportedCommands = this.onSupportedCommands.bind(this);
        this.onServicesConfigured = this.onServicesConfigured.bind(this);

        this.type = type;
        this.platform = platform;
        this.config = config;
        this.device = device;
        this.power = false;
        this.characteristics = require("./characteristics")(platform.api);

        this.configureAccessory();

        this.device.on("message", this.onMessage);
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
            this.accessory.context.type = this.type;

            this.platform.registerAccessories([this.accessory]);
        } else {
            this.platform.debug(`updating ${this.type} accessory (${this.device.name} [${this.device.uid}]).`);

            this.accessory.displayName = this.config.name;
            this.accessory.name = this.config.name;
            this.accessory.context.type = this.type;

            this.platform.updateAccessories([this.accessory]);
        }

        this.platform.log(`${this.type} accessory (${this.device.name} [${this.device.uid}]) ready.`);
    }

    onSupportedCommands(message) {
        if (!!message) {
            if (!message.length) {
                this.primaryService && this.primaryService.getCharacteristic(this.platform.api.hap.Characteristic.Active).updateValue(false);
            }
        }
    }

    onMessage(message) {
        if (message.payload) {
            if (!!message.payload.logicalDeviceCount) {
                if (message.payload.logicalDeviceCount > 0 && (!messagePayload.isProxyGroupPlayer || messagePayload.isAirplayActive)) {
                    this.power = true;
                }

                this.power = false;

                this.primaryService && this.primaryService.updateCharacteristic(this.platform.api.hap.Characteristic.On).updateValue(this.power);
                this.primaryService && this.primaryService.updateCharacteristic(this.platform.api.hap.Characteristic.Active).updateValue(this.power);

                this.platform.debug(`auto power set to ${this.power ? "on" : "off"} for ${this.primaryService.type} service (${this.config.name} [${this.device.uid}]) .`);
            }
        }
    }

    onServicesConfigured() {
        this.primaryService && this.primaryService.getCharacteristic(this.platform.api.hap.Characteristic.On).on("set", this.setPower).on("get", this.getPower);
    }

    async setPower(value, next) {
        clearTimeout(this.powerTimer);

        this.platform.debug(`power set to ${value ? "on" : "off"} for ${this.primaryService.type} service (${this.config.name} [${this.device.uid}]) .`);

        if (!value && this.power) {
            await this.device.sendKeyCommand(appletv.AppleTV.Key.LongTv);
            await this.device.sendKeyCommand(appletv.AppleTV.Key.Select);
        } else if (value && !this.power) {
            await this.device.sendKeyCommand(appletv.AppleTV.Key.Tv);
        }

        this.power = value;

        next(null);
    }

    getPower(next) {
        this.platform.debug(`power requested for ${this.primaryService.type} service (${this.config.name} [${this.device.uid}]).`);
        next(null, this.power);
    }
}

module.exports = Accessory;
