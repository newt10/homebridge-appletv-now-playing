const Platform = require("./platform");

const lodash = require("lodash");
const appletv = require("node-appletv-x");

module.exports = class TelevisionAccessory {
    constructor(platform, config, device) {
        this.characteristics = require("./characteristics")(platform.api);

        this.type = "Television";

        this.configureAccessory = this.configureAccessory.bind(this);
        this.configureServices = this.configureServices.bind(this);
        this.configureTelevisionService = this.configureTelevisionService.bind(this);
        this.configureInputServices = this.configureInputServices.bind(this);

        this.setRemote = this.setRemote.bind(this);
        this.setActive = this.setActive.bind(this);
        this.getActive = this.getActive.bind(this);
        this.setActiveIdentifier = this.setActiveIdentifier.bind(this);
        this.getActiveIdentifier = this.getActiveIdentifier.bind(this);
        this.togglePower = this.togglePower.bind(this);

        this.onDeviceMessage = this.onDeviceMessage.bind(this);
        this.onPowerUpdate = this.onPowerUpdate.bind(this);
        this.onNowPlaying = this.onNowPlaying.bind(this);

        this.log = this.log.bind(this);
        this.debug = this.debug.bind(this);

        this.platform = platform;
        this.config = config;
        this.device = device;

        this.active = false;
        this.activeIdentifier = 0;

        this.configureAccessory();

        this.device.on("nowPlaying", this.onNowPlaying);
    }

    debug(message) {
        this.platform.debug(`(${this.config.name} ${this.type}) ${message}`);
    }

    log(message) {
        this.platform.log(`(${this.config.name} ${this.type}) ${message}`);
    }

    configureAccessory() {
        try {
            this.debug(`configuring ${this.type} accessory.`);

            this.uid = this.platform.api.hap.uuid.generate(`${Platform.platformName}.${this.device.uid}.${this.type}`);
            this.instance = lodash.find(
                this.platform.accessories,
                (accessory) => accessory.context.uid === this.device.uid && accessory.context.category === this.platform.api.hap.Categories.TELEVISION
            );

            //let update = true;

            if (!this.instance) {
                this.debug(`creating ${this.type} accessory.`);

                this.instance = new this.platform.api.platformAccessory(`${this.config.name} ${this.type}`, this.uid);
                this.platform.publishExternalAccessory(this.instance);

                //update = false;
            }

            this.instance.category = this.platform.api.hap.Categories.TELEVISION;
            this.instance.displayName = `${this.config.name} ${this.type}`;
            this.instance.name = `${this.config.name} ${this.type}`;
            this.instance.context.category = this.platform.api.hap.Categories.TELEVISION;
            this.instance.context.uid = this.device.uid;
            this.instance.context.version = 2;

            // if (update) {
            //     this.updateAccessory(this.instance);
            // }

            this.configureServices();

            this.device.on("message", this.onDeviceMessage);
            this.device.sendIntroduction().then(this.onDeviceMessage);

            this.deviceInfoTimer = setInterval(() => this.device.sendIntroduction().then(this.onDeviceMessage), 5000);

            this.log(`accessory configured.`);
        } catch (error) {
            this.log(`unable to configure accessory => ${error}`);
        }
    }

    configureServices() {
        try {
            this.debug(`configuring ${this.type} accessory information service.`);

            this.instance
                .getService(this.platform.api.hap.Service.AccessoryInformation)
                .setCharacteristic(this.platform.api.hap.Characteristic.Manufacturer, "Apple")
                .setCharacteristic(this.platform.api.hap.Characteristic.Model, "Apple TV")
                .setCharacteristic(this.platform.api.hap.Characteristic.SerialNumber, `TV${this.device.uid.substring(0, 5)}`)
                .setCharacteristic(this.platform.api.hap.Characteristic.Name, `${this.config.name} ${this.type}`);

            this.configureTelevisionService();

            this.log(`${this.type} accessory information service configured.`);
        } catch (error) {
            this.log(`unable to configure accessory information service => ${error}`);
        }
    }

    configureTelevisionService() {
        try {
            this.debug(`configuring television service.`);

            this.service = this.instance.getService(this.platform.api.hap.Service.Television);

            if (!this.service) {
                this.debug(`creating television service.`);

                this.service = this.instance.addService(this.platform.api.hap.Service.Television, `${this.config.name} Television`, `${this.uid}_television`);
            }

            this.service.getCharacteristic(this.platform.api.hap.Characteristic.Active).on("get", this.getActive).on("set", this.setActive);
            this.service.getCharacteristic(this.platform.api.hap.Characteristic.ActiveIdentifier).on("get", this.getActiveIdentifier).on("set", this.setActiveIdentifier);
            this.service.getCharacteristic(this.platform.api.hap.Characteristic.RemoteKey).on("set", this.setRemote);

            this.service.setCharacteristic(this.platform.api.hap.Characteristic.ConfiguredName, `${this.config.name} Television`);
            this.service.setCharacteristic(this.platform.api.hap.Characteristic.SleepDiscoveryMode, this.platform.api.hap.Characteristic.SleepDiscoveryMode.ALWAYS_DISCOVERABLE);

            this.configureInputServices();

            this.log(`television service configured.`);
        } catch (error) {
            this.log(`unable to configure television service => ${error}`);
        }
    }

    configureInputServices() {
        try {
            this.debug(`configuring input services.`);

            if (this.instance.context.inputs && this.config.inputs.length < this.instance.context.inputs.length) {
                for (let index = this.config.inputs.length; index < this.instance.context.inputs.length; index++) {
                    let inputService = this.instance.getServiceByUUIDAndSubType(this.platform.api.hap.Service.InputSource, `${this.device.uid}_apple_tv_input_${index}`);

                    if (inputService) {
                        this.debug(`removing input service => ${index}.`);

                        this.service.removeLinkedService(inputService);
                        this.instance.removeService(inputService);
                    }
                }
            }

            lodash.each(this.config.inputs, (input, index) => {
                try {
                    this.debug(`configuring input service => ${input.name}.`);

                    let inputService = this.instance.getServiceByUUIDAndSubType(this.platform.api.hap.Service.InputSource, `${this.device.uid}_apple_tv_input_${index}`);

                    if (!inputService) {
                        this.debug(`creating input service => ${input.name}.`);

                        inputService = new this.platform.api.hap.Service.InputSource(input.name, `${this.device.uid}_apple_tv_input_${index}`);

                        this.service.addLinkedService(inputService);
                        this.instance.addService(inputService, true);
                    }

                    input.identifier = index;

                    inputService
                        .setCharacteristic(this.platform.api.hap.Characteristic.Identifier, index)
                        .setCharacteristic(this.platform.api.hap.Characteristic.IsConfigured, this.platform.api.hap.Characteristic.IsConfigured.CONFIGURED)
                        .setCharacteristic(this.platform.api.hap.Characteristic.InputSourceType, this.platform.api.hap.Characteristic.InputSourceType.APPLICATION)
                        .setCharacteristic(this.platform.api.hap.Characteristic.Name, input.name)
                        .setCharacteristic(this.platform.api.hap.Characteristic.ConfiguredName, input.name)
                        .setCharacteristic(this.platform.api.hap.Characteristic.CurrentVisibilityState, this.platform.api.hap.Characteristic.CurrentVisibilityState.SHOWN);

                    this.log(`input service configured => ${input.name}.`);
                } catch (error) {
                    this.log(`unable create input service => ${input.name} => ${error}`);
                }
            });

            this.instance.context.inputs = this.config.inputs;

            this.log(`input services configured.`);
        } catch (error) {
            this.log(`unable to configure input service => ${error}`);
        }
    }

    async togglePower(value, callback) {
        try {
            clearInterval(this.deviceInfoTimer);

            this.debug(`toggle power => ${value ? "on" : "off"}.`);

            if (!value && this.power) {
                await this.device.sendKeyCommand(appletv.AppleTV.Key.LongTv);
                await this.device.sendKeyCommand(appletv.AppleTV.Key.Select);

                this.onPowerUpdate && this.onPowerUpdate(value);
                this.power = value;
            } else if (value && !this.power) {
                await this.device.sendKeyPressAndRelease(1, 0x83);
                await this.device.sendKeyCommand(appletv.AppleTV.Key.Tv);
                await this.device.sendKeyCommand(appletv.AppleTV.Key.Tv);

                this.onPowerUpdate && this.onPowerUpdate(value);
                this.power = value;
            }

            setTimeout(() => callback(), 5000);

            this.deviceInfoTimer = setInterval(() => this.device.sendIntroduction().then(this.onDeviceMessage), 5000);
        } catch (error) {
            this.log(`unable to toggle power status => ${error}`);
        }
    }

    setRemote(value, callback) {
        this.debug(`setting remote status => ${!!value}`);

        callback(null);
    }

    setActive(value, callback) {
        this.debug(`setting active status => ${value}`);

        this.active = value;

        this.togglePower(!!this.active, () => callback(null));
    }

    getActive(callback) {
        this.debug(`requesting active status => ${this.active}`);

        callback(null, this.active);
    }

    async setActiveIdentifier(value, callback) {
        try {
            this.debug(`setting active identifier status => ${value}`);

            if (this.activeIdentifier && this.activeIdentifier == value) return;

            this.activeIdentifier = value;

            let input = this.config.inputs[this.activeIdentifier];

            this.platform.debug(`switching to input => ${input.name}.`);

            let column = input.index % 5;
            let row = (input.index - column) / 5;

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

                    callback(null);
                }, 1000);
            }, 2000);
        } catch (error) {
            this.log(`unable to set active identifier status => ${error}`);
        }
    }

    getActiveIdentifier(callback) {
        this.debug(`requesting active identifier status => ${this.activeIdentifier}`);

        callback(null, this.activeIdentifier);
    }

    onPowerUpdate(value) {
        try {
            this.active = !!value ? this.platform.api.hap.Characteristic.Active.ACTIVE : this.platform.api.hap.Characteristic.Active.INACTIVE;
            this.service.getCharacteristic(this.platform.api.hap.Characteristic.Active).updateValue(this.active);
        } catch (error) {
            this.log(`unable to update power status => ${error}`);
        }
    }

    onNowPlaying(message) {
        try {
            if (message && message.playbackState && message.playbackState.length > 1) {
                message.playbackState = message.playbackState[0].toUpperCase() + message.playbackState.substring(1).toLowerCase();
            }

            if (message && message.appBundleIdentifier && this.config.inputs) {
                let input = this.config.inputs.filter((input) => input.applicationId && input.applicationId === message.appBundleIdentifier);

                if (input && input.length) {
                    input = input[0];

                    this.debug(`switching to input => ${input.name}.`);

                    this.input = input;
                    this.service.getCharacteristic(this.platform.api.hap.Characteristic.ActiveIdentifier).updateValue(this.input.identifier);
                }
            }

            this.service
                .getCharacteristic(this.platform.api.hap.Characteristic.CurrentMediaState)
                .updateValue(
                    message && message.playbackState
                        ? message.playbackState === "playing"
                            ? this.platform.api.hap.Characteristic.CurrentMediaState.PLAY
                            : message.playbackState === "paused"
                            ? this.platform.api.hap.Characteristic.CurrentMediaState.PAUSE
                            : this.platform.api.hap.Characteristic.CurrentMediaState.STOP
                        : this.platform.api.hap.Characteristic.CurrentMediaState.STOP
                );
        } catch (error) {
            this.log(`unable to update now playing status => ${error}`);
        }
    }

    onDeviceMessage(message) {
        try {
            if (message.payload) {
                if (message.payload.logicalDeviceCount) {
                    let power = false;

                    if (message.payload.logicalDeviceCount <= 0) {
                        power = false;
                    }

                    if (!message.payload.isProxyGroupPlayer || message.payload.isAirplayActive) {
                        power = true;
                    }

                    if (this.power === power) {
                        return;
                    }

                    this.power = power;

                    this.onPowerUpdate && this.onPowerUpdate(this.power);

                    this.debug(`power status update => ${this.power ? "on" : "off"}.`);
                }
            }
        } catch (error) {
            this.log(`unable to update power status => ${error}`);
        }
    }
};
