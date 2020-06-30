const appletv = require("node-appletv-x");
const Accessory = require("./accessory");

class TelevisionAccessory extends Accessory {
    constructor(platform, config, device) {
        super(TelevisionAccessory.Type, platform, config, device);

        this.configureServices = this.configureServices.bind(this);
        this.configureAccessoryInformationService = this.configureAccessoryInformationService.bind(this);
        this.configureTVService = this.configureTVService.bind(this);
        this.configureInputServices = this.configureInputServices.bind(this);
        this.setInput = this.setInput.bind(this);
        this.onPower = this.onPower.bind(this);
        this.onDeviceInfo = this.onDeviceInfo.bind(this);
        this.onSupportedCommands = this.onSupportedCommands.bind(this);
        this.onNowPlaying = this.onNowPlaying.bind(this);

        this.configureServices();
    }

    configureServices() {
        this.configureAccessoryInformationService();
        this.configureTVService();
        this.configureInputServices();

        this.powerTimer = setTimeout(() => this.device.sendIntroduction().then(this.onDeviceInfo), 5000);
    }

    configureAccessoryInformationService() {
        this.platform.debug(`configuring ${this.type} accessory information service for accessory (${this.device.name} [${this.device.uid}]).`);

        try {
            this.accessory
                .getService(this.platform.api.hap.Service.AccessoryInformation)
                .setCharacteristic(this.platform.api.hap.Characteristic.Manufacturer, "Apple")
                .setCharacteristic(this.platform.api.hap.Characteristic.Model, "Apple TV")
                .setCharacteristic(this.platform.api.hap.Characteristic.SerialNumber, this.device.uid)
                .setCharacteristic(this.platform.api.hap.Characteristic.Name, this.config.name);

            this.platform.debug(`${this.type} accessory information service for accessory (${this.device.name} [${this.device.uid}]) configured.`);
        } catch (error) {
            this.platform.log(`${this.type} accessory information service for accessory (${this.device.name} [${this.device.uid}]) could not be configured.`);
            this.platform.log(error);
        }
    }

    configureTVService() {
        this.platform.debug(`configuring ${this.type} service for accessory (${this.device.name} [${this.device.uid}]).`);

        try {
            this.tvService = this.accessory.getService(this.platform.api.hap.Service.Television);

            if (!this.tvService) {
                this.tvService = this.accessory.addService(this.platform.api.hap.Service.Television, `${this.config.name} Television`);

                this.platform.debug(`television service added to accessory (${this.device.name} [${this.device.uid}]).`);
            }

            this.tvService
                .setCharacteristic(this.platform.api.hap.Characteristic.Manufacturer, "Apple")
                .setCharacteristic(this.platform.api.hap.Characteristic.Model, "Apple TV")
                .setCharacteristic(this.platform.api.hap.Characteristic.SerialNumber, this.device.uid)
                .setCharacteristic(this.platform.api.hap.Characteristic.Name, this.config.name)
                .setCharacteristic(this.platform.api.hap.Characteristic.ConfiguredName, this.config.name);

            this.tvService.getCharacteristic(this.platform.api.hap.Characteristic.Active).on("set", this.onPower);
            this.tvService.getCharacteristic(this.platform.api.hap.Characteristic.ActiveIdentifier).on("set", this.setInput).on("get", this.getInput);

            this.device.on("supportedCommands", this.platform.debug);
            this.device.on("playbackQueue", this.platform.debug);
            this.device.requestPlaybackQueueWithWait().then(this.platform.debug);
            this.device.sendMessage("GetStateMessage", "GetStateMessage", {}, true).then(this.platform.debug);

            this.platform.debug(`${this.type} service for accessory (${this.device.name} [${this.device.uid}]) configured.`);
        } catch (error) {
            this.platform.log(`${this.type} service for accessory (${this.device.name} [${this.device.uid}]) could not be configured.`);
            this.platform.log(error);
        }
    }

    configureInputServices() {
        this.platform.debug(`configuring ${this.type} input service(s) for accessory (${this.device.name} [${this.device.uid}]).`);

        try {
            if (this.config.inputs && this.config.inputs.length) {
                if (this.accessory.context.inputs && this.accessory.context.inputs.length > this.config.inputs.length) {
                    let difference = this.accessory.context.inputs.length - this.config.inputs.length;

                    for (let index = this.accessory.context.inputs.length - 1; index > difference - 1; index--) {
                        let inputService = accessory.getServiceByUUIDAndSubType(this.platform.api.hap.Service.InputSource, `${this.accessory.context.uid}_input_${index}`);

                        if (inputService) {
                            this.platform.debug(`removing orphaned ${this.type} input service for accessory (${this.device.name} [${this.device.uid}]).`);
                            this.accessory.removeService(inputService);
                        }
                    }
                }

                for (let index = 0; index < this.config.inputs.length; index++) {
                    let input = this.config.inputs[index];

                    input.identifier = index;

                    this.platform.debug(`configuring ${this.type} input service ${input.name} [${index}] for accessory (${this.device.name} [${this.device.uid}]).`);

                    let inputService = this.accessory.getServiceByUUIDAndSubType(this.platform.api.hap.Service.InputSource, `${this.accessory.context.uid}_input_${index}`);

                    if (!inputService) {
                        inputService = this.accessory.addService(
                            this.platform.api.hap.Service.InputSource,
                            `${this.config.name} '${input.name}' Input`,
                            `${this.accessory.context.uid}_input_${index}`
                        );

                        this.platform.debug(`${this.type} input service ${input.name} [${index}] for added to accessory (${this.device.name} [${this.device.uid}]).`);
                    }

                    inputService
                        .setCharacteristic(this.platform.api.hap.Characteristic.Identifier, index)
                        .setCharacteristic(this.platform.api.hap.Characteristic.IsConfigured, this.platform.api.hap.Characteristic.IsConfigured.CONFIGURED)
                        .setCharacteristic(this.platform.api.hap.Characteristic.InputSourceType, this.platform.api.hap.Characteristic.InputSourceType, "APPLICATION")
                        .setCharacteristic(this.platform.api.hap.Characteristic.ConfiguredName, input.name)
                        .setCharacteristic(this.platform.api.hap.Characteristic.CurrentVisibilityState, this.platform.api.hap.Characteristic.CurrentVisibilityState.SHOWN);

                    this.tvService.addLinkedService(inputService);

                    this.platform.debug(`${this.type} input service ${input.name} [${index}] for accessory (${this.device.name} [${this.device.uid}]) configured.`);
                }

                this.accessory.context.inputs = this.config.inputs;
            } else if (this.accessory.context.inputs) {
                for (let index = 0; index < this.accessory.context.inputs.length; index++) {
                    let inputService = this.accessory.getService(this.platform.api.hap.Service.InputSource);

                    if (inputService) {
                        this.platform.debug(`removing orphaned ${this.type} input service for accessory (${this.device.name} [${this.device.uid}]).`);
                        this.accessory.removeService(this.platform.api.hap.Service.InputSource);
                    }
                }

                this.accessory.context.inputs = [];
            }
        } catch (error) {
            this.platform.log(`${this.type} input service(s) for accessory (${this.device.name} [${this.device.uid}]) could not be configured.`);
            this.platform.log(error);
        }
    }

    async setInput(value, next) {
        this.platform.debug(`switching to ${this.type} input ${value} for accessory (${this.device.name} [${this.device.uid}]).`);

        this.input = this.config.inputs[value];

        let column = this.input.index % 5;
        let row = (this.input.index - column) / 5;

        await this.device.sendKeyCommand(appletv.AppleTV.Key.Tv);

        setTimeout(async () => {
            await this.device.sendKeyCommand(appletv.AppleTV.Key.Tv);

            setTimeout(async () => {
                for (let i = 0; i < column - 1; i++) {
                    await this.device.sendKeyCommand(appletv.AppleTV.Key.Right);
                }

                for (let i = 0; i < row; i++) {
                    await this.device.sendKeyCommand(appletv.AppleTV.Key.Down);
                }

                await this.device.sendKeyCommand(appletv.AppleTV.Key.Select);

                next(null);
            }, 1000);
        }, 2000);
    }

    async getInput(next) {
        if (this.input) {
            next(null, this.input.name);
        } else {
            next(null, null);
        }
    }

    async onPower(value, next) {
        clearTimeout(this.powerTimer);

        this.platform.debug(`turning ${this.type} service for accessory (${this.device.name} [${this.device.uid}]) ${value ? "on" : "off"}.`);

        if (value && !this.power) {
            await this.device.sendKeyCommand(appletv.AppleTV.Key.LongTv);
            await this.device.sendKeyCommand(appletv.AppleTV.Key.Select);
        } else if (!value && this.power) {
            await this.device.sendKeyPressAndRelease(1, 0x83);
            await this.device.sendKeyCommand(appletv.AppleTV.Key.Tv);
        }

        this.power = value;
        this.powerTimer = setTimeout(() => this.device.sendIntroduction().then(this.onDeviceInfo), 10000);

        next(null);
    }

    onDeviceInfo(message) {
        this.power = message.payload.logicalDeviceCount == 1;
        this.tvService && this.tvService.getCharacteristic(this.platform.api.hap.Characteristic.Active).updateValue(this.power);

        this.powerTimer = setTimeout(() => this.device.sendIntroduction().then(this.onDeviceInfo), 5000);
    }

    onSupportedCommands(message) {
        if (!!message) {
            if (!message.length) {
                this.tvService.getCharacteristic(this.platform.api.hap.Characteristic.Active).updateValue(false);
            }
        }
    }

    onNowPlaying(message) {
        if (message && message.playbackState && message.playbackState.length > 1) {
            message.playbackState = message.playbackState[0].toUpperCase() + message.playbackState.substring(1).toLowerCase();
        }

        this.tvService
            .getCharacteristic(this.platform.api.hap.Characteristics.CurrentMediaState)
            .updateValue(
                message &&
                    (message.playbackState === "playing"
                        ? this.platform.api.hap.Characteristic.CurrentMediaState.PLAY
                        : message.playbackState === "paused"
                        ? this.platform.api.hap.Characteristic.CurrentMediaState.PAUSE
                        : this.platform.api.hap.Characteristic.CurrentMediaState.STOP)
            );
    }
}

TelevisionAccessory.Type = "television";

module.exports = TelevisionAccessory;
